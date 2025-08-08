const path = require('path');

class ConfigManager {
  constructor(eventBus, configPath = './class2css.config.js') {
    this.eventBus = eventBus;
    this.configPath = configPath;
    this.config = null;
    this.importantFlags = null;
    this.cssNameMap = null;
    this.baseClassNameMap = null;
    this.userStaticClassSet = null;
    this.userBaseClass = null;
    this.userStaticClass = null;
    
    this.loadConfig();
  }

  loadConfig() {
    try {
      // 解析绝对路径
      const path = require('path');
      const absoluteConfigPath = path.resolve(this.configPath);
      
      // 清除require缓存以确保重新加载
      delete require.cache[require.resolve(absoluteConfigPath)];
      this.config = require(absoluteConfigPath);
      
      this.updateConfigReferences();
      this.eventBus.emit('config:loaded', this.config);
      
      return this.config;
    } catch (error) {
      this.eventBus.emit('config:error', error);
      throw error;
    }
  }

  updateConfigReferences() {
    // 更新基础配置 - 支持新的system配置结构
    this.baseUnit = this.config.system?.baseUnit || this.config.baseUnit || 'px';
    this.multiFile = this.config.multiFile;

    // 更新自定义 important 标识
    this.importantFlags = {
      prefix: this.config.importantFlags?.prefix || ['!'],
      suffix: this.config.importantFlags?.suffix || ['_i', '-i'],
      custom: this.config.importantFlags?.custom || []
    };

    // 从atomicRules构建类名映射
    const cssNameMap = this.buildCssNameMapFromAtomicRules();
    
    // 获取baseClassName配置
    const baseClassName = this.config.baseClassName || {};

    // 更新类名配置
    this.userBaseClass = Object.entries(baseClassName)
      .filter(([k, v]) => typeof v === 'object');
    this.userStaticClass = Object.entries(baseClassName)
      .filter(([k, v]) => typeof v === 'string');

    // 重建索引和缓存
    this.cssNameMap = cssNameMap;
    this.baseClassNameMap = new Map(Object.entries(baseClassName));
    this.userStaticClassSet = new Set(this.userStaticClass.map(([k]) => k));

    this.eventBus.emit('config:references:updated');
  }

  // 从atomicRules构建cssName格式的映射
  buildCssNameMapFromAtomicRules() {
    const cssNameMap = new Map();
    const atomicRules = this.config.atomicRules || {};

    // 遍历所有规则类别
    Object.values(atomicRules).forEach(category => {
      Object.entries(category).forEach(([className, rule]) => {
        // 转换新格式到旧格式以保持兼容
        const legacyFormat = {
          classArr: rule.properties || [],
          unit: rule.defaultUnit || '',
          skipConversion: rule.skipConversion || false
        };
        cssNameMap.set(className, legacyFormat);
      });
    });

    return cssNameMap;
  }

  // 配置获取方法
  getConfig() {
    return this.config;
  }

  getImportantFlags() {
    return this.importantFlags;
  }

  getCssNameMap() {
    return this.cssNameMap;
  }

  getBaseClassNameMap() {
    return this.baseClassNameMap;
  }

  getUserStaticClassSet() {
    return this.userStaticClassSet;
  }

  getUserBaseClass() {
    return this.userBaseClass;
  }

  getUserStaticClass() {
    return this.userStaticClass;
  }

  getBaseUnit() {
    return this.baseUnit;
  }

  getMultiFile() {
    return this.multiFile;
  }

  getUnitConversion() {
    return Number(this.config.system?.unitConversion || this.config.unitConversion) || 1;
  }

  getCompression() {
    return this.config.system?.compression || this.config.compression || false;
  }

  getOutput() {
    return this.config.output;
  }

  // 配置验证
  validateConfig() {
    const errors = [];

    if (!this.config) {
      errors.push('Configuration is null or undefined');
      return errors;
    }

    // 检查系统配置
    if (!this.config.system?.baseUnit && !this.config.baseUnit) {
      errors.push('baseUnit configuration is required (either in system.baseUnit or baseUnit)');
    }

    // 检查原子规则配置
    const atomicRules = this.config.atomicRules;
    const baseClassName = this.config.baseClassName;

    if (!atomicRules || typeof atomicRules !== 'object') {
      errors.push('atomicRules configuration is required and must be an object');
    }

    if (!baseClassName || typeof baseClassName !== 'object') {
      errors.push('baseClassName configuration is required and must be an object');
    }

    if (this.config.multiFile) {
      if (!this.config.multiFile.entry || !this.config.multiFile.entry.path) {
        errors.push('multiFile.entry.path is required when multiFile is enabled');
      }
    }

    if (this.config.output) {
      if (!this.config.output.path || !this.config.output.fileName) {
        errors.push('output.path and output.fileName are required');
      }
    }

    return errors;
  }

  // 配置重载
  async reloadConfig() {
    try {
      this.eventBus.emit('config:reloading');
      this.loadConfig();
      this.eventBus.emit('config:reloaded', this.config);
      return true;
    } catch (error) {
      this.eventBus.emit('config:reload:error', error);
      return false;
    }
  }

  // 配置信息输出
  getConfigInfo() {
    return {
      userBaseClassCount: this.userBaseClass.length,
      userStaticClassCount: this.userStaticClass.length,
      importantFlags: this.importantFlags,
      baseUnit: this.baseUnit,
      multiFile: !!this.multiFile,
      compression: this.getCompression(),
      unitConversion: this.getUnitConversion()
    };
  }
}

module.exports = ConfigManager; 