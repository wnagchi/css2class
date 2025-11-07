import { EventBus } from '../core/EventBus';
import ConfigManager from '../core/ConfigManager';
import ImportantParser from '../parsers/ImportantParser';
import { Config } from '../../types';

// UnitProcessor 暂时使用 any 类型，因为还没有迁移
declare const UnitProcessor: any;

interface GenerationResult {
  cssStr: string;
  userBaseClassArr: string[];
}

interface GenerationStats {
  generatedCount: number;
  generationTime: number;
  cssLength: number;
}

interface ParsedClassName {
  property: string;
  value: string;
  unit?: string;
}

class DynamicClassGenerator {
  private eventBus: EventBus;
  private configManager: ConfigManager;
  private importantParser: ImportantParser;
  private unitProcessor: any;
  private cssCache: Map<string, string>;
  private cacheEnabled: boolean;

  constructor(
    eventBus: EventBus,
    configManager: ConfigManager,
    importantParser: ImportantParser
  ) {
    this.eventBus = eventBus;
    this.configManager = configManager;
    this.importantParser = importantParser;

    // 初始化单位处理器
    this.unitProcessor = new UnitProcessor(this.configManager.getConfig());

    // CSS生成缓存
    this.cssCache = new Map();
    this.cacheEnabled = true;
  }

  // 生成动态CSS类列表
  getClassList(classArr: string[]): GenerationResult {
    if (!Array.isArray(classArr)) {
      this.eventBus.emit('generator:error', { error: 'classArr must be an array' });
      return { cssStr: '', userBaseClassArr: [] };
    }

    const unitConversion = this.configManager.getUnitConversion();
    const cssNameMap = this.configManager.getCssNameMap();
    let cssStr = '';
    const userBaseClassArr: string[] = [];

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
            css: classCss,
            index,
          });
        } else {
          this.eventBus.emit('generator:dynamic:unknown', {
            className,
            property: name[0],
          });
        }
      } catch (error) {
        this.eventBus.emit('generator:dynamic:error', {
          className,
          error: (error as Error).message,
        });
      }
    });

    this.eventBus.emit('generator:dynamic:completed', {
      generatedCount: classArr.length,
      cssLength: cssStr.length,
      userBaseClassArr: userBaseClassArr.length,
    });

    return { cssStr, userBaseClassArr };
  }

  // 智能解析类名
  private parseClassNameIntelligent(className: string): [string, string] | null {
    if (!className || typeof className !== 'string') {
      return null;
    }

    // 检查是否包含连字符
    if (!className.includes('-')) {
      return null;
    }

    const parts = className.split('-');
    if (parts.length < 2) {
      return null;
    }

    const property = parts[0];
    const value = parts.slice(1).join('-');

    return [property, value];
  }

  // 生成CSS字符串
  private getClassListStr(name: [string, string], originalClassName: string, isImportant: boolean): string {
    const [property, value] = name;
    const cssProperty = this.getCSSProperty(property);

    if (!cssProperty) {
      return '';
    }

    // 获取配置的CSS值
    const cssValue = this.getCSSValue(property, value);

    if (!cssValue) {
      return '';
    }

    // 处理单位转换
    const processedValue = this.processUnitValue(cssValue, value);

    // 添加!important
    const finalValue = this.importantParser.addImportantToCss(processedValue, isImportant);

    return `.${originalClassName} { ${cssProperty}: ${finalValue} }\n`;
  }

  // 获取CSS属性名
  private getCSSProperty(property: string): string | null {
    const propertyMap: Record<string, string> = {
      'w': 'width',
      'h': 'height',
      'm': 'margin',
      'mt': 'margin-top',
      'mr': 'margin-right',
      'mb': 'margin-bottom',
      'ml': 'margin-left',
      'mx': 'margin-left, margin-right',
      'my': 'margin-top, margin-bottom',
      'p': 'padding',
      'pt': 'padding-top',
      'pr': 'padding-right',
      'pb': 'padding-bottom',
      'pl': 'padding-left',
      'px': 'padding-left, padding-right',
      'py': 'padding-top, padding-bottom',
      'text': 'color',
      'font': 'font-size',
      'bg': 'background-color',
      'border': 'border',
      'rounded': 'border-radius',
      'shadow': 'box-shadow',
      'flex': 'flex',
      'grid': 'grid',
      'display': 'display',
      'position': 'position',
      'z': 'z-index',
      'opacity': 'opacity',
      'overflow': 'overflow',
    };

    return propertyMap[property] || null;
  }

  // 获取CSS值
  private getCSSValue(property: string, value: string): string | null {
    const config = this.configManager.getConfig();

    // 尝试从配置中获取值
    if (config.cssName && config.cssName[value]) {
      return config.cssName[value];
    }

    // 处理数值
    if (/^\d+(\.\d+)?$/.test(value)) {
      return value;
    }

    // 处理特殊值
    const specialValues: Record<string, string> = {
      'auto': 'auto',
      'inherit': 'inherit',
      'initial': 'initial',
      'unset': 'unset',
      'transparent': 'transparent',
      'current': 'currentColor',
    };

    return specialValues[value] || null;
  }

  // 处理单位值
  private processUnitValue(cssValue: string, originalValue: string): string {
    if (this.unitProcessor) {
      try {
        // 使用UnitProcessor处理单位
        return this.unitProcessor.processValue(cssValue, originalValue);
      } catch (error) {
        // 如果处理失败，返回原值
        return cssValue;
      }
    }

    return cssValue;
  }

  // 创建用户基础类列表
  createUserBaseClassList(classArr: string[]): string {
    const cssNameMap = this.configManager.getCssNameMap();
    let result = '';

    for (const className of classArr) {
      const name = this.parseClassNameIntelligent(className);

      if (name && cssNameMap.has(name[0])) {
        const cssValue = this.getCSSValue(name[0], name[1]);
        if (cssValue) {
          result += `.${cssNameMap.get(name[0])} { ${cssValue} }\n`;
        }
      }
    }

    return result;
  }

  // 批量生成CSS
  batchGenerate(classArrays: string[][]): Array<{ className: string; css: string; error?: string }> {
    const results: Array<{ className: string; css: string; error?: string }> = [];

    classArrays.forEach((classArr, index) => {
      try {
        const result = this.getClassList(classArr);
        results.push({
          className: `batch_${index}`,
          css: result.cssStr,
        });
      } catch (error) {
        results.push({
          className: `batch_${index}`,
          css: '',
          error: (error as Error).message,
        });
      }
    });

    return results;
  }

  // 缓存管理
  clearCache(): void {
    this.cssCache.clear();
    this.eventBus.emit('generator:cache:cleared');
  }

  getCacheStats(): { size: number; enabled: boolean } {
    return {
      size: this.cssCache.size,
      enabled: this.cacheEnabled,
    };
  }

  setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
    if (!enabled) {
      this.clearCache();
    }
  }

  // 获取生成统计信息
  getGenerationStats(): GenerationStats {
    return {
      generatedCount: 0,
      generationTime: 0,
      cssLength: 0,
    };
  }

  // 验证生成的CSS
  validateGeneratedCSS(css: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!css || typeof css !== 'string') {
      errors.push('CSS must be a non-empty string');
      return { isValid: false, errors };
    }

    // 基本CSS语法检查
    const cssPattern = /\.([a-zA-Z0-9_-]+)\s*\{\s*([^}]+)\s*\}/g;
    const matches = css.match(cssPattern);

    if (!matches || matches.length === 0) {
      errors.push('No valid CSS rules found');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // 性能测试
  performanceTest(classArr: string[], iterations = 1000): { duration: number; classesPerSecond: number } {
    const startTime = process.hrtime.bigint();

    for (let i = 0; i < iterations; i++) {
      this.getClassList(classArr);
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // 转换为毫秒
    const classesPerSecond = (classArr.length * iterations * 1000) / duration;

    return {
      duration,
      classesPerSecond,
    };
  }
}

export default DynamicClassGenerator;