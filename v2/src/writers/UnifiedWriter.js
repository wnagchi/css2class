class UnifiedWriter {
  constructor(eventBus, configManager, dynamicClassGenerator) {
    this.eventBus = eventBus;
    this.configManager = configManager;
    this.dynamicClassGenerator = dynamicClassGenerator;
    this.writeTimer = null;
    this.debounceDelay = 300;
    this.pendingWrites = new Set();
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
      delay: this.debounceDelay
    });

    // 设置新的定时器
    this.writeTimer = setTimeout(async () => {
      try {
        await this.executeWrite(fullScanManager, fileWriter);
      } catch (error) {
        this.eventBus.emit('unifiedWriter:error', {
          error: error.message,
          pendingWrites: Array.from(this.pendingWrites)
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
      pendingFiles: Array.from(this.pendingWrites)
    });

    // 等待全量数据锁定
    const isLocked = await fullScanManager.waitForDataLock();
    
    if (!isLocked) {
      this.eventBus.emit('unifiedWriter:warning', {
        message: 'Full scan data not locked, using available data'
      });
    }

    // 获取合并后的完整数据
    const mergedData = fullScanManager.getMergedData();
    
    this.eventBus.emit('unifiedWriter:dataReady', {
      classCount: mergedData.classListSet.size,
      staticClassCount: mergedData.userStaticClassListSet.size,
      fileCount: mergedData.fileCount,
      isLocked: mergedData.isLocked
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
      fileName: outputConfig.fileName
    });

    this.eventBus.emit('unifiedWriter:completed', {
      cssLength: cssContent.length,
      classCount: mergedData.classListSet.size,
      staticClassCount: mergedData.userStaticClassListSet.size,
      processedFiles: Array.from(this.pendingWrites)
    });
  }

  // 生成完整CSS内容
  async generateUnifiedCSS(classListSet, userStaticClassListSet) {
    try {
      this.eventBus.emit('unifiedWriter:cssGeneration:started', {
        classCount: classListSet.size,
        staticClassCount: userStaticClassListSet.size
      });

      // 清空防重复写入缓存（类似原始代码中的 cssWrite.clear()）
      this.clearGenerationCache();

      // 生成动态CSS
      const dynamicResult = this.dynamicClassGenerator.getClassList(Array.from(classListSet));
      
      // 生成用户基础类CSS
      const userBaseResult = this.dynamicClassGenerator.createUserBaseClassList(dynamicResult.userBaseClassArr);
      
      // 生成静态类CSS
      const staticResult = await this.generateStaticCSS(Array.from(userStaticClassListSet));

      // 合并所有CSS内容
      const cssContent = [
        dynamicResult.cssStr,
        staticResult,
        userBaseResult
      ].filter(Boolean).join('\n');

      this.eventBus.emit('unifiedWriter:cssGeneration:completed', {
        dynamicCssLength: dynamicResult.cssStr.length,
        staticCssLength: staticResult.length,
        userBaseCssLength: userBaseResult.length,
        totalCssLength: cssContent.length
      });

      return cssContent;

    } catch (error) {
      this.eventBus.emit('unifiedWriter:cssGeneration:error', {
        error: error.message
      });
      throw error;
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
        classCount: userStaticClassArr.length
      });

      userStaticClassArr.forEach((className) => {
        if (cssWrite.has(className)) {
          return; // 跳过重复的类
        }

        const staticClassItem = userStaticClass.find(([k, v]) => k === className);
        
        if (staticClassItem !== undefined) {
          cssWrite.add(className);
          const cssClassName = className.replaceAll('_', '-');
          str += `\n.${cssClassName} {\n  ${staticClassItem[1]}\n}\n`;
        }
      });

      this.eventBus.emit('unifiedWriter:staticGeneration:completed', {
        generatedCount: cssWrite.size,
        cssLength: str.length
      });

      return str;

    } catch (error) {
      this.eventBus.emit('unifiedWriter:staticGeneration:error', {
        error: error.message
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
      cancelledCount
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
      debounceDelay: this.debounceDelay
    };
  }

  // 设置防抖延迟
  setDebounceDelay(delay) {
    this.debounceDelay = Math.max(100, Math.min(5000, delay)); // 限制在100ms-5s之间
    this.eventBus.emit('unifiedWriter:debounceDelayChanged', {
      newDelay: this.debounceDelay
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
      config: this.configManager.getMultiFile()?.output
    };
  }
}

module.exports = UnifiedWriter;