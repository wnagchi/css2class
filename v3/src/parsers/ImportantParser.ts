import { EventBus } from '../core/EventBus';

interface ImportantFlags {
  prefix: string[];
  suffix: string[];
  custom: string[];
}

interface ValidationResult {
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

interface ImportantStats {
  prefixCount: number;
  suffixCount: number;
  customCount: number;
  totalFlags: number;
  flags: ImportantFlags;
}

interface BatchProcessResult {
  original: string;
  clean: string;
  isImportant: boolean;
  hasImportantFlag: boolean;
}

interface TestResult {
  className: string;
  isImportant: boolean;
  cleanName: string;
  originalLength: number;
  cleanLength: number;
}

interface ImportantExample {
  type: 'prefix' | 'suffix' | 'custom';
  flag: string;
  example: string;
  description: string;
}

class ImportantParser {
  private eventBus: EventBus;
  private importantFlags: ImportantFlags;

  constructor(eventBus: EventBus, importantFlags: ImportantFlags) {
    this.eventBus = eventBus;
    this.importantFlags = importantFlags;
  }

  // 检测类名是否包含Important标识
  hasImportantFlag(className: string): boolean {
    if (!className || typeof className !== 'string') {
      return false;
    }

    // 检查前缀标识
    for (const prefix of this.importantFlags.prefix) {
      if (className.startsWith(prefix)) {
        this.eventBus.emit('important:detected', { className, type: 'prefix', flag: prefix });
        return true;
      }
    }

    // 检查后缀标识
    for (const suffix of this.importantFlags.suffix) {
      if (className.endsWith(suffix)) {
        this.eventBus.emit('important:detected', { className, type: 'suffix', flag: suffix });
        return true;
      }
    }

    // 检查自定义标识
    for (const custom of this.importantFlags.custom) {
      if (className.includes(custom)) {
        this.eventBus.emit('important:detected', { className, type: 'custom', flag: custom });
        return true;
      }
    }

    return false;
  }

  // 清理Important标识，返回干净的类名
  cleanImportantFlag(className: string): string {
    if (!className || typeof className !== 'string') {
      return className;
    }

    let cleanName = className;
    let removedFlag: string | null = null;
    let removedType: string | null = null;

    // 清理前缀标识
    for (const prefix of this.importantFlags.prefix) {
      if (cleanName.startsWith(prefix)) {
        cleanName = cleanName.substring(prefix.length);
        removedFlag = prefix;
        removedType = 'prefix';
        break;
      }
    }

    // 清理后缀标识
    if (!removedFlag) {
      for (const suffix of this.importantFlags.suffix) {
        if (cleanName.endsWith(suffix)) {
          cleanName = cleanName.substring(0, cleanName.length - suffix.length);
          removedFlag = suffix;
          removedType = 'suffix';
          break;
        }
      }
    }

    // 清理自定义标识
    if (!removedFlag) {
      for (const custom of this.importantFlags.custom) {
        if (cleanName.includes(custom)) {
          cleanName = cleanName.replace(custom, '');
          removedFlag = custom;
          removedType = 'custom';
          break;
        }
      }
    }

    if (removedFlag) {
      this.eventBus.emit('important:cleaned', {
        original: className,
        cleaned: cleanName,
        removedFlag,
        removedType,
      });
    }

    return cleanName;
  }

  // 为CSS值添加!important
  addImportantToCss(cssValue: string, isImportant: boolean): string {
    if (!isImportant) {
      return cssValue;
    }

    // 如果已经包含!important，直接返回
    if (cssValue.includes('!important')) {
      return cssValue;
    }

    // 清理末尾的分号和空格
    const cleanValue = cssValue.replace(/;?\s*$/, '');
    const result = `${cleanValue} !important;`;

    this.eventBus.emit('important:added', { original: cssValue, result });
    return result;
  }

  // 批量处理Important标识
  batchProcessImportant(classNames: string[]): BatchProcessResult[] {
    const results: BatchProcessResult[] = [];

    for (const className of classNames) {
      const isImportant = this.hasImportantFlag(className);
      const cleanName = this.cleanImportantFlag(className);

      results.push({
        original: className,
        clean: cleanName,
        isImportant,
        hasImportantFlag: isImportant,
      });
    }

    this.eventBus.emit('important:batch:processed', {
      totalCount: classNames.length,
      importantCount: results.filter((r) => r.isImportant).length,
    });

    return results;
  }

  // 验证Important标识配置
  validateImportantFlags(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查前缀标识
    if (!Array.isArray(this.importantFlags.prefix)) {
      errors.push('importantFlags.prefix must be an array');
    } else {
      this.importantFlags.prefix.forEach((flag, index) => {
        if (typeof flag !== 'string' || flag.length === 0) {
          errors.push(`importantFlags.prefix[${index}] must be a non-empty string`);
        }
      });
    }

    // 检查后缀标识
    if (!Array.isArray(this.importantFlags.suffix)) {
      errors.push('importantFlags.suffix must be an array');
    } else {
      this.importantFlags.suffix.forEach((flag, index) => {
        if (typeof flag !== 'string' || flag.length === 0) {
          errors.push(`importantFlags.suffix[${index}] must be a non-empty string`);
        }
      });
    }

    // 检查自定义标识
    if (!Array.isArray(this.importantFlags.custom)) {
      errors.push('importantFlags.custom must be an array');
    } else {
      this.importantFlags.custom.forEach((flag, index) => {
        if (typeof flag !== 'string' || flag.length === 0) {
          errors.push(`importantFlags.custom[${index}] must be a non-empty string`);
        }
      });
    }

    // 检查标识冲突
    const allFlags = [
      ...this.importantFlags.prefix,
      ...this.importantFlags.suffix,
      ...this.importantFlags.custom,
    ];

    const duplicates = allFlags.filter((flag, index) => allFlags.indexOf(flag) !== index);
    if (duplicates.length > 0) {
      warnings.push(`Duplicate important flags detected: ${duplicates.join(', ')}`);
    }

    return { errors, warnings, isValid: errors.length === 0 };
  }

  // 获取Important标识统计
  getImportantStats(): ImportantStats {
    return {
      prefixCount: this.importantFlags.prefix.length,
      suffixCount: this.importantFlags.suffix.length,
      customCount: this.importantFlags.custom.length,
      totalFlags:
        this.importantFlags.prefix.length +
        this.importantFlags.suffix.length +
        this.importantFlags.custom.length,
      flags: {
        prefix: [...this.importantFlags.prefix],
        suffix: [...this.importantFlags.suffix],
        custom: [...this.importantFlags.custom],
      },
    };
  }

  // 更新Important标识配置
  updateImportantFlags(newImportantFlags: ImportantFlags): void {
    const oldFlags = { ...this.importantFlags };
    this.importantFlags = newImportantFlags;

    this.eventBus.emit('important:flags:updated', {
      old: oldFlags,
      new: newImportantFlags,
    });
  }

  // 测试Important标识
  testImportantFlags(testClassNames: string[]): TestResult[] {
    const results: TestResult[] = [];

    for (const className of testClassNames) {
      const isImportant = this.hasImportantFlag(className);
      const cleanName = this.cleanImportantFlag(className);

      results.push({
        className,
        isImportant,
        cleanName,
        originalLength: className.length,
        cleanLength: cleanName.length,
      });
    }

    return results;
  }

  // 生成Important标识示例
  generateExamples(): ImportantExample[] {
    const examples: ImportantExample[] = [];

    // 前缀示例
    this.importantFlags.prefix.forEach((prefix) => {
      examples.push({
        type: 'prefix',
        flag: prefix,
        example: `${prefix}w-100`,
        description: `Class with prefix flag "${prefix}"`,
      });
    });

    // 后缀示例
    this.importantFlags.suffix.forEach((suffix) => {
      examples.push({
        type: 'suffix',
        flag: suffix,
        example: `w-100${suffix}`,
        description: `Class with suffix flag "${suffix}"`,
      });
    });

    // 自定义示例
    this.importantFlags.custom.forEach((custom) => {
      examples.push({
        type: 'custom',
        flag: custom,
        example: `w-100${custom}`,
        description: `Class with custom flag "${custom}"`,
      });
    });

    return examples;
  }
}

export default ImportantParser;