class UnifiedWriter {
  constructor(eventBus, configManager, dynamicClassGenerator) {
    this.eventBus = eventBus;
    this.configManager = configManager;
    this.dynamicClassGenerator = dynamicClassGenerator;
    this.writeTimer = null;
    this.debounceDelay = 300;
    this.pendingWrites = new Set();

    // 初始化CSS格式化器
    const CssFormatter = require('../utils/CssFormatter');
    const cssFormat = this.configManager.getCssFormat();
    this.cssFormatter = new CssFormatter(cssFormat);
  }

  // 防抖写入统一文件
  debouncedWrite(fullScanManager, fileWriter, triggerFile = null) {
    // 清除现有的定时器
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
    }

    // 记录触发文件
    if (triggerFile) {
      this.pendingWrites.add(triggerFile);
    }

    this.eventBus.emit('unifiedWriter:debounced', {
      triggerFile,
      pendingCount: this.pendingWrites.size,
      delay: this.debounceDelay,
    });

    // 设置新的定时器
    this.writeTimer = setTimeout(async () => {
      try {
        await this.executeWrite(fullScanManager, fileWriter);
      } catch (error) {
        this.eventBus.emit('unifiedWriter:error', {
          error: error.message,
          pendingWrites: Array.from(this.pendingWrites),
        });
      } finally {
        this.pendingWrites.clear();
        this.writeTimer = null;
      }
    }, this.debounceDelay);
  }

  // 执行实际的写入操作
  async executeWrite(fullScanManager, fileWriter) {
    this.eventBus.emit('unifiedWriter:started', {
      pendingFiles: Array.from(this.pendingWrites),
    });

    // 等待全量数据锁定
    const isLocked = await fullScanManager.waitForDataLock();

    if (!isLocked) {
      this.eventBus.emit('unifiedWriter:warning', {
        message: 'Full scan data not locked, using available data',
      });
    }

    // 获取合并后的完整数据
    const mergedData = fullScanManager.getMergedData();

    this.eventBus.emit('unifiedWriter:dataReady', {
      classCount: mergedData.classListSet.size,
      staticClassCount: mergedData.userStaticClassListSet.size,
      fileCount: mergedData.fileCount,
      isLocked: mergedData.isLocked,
    });

    // 生成统一CSS内容
    const cssContent = await this.generateUnifiedCSS(
      mergedData.classListSet,
      mergedData.userStaticClassListSet
    );

    // 获取统一文件配置
    const multiFile = this.configManager.getMultiFile();
    const outputConfig = multiFile.output;
    const dummyFilePath = 'unified-output'; // 用于触发写入的虚拟文件路径

    // 写入统一文件
    await fileWriter.writeCSS(cssContent, dummyFilePath, {
      forceUniFile: true,
      outputPath: outputConfig.path,
      fileName: outputConfig.fileName,
    });

    this.eventBus.emit('unifiedWriter:completed', {
      cssLength: cssContent.length,
      classCount: mergedData.classListSet.size,
      staticClassCount: mergedData.userStaticClassListSet.size,
      processedFiles: Array.from(this.pendingWrites),
    });
  }

  // 生成完整CSS内容
  async generateUnifiedCSS(classListSet, userStaticClassListSet) {
    try {
      this.eventBus.emit('unifiedWriter:cssGeneration:started', {
        classCount: classListSet.size,
        staticClassCount: userStaticClassListSet.size,
      });

      // 清空防重复写入缓存（类似原始代码中的 cssWrite.clear()）
      this.clearGenerationCache();

      // 生成动态CSS
      const dynamicResult = this.dynamicClassGenerator.getClassList(Array.from(classListSet));

      // 生成用户基础类CSS
      const userBaseResult = this.dynamicClassGenerator.createUserBaseClassList(
        dynamicResult.userBaseClassArr
      );

      // 生成静态类CSS
      const staticResult = await this.generateStaticCSS(Array.from(userStaticClassListSet));

      // 获取共用CSS内容
      const commonCssContent = await this.configManager.getCommonCssContent();

      // 合并所有CSS内容（共用CSS前置）
      let cssContent = [commonCssContent, dynamicResult.cssStr, staticResult, userBaseResult]
        .filter(Boolean)
        .join('\n');

      // 如果启用了排序，对CSS规则进行字母排序（在格式化之前排序）
      const sortClasses = this.configManager.getSortClasses();
      if (sortClasses) {
        cssContent = this.cssFormatter.sortCSSRules(cssContent);
      }

      // 根据配置的格式对整个CSS进行格式化处理
      const cssFormat = this.configManager.getCssFormat();
      cssContent = this.cssFormatter.formatCSS(cssContent, cssFormat);

      this.eventBus.emit('unifiedWriter:cssGeneration:completed', {
        dynamicCssLength: dynamicResult.cssStr.length,
        staticCssLength: staticResult.length,
        userBaseCssLength: userBaseResult.length,
        totalCssLength: cssContent.length,
        cssFormat: cssFormat,
      });

      return cssContent;
    } catch (error) {
      this.eventBus.emit('unifiedWriter:cssGeneration:error', {
        error: error.message,
      });
      throw error;
    }
  }

  // 提取 base class（去除响应式前缀等变体前缀）
  extractBaseClass(className) {
    if (!className || typeof className !== 'string') {
      return className;
    }

    // 按 : 拆分，取最后一段作为 base class
    const parts = className.split(':');
    return parts[parts.length - 1];
  }

  // 解析响应式变体前缀（如 sm:, md: 等）
  parseResponsiveVariant(className) {
    if (!className || typeof className !== 'string') {
      return { variant: null, baseClass: className };
    }

    const variants = this.configManager.getVariants();
    const responsiveVariants = variants.responsive || [];

    // 按 : 拆分，检查第一部分是否是响应式变体
    const parts = className.split(':');
    if (parts.length >= 2) {
      const potentialVariant = parts[0];
      if (responsiveVariants.includes(potentialVariant)) {
        const baseClass = parts.slice(1).join(':');
        return { variant: potentialVariant, baseClass };
      }
    }

    return { variant: null, baseClass: className };
  }

  // 用 @media 查询包裹 CSS 规则
  wrapWithMediaQuery(cssRule, variant) {
    const breakpoints = this.configManager.getBreakpoints();
    const breakpoint = breakpoints[variant];

    if (!breakpoint) {
      this.eventBus.emit('unifiedWriter:warning', {
        warning: `Breakpoint not found for variant: ${variant}`,
      });
      return cssRule; // 如果没有找到断点，返回原始规则
    }

    const cssFormat = this.configManager.getCssFormat();
    const isCompressed = cssFormat === 'compressed';
    const isSingleLine = cssFormat === 'singleLine';

    if (isCompressed) {
      // 压缩格式：@media(min-width:640px){.sm\:flex{display:flex}}
      return `@media(min-width:${breakpoint}){${cssRule.trim()}}`;
    } else if (isSingleLine) {
      // 单行格式：@media (min-width: 640px) { .sm\:flex { display: flex; } }
      return `@media (min-width: ${breakpoint}) { ${cssRule.trim()} }\n`;
    } else {
      // 多行格式
      return `@media (min-width: ${breakpoint}) {\n${cssRule.trim()}\n}\n`;
    }
  }

  // 生成静态类CSS（模拟原始代码中的 creatStaticClass）
  async generateStaticCSS(userStaticClassArr) {
    if (!Array.isArray(userStaticClassArr) || userStaticClassArr.length === 0) {
      return '';
    }

    try {
      const userStaticClass = this.configManager.getUserStaticClass();
      const cssWrite = new Set(); // 防重复集合
      let str = '';

      this.eventBus.emit('unifiedWriter:staticGeneration:started', {
        classCount: userStaticClassArr.length,
      });

      userStaticClassArr.forEach((className) => {
        if (cssWrite.has(className)) {
          return; // 跳过重复的类
        }

        // 解析响应式变体
        const { variant, baseClass } = this.parseResponsiveVariant(className);

        // 使用 base class 查找静态类定义
        const staticClassItem = userStaticClass.find(([k, v]) => k === baseClass);

        if (staticClassItem !== undefined) {
          cssWrite.add(className);
          // 使用原始 class 名（包含响应式前缀）生成 CSS
          const cssClassName = className.replaceAll('_', '-');
          // 使用格式化器格式化CSS
          let cssRule = this.cssFormatter.formatRule(cssClassName, staticClassItem[1]);

          // 如果有响应式变体，用 @media 包裹
          if (variant) {
            cssRule = this.wrapWithMediaQuery(cssRule, variant);
          }

          str += cssRule;
        }
      });

      this.eventBus.emit('unifiedWriter:staticGeneration:completed', {
        generatedCount: cssWrite.size,
        cssLength: str.length,
      });

      return str;
    } catch (error) {
      this.eventBus.emit('unifiedWriter:staticGeneration:error', {
        error: error.message,
      });
      return '';
    }
  }

  // 清空生成缓存
  clearGenerationCache() {
    // 这里可以清空任何需要重置的生成缓存
    // 例如在动态生成器中的重复检查缓存
    this.eventBus.emit('unifiedWriter:cacheCleared');
  }

  // 取消待处理的写入
  cancelPendingWrites() {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }

    const cancelledCount = this.pendingWrites.size;
    this.pendingWrites.clear();

    this.eventBus.emit('unifiedWriter:cancelled', {
      cancelledCount,
    });
  }

  // 立即执行写入（跳过防抖）
  async immediateWrite(fullScanManager, fileWriter, triggerFile = null) {
    // 取消防抖定时器
    this.cancelPendingWrites();

    // 立即执行写入
    if (triggerFile) {
      this.pendingWrites.add(triggerFile);
    }

    await this.executeWrite(fullScanManager, fileWriter);
  }

  // 获取写入状态
  getWriteStats() {
    return {
      isWritePending: this.writeTimer !== null,
      pendingWriteCount: this.pendingWrites.size,
      pendingFiles: Array.from(this.pendingWrites),
      debounceDelay: this.debounceDelay,
    };
  }

  // 设置防抖延迟
  setDebounceDelay(delay) {
    this.debounceDelay = Math.max(100, Math.min(5000, delay)); // 限制在100ms-5s之间
    this.eventBus.emit('unifiedWriter:debounceDelayChanged', {
      newDelay: this.debounceDelay,
    });
  }

  // 验证统一写入配置
  validateConfig() {
    const errors = [];
    const warnings = [];

    const multiFile = this.configManager.getMultiFile();
    if (!multiFile) {
      errors.push('MultiFile configuration is required for unified writing');
      return { errors, warnings, isValid: false };
    }

    const outputConfig = multiFile.output;
    if (!outputConfig) {
      errors.push('Output configuration is required');
      return { errors, warnings, isValid: false };
    }

    if (outputConfig.cssOutType !== 'uniFile') {
      warnings.push(`CSS output type is '${outputConfig.cssOutType}', expected 'uniFile'`);
    }

    if (!outputConfig.path) {
      errors.push('Output path is required for unified file writing');
    }

    if (!outputConfig.fileName) {
      warnings.push('Output file name not specified, will use default');
    }

    return { errors, warnings, isValid: errors.length === 0 };
  }

  // 调试信息
  debug() {
    return {
      writeStats: this.getWriteStats(),
      configValidation: this.validateConfig(),
      config: this.configManager.getMultiFile()?.output,
    };
  }
}

module.exports = UnifiedWriter;
