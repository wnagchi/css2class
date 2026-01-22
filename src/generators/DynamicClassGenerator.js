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

    // 缓存：已知前缀列表（按长度降序），避免每个 class 解析都重新排序
    this._sortedPrefixes = [];
    this._sortedPrefixesCacheKey = null;
    this.refreshPrefixCache();
  }

  // 刷新前缀缓存（配置变更时调用）
  refreshPrefixCache() {
    try {
      const cssNameMap = this.configManager?.getCssNameMap?.();
      if (!cssNameMap) {
        this._sortedPrefixes = [];
        this._sortedPrefixesCacheKey = null;
        return;
      }

      // 以 key 的拼接作为轻量 cache key（避免在热路径里做深比较）
      const keys = Array.from(cssNameMap.keys());
      const nextKey = keys.join('|');
      if (this._sortedPrefixesCacheKey === nextKey && this._sortedPrefixes.length > 0) {
        return;
      }

      this._sortedPrefixes = keys.sort((a, b) => b.length - a.length);
      this._sortedPrefixesCacheKey = nextKey;
      this.eventBus.emit('generator:dynamic:prefix_cache:refreshed', {
        prefixCount: this._sortedPrefixes.length,
      });
    } catch (_) {
      // ignore: cache refresh failure should not break generation
      this._sortedPrefixes = [];
      this._sortedPrefixesCacheKey = null;
    }
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

    // 确保前缀缓存存在（热更新/首次运行兜底）
    if (!this._sortedPrefixes || this._sortedPrefixes.length === 0) {
      this.refreshPrefixCache();
    }

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

        // name 现在是 [prefix, value, responsiveVariant, stateVariants]
        const responsiveVariant = name.length >= 3 ? name[2] : null;
        const stateVariants = name.length >= 4 ? name[3] : [];
        
        if (cssNameMap.has(name[0])) {
          const classCss = this.getClassListStr(
            [name[0], name[1]],
            className,
            isImportant,
            responsiveVariant,
            stateVariants
          );
          cssStr += classCss;
          this.eventBus.emit('generator:dynamic:generated', {
            className,
            cleanName: cleanClassName,
            isImportant,
            responsiveVariant,
            stateVariants,
          });
        } else {
          userBaseClassArr.push([name[0], name[1], className, isImportant, responsiveVariant, stateVariants]);
          this.eventBus.emit('generator:dynamic:userBase', {
            className,
            cleanName: cleanClassName,
            isImportant,
            responsiveVariant,
            stateVariants,
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

  // 解析响应式变体前缀（如 sm:, md: 等）
  // 保留向后兼容，内部调用 parseVariants
  parseResponsiveVariant(className) {
    const result = this.parseVariants(className);
    return { variant: result.responsiveVariant, baseClass: result.baseClass };
  }

  // 解析所有变体（响应式 + 状态变体如 hover/focus/active）
  // 返回 { responsiveVariant, stateVariants, baseClass }
  parseVariants(className) {
    if (!className || typeof className !== 'string') {
      return { responsiveVariant: null, stateVariants: [], baseClass: className };
    }

    const variants = this.configManager.getVariants();
    const responsiveVariants = variants.responsive || [];
    const stateVariants = variants.states || [];

    // 按 : 拆分前缀链
    const parts = className.split(':');
    if (parts.length < 2) {
      return { responsiveVariant: null, stateVariants: [], baseClass: className };
    }

    let responsiveVariant = null;
    const foundStateVariants = [];
    let baseClass = className;

    // 从前往后解析：最多一个响应式变体（通常在链的最前面），可以有多个状态变体
    // 例如：lg:hover:focus:w-20 -> responsive: lg, states: [hover, focus], base: w-20
    let i = 0;
    while (i < parts.length - 1) {
      const potentialVariant = parts[i];

      // 检查是否是响应式变体（只取第一个）
      if (!responsiveVariant && responsiveVariants.includes(potentialVariant)) {
        responsiveVariant = potentialVariant;
        i++;
        continue;
      }

      // 检查是否是状态变体
      if (stateVariants.includes(potentialVariant)) {
        foundStateVariants.push(potentialVariant);
        i++;
        continue;
      }

      // 遇到未知变体，停止解析，剩余部分作为 baseClass
      break;
    }

    // baseClass 是最后一部分（或剩余部分）
    baseClass = parts.slice(i).join(':');

    return {
      responsiveVariant,
      stateVariants: foundStateVariants,
      baseClass,
    };
  }

  // 智能前缀解析方法 - 支持复合前缀如 max-w, min-h 等，同时支持响应式和状态变体
  parseClassNameIntelligent(className) {
    // 解析所有变体（响应式 + 状态）
    const { responsiveVariant, stateVariants, baseClass } = this.parseVariants(className);
    
    // 使用缓存的前缀列表进行解析（避免每次都重新排序）
    const prefixes = this._sortedPrefixes || [];

    // 尝试匹配每个前缀
    for (const prefix of prefixes) {
      if (baseClass.startsWith(prefix + '-')) {
        const value = baseClass.substring(prefix.length + 1);
        // 确保值部分不为空且不包含连字符
        if (value && !value.includes('-')) {
          this.eventBus.emit('generator:dynamic:prefix_matched', {
            className,
            prefix,
            value,
            responsiveVariant,
            stateVariants,
            method: 'intelligent_parsing',
          });
          // 返回包含所有变体信息的数组：[prefix, value, responsiveVariant, stateVariants]
          return [prefix, value, responsiveVariant, stateVariants];
        }
      }
    }

    // 降级到原有逻辑：支持首个 - 分割，允许 value 包含 -
    // 例如：bg-hex-fff -> ['bg', 'hex-fff']
    const firstDashIndex = baseClass.indexOf('-');
    if (firstDashIndex > 0 && firstDashIndex < baseClass.length - 1) {
      const prefix = baseClass.substring(0, firstDashIndex);
      const value = baseClass.substring(firstDashIndex + 1);
      this.eventBus.emit('generator:dynamic:prefix_matched', {
        className,
        prefix,
        value,
        responsiveVariant,
        stateVariants,
        method: 'fallback_first_dash_split',
      });
      return [prefix, value, responsiveVariant, stateVariants];
    }

    this.eventBus.emit('generator:dynamic:parse_failed', {
      className,
      reason: 'invalid_format',
    });
    return null;
  }

  // 生成单个类的CSS字符串（优化版）
  getClassListStr(name, originalClassName, isImportant = false, responsiveVariant = null, stateVariants = []) {
    // 检查缓存（包含所有变体信息）
    const stateKey = stateVariants.length > 0 ? stateVariants.join(',') : '';
    const cacheKey = `${name[0]}-${name[1]}-${isImportant}-${responsiveVariant || ''}-${stateKey}`;
    if (this.cacheEnabled && this.cssCache.has(cacheKey)) {
      const cached = this.cssCache.get(cacheKey);
      // 替换选择器时需要考虑转义和状态伪类
      const escapedSelector = this.cssFormatter.escapeSelector(originalClassName);
      const pseudoSelectors = this.cssFormatter.buildStatePseudoSelectors(stateVariants);
      // 修复：将 - 放在字符类末尾，避免被解释为范围操作符
      return cached.replace(/\.[\w\\:-]+\s*{/, `.${escapedSelector}${pseudoSelectors} {`);
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
        isImportant,
        responsiveVariant,
        stateVariants
      );
    } else {
      // 处理字符串类型的CSS定义
      cssResult = this.generateStringBasedCSS(
        name,
        originalClassName,
        classNameDefinition,
        isImportant,
        responsiveVariant,
        stateVariants
      );
    }

    // 缓存结果
    if (this.cacheEnabled && cssResult) {
      this.cssCache.set(cacheKey, cssResult);
    }

    return cssResult;
  }

  // 生成基于对象定义的CSS
  generateObjectBasedCSS(name, originalClassName, classNameDefinition, isImportant, responsiveVariant = null, stateVariants = []) {
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

    // 使用格式化器格式化CSS（传入状态变体用于生成伪类选择器）
    const cssRule = this.cssFormatter.formatRule(originalClassName, processedValuesArray, null, stateVariants);

    // 如果有响应式变体，用 @media 包裹
    if (responsiveVariant) {
      return this.wrapWithMediaQuery(cssRule, responsiveVariant);
    }

    return cssRule;
  }

  // 生成基于字符串定义的CSS
  generateStringBasedCSS(name, originalClassName, classNameDefinition, isImportant, responsiveVariant = null, stateVariants = []) {
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

    // 使用格式化器格式化CSS（传入状态变体用于生成伪类选择器）
    const cssRule = this.cssFormatter.formatRule(originalClassName, `${classNameDefinition}: ${finalValue}`, null, stateVariants);

    // 如果有响应式变体，用 @media 包裹
    if (responsiveVariant) {
      return this.wrapWithMediaQuery(cssRule, responsiveVariant);
    }

    return cssRule;
  }

  // 用 @media 查询包裹 CSS 规则
  wrapWithMediaQuery(cssRule, responsiveVariant) {
    const breakpoints = this.configManager.getBreakpoints();
    const breakpoint = breakpoints[responsiveVariant];

    if (!breakpoint) {
      this.eventBus.emit('generator:warning', {
        warning: `Breakpoint not found for variant: ${responsiveVariant}`,
      });
      return cssRule; // 如果没有找到断点，返回原始规则
    }

    const cssFormat = this.configManager.getCssFormat();
    const isCompressed = cssFormat === 'compressed';
    const isSingleLine = cssFormat === 'singleLine';

    if (isCompressed) {
      // 压缩格式：@media(min-width:640px){.sm\:w-100{width:200rpx}}
      return `@media(min-width:${breakpoint}){${cssRule.trim()}}`;
    } else if (isSingleLine) {
      // 单行格式：@media (min-width: 640px) { .sm\:w-100 { width: 200rpx; } }
      return `@media (min-width: ${breakpoint}) { ${cssRule.trim()} }\n`;
    } else {
      // 多行格式
      return `@media (min-width: ${breakpoint}) {\n${cssRule.trim()}\n}\n`;
    }
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
    const baseClassNameMap = this.configManager.getBaseClassNameMap();
    const cssWrite = new Set(); // 临时防重复集合

    this.eventBus.emit('generator:userBase:started', { classCount: arr.length });

    arr.forEach((item, index) => {
      try {
        // item 现在是 [className, value, originalClassName, isImportant, responsiveVariant, stateVariants]
        const [className, value, originalClassName, isImportant, responsiveVariant, stateVariants = []] = item;
        const classKey = originalClassName;

        if (cssWrite.has(classKey)) {
          this.eventBus.emit('generator:userBase:skipped', {
            className: originalClassName,
            reason: 'duplicate',
          });
          return;
        }

        const baseDef = baseClassNameMap ? baseClassNameMap.get(className) : undefined;
        // userBaseClass 应该是 object 类型（如颜色族：{ ABBR: 'color', red: '#f00', ... }）
        if (!baseDef || typeof baseDef !== 'object' || Array.isArray(baseDef)) {
          this.eventBus.emit('generator:userBase:skipped', {
            className: originalClassName,
            reason: 'not_found_in_config',
          });
          return;
        }

        cssWrite.add(classKey);
        const cssClassName = className.replaceAll('_', '-');

        let cssRule = '';
        if (this.isArray(baseDef)) {
          const cssValue = isImportant ? `${value} !important` : value;
          // 使用格式化器格式化CSS（传入状态变体）
          cssRule = this.cssFormatter.formatRule(originalClassName, `${cssClassName}: ${cssValue}`, null, stateVariants);
        } else if (this.isObject(baseDef)) {
          // 优先使用映射值（如果存在）
          if (baseDef[value] !== undefined) {
            const cssValue = isImportant
              ? `${baseDef[value]} !important`
              : baseDef[value];
            const propertyName = baseDef['ABBR'] || cssClassName;
            // 使用格式化器格式化CSS（传入状态变体）
            cssRule = this.cssFormatter.formatRule(originalClassName, `${propertyName}: ${cssValue}`, null, stateVariants);
          } else if (baseDef['ABBR']) {
            // 映射不存在，但有 ABBR，尝试解析为直接颜色值
            const parsedColor = this.parseColorValue(value);
            if (parsedColor) {
              const cssValue = isImportant
                ? `${parsedColor} !important`
                : parsedColor;
              const propertyName = baseDef['ABBR'];
              // 使用格式化器格式化CSS（传入状态变体）
              cssRule = this.cssFormatter.formatRule(originalClassName, `${propertyName}: ${cssValue}`, null, stateVariants);
            }
          }
        }

        // 如果有响应式变体，用 @media 包裹
        if (responsiveVariant && cssRule) {
          cssRule = this.wrapWithMediaQuery(cssRule, responsiveVariant);
        }

        str += cssRule;

        this.eventBus.emit('generator:userBase:generated', {
          className: originalClassName,
          isImportant,
          responsiveVariant,
          stateVariants,
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

  // 解析颜色值（支持 hex、rgb、rgba）
  // 返回解析后的 CSS 颜色值字符串，失败返回 null
  parseColorValue(value) {
    if (!value || typeof value !== 'string') {
      return null;
    }

    // Hex 格式：hex-fff, hex-112233, hex-ffffffff
    if (value.startsWith('hex-')) {
      const hexValue = value.substring(4);
      // 验证 hex 值：3、4、6、8 位十六进制数字
      if (/^[0-9a-fA-F]{3}$/.test(hexValue)) {
        return `#${hexValue}`;
      }
      if (/^[0-9a-fA-F]{4}$/.test(hexValue)) {
        return `#${hexValue}`;
      }
      if (/^[0-9a-fA-F]{6}$/.test(hexValue)) {
        return `#${hexValue}`;
      }
      if (/^[0-9a-fA-F]{8}$/.test(hexValue)) {
        return `#${hexValue}`;
      }
      return null;
    }

    // RGB 格式：rgb-255-0-0
    if (value.startsWith('rgb-')) {
      const parts = value.substring(4).split('-');
      if (parts.length === 3) {
        const r = parseInt(parts[0], 10);
        const g = parseInt(parts[1], 10);
        const b = parseInt(parts[2], 10);
        if (
          !isNaN(r) && r >= 0 && r <= 255 &&
          !isNaN(g) && g >= 0 && g <= 255 &&
          !isNaN(b) && b >= 0 && b <= 255
        ) {
          return `rgb(${r}, ${g}, ${b})`;
        }
      }
      return null;
    }

    // RGBA 格式：rgba-255-0-0-05 或 rgba-255-0-0-0_5
    if (value.startsWith('rgba-')) {
      const parts = value.substring(5).split('-');
      if (parts.length === 4) {
        const r = parseInt(parts[0], 10);
        const g = parseInt(parts[1], 10);
        const b = parseInt(parts[2], 10);
        // 解析 alpha：支持 05 (0.5) 或 0_5 (0.5) 格式
        let alpha = parts[3];
        let alphaNum;
        
        // 如果包含下划线，替换为点
        if (alpha.includes('_')) {
          alpha = alpha.replace('_', '.');
          alphaNum = parseFloat(alpha);
        } else if (/^\d{2}$/.test(alpha) && alpha.length === 2) {
          // 两位数字格式：
          // - 如果 < 10（如 05, 08），除以 10 得到 0.5, 0.8
          // - 如果 >= 10（如 50, 99），除以 100 得到 0.5, 0.99（作为百分比）
          const num = parseInt(alpha, 10);
          alphaNum = num < 10 ? num / 10 : num / 100;
        } else {
          // 其他格式（如 0.5, 1 等）直接解析
          alphaNum = parseFloat(alpha);
        }
        if (
          !isNaN(r) && r >= 0 && r <= 255 &&
          !isNaN(g) && g >= 0 && g <= 255 &&
          !isNaN(b) && b >= 0 && b <= 255 &&
          !isNaN(alphaNum) && alphaNum >= 0 && alphaNum <= 1
        ) {
          return `rgba(${r}, ${g}, ${b}, ${alphaNum})`;
        }
      }
      return null;
    }

    return null;
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

      // 配置更新后刷新前缀缓存
      this.refreshPrefixCache();

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
