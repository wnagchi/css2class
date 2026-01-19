const path = require('path');
const fs = require('fs').promises;

class FileWriter {
  constructor(eventBus, configManager, fileUtils) {
    this.eventBus = eventBus;
    this.configManager = configManager;
    this.fileUtils = fileUtils;
    this.writeQueue = [];
    this.isWriting = false;
  }

  // 写入CSS到文件
  async writeCSS(cssContent, filePath, options = {}) {
    try {
      const multiFile = this.configManager.getMultiFile();
      if (!multiFile) {
        throw new Error('MultiFile configuration is required for CSS writing');
      }

      const outputConfig = multiFile.output;
      const cssOutType = outputConfig.cssOutType || 'filePath';

      let outputPath;
      let fileName;

      // 强制统一文件模式（由UnifiedWriter调用时）
      if (options.forceUniFile || cssOutType === 'uniFile') {
        const outputDir = options.outputPath || outputConfig.path || './';
        fileName = options.fileName || outputConfig.fileName || 'common.wxss';
        outputPath = path.join(outputDir, fileName);

        this.eventBus.emit('fileWriter:uniFileMode', {
          outputPath,
          fileName,
          cssLength: cssContent.length,
        });
      } else if (cssOutType === 'filePath') {
        // 将CSS文件输出到监听文件对应的目录下
        const relativePath = path.relative(multiFile.entry.path, filePath);
        const dirPath = path.dirname(relativePath);
        const baseName = path.basename(filePath, path.extname(filePath));

        // 构建输出路径
        const outputDir = outputConfig.path || path.dirname(filePath);
        const outputDirPath = path.join(outputDir, dirPath);
        fileName = `${baseName}.${outputConfig.fileType || 'wxss'}`;
        outputPath = path.join(outputDirPath, fileName);

        this.eventBus.emit('fileWriter:filePathMode', {
          sourceFile: filePath,
          outputPath,
          fileName,
        });
      }

      // 确保输出目录存在
      await this.ensureDirectoryExists(path.dirname(outputPath));

      // 写入文件
      await this.fileUtils.writeFile(outputPath, cssContent, 'utf-8');

      this.eventBus.emit('file:css:written', {
        sourceFile: filePath,
        outputFile: outputPath,
        cssLength: cssContent.length,
      });

      return {
        success: true,
        outputPath: outputPath,
        fileName: fileName,
        cssLength: cssContent.length,
      };
    } catch (error) {
      this.eventBus.emit('file:css:write:error', {
        sourceFile: filePath,
        error: error.message,
      });
      throw error;
    }
  }

  // 批量写入CSS
  async writeBatchCSS(cssMap) {
    const results = [];

    for (const [filePath, cssContent] of Object.entries(cssMap)) {
      try {
        const result = await this.writeCSS(cssContent, filePath);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          sourceFile: filePath,
          error: error.message,
        });
      }
    }

    this.eventBus.emit('file:css:batch:written', {
      totalFiles: cssMap.length,
      successCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success).length,
      results: results,
    });

    return results;
  }

  // 确保目录存在
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch (error) {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  // 获取写入统计信息
  getWriteStats() {
    return {
      isWriting: this.isWriting,
      queueLength: this.writeQueue.length,
    };
  }

  // 清理输出目录
  async cleanOutputDirectory() {
    try {
      const multiFile = this.configManager.getMultiFile();
      if (!multiFile || !multiFile.output || !multiFile.output.path) {
        return;
      }

      const outputPath = path.resolve(multiFile.output.path);

      // 检查目录是否存在
      try {
        await fs.access(outputPath);
      } catch (error) {
        // 目录不存在，无需清理
        return;
      }

      // 读取目录内容
      const files = await fs.readdir(outputPath);

      // 删除所有.wxss文件
      for (const file of files) {
        if (file.endsWith('.wxss')) {
          const filePath = path.join(outputPath, file);
          await fs.unlink(filePath);
        }
      }

      this.eventBus.emit('file:output:cleaned', { outputPath });
    } catch (error) {
      this.eventBus.emit('file:output:clean:error', { error: error.message });
    }
  }

  // 追加CSS到文件末尾（用于 appendDelta 模式）
  async appendCSS(cssContent, filePath, options = {}) {
    try {
      const multiFile = this.configManager.getMultiFile();
      if (!multiFile) {
        throw new Error('MultiFile configuration is required for CSS writing');
      }

      const outputConfig = multiFile.output;
      const cssOutType = outputConfig.cssOutType || 'filePath';

      let outputPath;

      // 强制统一文件模式（由UnifiedWriter调用时）
      if (options.forceUniFile || cssOutType === 'uniFile') {
        const outputDir = options.outputPath || outputConfig.path || './';
        const fileName = options.fileName || outputConfig.fileName || 'common.wxss';
        outputPath = path.join(outputDir, fileName);
      } else {
        throw new Error('appendCSS is only supported for uniFile mode');
      }

      // 确保输出目录存在
      await this.ensureDirectoryExists(path.dirname(outputPath));

      // 追加内容到文件末尾（确保前后有换行，避免粘连）
      const contentToAppend = cssContent.trim();
      if (contentToAppend) {
        const appendContent = '\n' + contentToAppend + '\n';
        await fs.appendFile(outputPath, appendContent, 'utf-8');

        this.eventBus.emit('file:css:appended', {
          sourceFile: filePath,
          outputFile: outputPath,
          cssLength: cssContent.length,
        });
      }

      return {
        success: true,
        outputPath: outputPath,
        cssLength: cssContent.length,
      };
    } catch (error) {
      this.eventBus.emit('file:css:append:error', {
        sourceFile: filePath,
        error: error.message,
      });
      throw error;
    }
  }

  // 写入BASE区块并添加DELTA_START标记（用于 appendDelta 模式的启动重建）
  async writeBaseWithDeltaMarker(baseCssContent, filePath, options = {}) {
    try {
      const multiFile = this.configManager.getMultiFile();
      if (!multiFile) {
        throw new Error('MultiFile configuration is required for CSS writing');
      }

      const outputConfig = multiFile.output;
      const cssOutType = outputConfig.cssOutType || 'filePath';

      let outputPath;
      let fileName;

      // 强制统一文件模式
      if (options.forceUniFile || cssOutType === 'uniFile') {
        const outputDir = options.outputPath || outputConfig.path || './';
        fileName = options.fileName || outputConfig.fileName || 'common.wxss';
        outputPath = path.join(outputDir, fileName);
      } else {
        throw new Error('writeBaseWithDeltaMarker is only supported for uniFile mode');
      }

      // 确保输出目录存在
      await this.ensureDirectoryExists(path.dirname(outputPath));

      // 构建包含BASE标记和DELTA_START标记的内容
      const baseMarker = '/* CLASS2CSS:BASE */\n';
      const deltaMarker = '\n/* CLASS2CSS:DELTA_START */\n';
      const fullContent = baseMarker + baseCssContent.trim() + deltaMarker;

      // 覆盖写入文件（清空旧内容）
      await this.fileUtils.writeFile(outputPath, fullContent, 'utf-8');

      this.eventBus.emit('file:css:baseWritten', {
        sourceFile: filePath,
        outputFile: outputPath,
        cssLength: baseCssContent.length,
      });

      return {
        success: true,
        outputPath: outputPath,
        fileName: fileName,
        cssLength: baseCssContent.length,
      };
    } catch (error) {
      this.eventBus.emit('file:css:baseWrite:error', {
        sourceFile: filePath,
        error: error.message,
      });
      throw error;
    }
  }

  // 获取输出配置信息
  getOutputConfig() {
    const multiFile = this.configManager.getMultiFile();
    if (!multiFile || !multiFile.output) {
      return null;
    }

    return {
      cssOutType: multiFile.output.cssOutType || 'filePath',
      outputPath: multiFile.output.path,
      fileName: multiFile.output.fileName,
      fileType: multiFile.output.fileType || 'wxss',
    };
  }
}

module.exports = FileWriter;
