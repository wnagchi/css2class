import { EventBus } from '../core/EventBus';
import ConfigManager from '../core/ConfigManager';
import FileUtils from '../utils/FileUtils';
import * as fs from 'fs/promises';
import * as path from 'path';

interface WriteOptions {
  forceUniFile?: boolean;
  outputPath?: string;
  fileName?: string;
  encoding?: BufferEncoding;
  mode?: number;
}

interface WriteStats {
  totalWrites: number;
  successfulWrites: number;
  failedWrites: number;
  lastWriteTime: Date | null;
  totalBytesWritten: number;
  errors: string[];
}

interface MultiFileConfig {
  entry?: {
    path?: string;
  };
  output?: {
    cssOutType?: 'filePath' | 'uniFile';
    path?: string;
    fileName?: string;
    fileType?: string;
  };
}

class FileWriter {
  private eventBus: EventBus;
  private configManager: ConfigManager;
  private fileUtils: FileUtils;
  private writeQueue: Array<{
    cssContent: string;
    filePath: string;
    options: WriteOptions;
    resolve: (value: void) => void;
    reject: (reason: any) => void;
  }> = [];
  private isWriting: boolean = false;
  private stats: WriteStats = {
    totalWrites: 0,
    successfulWrites: 0,
    failedWrites: 0,
    lastWriteTime: null,
    totalBytesWritten: 0,
    errors: [],
  };

  constructor(eventBus: EventBus, configManager: ConfigManager, fileUtils: FileUtils) {
    this.eventBus = eventBus;
    this.configManager = configManager;
    this.fileUtils = fileUtils;
  }

  // 写入CSS到文件
  async writeCSS(cssContent: string, filePath: string, options: WriteOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      this.writeQueue.push({
        cssContent,
        filePath,
        options,
        resolve,
        reject,
      });

      if (!this.isWriting) {
        this.processWriteQueue();
      }
    });
  }

  // 处理写入队列
  private async processWriteQueue(): Promise<void> {
    if (this.isWriting || this.writeQueue.length === 0) {
      return;
    }

    this.isWriting = true;

    while (this.writeQueue.length > 0) {
      const job = this.writeQueue.shift()!;
      try {
        await this.performWrite(job.cssContent, job.filePath, job.options);
        job.resolve();
        this.stats.successfulWrites++;
      } catch (error) {
        job.reject(error);
        this.stats.failedWrites++;
        this.stats.errors.push((error as Error).message);
      }
      this.stats.totalWrites++;
      this.stats.lastWriteTime = new Date();
    }

    this.isWriting = false;
  }

  // 执行实际的文件写入
  private async performWrite(cssContent: string, filePath: string, options: WriteOptions = {}): Promise<void> {
    try {
      const multiFile = this.configManager.getMultiFile() as MultiFileConfig;
      if (!multiFile) {
        throw new Error('MultiFile configuration is required for CSS writing');
      }

      const outputConfig = multiFile.output;
      const cssOutType = outputConfig?.cssOutType || 'filePath';

      let outputPath: string;
      let fileName: string;

      // 强制统一文件模式（由UnifiedWriter调用时）
      if (options.forceUniFile || cssOutType === 'uniFile') {
        const outputDir = options.outputPath || outputConfig?.path || './';
        fileName = options.fileName || outputConfig?.fileName || 'common.wxss';
        outputPath = path.join(outputDir, fileName);

        this.eventBus.emit('fileWriter:uniFileMode', {
          outputPath,
          fileName,
          cssLength: cssContent.length,
        });
      } else if (cssOutType === 'filePath') {
        // 将CSS文件输出到监听文件对应的目录下
        const relativePath = path.relative(multiFile.entry?.path || '', filePath);
        const dirPath = path.dirname(relativePath);
        const baseName = path.basename(filePath, path.extname(filePath));

        // 构建输出路径
        const outputDir = outputConfig?.path || path.dirname(filePath);
        const outputDirPath = path.join(outputDir, dirPath);
        fileName = `${baseName}.${outputConfig?.fileType || 'wxss'}`;
        outputPath = path.join(outputDirPath, fileName);

        this.eventBus.emit('fileWriter:filePathMode', {
          outputPath,
          fileName,
          cssLength: cssContent.length,
          relativePath,
        });
      } else {
        throw new Error(`Unsupported cssOutType: ${cssOutType}`);
      }

      // 确保目录存在
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });

      // 写入文件
      const encoding = options.encoding || 'utf8';
      const mode = options.mode || 0o644;

      await fs.writeFile(outputPath, cssContent, { encoding, mode });

      this.stats.totalBytesWritten += Buffer.byteLength(cssContent, encoding);

      this.eventBus.emit('file:css:written', {
        outputFile: outputPath,
        sourceFile: filePath,
        cssLength: cssContent.length,
        encoding,
        mode,
      });

    } catch (error) {
      this.eventBus.emit('file:css:write:error', {
        sourceFile: filePath,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // 批量写入CSS文件
  async batchWrite(cssFiles: Array<{ content: string; filePath: string; options?: WriteOptions }>): Promise<Array<{ success: boolean; error?: string }>> {
    const results = Array<{ success: boolean; error?: string }>(cssFiles.length);

    // 并发写入，但限制并发数
    const concurrency = 5;
    const chunks = [];
    for (let i = 0; i < cssFiles.length; i += concurrency) {
      chunks.push(cssFiles.slice(i, i + concurrency));
    }

    let resultIndex = 0;
    for (const chunk of chunks) {
      const promises = chunk.map(async (file, index) => {
        try {
          await this.writeCSS(file.content, file.filePath, file.options);
          results[resultIndex + index] = { success: true };
        } catch (error) {
          results[resultIndex + index] = {
            success: false,
            error: (error as Error).message
          };
        }
      });

      await Promise.all(promises);
      resultIndex += chunk.length;
    }

    return results;
  }

  // 追加CSS到文件
  async appendCSS(cssContent: string, filePath: string, options: WriteOptions = {}): Promise<void> {
    try {
      const outputPath = await this.getOutputPath(filePath, options);

      // 确保目录存在
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });

      // 检查文件是否存在
      try {
        await fs.access(outputPath);
        // 文件存在，追加内容
        await fs.appendFile(outputPath, cssContent, { encoding: options.encoding || 'utf8' });
      } catch {
        // 文件不存在，创建新文件
        await fs.writeFile(outputPath, cssContent, { encoding: options.encoding || 'utf8' });
      }

      this.eventBus.emit('file:css:appended', {
        outputFile: outputPath,
        sourceFile: filePath,
        cssLength: cssContent.length,
      });
    } catch (error) {
      this.eventBus.emit('file:css:append:error', {
        sourceFile: filePath,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // 获取输出路径
  private async getOutputPath(filePath: string, options: WriteOptions): Promise<string> {
    const multiFile = this.configManager.getMultiFile() as MultiFileConfig;
    if (!multiFile) {
      throw new Error('MultiFile configuration is required');
    }

    const outputConfig = multiFile.output;
    const cssOutType = outputConfig?.cssOutType || 'filePath';

    if (options.forceUniFile || cssOutType === 'uniFile') {
      const outputDir = options.outputPath || outputConfig?.path || './';
      const fileName = options.fileName || outputConfig?.fileName || 'common.wxss';
      return path.join(outputDir, fileName);
    } else {
      const relativePath = path.relative(multiFile.entry?.path || '', filePath);
      const dirPath = path.dirname(relativePath);
      const baseName = path.basename(filePath, path.extname(filePath));
      const outputDir = outputConfig?.path || path.dirname(filePath);
      const outputDirPath = path.join(outputDir, dirPath);
      const fileName = `${baseName}.${outputConfig?.fileType || 'wxss'}`;
      return path.join(outputDirPath, fileName);
    }
  }

  // 清空写入队列
  clearQueue(): void {
    this.writeQueue = [];
    this.isWriting = false;
    this.eventBus.emit('fileWriter:queue:cleared');
  }

  // 获取写入统计信息
  getWriteStats(): WriteStats {
    return { ...this.stats };
  }

  // 重置统计信息
  resetStats(): void {
    this.stats = {
      totalWrites: 0,
      successfulWrites: 0,
      failedWrites: 0,
      lastWriteTime: null,
      totalBytesWritten: 0,
      errors: [],
    };
    this.eventBus.emit('fileWriter:stats:reset');
  }

  // 检查文件写入权限
  async checkWritePermissions(filePath: string): Promise<boolean> {
    try {
      const outputPath = await this.getOutputPath(filePath, {});
      const dir = path.dirname(outputPath);

      // 尝试创建目录
      await fs.mkdir(dir, { recursive: true });

      // 尝试写入测试文件
      const testFile = path.join(dir, '.write-test');
      await fs.writeFile(testFile, 'test', { flag: 'w' });
      await fs.unlink(testFile);

      return true;
    } catch {
      return false;
    }
  }

  // 获取队列状态
  getQueueStatus(): {
    queueLength: number;
    isWriting: boolean;
    estimatedWaitTime: number;
  } {
    // 简单估算：每个文件平均写入时间10ms
    const estimatedWaitTime = this.writeQueue.length * 10;

    return {
      queueLength: this.writeQueue.length,
      isWriting: this.isWriting,
      estimatedWaitTime,
    };
  }
}

export default FileWriter;