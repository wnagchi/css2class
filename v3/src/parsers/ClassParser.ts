import { EventBus } from '../core/EventBus';
import RegexCompiler from './RegexCompiler';
import ImportantParser from './ImportantParser';
import ConfigManager from '../core/ConfigManager';
import { Config } from '../../types';

// UnitProcessor 暂时使用 any 类型，因为还没有迁移
declare const UnitProcessor: any;

interface ParseResult {
  classArr: string[];
  userStaticClassArr: string[];
}

interface ProcessedClass {
  original: string;
  clean: string;
  hasImportant: boolean;
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
  property?: string;
  value?: string;
  cssProperty?: string;
  unitAnalysis?: {
    warnings: string[];
    suggestions: string[];
  };
}

interface ParseStats {
  totalCount: number;
  classCount: number;
  staticClassCount: number;
  importantClassCount: number;
}

interface PerformanceResult {
  result: ParseResult;
  performance: {
    duration: number;
    classesPerMs: number;
    htmlSize: number;
    classesFound: number;
  };
}

interface DebugResult {
  inputLength: number;
  truncatedInput: string;
  result: ParseResult;
  validation: any;
  stats: ParseStats;
}

class ClassParser {
  private eventBus: EventBus;
  private regexCompiler: RegexCompiler;
  private importantParser: ImportantParser;
  private userStaticClassSet: Set<string>;
  private configManager: ConfigManager;
  private unitProcessor: any;

  constructor(
    eventBus: EventBus,
    regexCompiler: RegexCompiler,
    importantParser: ImportantParser,
    userStaticClassSet: Set<string>,
    configManager: ConfigManager
  ) {
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
  parseClassOptimized(htmlStr: string): ParseResult {
    if (!htmlStr || typeof htmlStr !== 'string') {
      this.eventBus.emit('parser:error', { error: 'Invalid HTML string provided' });
      return { classArr: [], userStaticClassArr: [] };
    }

    const classList = new Set<string>();
    const userStaticList = new Set<string>();
    const compiledRegex = this.regexCompiler.getCompiledRegex();

    if (!compiledRegex) {
      this.eventBus.emit('parser:error', { error: 'Regex not compiled' });
      return { classArr: [], userStaticClassArr: [] };
    }

    try {
      let match: RegExpExecArray | null;
      const classAttrRegex = new RegExp(
        compiledRegex.classAttr.source,
        compiledRegex.classAttr.flags
      );

      while ((match = classAttrRegex.exec(htmlStr)) !== null) {
        const classStr = match[1].slice(1, -1); // 移除引号
        const classes = classStr.split(/\s+/).filter(Boolean);

        for (const className of classes) {
          const cleanName = this.importantParser.cleanImportantFlag(className);

          // 智能类名预处理和验证
          const processedClass = this.preprocessClassName(className, cleanName);

          // 先检查是否是静态类
          if (this.userStaticClassSet.has(cleanName)) {
            userStaticList.add(processedClass.original);
            this.eventBus.emit('parser:static:found', {
              className: processedClass.original,
              cleanName,
              processed: processedClass,
            });
          }

          // 再检查是否是动态类
          if (cleanName.includes('-')) {
            classList.add(processedClass.original);
            this.eventBus.emit('parser:dynamic:found', {
              className: processedClass.original,
              cleanName,
              processed: processedClass,
            });
          }
        }
      }

      const result: ParseResult = {
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
      this.eventBus.emit('parser:error', { error: (error as Error).message });
      return { classArr: [], userStaticClassArr: [] };
    }
  }

  // 智能类名预处理
  private preprocessClassName(originalClassName: string, cleanName: string): ProcessedClass {
    const processed: ProcessedClass = {
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
  private isKnownCSSProperty(property: string): boolean {
    const knownProperties = [
      'm', 'mt', 'mr', 'mb', 'ml', 'mx', 'my',
      'p', 'pt', 'pr', 'pb', 'pl', 'px', 'py',
      'w', 'h', 'text', 'font', 'bg', 'border',
      'flex', 'grid', 'display', 'position', 'overflow',
      'z', 'opacity', 'rounded', 'shadow', 'transition',
    ];

    return knownProperties.includes(property);
  }

  // 获取CSS属性映射
  private getCSSPropertyMapping(property: string): string {
    const mappings: Record<string, string> = {
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
      'w': 'width',
      'h': 'height',
      'text': 'color',
      'font': 'font-size',
      'bg': 'background-color',
      'rounded': 'border-radius',
      'z': 'z-index',
    };

    return mappings[property] || property;
  }

  // 分析单位
  private analyzeUnit(property: string, value: string): { warnings: string[]; suggestions: string[] } {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // 这里应该调用 UnitProcessor 的方法
    // 由于 UnitProcessor 还没有迁移，暂时返回空数组
    return { warnings, suggestions };
  }

  // 解析文件（简化版）
  async parseFile(filePath: string, cache: any): Promise<ParseResult | null> {
    try {
      // 这里应该实现文件解析逻辑
      // 暂时返回 null，需要完整实现
      return null;
    } catch (error) {
      this.eventBus.emit('parser:file:error', { filePath, error: (error as Error).message });
      return null;
    }
  }

  // 更新静态类集合
  updateUserStaticClassSet(classSet: Set<string>): void {
    this.userStaticClassSet = classSet;
  }

  // 获取解析统计信息
  getParseStats(): ParseStats {
    // 返回当前解析器的统计信息
    return {
      totalCount: 0,
      classCount: 0,
      staticClassCount: 0,
      importantClassCount: 0,
    };
  }

  // 性能分析
  analyzePerformance(htmlStr: string): PerformanceResult {
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
  debugParse(htmlStr: string, maxLength = 1000): DebugResult {
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

  // 验证解析结果
  private validateParseResult(result: ParseResult): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(result.classArr)) {
      errors.push('classArr must be an array');
    }

    if (!Array.isArray(result.userStaticClassArr)) {
      errors.push('userStaticClassArr must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export default ClassParser;