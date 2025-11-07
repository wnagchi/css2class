import { promises as fs } from 'fs';
import path from 'path';
import { EventBus } from '../core/EventBus';
import { FileCleaner } from '../cleanup';

interface FileInfo {
  fileName: string;
  fileType: string;
  filePath: string;
  fileTName: string;
  path: string;
  fullPath: string;
}

interface FileStats {
  size: number;
  mtime: Date;
  ctime: Date;
  isFile: boolean;
  isDirectory: boolean;
}

interface BatchProcessOptions {
  concurrency?: number;
  onProgress?: (processed: number, total: number) => void;
}

interface BatchProcessResult {
  file: string;
  success: boolean;
  result?: any;
  error?: any;
}

export default class FileUtils {
  private eventBus: EventBus;
  private fileCleaner: FileCleaner;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.fileCleaner = new FileCleaner(eventBus);
  }

  // 文件信息提取
  getFileInfo(filePath: string): FileInfo | null {
    try {
      const fileName = path.basename(filePath);
      const fileType = path.extname(filePath).substring(1);
      const fileDir = path.dirname(filePath);
      const fileTName = path.basename(filePath, path.extname(filePath));

      return {
        fileName,
        fileType,
        filePath: fileDir,
        fileTName,
        path: filePath,
        fullPath: path.resolve(filePath),
      };
    } catch (error) {
      this.eventBus.emit('fileUtils:error', { operation: 'getFileInfo', filePath, error });
      return null;
    }
  }

  // 路径标准化
  normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, '/');
  }

  // 路径合并
  joinPaths(...paths: string[]): string {
    return path.join(...paths).replace(/\\/g, '/');
  }

  // 文件存在检查
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // 目录存在检查
  async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  // 创建目录
  async createDirectory(dirPath: string): Promise<boolean> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      this.eventBus.emit('fileUtils:directory:created', { dirPath });
      return true;
    } catch (error) {
      this.eventBus.emit('fileUtils:error', { operation: 'createDirectory', dirPath, error });
      return false;
    }
  }

  // 读取文件
  async readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string | null> {
    try {
      const content = await fs.readFile(filePath, encoding);
      this.eventBus.emit('fileUtils:file:read', { filePath });
      return content;
    } catch (error) {
      this.eventBus.emit('fileUtils:error', { operation: 'readFile', filePath, error });
      return null;
    }
  }

  // 写入文件
  async writeFile(filePath: string, content: string, encoding: BufferEncoding = 'utf-8'): Promise<boolean> {
    try {
      // 确保目录存在
      const dirPath = path.dirname(filePath);
      await this.createDirectory(dirPath);

      await fs.writeFile(filePath, content, encoding);
      this.eventBus.emit('fileUtils:file:written', { filePath });
      return true;
    } catch (error) {
      this.eventBus.emit('fileUtils:error', { operation: 'writeFile', filePath, error });
      return false;
    }
  }

  // 获取文件统计信息
  async getFileStats(filePath: string): Promise<FileStats | null> {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        mtime: stats.mtime,
        ctime: stats.ctime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      };
    } catch (error) {
      this.eventBus.emit('fileUtils:error', { operation: 'getFileStats', filePath, error });
      return null;
    }
  }

  // 文件类型检查
  isHtmlFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.html', '.htm'].includes(ext);
  }

  isWxmlFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.wxml';
  }

  isSupportedFile(filePath: string, supportedTypes: string[] = ['html', 'wxml']): boolean {
    const ext = path.extname(filePath).toLowerCase().substring(1);
    return supportedTypes.includes(ext);
  }

  // 路径模式匹配
  matchPathPattern(filePath: string, patterns: string[]): boolean {
    const normalizedPath = this.normalizePath(filePath);

    return patterns.some((pattern) => {
      // 简单的通配符匹配
      const regexPattern = pattern
        .replace(/\\/g, '/')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');

      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(normalizedPath);
    });
  }

  // 相对路径计算
  getRelativePath(fromPath: string, toPath: string): string {
    try {
      return path.relative(fromPath, toPath).replace(/\\/g, '/');
    } catch (error) {
      this.eventBus.emit('fileUtils:error', {
        operation: 'getRelativePath',
        fromPath,
        toPath,
        error,
      });
      return toPath;
    }
  }

  // 绝对路径转换
  getAbsolutePath(filePath: string, basePath: string = process.cwd()): string {
    try {
      return path.resolve(basePath, filePath).replace(/\\/g, '/');
    } catch (error) {
      this.eventBus.emit('fileUtils:error', {
        operation: 'getAbsolutePath',
        filePath,
        basePath,
        error,
      });
      return filePath;
    }
  }

  // 文件扩展名处理
  changeExtension(filePath: string, newExt: string): string {
    const ext = path.extname(filePath);
    const basePath = filePath.substring(0, filePath.length - ext.length);
    return `${basePath}${newExt.startsWith('.') ? newExt : `.${newExt}`}`;
  }

  // 批量文件操作
  async batchProcess(
    files: string[],
    processor: (file: string) => Promise<any>,
    options: BatchProcessOptions = {}
  ): Promise<BatchProcessResult[]> {
    const results: BatchProcessResult[] = [];
    const { concurrency = 5, onProgress } = options;

    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      const batchPromises = batch.map(async (file) => {
        try {
          const result = await processor(file);
          return { file, success: true, result };
        } catch (error) {
          return { file, success: false, error };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      if (onProgress) {
        onProgress(i + batch.length, files.length);
      }
    }

    this.eventBus.emit('fileUtils:batch:completed', { totalFiles: files.length, results });
    return results;
  }

  // 文件监控辅助
  getFileChangeType(oldStats: FileStats | null, newStats: FileStats | null): string {
    if (!oldStats || !newStats) {
      return 'unknown';
    }

    if (oldStats.mtime.getTime() !== newStats.mtime.getTime()) {
      return 'modified';
    }

    if (oldStats.size !== newStats.size) {
      return 'size_changed';
    }

    return 'unchanged';
  }

  // 递归获取目录下所有文件
  async getAllFiles(dirPath: string, extensions: string[] = []): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = this.joinPaths(dirPath, entry.name);

        if (entry.isDirectory()) {
          // 递归处理子目录
          const subFiles = await this.getAllFiles(fullPath, extensions);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          // 检查扩展名
          if (extensions.length === 0 || extensions.includes(path.extname(entry.name).substring(1))) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      this.eventBus.emit('fileUtils:error', { operation: 'getAllFiles', dirPath, error });
    }

    return files;
  }

  // 文件大小格式化
  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  // 安全的文件删除 - 使用FileCleaner
  async safeDelete(filePath: string): Promise<boolean> {
    return await this.fileCleaner.safeDelete(filePath);
  }

  // 新增：清理过期文件
  async cleanupExpiredFiles(targetPath: string, options?: any): Promise<any> {
    return await this.fileCleaner.cleanupExpiredFiles(targetPath, options);
  }

  // 新增：清理临时文件
  async cleanupTempFiles(basePaths: string[], options?: any): Promise<any> {
    return await this.fileCleaner.cleanupTempFiles(basePaths, options);
  }

  // 新增：清理空目录
  async cleanupEmptyDirectories(rootPath: string, options?: any): Promise<any> {
    return await this.fileCleaner.cleanupEmptyDirectories(rootPath, options);
  }

  // 复制文件
  async copyFile(srcPath: string, destPath: string): Promise<boolean> {
    try {
      const content = await this.readFile(srcPath);
      if (content !== null) {
        return await this.writeFile(destPath, content);
      }
      return false;
    } catch (error) {
      this.eventBus.emit('fileUtils:error', { operation: 'copyFile', srcPath, destPath, error });
      return false;
    }
  }

  // 移动文件
  async moveFile(srcPath: string, destPath: string): Promise<boolean> {
    try {
      await fs.rename(srcPath, destPath);
      this.eventBus.emit('fileUtils:moved', { srcPath, destPath });
      return true;
    } catch (error) {
      this.eventBus.emit('fileUtils:error', { operation: 'moveFile', srcPath, destPath, error });
      return false;
    }
  }

  // 获取文件MIME类型
  getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.htm': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.wxml': 'application/xml', // 微信小程序
      '.wxss': 'text/css',      // 微信小程序样式
      '.ts': 'application/typescript',
      '.tsx': 'application/typescript',
      '.jsx': 'application/javascript',
      '.md': 'text/markdown',
      '.txt': 'text/plain',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  // 验证文件路径
  validatePath(filePath: string): { valid: boolean; error?: string } {
    try {
      // 检查路径长度
      if (filePath.length > 260) {
        return { valid: false, error: 'Path too long (max 260 characters)' };
      }

      // 检查非法字符
      const invalidChars = /[<>:"|?*]/;
      if (invalidChars.test(filePath)) {
        return { valid: false, error: 'Path contains invalid characters' };
      }

      // 尝试解析路径
      path.parse(filePath);

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `Invalid path: ${error}` };
    }
  }
}