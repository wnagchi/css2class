import path from 'path';
import { EventBus } from './EventBus';
import { ConfigCleaner } from '../cleanup';
import { Config, ImportantFlags } from '../../types';

interface LegacyCssRule {
  classArr: string[];
  unit: string;
  skipConversion?: boolean;
}

export default class ConfigManager {
  private eventBus: EventBus;
  private configPath: string;
  private configCleaner: ConfigCleaner;
  private config: Config | null = null;
  private importantFlags: ImportantFlags | null = null;
  private cssNameMap: Map<string, LegacyCssRule> | null = null;
  private baseClassNameMap: Map<string, any> | null = null;
  private userStaticClassSet: Set<string> | null = null;
  private userBaseClass: Array<[string, any]> | null = null;
  private userStaticClass: Array<[string, any]> | null = null;
  private baseUnit: string = 'px';
  private multiFile: any = null;

  constructor(eventBus: EventBus, configPath = './class2css.config.js') {
    this.eventBus = eventBus;
    this.configPath = configPath;
    this.configCleaner = new ConfigCleaner(eventBus);
    this.loadConfig();
  }

  loadConfig(): Config {
    try {
      // 解析绝对路径
      const absoluteConfigPath = path.resolve(this.configPath);

      // 清除require缓存以确保重新加载
      delete require.cache[require.resolve(absoluteConfigPath)];
      this.config = require(absoluteConfigPath);

      this.updateConfigReferences();
      this.eventBus.emit('config:loaded', { config: this.config });

      if (!this.config) {
        throw new Error('Configuration could not be loaded');
      }

      return this.config;
    } catch (error) {
      this.eventBus.emit('config:error', { error });
      throw error;
    }
  }

  private updateConfigReferences(): void {
    if (!this.config) return;

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

    this.eventBus.emit('config:references:updated');
  }

  // 从atomicRules构建cssName格式的映射
  private buildCssNameMapFromAtomicRules(): Map<string, LegacyCssRule> {
    const cssNameMap = new Map<string, LegacyCssRule>();
    const atomicRules = this.config?.atomicRules || {};

    // 遍历所有规则类别
    Object.values(atomicRules).forEach((category) => {
      if (category && typeof category === 'object') {
        Object.entries(category).forEach(([className, rule]) => {
          // 转换新格式到旧格式以保持兼容
          const ruleObj = rule as any;
          const legacyFormat: LegacyCssRule = {
            classArr: ruleObj.properties || [],
            unit: ruleObj.defaultUnit || '',
            skipConversion: ruleObj.skipConversion || false,
          };
          cssNameMap.set(className, legacyFormat);
        });
      }
    });

    return cssNameMap;
  }

  // 配置获取方法
  getConfig(): Config | null {
    return this.config;
  }

  getImportantFlags(): ImportantFlags {
    return this.importantFlags || {
      prefix: ['!'],
      suffix: ['_i', '-i'],
      custom: []
    };
  }

  getCssNameMap(): Map<string, LegacyCssRule> {
    return this.cssNameMap || new Map();
  }

  getBaseClassNameMap(): Map<string, any> {
    return this.baseClassNameMap || new Map();
  }

  getUserStaticClassSet(): Set<string> {
    return this.userStaticClassSet || new Set();
  }

  getUserBaseClass(): Array<[string, any]> {
    return this.userBaseClass || [];
  }

  getUserStaticClass(): Array<[string, any]> {
    return this.userStaticClass || [];
  }

  getBaseUnit(): string {
    return this.baseUnit;
  }

  getMultiFile(): any {
    return this.multiFile;
  }

  getUnitConversion(): number {
    return Number(this.config?.system?.unitConversion || this.config?.unitConversion) || 1;
  }

  getCompression(): boolean {
    return this.config?.system?.compression || this.config?.compression || false;
  }

  getOutput(): any {
    return this.config?.output;
  }

  // 配置验证
  validateConfig(): string[] {
    const errors: string[] = [];

    if (!this.config) {
      errors.push('Configuration is null or undefined');
      return errors;
    }

    // 检查系统配置
    if (!this.config.system?.baseUnit && !this.config.baseUnit) {
      errors.push('baseUnit configuration is required (either in system.baseUnit or baseUnit)');
    }

    // 检查输出配置
    if (!this.config.output?.path) {
      errors.push('output.path configuration is required');
    }

    if (!this.config.output?.fileName) {
      errors.push('output.fileName configuration is required');
    }

    // 检查多文件配置
    if (this.config.multiFile) {
      if (!this.config.multiFile.entry?.path) {
        errors.push('multiFile.entry.path configuration is required when multiFile is enabled');
      }

      if (!this.config.multiFile.entry?.fileType ||
          !Array.isArray(this.config.multiFile.entry.fileType)) {
        errors.push('multiFile.entry.fileType configuration must be an array');
      }

      if (!this.config.multiFile.output?.cssOutType) {
        errors.push('multiFile.output.cssOutType configuration is required');
      }
    }

    // 检查原子规则配置
    if (this.config.atomicRules) {
      const validUnits = ['rpx', 'px', 'em', 'rem', '%', ''];
      Object.values(this.config.atomicRules).forEach((category) => {
        if (category && typeof category === 'object') {
          Object.entries(category).forEach(([className, rule]) => {
            const ruleObj = rule as any;
            if (!ruleObj.properties || !Array.isArray(ruleObj.properties)) {
              errors.push(`atomicRules: ${className}.properties must be an array`);
            }
            if (ruleObj.defaultUnit && !validUnits.includes(ruleObj.defaultUnit)) {
              errors.push(`atomicRules: ${className}.defaultUnit must be one of ${validUnits.join(', ')}`);
            }
          });
        }
      });
    }

    return errors;
  }

  // 重新加载配置
  reloadConfig(): Config {
    return this.loadConfig();
  }

  // 获取配置信息
  getConfigInfo(): any {
    return {
      configPath: this.configPath,
      hasConfig: !!this.config,
      cssNameCount: this.cssNameMap?.size || 0,
      baseClassNameCount: this.baseClassNameMap?.size || 0,
      staticClassCount: this.userStaticClassSet?.size || 0,
      lastLoaded: Date.now(),
    };
  }

  // 清理缓存 - 使用ConfigCleaner
  cleanup(): void {
    const result = this.configCleaner.cleanup(this);
    if (!result.success) {
      this.eventBus.emit('config:cleanup:error', { errors: result.errors });
    }
  }

  // 新增：获取配置清理统计
  getConfigCleanupStats(): any {
    return this.configCleaner.getCleanupStats(this);
  }

  // 新增：检查配置是否已加载
  isConfigLoaded(): boolean {
    return this.configCleaner.isConfigLoaded(this);
  }

  // 新增：安全配置清理
  safeConfigCleanup(isConfigInUse: () => boolean, options?: any): any {
    return this.configCleaner.safeCleanup(this, isConfigInUse, options);
  }

  // 获取统计信息
  getStats(): any {
    return {
      configLoaded: !!this.config,
      configPath: this.configPath,
      cssNameCount: this.cssNameMap?.size || 0,
      baseClassNameCount: this.baseClassNameMap?.size || 0,
      staticClassCount: this.userStaticClassSet?.size || 0,
      baseClassCount: this.userBaseClass?.length || 0,
      unitConversion: this.getUnitConversion(),
      compression: this.getCompression(),
      baseUnit: this.baseUnit,
    };
  }
}