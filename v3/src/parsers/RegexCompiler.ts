import { EventBus } from '../core/EventBus';

interface ImportantFlags {
  prefix: string[];
  suffix: string[];
  custom: string[];
}

interface CompiledRegex {
  classAttr: RegExp;
  classNames: RegExp;
  importantFlag: RegExp;
  twoPartClass: RegExp;
  percentageValue: RegExp;
  whitespace: RegExp;
  quotes: RegExp;
}

interface RegexValidationResult {
  valid: boolean;
  error?: string;
}

interface ClassAttributeMatch {
  fullMatch: string;
  classContent: string;
  index: number;
}

interface ClassNameMatch {
  className: string;
  index: number;
}

interface RegexDebugResult {
  pattern: string;
  testString: string;
  matches: RegExpMatchArray | null;
  matchCount: number;
  isValid: boolean;
  error?: string;
}

interface RegexStats {
  compiledCount: number;
  cacheSize: number;
  importantFlagsCount: {
    prefix: number;
    suffix: number;
    custom: number;
  };
}

class RegexCompiler {
  private eventBus: EventBus;
  private importantFlags: ImportantFlags;
  private compiledRegex: CompiledRegex | null = null;
  private cache: Map<string, RegExp> = new Map();

  constructor(eventBus: EventBus, importantFlags: ImportantFlags) {
    this.eventBus = eventBus;
    this.importantFlags = importantFlags;
    this.compileRegex();
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private compileRegex(): void {
    try {
      const allFlags = [
        ...this.importantFlags.prefix.map((flag) => `^${this.escapeRegex(flag)}`),
        ...this.importantFlags.suffix.map((flag) => `${this.escapeRegex(flag)}$`),
        ...this.importantFlags.custom.map((flag) => this.escapeRegex(flag)),
      ];

      this.compiledRegex = {
        classAttr: /class=(\"[^\"]*\"|'[^']*')/g,
        classNames: /[\w\-!]+/g,
        importantFlag: new RegExp(allFlags.join('|')),
        twoPartClass: /^([a-zA-Z_]+)-(.+)$/,
        percentageValue: /(\d+)b$/,
        whitespace: /\s+/g,
        quotes: /^["']|["']$/g,
      };

      this.eventBus.emit('regex:compiled', this.compiledRegex);
      this.eventBus.emit('parser:regex:ready');
    } catch (error) {
      this.eventBus.emit('regex:compilation:error', { error });
      throw error;
    }
  }

  // 获取编译后的正则表达式
  getCompiledRegex(): CompiledRegex | null {
    return this.compiledRegex;
  }

  // 更新Important标识并重新编译
  updateImportantFlags(importantFlags: ImportantFlags): void {
    this.importantFlags = importantFlags;
    this.compileRegex();
    this.clearCache();
  }

  // 缓存管理
  getCachedRegex(key: string): RegExp | undefined {
    return this.cache.get(key);
  }

  setCachedRegex(key: string, regex: RegExp): void {
    this.cache.set(key, regex);
  }

  clearCache(): void {
    this.cache.clear();
    this.eventBus.emit('regex:cache:cleared');
  }

  // 正则表达式测试工具
  testClassAttribute(text: string): boolean {
    if (!this.compiledRegex?.classAttr) return false;

    const testRegex = new RegExp(
      this.compiledRegex.classAttr.source,
      this.compiledRegex.classAttr.flags
    );
    return testRegex.test(text);
  }

  testImportantFlag(className: string): boolean {
    if (!this.compiledRegex?.importantFlag) return false;

    return this.compiledRegex.importantFlag.test(className);
  }

  testTwoPartClass(className: string): boolean {
    if (!this.compiledRegex?.twoPartClass) return false;

    return this.compiledRegex.twoPartClass.test(className);
  }

  // 正则表达式匹配工具
  matchClassAttributes(htmlStr: string): ClassAttributeMatch[] {
    if (!this.compiledRegex?.classAttr) return [];

    const matches: ClassAttributeMatch[] = [];
    let match: RegExpExecArray | null;
    const regex = new RegExp(
      this.compiledRegex.classAttr.source,
      this.compiledRegex.classAttr.flags
    );

    while ((match = regex.exec(htmlStr)) !== null) {
      matches.push({
        fullMatch: match[0],
        classContent: match[1],
        index: match.index || 0,
      });
    }

    return matches;
  }

  matchClassNames(classStr: string): ClassNameMatch[] {
    if (!this.compiledRegex?.classNames) return [];

    const matches: ClassNameMatch[] = [];
    let match: RegExpExecArray | null;
    const regex = new RegExp(
      this.compiledRegex.classNames.source,
      this.compiledRegex.classNames.flags
    );

    while ((match = regex.exec(classStr)) !== null) {
      matches.push({
        className: match[0],
        index: match.index,
      });
    }

    return matches;
  }

  // 性能优化：预编译常用正则
  precompileCommonPatterns(): void {
    const commonPatterns: Record<string, RegExp> = {
      // 常见的CSS类名模式
      cssClass: /^[a-zA-Z_][\w\-]*$/,
      // 数值模式
      number: /^\d+(\.\d+)?$/,
      // 单位模式
      unit: /^(px|em|rem|%|vw|vh|pt|cm|mm|in)$/,
      // 颜色模式
      color:
        /^(#[0-9a-fA-F]{3,6}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\))$/,
      // 媒体查询
      mediaQuery: /^@media\s+[^{]+$/,
      // 选择器
      selector: /^[.#]?[\w\-]+(\.[\w\-]+)*(\[[^\]]+\])?(:[^\s]+)*$/,
    };

    Object.entries(commonPatterns).forEach(([key, pattern]) => {
      this.setCachedRegex(key, pattern);
    });

    this.eventBus.emit('regex:common:precompiled', Object.keys(commonPatterns));
  }

  // 正则表达式验证
  validateRegex(pattern: string, flags = ''): RegexValidationResult {
    try {
      new RegExp(pattern, flags);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: (error as Error).message };
    }
  }

  // 正则表达式统计
  getRegexStats(): RegexStats {
    return {
      compiledCount: Object.keys(this.compiledRegex || {}).length,
      cacheSize: this.cache.size,
      importantFlagsCount: {
        prefix: this.importantFlags.prefix.length,
        suffix: this.importantFlags.suffix.length,
        custom: this.importantFlags.custom.length,
      },
    };
  }

  // 调试工具
  debugRegex(pattern: string, testString: string): RegexDebugResult {
    const validation = this.validateRegex(pattern);
    if (!validation.valid) {
      return { pattern, testString, matches: null, matchCount: 0, isValid: false, error: validation.error };
    }

    const regex = new RegExp(pattern);
    const matches = testString.match(regex);

    return {
      pattern,
      testString,
      matches,
      matchCount: matches ? matches.length : 0,
      isValid: validation.valid,
    };
  }
}

export default RegexCompiler;