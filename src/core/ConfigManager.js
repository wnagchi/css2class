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
    this._fileUtils = null;
    this._logger = null;
    this._commonCssCache = null;

    this.loadConfig();
  }

  loadConfig() {
    try {
      // 解析绝对路径
      const path = require('path');
      const absoluteConfigPath = path.resolve(this.configPath);
      this.configPath = absoluteConfigPath; // 保存绝对路径

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
      custom: this.config.importantFlags?.custom || [],
    };

    // 从atomicRules构建类名映射
    const cssNameMap = this.buildCssNameMapFromAtomicRules();

    // 获取baseClassName配置
    const baseClassName = this.config.baseClassName || {};

    // 更新类名配置
    this.userBaseClass = Object.entries(baseClassName).filter(([k, v]) => typeof v === 'object');
    this.userStaticClass = Object.entries(baseClassName).filter(([k, v]) => typeof v === 'string');

    // 重建索引和缓存
    this.cssNameMap = cssNameMap;
    this.baseClassNameMap = new Map(Object.entries(baseClassName));
    this.userStaticClassSet = new Set(this.userStaticClass.map(([k]) => k));

    // 清空共用CSS缓存，确保配置变更时重新读取
    this._commonCssCache = null;

    this.eventBus.emit('config:references:updated');
  }

  // 从atomicRules构建cssName格式的映射
  buildCssNameMapFromAtomicRules() {
    const cssNameMap = new Map();
    const atomicRules = this.config.atomicRules || {};

    // 遍历所有规则类别
    Object.values(atomicRules).forEach((category) => {
      Object.entries(category).forEach(([className, rule]) => {
        // 转换新格式到旧格式以保持兼容
        const legacyFormat = {
          classArr: rule.properties || [],
          unit: rule.defaultUnit || '',
          skipConversion: rule.skipConversion || false,
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

  getCssFormat() {
    // 获取CSS格式配置，默认返回 'multiLine'
    return this.config.system?.cssFormat || 'multiLine';
  }

  getSortClasses() {
    // 获取排序配置，默认返回 false
    return this.config.system?.sortClasses || false;
  }

  getOutput() {
    return this.config.output;
  }

  // 设置依赖（FileUtils和Logger）
  setDependencies(fileUtils, logger) {
    this._fileUtils = fileUtils;
    this._logger = logger;
  }

  // 获取共用CSS文件路径
  getCommonCssPath() {
    // 优先从 multiFile.output.commonCssPath 读取
    let commonCssPath = this.multiFile?.output?.commonCssPath;
    
    // 如果没有，尝试从 output.commonCssPath 读取（向后兼容）
    if (!commonCssPath && this.config?.output?.commonCssPath) {
      commonCssPath = this.config.output.commonCssPath;
    }
    
    return commonCssPath || null;
  }

  // 读取共用CSS文件内容
  async getCommonCssContent() {
    // 检查依赖是否已设置
    if (!this._fileUtils || !this._logger) {
      return '';
    }

    // 获取共用CSS文件路径
    const commonCssPath = this.getCommonCssPath();
    if (!commonCssPath) {
      return '';
    }

    // 如果缓存存在，直接返回
    if (this._commonCssCache !== null) {
      return this._commonCssCache;
    }

    try {
      // 解析路径：支持绝对路径和相对路径
      // 如果是绝对路径，直接使用；如果是相对路径，基于配置文件所在目录解析
      let absolutePath;
      if (path.isAbsolute(commonCssPath)) {
        // 绝对路径：直接使用并规范化
        absolutePath = path.normalize(commonCssPath);
      } else {
        // 相对路径：基于配置文件所在目录解析
        const configDir = path.dirname(this.configPath);
        absolutePath = path.resolve(configDir, commonCssPath);
      }

      // 检查文件是否存在
      const exists = await this._fileUtils.fileExists(absolutePath);
      if (!exists) {
        this._logger.warn(`共用CSS文件不存在: ${absolutePath}`);
        this._commonCssCache = '';
        return '';
      }

      // 读取文件内容
      const content = await this._fileUtils.readFile(absolutePath, 'utf-8');
      if (content === null) {
        this._logger.warn(`读取共用CSS文件失败: ${absolutePath}`);
        this._commonCssCache = '';
        return '';
      }

      // 缓存内容
      this._commonCssCache = content;
      this._logger.info(`成功读取共用CSS文件: ${absolutePath} (${content.length} 字符)`);
      return content;
    } catch (error) {
      this._logger.warn(`读取共用CSS文件时出错: ${commonCssPath}`, error.message);
      this._commonCssCache = '';
      return '';
    }
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
      unitConversion: this.getUnitConversion(),
    };
  }

  // 运行时覆盖配置
  overrideConfig(overrides) {
    if (!overrides || typeof overrides !== 'object') {
      return;
    }

    // 确保 config 对象存在
    if (!this.config) {
      this.config = {};
    }

    // 覆盖输入目录（multiFile.entry.path）
    if (overrides.inputPath) {
      if (!this.config.multiFile) {
        this.config.multiFile = {};
      }
      if (!this.config.multiFile.entry) {
        this.config.multiFile.entry = {};
      }
      this.config.multiFile.entry.path = overrides.inputPath;
      this.eventBus.emit('config:override:inputPath', overrides.inputPath);
    }

    // 覆盖输出目录（multiFile.output.path）
    if (overrides.outputPath) {
      if (!this.config.multiFile) {
        this.config.multiFile = {};
      }
      if (!this.config.multiFile.output) {
        this.config.multiFile.output = {};
      }
      this.config.multiFile.output.path = overrides.outputPath;
      this.eventBus.emit('config:override:outputPath', overrides.outputPath);
    }

    // 覆盖输出文件名（multiFile.output.fileName）
    if (overrides.outputFileName) {
      if (!this.config.multiFile) {
        this.config.multiFile = {};
      }
      if (!this.config.multiFile.output) {
        this.config.multiFile.output = {};
      }
      this.config.multiFile.output.fileName = overrides.outputFileName;
      this.eventBus.emit('config:override:outputFileName', overrides.outputFileName);
    }

    // 覆盖输出类型（multiFile.output.cssOutType）
    if (overrides.outputType) {
      if (!this.config.multiFile) {
        this.config.multiFile = {};
      }
      if (!this.config.multiFile.output) {
        this.config.multiFile.output = {};
      }
      this.config.multiFile.output.cssOutType = overrides.outputType;
      this.eventBus.emit('config:override:outputType', overrides.outputType);
    }

    // 重新更新配置引用
    this.updateConfigReferences();
    this.eventBus.emit('config:overridden', overrides);
  }
}

module.exports = ConfigManager;
