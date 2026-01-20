const UnitProcessor = require('../utils/UnitProcessor');

class ClassParser {
  constructor(eventBus, regexCompiler, importantParser, userStaticClassSet, configManager) {
    this.eventBus = eventBus;
    this.regexCompiler = regexCompiler;
    this.importantParser = importantParser;
    this.userStaticClassSet = userStaticClassSet;
    this.configManager = configManager;

    // 初始化单位处理器
    if (this.configManager) {
      this.unitProcessor = new UnitProcessor(this.configManager.getConfig());
    }
  }

  // 优化的类名解析方法
  parseClassOptimized(htmlStr) {
    if (!htmlStr || typeof htmlStr !== 'string') {
      this.eventBus.emit('parser:error', { error: 'Invalid HTML string provided' });
      return { classArr: [], userStaticClassArr: [] };
    }

    const classList = new Set();
    const userStaticList = new Set();
    const compiledRegex = this.regexCompiler.getCompiledRegex();

    if (!compiledRegex) {
      this.eventBus.emit('parser:error', { error: 'Regex not compiled' });
      return { classArr: [], userStaticClassArr: [] };
    }

    try {
      let match;
      const classAttrRegex = new RegExp(
        compiledRegex.classAttr.source,
        compiledRegex.classAttr.flags
      );

      while ((match = classAttrRegex.exec(htmlStr)) !== null) {
        const classStr = match[1].slice(1, -1); // 移除引号
        const classes = classStr.split(/\s+/).filter(Boolean);

        for (const className of classes) {
          const cleanName = this.importantParser.cleanImportantFlag(className);

          // 提取 base class（处理响应式前缀如 sm:, md: 等）
          // 按 : 拆分，取最后一段作为 base class
          const baseClass = this.extractBaseClass(cleanName);

          // 智能类名预处理和验证（使用 base class 进行分析）
          const processedClass = this.preprocessClassName(className, cleanName);

          const isStaticHit = this.userStaticClassSet.has(baseClass);
          // 如果命中静态类定义，则不再把它当成动态类候选，避免同一 selector 重复生成两份规则
          const isDynamicCandidate = baseClass.includes('-') && !isStaticHit;

          // 先检查是否是静态类（使用 base class 检查）
          if (isStaticHit) {
            userStaticList.add(processedClass.original); // 保存原始 class 名（如 sm:flex）
            this.eventBus.emit('parser:static:found', {
              className: processedClass.original,
              cleanName,
              baseClass,
              processed: processedClass,
            });
          }

          // 再检查是否是动态类（使用 base class 检查）
          if (isDynamicCandidate) {
            classList.add(processedClass.original); // 保存原始 class 名（如 sm:w-100）
            this.eventBus.emit('parser:dynamic:found', {
              className: processedClass.original,
              cleanName,
              baseClass,
              processed: processedClass,
            });
          }
        }
      }

      const result = {
        userStaticClassArr: Array.from(userStaticList),
        classArr: Array.from(classList),
      };

      this.eventBus.emit('parser:completed', {
        staticCount: result.userStaticClassArr.length,
        dynamicCount: result.classArr.length,
        totalCount: result.userStaticClassArr.length + result.classArr.length,
      });

      return result;
    } catch (error) {
      this.eventBus.emit('parser:error', { error: error.message });
      return { classArr: [], userStaticClassArr: [] };
    }
  }

  // 提取 base class（去除响应式前缀等变体前缀）
  extractBaseClass(className) {
    if (!className || typeof className !== 'string') {
      return className;
    }

    // 按 : 拆分，取最后一段作为 base class
    // 例如: "sm:w-100" -> "w-100", "md:flex" -> "flex"
    const parts = className.split(':');
    return parts[parts.length - 1];
  }

  // 智能类名预处理
  preprocessClassName(originalClassName, cleanName) {
    const processed = {
      original: originalClassName,
      clean: cleanName,
      hasImportant: originalClassName !== cleanName,
      isValid: true,
      warnings: [],
      suggestions: [],
    };

    // 如果有单位处理器，进行智能分析
    if (this.unitProcessor && cleanName.includes('-')) {
      const parts = cleanName.split('-');
      if (parts.length >= 2) {
        const property = parts[0];
        const value = parts.slice(1).join('-');

        // 检查是否是已知的CSS属性
        if (this.isKnownCSSProperty(property)) {
          processed.property = property;
          processed.value = value;
          processed.cssProperty = this.getCSSPropertyMapping(property);

          // 单位验证和建议
          const unitAnalysis = this.analyzeUnit(property, value);
          processed.unitAnalysis = unitAnalysis;

          if (unitAnalysis.warnings.length > 0) {
            processed.warnings.push(...unitAnalysis.warnings);
          }

          if (unitAnalysis.suggestions.length > 0) {
            processed.suggestions.push(...unitAnalysis.suggestions);
          }
        }
      }
    }

    return processed;
  }

  // 检查是否是已知的CSS属性
  isKnownCSSProperty(property) {
    const knownProperties = [
      'm',
      'mt',
      'mr',
      'mb',
      'ml',
      'mx',
      'my',
      'p',
      'pt',
      'pr',
      'pb',
      'pl',
      'px',
      'py',
      'w',
      'h',
      'max-w',
      'max-h',
      'min-w',
      'min-h',
      'text',
      'font',
      'leading',
      'tracking',
      'spacing',
      'top',
      'right',
      'bottom',
      'left',
      'inset',
      'rounded',
      'border',
      'bordert',
      'borderr',
      'borderb',
      'borderl',
      'opacity',
      'op',
      'transition',
      'gap',
      'size',
      'b_r',
    ];

    return knownProperties.includes(property);
  }

  // 获取CSS属性映射
  getCSSPropertyMapping(property) {
    const mappings = {
      m: 'margin',
      mt: 'margin-top',
      mr: 'margin-right',
      mb: 'margin-bottom',
      ml: 'margin-left',
      p: 'padding',
      pt: 'padding-top',
      pr: 'padding-right',
      pb: 'padding-bottom',
      pl: 'padding-left',
      w: 'width',
      h: 'height',
      'max-w': 'max-width',
      'max-h': 'max-height',
      'min-w': 'min-width',
      'min-h': 'min-height',
      text: 'font-size',
      font: 'font-weight',
      leading: 'line-height',
      tracking: 'letter-spacing',
      top: 'top',
      right: 'right',
      bottom: 'bottom',
      left: 'left',
      rounded: 'border-radius',
      border: 'border-width',
      opacity: 'opacity',
      gap: 'gap',
    };

    return mappings[property] || property;
  }

  // 分析单位使用
  analyzeUnit(property, value) {
    const analysis = {
      warnings: [],
      suggestions: [],
      recommendedUnit: null,
      detectedUnit: null,
    };

    if (!this.unitProcessor) {
      return analysis;
    }

    // 检测当前单位
    const detectedUnit = this.unitProcessor.extractUnit(value);
    analysis.detectedUnit = detectedUnit;

    // 获取推荐单位
    const cssProperty = this.getCSSPropertyMapping(property);
    const recommendedUnit = this.unitProcessor.getPropertyUnit(cssProperty);
    analysis.recommendedUnit = recommendedUnit;

    // 单位一致性检查
    if (detectedUnit && recommendedUnit && detectedUnit !== recommendedUnit) {
      analysis.warnings.push(`单位不一致: 使用了${detectedUnit}，建议使用${recommendedUnit}`);
      analysis.suggestions.push(
        `考虑使用 ${property}-${value.replace(detectedUnit, '')}${recommendedUnit ? recommendedUnit : ''}`
      );
    }

    // 无单位值检查
    if (!detectedUnit && recommendedUnit) {
      const numericValue = this.unitProcessor.extractNumericValue(value);
      if (numericValue !== null) {
        analysis.suggestions.push(`建议明确单位: ${property}-${value}${recommendedUnit}`);
      }
    }

    return analysis;
  }

  // 向后兼容的解析方法
  parseClass(htmlStr) {
    const result = this.parseClassOptimized(htmlStr);

    // 去重并排序
    const uniqueStaticClasses = [...new Set(result.userStaticClassArr)].sort();
    const uniqueDynamicClasses = [...new Set(result.classArr)].sort();

    this.eventBus.emit('parser:log', {
      classArr: uniqueDynamicClasses,
      userStaticClassArr: uniqueStaticClasses,
    });

    return {
      userStaticClassArr: uniqueStaticClasses,
      classArr: uniqueDynamicClasses,
    };
  }

  // 批量解析多个文件
  async batchParseFiles(files, cacheManager) {
    const results = [];
    const totalFiles = files.length;

    this.eventBus.emit('parser:batch:started', { totalFiles });

    for (let i = 0; i < files.length; i++) {
      const filePath = files[i];
      try {
        const html = await cacheManager.getFileContent(filePath);
        if (html) {
          const classInfo = this.parseClassOptimized(html);
          results.push({
            filePath,
            success: true,
            classInfo,
            staticCount: classInfo.userStaticClassArr.length,
            dynamicCount: classInfo.classArr.length,
          });
        } else {
          results.push({
            filePath,
            success: false,
            error: 'Failed to read file content',
          });
        }
      } catch (error) {
        results.push({
          filePath,
          success: false,
          error: error.message,
        });
      }

      // 进度报告
      if ((i + 1) % 10 === 0 || i === files.length - 1) {
        this.eventBus.emit('parser:batch:progress', {
          processed: i + 1,
          total: totalFiles,
          percentage: Math.round(((i + 1) / totalFiles) * 100),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const totalStaticClasses = results
      .filter((r) => r.success)
      .reduce((sum, r) => sum + r.staticCount, 0);
    const totalDynamicClasses = results
      .filter((r) => r.success)
      .reduce((sum, r) => sum + r.dynamicCount, 0);

    this.eventBus.emit('parser:batch:completed', {
      totalFiles,
      successCount,
      failedCount: totalFiles - successCount,
      totalStaticClasses,
      totalDynamicClasses,
      results,
    });

    return results;
  }

  // 解析单个文件
  async parseFile(filePath, cacheManager) {
    try {
      const html = await cacheManager.getFileContent(filePath);
      if (!html) {
        this.eventBus.emit('parser:file:error', { filePath, error: 'Empty file content' });
        return null;
      }

      const classInfo = this.parseClassOptimized(html);

      this.eventBus.emit('parser:file:completed', {
        filePath,
        staticCount: classInfo.userStaticClassArr.length,
        dynamicCount: classInfo.classArr.length,
      });

      return classInfo;
    } catch (error) {
      this.eventBus.emit('parser:file:error', { filePath, error: error.message });
      return null;
    }
  }

  // 验证解析结果
  validateParseResult(result) {
    const errors = [];
    const warnings = [];

    if (!result) {
      errors.push('Parse result is null or undefined');
      return { errors, warnings, isValid: false };
    }

    if (!Array.isArray(result.classArr)) {
      errors.push('classArr must be an array');
    }

    if (!Array.isArray(result.userStaticClassArr)) {
      errors.push('userStaticClassArr must be an array');
    }

    // 检查重复的类名
    const allClasses = [...result.classArr, ...result.userStaticClassArr];
    const duplicates = allClasses.filter(
      (className, index) => allClasses.indexOf(className) !== index
    );

    if (duplicates.length > 0) {
      warnings.push(`Duplicate class names found: ${duplicates.join(', ')}`);
    }

    // 检查无效的类名
    const invalidClasses = allClasses.filter((className) => {
      return !className || typeof className !== 'string' || className.trim().length === 0;
    });

    if (invalidClasses.length > 0) {
      errors.push(`Invalid class names found: ${invalidClasses.join(', ')}`);
    }

    return { errors, warnings, isValid: errors.length === 0 };
  }

  // 更新配置（用于配置热更新）
  updateConfig(newConfigManager) {
    if (newConfigManager && newConfigManager !== this.configManager) {
      this.configManager = newConfigManager;

      // 重新初始化单位处理器
      this.unitProcessor = new UnitProcessor(this.configManager.getConfig());

      this.eventBus.emit('parser:config:updated', {
        timestamp: Date.now(),
        hasUnitProcessor: !!this.unitProcessor,
      });
    }
  }

  // 更新静态类集合
  updateUserStaticClassSet(newUserStaticClassSet) {
    if (newUserStaticClassSet && newUserStaticClassSet !== this.userStaticClassSet) {
      const oldSize = this.userStaticClassSet.size;
      this.userStaticClassSet = newUserStaticClassSet;
      const newSize = this.userStaticClassSet.size;

      this.eventBus.emit('parser:static:updated', {
        oldSize,
        newSize,
        delta: newSize - oldSize,
      });
    }
  }

  // 获取增强的解析统计
  getParseStats() {
    const baseStats = {
      userStaticClassSetSize: this.userStaticClassSet.size,
      regexCompilerReady: !!this.regexCompiler.getCompiledRegex(),
      importantParserReady: !!this.importantParser,
      unitProcessorReady: !!this.unitProcessor,
      configManagerReady: !!this.configManager,
    };

    // 如果有单位处理器，添加单位处理统计
    if (this.unitProcessor) {
      const unitConfig = this.unitProcessor.getConfig();
      baseStats.unitProcessor = {
        baseUnit: unitConfig.baseUnit,
        unitConversion: unitConfig.unitConversion,
        supportedProperties: Object.keys(unitConfig.propertyUnits).length,
        unitlessProperties: unitConfig.unitlessProperties.length,
      };
    }

    return baseStats;
  }

  // 获取类名建议
  getClassNameSuggestions(partialClassName) {
    const suggestions = [];

    if (!partialClassName || typeof partialClassName !== 'string') {
      return suggestions;
    }

    const partial = partialClassName.toLowerCase();

    // 从静态类中搜索
    for (const staticClass of this.userStaticClassSet) {
      if (staticClass.toLowerCase().includes(partial)) {
        suggestions.push({
          type: 'static',
          className: staticClass,
          description: 'Static utility class',
        });
      }
    }

    // 如果是动态类的开始，提供属性建议
    if (partial.includes('-')) {
      const parts = partial.split('-');
      const property = parts[0];

      if (this.isKnownCSSProperty(property)) {
        const cssProperty = this.getCSSPropertyMapping(property);
        const recommendedUnit = this.unitProcessor?.getPropertyUnit(cssProperty);

        suggestions.push({
          type: 'dynamic',
          property,
          cssProperty,
          recommendedUnit,
          examples: this.generateExamples(property, recommendedUnit),
        });
      }
    }

    return suggestions.slice(0, 10); // 限制建议数量
  }

  // 生成使用示例
  generateExamples(property, unit) {
    const examples = [];
    const baseValues = ['4', '8', '12', '16', '20'];

    baseValues.forEach((value) => {
      examples.push(`${property}-${value}${unit || ''}`);
    });

    return examples;
  }

  // 性能分析
  analyzePerformance(htmlStr) {
    const startTime = process.hrtime.bigint();

    const result = this.parseClassOptimized(htmlStr);

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // 转换为毫秒

    return {
      result,
      performance: {
        duration,
        classesPerMs: (result.classArr.length + result.userStaticClassArr.length) / duration,
        htmlSize: htmlStr.length,
        classesFound: result.classArr.length + result.userStaticClassArr.length,
      },
    };
  }

  // 调试解析过程
  debugParse(htmlStr, maxLength = 1000) {
    const truncatedHtml =
      htmlStr.length > maxLength ? htmlStr.substring(0, maxLength) + '...' : htmlStr;

    const result = this.parseClassOptimized(htmlStr);
    const validation = this.validateParseResult(result);

    return {
      inputLength: htmlStr.length,
      truncatedInput: truncatedHtml,
      result,
      validation,
      stats: this.getParseStats(),
    };
  }
}

module.exports = ClassParser;
