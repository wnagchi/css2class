import { EventBus } from './EventBus';
import ConfigValidator from './ConfigValidator';
import { Config } from '../../types';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface ConflictResolutionResult {
  config: Config;
  hasChanges: boolean;
}

interface SpacingConflict {
  property: string;
  sources: string[];
}

interface CompatibilityReport {
  originalFormat: 'modern' | 'legacy';
  adaptedFormat: 'modern';
  conflicts: Array<{
    type: string;
    property?: string;
    description: string;
  }>;
  warnings: string[];
  recommendations: string[];
}

interface AdapterStats {
  adaptationsCount: number;
  conflictsResolved: number;
  lastAdaptation: Date | null;
}

class CompatibilityAdapter {
  private eventBus: EventBus;
  private configValidator: ConfigValidator;
  private adaptationsCount: number = 0;
  private conflictsResolved: number = 0;
  private lastAdaptation: Date | null = null;

  constructor(eventBus: EventBus, configValidator?: ConfigValidator) {
    this.eventBus = eventBus;
    this.configValidator = configValidator || new ConfigValidator(eventBus);
  }

  // 将旧配置格式转换为新格式
  adaptConfig(config: Config): Config {
    try {
      // 如果已经是新格式，直接返回
      if (this.isNewFormat(config)) {
        return config;
      }

      // 转换为新格式
      const adaptedConfig = this.transformToNewFormat(config);

      // 验证转换后的配置
      const validation = this.configValidator.validateConfig(adaptedConfig);
      if (!validation.isValid) {
        this.eventBus.emit('compatibility:validation:failed', {
          errors: validation.errors,
          warnings: validation.warnings,
        });
      }

      this.adaptationsCount++;
      this.lastAdaptation = new Date();

      this.eventBus.emit('compatibility:adapted', {
        original: config,
        adapted: adaptedConfig,
        validation,
      });

      return adaptedConfig;
    } catch (error) {
      this.eventBus.emit('compatibility:error', error);
      throw error;
    }
  }

  // 检查是否为新格式
  private isNewFormat(config: Config): boolean {
    // 检查是否有新的system配置结构
    return !!(config.system || config.atomicRules || config.compatibility);
  }

  // 转换为新格式
  private transformToNewFormat(config: Config): Config {
    const newConfig: Config = {
      // 系统配置
      system: {
        baseUnit: config.baseUnit || 'px',
        unitConversion: config.unitConversion || 1,
        compression: config.compression !== undefined ? config.compression : true,
        unitStrategy: {
          autoDetect: true,
          propertyUnits: {
            'font-size': config.baseUnit || 'px',
            'width|height': config.baseUnit || 'px',
            opacity: '',
            'z-index': '',
            'line-height': '',
            'border-radius': config.baseUnit || 'px',
          },
        },
      },

      // 保留现有配置
      output: config.output,
      importantFlags: config.importantFlags,
      multiFile: config.multiFile,

      // 保留原有配置结构以确保兼容性
      cssName: config.cssName,
      baseClassName: config.baseClassName,
      atomicClassMap: config.atomicClassMap,
      variants: config.variants,

      // 兼容性配置
      compatibility: {
        legacy: {
          cssName: config.cssName,
          baseClassName: config.baseClassName,
          atomicClassMap: config.atomicClassMap,
        },
        unified: {
          enabled: false, // 默认关闭新功能
        },
      },
    };

    return newConfig;
  }

  // 合并配置
  mergeConfigs(baseConfig: Config, overrideConfig: Config): Config {
    const merged = JSON.parse(JSON.stringify(baseConfig));

    // 深度合并
    this.deepMerge(merged, overrideConfig);

    return merged;
  }

  // 深度合并对象
  private deepMerge(target: any, source: any): void {
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key] || typeof target[key] !== 'object') {
            target[key] = {};
          }
          this.deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
  }

  // 解决配置冲突
  resolveConflicts(config: Config): ConflictResolutionResult {
    const resolved = JSON.parse(JSON.stringify(config));
    let hasChanges = false;

    // 解决text属性冲突
    if (resolved.cssName?.text && resolved.atomicClassMap?.text) {
      // 保留atomicClassMap中的定义，在cssName中重命名
      (resolved.cssName as any).textSize = (resolved.cssName as any).text;
      delete (resolved.cssName as any).text;
      hasChanges = true;

      this.conflictsResolved++;

      this.eventBus.emit('compatibility:conflict:resolved', {
        type: 'text_property_conflict',
        action: 'renamed cssName.text to cssName.textSize',
      });
    }

    // 解决重复的间距定义
    const spacingConflicts = this.findSpacingConflicts(resolved);
    if (spacingConflicts.length > 0) {
      this.resolveSpacingConflicts(resolved, spacingConflicts);
      hasChanges = true;
    }

    return { config: resolved, hasChanges };
  }

  // 查找间距配置冲突
  private findSpacingConflicts(config: Config): SpacingConflict[] {
    const conflicts: SpacingConflict[] = [];
    const spacingProps = [
      'm', 'mt', 'mr', 'mb', 'ml', 'mx', 'my',
      'p', 'pt', 'pr', 'pb', 'pl', 'px', 'py',
    ];

    spacingProps.forEach((prop) => {
      const sources: string[] = [];
      if (config.cssName?.[prop]) sources.push('cssName');
      if (config.atomicClassMap?.[prop]) sources.push('atomicClassMap');

      if (sources.length > 1) {
        conflicts.push({ property: prop, sources });
      }
    });

    return conflicts;
  }

  // 解决间距配置冲突
  private resolveSpacingConflicts(config: Config, conflicts: SpacingConflict[]): void {
    conflicts.forEach((conflict) => {
      // 优先使用atomicClassMap的定义
      if (config.cssName?.[conflict.property] && config.atomicClassMap?.[conflict.property]) {
        delete (config.cssName as any)[conflict.property];

        this.conflictsResolved++;

        this.eventBus.emit('compatibility:conflict:resolved', {
          type: 'spacing_conflict',
          property: conflict.property,
          action: 'removed from cssName, kept in atomicClassMap',
        });
      }
    });
  }

  // 创建向后兼容的配置视图
  createLegacyView(modernConfig: Config): Config {
    return {
      baseUnit: modernConfig.system?.baseUnit || modernConfig.baseUnit,
      unitConversion: modernConfig.system?.unitConversion || modernConfig.unitConversion,
      compression: modernConfig.system?.compression || modernConfig.compression,
      cssName: modernConfig.cssName || modernConfig.compatibility?.legacy?.cssName,
      baseClassName: modernConfig.baseClassName || modernConfig.compatibility?.legacy?.baseClassName,
      atomicClassMap: modernConfig.atomicClassMap || modernConfig.compatibility?.legacy?.atomicClassMap,
      importantFlags: modernConfig.importantFlags,
      multiFile: modernConfig.multiFile,
      output: modernConfig.output,
      variants: modernConfig.variants,
    };
  }

  // 生成兼容性报告
  generateCompatibilityReport(originalConfig: Config, adaptedConfig: Config): CompatibilityReport {
    const report: CompatibilityReport = {
      originalFormat: this.isNewFormat(originalConfig) ? 'modern' : 'legacy',
      adaptedFormat: 'modern',
      conflicts: [],
      warnings: [],
      recommendations: [],
    };

    // 检查配置冲突
    const validation = this.configValidator.validateConfig(adaptedConfig);
    report.warnings = validation.warnings;

    // 检查text属性冲突
    if (originalConfig.cssName?.text && originalConfig.atomicClassMap?.text) {
      report.conflicts.push({
        type: 'property_conflict',
        property: 'text',
        description: 'text property defined in both cssName and atomicClassMap',
      });
    }

    // 生成建议
    if (originalConfig.baseUnit !== adaptedConfig.system?.baseUnit) {
      report.recommendations.push('Consider using consistent base unit across all configurations');
    }

    if (!originalConfig.compression && adaptedConfig.system?.compression) {
      report.recommendations.push(
        'Compression has been enabled in the adapted configuration for better performance'
      );
    }

    return report;
  }

  // 获取适配器统计信息
  getStats(): AdapterStats {
    return {
      adaptationsCount: this.adaptationsCount,
      conflictsResolved: this.conflictsResolved,
      lastAdaptation: this.lastAdaptation,
    };
  }
}

export default CompatibilityAdapter;