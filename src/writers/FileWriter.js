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
        const entryRoots = this.configManager.getMultiFileEntryPaths();
        const fileAbs = path.resolve(filePath);

        // 选择“最匹配”的根目录（最长前缀），以支持多目录入口
        let bestRootAbs = null;
        let bestRel = null;
        for (const root of entryRoots) {
          const rootAbs = path.resolve(root);
          const rel = path.relative(rootAbs, fileAbs);
          const isInside = rel && !rel.startsWith('..') && !path.isAbsolute(rel);
          if (isInside && (!bestRootAbs || rootAbs.length > bestRootAbs.length)) {
            bestRootAbs = rootAbs;
            bestRel = rel;
          }
        }

        const relativePath = bestRel || path.basename(fileAbs);
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
  // 新实现：分区插入 baseDelta 和 mediaDelta 到对应 marker 区域
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

      const contentToAppend = cssContent.trim();
      if (!contentToAppend) {
        return {
          success: true,
          outputPath: outputPath,
          cssLength: 0,
        };
      }

      // 拆分 delta CSS 为 base 和 media
      const CssFormatter = require('../utils/CssFormatter');
      const cssFormat = this.configManager.getCssFormat();
      const cssFormatter = new CssFormatter(cssFormat);
      const { baseCss: baseDelta, mediaCss: mediaDelta, otherAtRulesPrefix: deltaPrefix } =
        cssFormatter.splitBaseAndMedia(contentToAppend);

      // 读取现有文件内容
      let existingContent = '';
      try {
        existingContent = await fs.readFile(outputPath, 'utf-8');
      } catch (error) {
        // 文件不存在，使用分区插入写入新文件
        if (error.code === 'ENOENT') {
          return await this.writeBaseWithDeltaMarker(contentToAppend, filePath, options);
        }
        throw error;
      }

      // 检查是否存在分区 marker
      const baseStartMarker = '/* CLASS2CSS:BASE_START */';
      const baseEndMarker = '/* CLASS2CSS:BASE_END */';
      const mediaStartMarker = '/* CLASS2CSS:MEDIA_START */';
      const mediaEndMarker = '/* CLASS2CSS:MEDIA_END */';
      const deltaStartMarker = '/* CLASS2CSS:DELTA_START */';

      const hasPartitionMarkers =
        existingContent.includes(baseStartMarker) &&
        existingContent.includes(baseEndMarker) &&
        existingContent.includes(mediaStartMarker) &&
        existingContent.includes(mediaEndMarker);

      if (!hasPartitionMarkers) {
        // 回退策略：旧文件格式，先做一次全文件 normalize 并写入分区结构
        this.eventBus.emit('file:css:append:fallback', {
          message: 'Output file lacks partition markers, normalizing and rewriting',
          outputPath,
        });

        // 合并旧内容和新内容，做 normalize
        const mergedContent = existingContent + '\n' + contentToAppend;
        const normalizedContent = cssFormatter.normalizeResponsiveOrder(mergedContent);
        const { baseCss, mediaCss, otherAtRulesPrefix, suffix } =
          cssFormatter.splitBaseAndMedia(normalizedContent);

        const baseStartMarkerLine = '/* CLASS2CSS:BASE_START */\n';
        const baseEndMarkerLine = '\n/* CLASS2CSS:BASE_END */\n';
        const mediaStartMarkerLine = '/* CLASS2CSS:MEDIA_START */\n';
        const mediaEndMarkerLine = '\n/* CLASS2CSS:MEDIA_END */\n';
        const deltaStartMarkerLine = '\n/* CLASS2CSS:DELTA_START */\n';

        const rewrittenContent =
          otherAtRulesPrefix +
          baseStartMarkerLine +
          baseCss.trim() +
          baseEndMarkerLine +
          mediaStartMarkerLine +
          mediaCss.trim() +
          mediaEndMarkerLine +
          deltaStartMarkerLine +
          (suffix ? '\n' + suffix.trim() : '');

        await this.fileUtils.writeFile(outputPath, rewrittenContent, 'utf-8');

        this.eventBus.emit('file:css:appended', {
          sourceFile: filePath,
          outputFile: outputPath,
          cssLength: cssContent.length,
        });

        return {
          success: true,
          outputPath: outputPath,
          cssLength: cssContent.length,
        };
      }

      // 分区插入：找到 marker 位置并插入对应内容
      let newContent = existingContent;

      // 插入 baseDelta 到 BASE_END 之前
      if (baseDelta.trim()) {
        const baseEndIdx = newContent.indexOf(baseEndMarker);
        if (baseEndIdx !== -1) {
          const beforeBaseEnd = newContent.slice(0, baseEndIdx);
          const afterBaseEnd = newContent.slice(baseEndIdx);
          // 如果 base 区域不为空，添加换行分隔
          const separator = beforeBaseEnd.trim().endsWith('}') ? '\n' : '';
          newContent = beforeBaseEnd + separator + baseDelta.trim() + '\n' + afterBaseEnd;
        }
      }

      // 插入 mediaDelta 到 MEDIA_END 之前
      if (mediaDelta.trim()) {
        const mediaEndIdx = newContent.indexOf(mediaEndMarker);
        if (mediaEndIdx !== -1) {
          const beforeMediaEnd = newContent.slice(0, mediaEndIdx);
          const afterMediaEnd = newContent.slice(mediaEndIdx);
          // 如果 media 区域不为空，添加换行分隔
          const separator = beforeMediaEnd.trim().endsWith('}') ? '\n' : '';
          newContent = beforeMediaEnd + separator + mediaDelta.trim() + '\n' + afterMediaEnd;
        }
      }

      // 插入 deltaPrefix（其他 at-rules）到 BASE_START 之前（如果有）
      if (deltaPrefix.trim()) {
        const baseStartIdx = newContent.indexOf(baseStartMarker);
        if (baseStartIdx !== -1) {
          const beforeBaseStart = newContent.slice(0, baseStartIdx);
          const afterBaseStart = newContent.slice(baseStartIdx);
          newContent = beforeBaseStart + deltaPrefix.trim() + '\n' + afterBaseStart;
        }
      }

      // 写回文件
      await this.fileUtils.writeFile(outputPath, newContent, 'utf-8');

      this.eventBus.emit('file:css:appended', {
        sourceFile: filePath,
        outputFile: outputPath,
        cssLength: cssContent.length,
      });

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

      // 拆分 CSS 为 base 和 media 两部分（用于分区写入）
      // 注意：baseCssContent 已经是格式化后的内容（由 generateUnifiedCSS 处理）
      const CssFormatter = require('../utils/CssFormatter');
      const cssFormat = this.configManager.getCssFormat();
      const cssFormatter = new CssFormatter(cssFormat);
      const { baseCss, mediaCss, otherAtRulesPrefix, suffix } = cssFormatter.splitBaseAndMedia(baseCssContent);

      // 构建分区标记结构
      // 注意：在 compressed 格式下，标记会被保留（compressCSS 已更新以保留这些标记）
      const baseStartMarker = '/* CLASS2CSS:BASE_START */\n';
      const baseEndMarker = '\n/* CLASS2CSS:BASE_END */\n';
      const mediaStartMarker = '/* CLASS2CSS:MEDIA_START */\n';
      const mediaEndMarker = '\n/* CLASS2CSS:MEDIA_END */\n';
      const deltaStartMarker = '\n/* CLASS2CSS:DELTA_START */\n';

      // 按固定顺序写入：prefix -> BASE -> MEDIA -> DELTA（初始为空）
      const fullContent =
        (otherAtRulesPrefix ? otherAtRulesPrefix + '\n' : '') +
        baseStartMarker +
        baseCss.trim() +
        baseEndMarker +
        mediaStartMarker +
        mediaCss.trim() +
        mediaEndMarker +
        deltaStartMarker +
        (suffix ? '\n' + suffix.trim() : '');

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
