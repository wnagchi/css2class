const UnitProcessor = require('../utils/UnitProcessor');
const CssFormatter = require('../utils/CssFormatter');

class DynamicClassGenerator {
  constructor(eventBus, configManager, importantParser) {
    this.eventBus = eventBus;
    this.configManager = configManager;
    this.importantParser = importantParser;

    // 初始化单位处理器
    this.unitProcessor = new UnitProcessor(this.configManager.getConfig());

    // 初始化CSS格式化器
    const cssFormat = this.configManager.getCssFormat();
    this.cssFormatter = new CssFormatter(cssFormat);

    // CSS生成缓存
    this.cssCache = new Map();
    this.cacheEnabled = true;
  }

  // 生成动态CSS类列表
  getClassList(classArr) {
    if (!Array.isArray(classArr)) {
      this.eventBus.emit('generator:error', { error: 'classArr must be an array' });
      return { cssStr: '', userBaseClassArr: [] };
    }

    const unitConversion = this.configManager.getUnitConversion();
    const cssNameMap = this.configManager.getCssNameMap();
    let cssStr = '';
    const userBaseClassArr = [];

    this.eventBus.emit('generator:dynamic:started', { classCount: classArr.length });

    classArr.forEach((className, index) => {
      try {
        const isImportant = this.importantParser.hasImportantFlag(className);
        const cleanClassName = this.importantParser.cleanImportantFlag(className);
        const name = this.parseClassNameIntelligent(cleanClassName);

        if (!name) {
          this.eventBus.emit('generator:dynamic:skipped', {
            className,
            reason: 'invalid_format',
          });
          return;
        }

        if (cssNameMap.has(name[0])) {
          const classCss = this.getClassListStr([name[0], name[1]], className, isImportant);
          cssStr += classCss;
          this.eventBus.emit('generator:dynamic:generated', {
            className,
            cleanName: cleanClassName,
            isImportant,
          });
        } else {
          userBaseClassArr.push([name[0], name[1], className, isImportant]);
          this.eventBus.emit('generator:dynamic:userBase', {
            className,
            cleanName: cleanClassName,
            isImportant,
          });
        }
      } catch (error) {
        this.eventBus.emit('generator:dynamic:error', {
          className,
          error: error.message,
        });
      }
    });

    this.eventBus.emit('generator:dynamic:completed', {
      generatedCount: classArr.length - userBaseClassArr.length,
      userBaseCount: userBaseClassArr.length,
      cssLength: cssStr.length,
    });

    return { cssStr, userBaseClassArr };
  }

  // 智能前缀解析方法 - 支持复合前缀如 max-w, min-h 等
  parseClassNameIntelligent(className) {
    const cssNameMap = this.configManager.getCssNameMap();

    // 获取所有已知前缀，按长度降序排列
    const prefixes = Array.from(cssNameMap.keys()).sort((a, b) => b.length - a.length);

    // 尝试匹配每个前缀
    for (const prefix of prefixes) {
      if (className.startsWith(prefix + '-')) {
        const value = className.substring(prefix.length + 1);
        // 确保值部分不为空且不包含连字符
        if (value && !value.includes('-')) {
          this.eventBus.emit('generator:dynamic:prefix_matched', {
            className,
            prefix,
            value,
            method: 'intelligent_parsing',
          });
          return [prefix, value];
        }
      }
    }

    // 降级到原有逻辑
    const parts = className.split('-');
    if (parts.length === 2) {
      this.eventBus.emit('generator:dynamic:prefix_matched', {
        className,
        prefix: parts[0],
        value: parts[1],
        method: 'fallback_split',
      });
      return parts;
    }

    this.eventBus.emit('generator:dynamic:parse_failed', {
      className,
      reason: 'invalid_format',
    });
    return null;
  }

  // 生成单个类的CSS字符串（优化版）
  getClassListStr(name, originalClassName, isImportant = false) {
    // 检查缓存
    const cacheKey = `${name[0]}-${name[1]}-${isImportant}`;
    if (this.cacheEnabled && this.cssCache.has(cacheKey)) {
      const cached = this.cssCache.get(cacheKey);
      return cached.replace(/\.[\w-]+\s*{/, `.${originalClassName} {`);
    }

    const classNameDefinition = this.configManager.getCssNameMap().get(name[0]);

    if (!classNameDefinition) {
      this.eventBus.emit('generator:error', {
        error: `CSS name definition not found for: ${name[0]}`,
      });
      return '';
    }

    let cssResult = '';

    // 处理对象类型的CSS定义
    if (this.isObject(classNameDefinition)) {
      cssResult = this.generateObjectBasedCSS(
        name,
        originalClassName,
        classNameDefinition,
        isImportant
      );
    } else {
      // 处理字符串类型的CSS定义
      cssResult = this.generateStringBasedCSS(
        name,
        originalClassName,
        classNameDefinition,
        isImportant
      );
    }

    // 缓存结果
    if (this.cacheEnabled && cssResult) {
      this.cssCache.set(cacheKey, cssResult);
    }

    return cssResult;
  }

  // 生成基于对象定义的CSS
  generateObjectBasedCSS(name, originalClassName, classNameDefinition, isImportant) {
    if (!classNameDefinition.classArr) {
      this.eventBus.emit('generator:warning', {
        warning: `classArr not found in definition for: ${name[0]}`,
      });
      return '';
    }

    const rawValue = name[1];
    const processedValues = [];

    // 为每个CSS属性处理值
    classNameDefinition.classArr.forEach((cssProperty) => {
      // 使用单位处理器智能处理值
      let processedValue;

      if (this.unitProcessor && !classNameDefinition.skipConversion) {
        processedValue = this.unitProcessor.parseValue(
          rawValue,
          cssProperty,
          classNameDefinition.unit
        );
      } else {
        // 使用传统逻辑（支持skipConversion）
        processedValue = this.legacyProcessValue(rawValue, classNameDefinition);
      }

      processedValues.push({
        property: cssProperty,
        value: processedValue,
      });
    });

    // 生成CSS字符串
    const processedValuesArray = processedValues.map(({ property, value }) => ({
      property,
      value: isImportant ? `${value} !important` : value,
    }));

    // 使用格式化器格式化CSS
    return this.cssFormatter.formatRule(originalClassName, processedValuesArray);
  }

  // 生成基于字符串定义的CSS
  generateStringBasedCSS(name, originalClassName, classNameDefinition, isImportant) {
    const rawValue = name[1];
    let processedValue;

    if (this.unitProcessor) {
      // 使用单位处理器处理值
      processedValue = this.unitProcessor.parseValue(rawValue, classNameDefinition);
    } else {
      // 回退到原有逻辑
      processedValue = this.legacyProcessValue(rawValue);
    }

    const finalValue = isImportant ? `${processedValue} !important` : processedValue;

    // 使用格式化器格式化CSS
    return this.cssFormatter.formatRule(originalClassName, `${classNameDefinition}: ${finalValue}`);
  }

  // 传统的值处理逻辑（向后兼容）
  legacyProcessValue(rawValue, classNameDefinition = {}) {
    const unitConversion = this.configManager.getUnitConversion();
    const baseUnit = this.configManager.getBaseUnit();

    let unit = baseUnit;
    let size = rawValue;
    const sizeArr = size.split('');

    // 单位处理
    if (classNameDefinition.unit === '-') {
      unit = '';
    } else if (sizeArr[sizeArr.length - 1] === 'b') {
      size = sizeArr.slice(0, sizeArr.length - 1).join('') + '%';
      unit = '';
    } else if (classNameDefinition.skipConversion === true) {
      // 跳过单位转换，直接使用原始值和指定单位
      unit = classNameDefinition.unit || '';
      // size 保持原值，不进行 unitConversion 转换
    } else if (classNameDefinition.unit !== undefined) {
      unit = classNameDefinition.unit;
      size = unitConversion * size;
    } else {
      size = unitConversion * size;
    }

    // 处理小数点
    if (rawValue[0] === '0' && rawValue.length > 1) {
      size = String(size).replace('0', '0.');
    }

    // 当值为0时，省略单位
    return size === 0 || size === '0' ? '0' : `${size}${unit}`;
  }

  // 生成用户基础类CSS
  createUserBaseClassList(arr) {
    if (!Array.isArray(arr)) {
      this.eventBus.emit('generator:error', { error: 'userBaseClassArr must be an array' });
      return '';
    }

    let str = '';
    const userBaseClass = this.configManager.getUserBaseClass();
    const cssWrite = new Set(); // 临时防重复集合

    this.eventBus.emit('generator:userBase:started', { classCount: arr.length });

    arr.forEach((item, index) => {
      try {
        const [className, value, originalClassName, isImportant] = item;
        const classKey = originalClassName;

        if (cssWrite.has(classKey)) {
          this.eventBus.emit('generator:userBase:skipped', {
            className: originalClassName,
            reason: 'duplicate',
          });
          return;
        }

        const baseClassItem = userBaseClass.find(([k, v]) => k === className);

        if (baseClassItem === undefined) {
          this.eventBus.emit('generator:userBase:skipped', {
            className: originalClassName,
            reason: 'not_found_in_config',
          });
          return;
        }

        cssWrite.add(classKey);
        const cssClassName = className.replaceAll('_', '-');

        if (this.isArray(baseClassItem[1])) {
          const cssValue = isImportant ? `${value} !important` : value;
          // 使用格式化器格式化CSS
          str += this.cssFormatter.formatRule(originalClassName, `${cssClassName}: ${cssValue}`);
        } else if (this.isObject(baseClassItem[1]) && baseClassItem[1][value] !== undefined) {
          const cssValue = isImportant
            ? `${baseClassItem[1][value]} !important`
            : baseClassItem[1][value];
          const propertyName = baseClassItem[1]['ABBR'] || cssClassName;
          // 使用格式化器格式化CSS
          str += this.cssFormatter.formatRule(originalClassName, `${propertyName}: ${cssValue}`);
        }

        this.eventBus.emit('generator:userBase:generated', {
          className: originalClassName,
          isImportant,
        });
      } catch (error) {
        this.eventBus.emit('generator:userBase:error', {
          item,
          error: error.message,
        });
      }
    });

    this.eventBus.emit('generator:userBase:completed', {
      generatedCount: cssWrite.size,
      cssLength: str.length,
    });

    return str;
  }

  // 工具方法
  isObject(obj) {
    return Object.prototype.toString.call(obj) === '[object Object]';
  }

  isArray(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  }

  // 验证CSS生成结果
  validateGeneratedCSS(cssStr) {
    const errors = [];
    const warnings = [];

    if (!cssStr || typeof cssStr !== 'string') {
      errors.push('Generated CSS is null or not a string');
      return { errors, warnings, isValid: false };
    }

    // 检查基本的CSS语法
    const cssRules = cssStr.split('}').filter((rule) => rule.trim().length > 0);

    cssRules.forEach((rule, index) => {
      if (!rule.includes('{')) {
        errors.push(`Rule ${index + 1} missing opening brace`);
      }

      if (!rule.includes(':')) {
        warnings.push(`Rule ${index + 1} might be missing property-value pairs`);
      }
    });

    // 检查重复的选择器
    const selectors = cssStr.match(/\.([\w\-]+)\s*{/g);
    if (selectors) {
      const selectorNames = selectors.map((s) => s.replace(/[.{]/g, '').trim());
      const duplicates = selectorNames.filter(
        (name, index) => selectorNames.indexOf(name) !== index
      );

      if (duplicates.length > 0) {
        warnings.push(`Duplicate selectors found: ${duplicates.join(', ')}`);
      }
    }

    return { errors, warnings, isValid: errors.length === 0 };
  }

  // 获取生成统计

  // 调试生成过程
  debugGeneration(classArr) {
    const result = this.getClassList(classArr);
    const validation = this.validateGeneratedCSS(result.cssStr);

    return {
      inputClasses: classArr,
      result,
      validation,
      stats: this.getGenerationStats(),
    };
  }

  // 缓存管理
  clearCache() {
    this.cssCache.clear();
    this.eventBus.emit('generator:cache:cleared', {
      timestamp: Date.now(),
    });
  }

  setCacheEnabled(enabled) {
    this.cacheEnabled = enabled;
    if (!enabled) {
      this.clearCache();
    }
    this.eventBus.emit('generator:cache:toggle', {
      enabled,
      timestamp: Date.now(),
    });
  }

  getCacheStats() {
    return {
      size: this.cssCache.size,
      enabled: this.cacheEnabled,
      memoryUsage: this.estimateCacheMemoryUsage(),
    };
  }

  estimateCacheMemoryUsage() {
    let totalSize = 0;
    for (const [key, value] of this.cssCache) {
      totalSize += key.length + value.length;
    }
    return totalSize * 2; // 估算字符串内存使用（大概）
  }

  // 配置更新
  updateConfig(newConfigManager) {
    if (newConfigManager && newConfigManager !== this.configManager) {
      this.configManager = newConfigManager;

      // 重新初始化单位处理器
      this.unitProcessor = new UnitProcessor(this.configManager.getConfig());

      // 更新CSS格式化器格式
      const cssFormat = this.configManager.getCssFormat();
      this.cssFormatter.setFormat(cssFormat);

      // 清空缓存，因为配置可能已更改
      this.clearCache();

      this.eventBus.emit('generator:config:updated', {
        timestamp: Date.now(),
        hasUnitProcessor: !!this.unitProcessor,
        cssFormat: cssFormat,
      });
    }
  }

  // 性能分析
  analyzePerformance(classArr) {
    const startTime = process.hrtime.bigint();
    const initialCacheSize = this.cssCache.size;

    const result = this.getClassList(classArr);

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // 转换为毫秒
    const finalCacheSize = this.cssCache.size;

    return {
      result,
      performance: {
        duration,
        classesPerMs: classArr.length / duration,
        cacheHits: finalCacheSize - initialCacheSize,
        cacheHitRate: initialCacheSize > 0 ? (initialCacheSize / classArr.length) * 100 : 0,
        generatedCssLength: result.cssStr.length,
      },
    };
  }

  // 批量生成CSS
  batchGenerateCSS(classBatches) {
    const results = [];
    let totalDuration = 0;

    this.eventBus.emit('generator:batch:started', {
      batchCount: classBatches.length,
    });

    classBatches.forEach((batch, index) => {
      const startTime = process.hrtime.bigint();
      const batchResult = this.getClassList(batch);
      const endTime = process.hrtime.bigint();

      const duration = Number(endTime - startTime) / 1000000;
      totalDuration += duration;

      results.push({
        batchIndex: index,
        classCount: batch.length,
        cssLength: batchResult.cssStr.length,
        duration,
        result: batchResult,
      });
    });

    this.eventBus.emit('generator:batch:completed', {
      batchCount: classBatches.length,
      totalDuration,
      averageDuration: totalDuration / classBatches.length,
      results,
    });

    return results;
  }

  // 优化建议
  getOptimizationSuggestions() {
    const suggestions = [];
    const cacheStats = this.getCacheStats();

    // 缓存相关建议
    if (!this.cacheEnabled) {
      suggestions.push({
        type: 'cache',
        priority: 'high',
        message: 'Enable CSS generation cache for better performance',
        action: 'setCacheEnabled(true)',
      });
    } else if (cacheStats.size > 1000) {
      suggestions.push({
        type: 'cache',
        priority: 'medium',
        message: 'Cache size is large, consider clearing periodically',
        action: 'clearCache()',
      });
    }

    // 单位处理器建议
    if (!this.unitProcessor) {
      suggestions.push({
        type: 'unit_processor',
        priority: 'medium',
        message: 'Unit processor not available, using legacy processing',
        action: 'Check configuration manager setup',
      });
    }

    return suggestions;
  }

  // 增强的统计信息
  getGenerationStats() {
    const baseStats = {
      configManagerReady: !!this.configManager,
      importantParserReady: !!this.importantParser,
      cssNameMapSize: this.configManager ? this.configManager.getCssNameMap().size : 0,
      userBaseClassCount: this.configManager ? this.configManager.getUserBaseClass().length : 0,
      unitProcessorReady: !!this.unitProcessor,
    };

    // 添加缓存统计
    baseStats.cache = this.getCacheStats();

    // 添加单位处理器统计
    if (this.unitProcessor) {
      const unitConfig = this.unitProcessor.getConfig();
      baseStats.unitProcessor = {
        baseUnit: unitConfig.baseUnit,
        unitConversion: unitConfig.unitConversion,
        supportedProperties: Object.keys(unitConfig.propertyUnits).length,
      };
    }

    return baseStats;
  }
}

module.exports = DynamicClassGenerator;
