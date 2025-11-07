import { Parser, ParseResult, CSSClass, CSSRule } from '../types';
import { Utils } from '../utils/utils';
import * as path from 'path';
import * as htmlparser2 from 'htmlparser2';

/**
 * HTML解析器
 */
export class HTMLParser implements Parser {
  private utils: Utils;

  constructor(utils: Utils) {
    this.utils = utils;
  }

  /**
   * 解析HTML内容
   */
  async parse(filePath: string, content: string): Promise<ParseResult> {
    const classes: CSSClass[] = [];
    const dependencies: string[] = [];

    try {
      const parser = new htmlparser2.Parser({
        onopentag: (name: string, attribs: Record<string, string>) => {
          // 解析class属性
          if (attribs.class) {
            const classNames = attribs.class.split(/\s+/).filter(Boolean);
            for (const className of classNames) {
              const cssClass = this.parseClassName(className);
              if (cssClass) {
                classes.push(cssClass);
              }
            }
          }

          // 解析style属性
          if (attribs.style) {
            const styleRules = this.parseInlineStyles(attribs.style);
            for (const rule of styleRules) {
              const className = this.utils.sanitizeClassName(`inline-${rule.property}-${rule.value}`);
              classes.push({
                name: className,
                rules: [rule]
              });
            }
          }
        },
        ontext: (text: string) => {
          // 处理文本中的class（如果需要）
        }
      }, {
        decodeEntities: true,
        lowerCaseAttributeNames: false
      });

      parser.parseComplete(content);

      return {
        classes,
        dependencies,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`解析HTML文件失败: ${filePath}, ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 检查是否支持该文件格式
   */
  supports(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.html', '.htm'].includes(ext);
  }

  /**
   * 获取支持的文件格式
   */
  getSupportedFormats(): string[] {
    return ['.html', '.htm'];
  }

  /**
   * 解析CSS类名
   */
  private parseClassName(className: string): CSSClass | null {
    const parsed = this.utils.parseClassName(className);
    if (!parsed) {
      return null;
    }

    const mapping = this.utils.getPropertyMapping(parsed.prefix);
    if (!mapping) {
      return null;
    }

    // 生成规则，支持方向/轴向简写（mt/mr/mb/ml/mx/my 以及 pt/pr/pb/pl/px/py）
    const rules: CSSRule[] = [];
    if (mapping.property === 'margin' || mapping.property === 'padding') {
      const prefix = parsed.prefix;
      const base = mapping.property; // 'margin' | 'padding'

      if (prefix.length >= 2) {
        const dir = prefix[1];
        if (dir === 't') {
          const rule = this.generateCSSRule(`${base}-top`, parsed.value, mapping.category);
          if (rule) rules.push(rule);
        } else if (dir === 'r') {
          const rule = this.generateCSSRule(`${base}-right`, parsed.value, mapping.category);
          if (rule) rules.push(rule);
        } else if (dir === 'b') {
          const rule = this.generateCSSRule(`${base}-bottom`, parsed.value, mapping.category);
          if (rule) rules.push(rule);
        } else if (dir === 'l') {
          const rule = this.generateCSSRule(`${base}-left`, parsed.value, mapping.category);
          if (rule) rules.push(rule);
        } else if (dir === 'x') {
          const left = this.generateCSSRule(`${base}-left`, parsed.value, mapping.category);
          const right = this.generateCSSRule(`${base}-right`, parsed.value, mapping.category);
          if (left) rules.push(left);
          if (right) rules.push(right);
        } else if (dir === 'y') {
          const top = this.generateCSSRule(`${base}-top`, parsed.value, mapping.category);
          const bottom = this.generateCSSRule(`${base}-bottom`, parsed.value, mapping.category);
          if (top) rules.push(top);
          if (bottom) rules.push(bottom);
        } else {
          const rule = this.generateCSSRule(base, parsed.value, mapping.category);
          if (rule) rules.push(rule);
        }
      } else {
        const rule = this.generateCSSRule(base, parsed.value, mapping.category);
        if (rule) rules.push(rule);
      }
    } else {
      const cssRule = this.generateCSSRule(mapping.property, parsed.value, mapping.category);
      if (!cssRule) {
        return null;
      }
      rules.push(cssRule);
    }

    // 处理伪类
    if (parsed.pseudoClass) {
      // 伪类会在生成阶段处理
    }

    // 处理响应式
    if (parsed.responsive) {
      // 响应式会在生成阶段处理
    }

    const result: CSSClass = {
      name: className,
      rules
    };
    if (parsed.pseudoClass) {
      result.pseudoClass = parsed.pseudoClass;
    }
    if (parsed.responsive) {
      result.mediaQuery = `@media (min-width: ${this.utils.getBreakpointValue(parsed.responsive)})`;
    }
    return result;
  }

  /**
   * 生成CSS规则
   */
  private generateCSSRule(property: string, value: string, category: string): CSSRule | null {
    try {
      let unitType: keyof Utils['config']['units'] | undefined;

      // 根据类别确定单位类型
      if (['margin', 'padding', 'gap'].includes(property) || category === 'spacing') {
        unitType = 'spacing';
      } else if (['font-size', 'text'].includes(property) || category === 'fonts') {
        unitType = 'fontSize';
      } else if (['width', 'height', 'max-width', 'min-width', 'max-height', 'min-height'].includes(property)) {
        unitType = 'width';
      }

      // 处理颜色值
      if (['color', 'background-color', 'border-color', 'text-color'].includes(property)) {
        const parsedColor = this.utils.parseColor(value);
        if (parsedColor) {
          return { property, value: parsedColor };
        }
        return null;
      }

      // 处理数值+单位
      if (/^\d+(\.\d+)?$/.test(value)) {
        const rule = this.utils.generateCSSRule(property, value, unitType);
        return rule;
      }

      // 处理其他值
      return { property, value };
    } catch (error) {
      return null;
    }
  }

  /**
   * 解析内联样式
   */
  private parseInlineStyles(styleString: string): CSSRule[] {
    const rules: CSSRule[] = [];
    const declarations = styleString.split(';');

    for (const declaration of declarations) {
      const [property, value] = declaration.split(':').map(s => s.trim());
      if (property && value) {
        rules.push({ property, value });
      }
    }

    return rules;
  }
}

/**
 * Vue解析器
 */
export class VueParser implements Parser {
  private utils: Utils;
  private htmlParser: HTMLParser;

  constructor(utils: Utils) {
    this.utils = utils;
    this.htmlParser = new HTMLParser(utils);
  }

  /**
   * 解析Vue文件
   */
  async parse(filePath: string, content: string): Promise<ParseResult> {
    const classes: CSSClass[] = [];
    const dependencies: string[] = [];

    try {
      // 提取template部分
      const templateMatch = content.match(/<template[^>]*>([\s\S]*?)<\/template>/i);
      if (templateMatch && templateMatch[1] !== undefined) {
        const templateContent = templateMatch[1] as string;
        const templateResult = await this.htmlParser.parse(filePath, templateContent);
        classes.push(...templateResult.classes);
      }

      // 提取style部分
      const styleMatches = content.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
      if (styleMatches) {
        for (const styleMatch of styleMatches) {
          const styleContent = styleMatch.replace(/<\/?style[^>]*>/gi, '');
          const styleClasses = this.parseStyleBlock(styleContent);
          classes.push(...styleClasses);
        }
      }

      return {
        classes,
        dependencies,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`解析Vue文件失败: ${filePath}, ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 检查是否支持该文件格式
   */
  supports(filePath: string): boolean {
    return path.extname(filePath).toLowerCase() === '.vue';
  }

  /**
   * 获取支持的文件格式
   */
  getSupportedFormats(): string[] {
    return ['.vue'];
  }

  /**
   * 解析样式块
   */
  private parseStyleBlock(styleContent: string): CSSClass[] {
    const classes: CSSClass[] = [];
    const cssRules = /([^{]+)\{([^}]+)\}/g;
    let match;

    while ((match = cssRules.exec(styleContent)) !== null) {
      if (!match[1] || !match[2]) {
        continue;
      }
      const selector = match[1]!.trim();
      const declarations = match[2]!.trim();

      // 只处理类选择器
      if (selector.startsWith('.')) {
        const className = selector.substring(1);
        const rules: CSSRule[] = [];

        const declarationPairs = declarations.split(';');
        for (const pair of declarationPairs) {
          const [property, value] = pair.split(':').map(s => s.trim());
          if (property && value) {
            rules.push({ property, value });
          }
        }

        if (rules.length > 0) {
          classes.push({ name: className, rules });
        }
      }
    }

    return classes;
  }
}

/**
 * WXML解析器（微信小程序）
 */
export class WXMLParser implements Parser {
  private utils: Utils;

  constructor(utils: Utils) {
    this.utils = utils;
  }

  /**
   * 解析WXML文件
   */
  async parse(filePath: string, content: string): Promise<ParseResult> {
    const classes: CSSClass[] = [];
    const dependencies: string[] = [];

    try {
      const parser = new htmlparser2.Parser({
        onopentag: (name: string, attribs: Record<string, string>) => {
          // 解析class属性
          if (attribs.class) {
            const classNames = attribs.class.split(/\s+/).filter(Boolean);
            for (const className of classNames) {
              const cssClass = this.parseClassName(className);
              if (cssClass) {
                classes.push(cssClass);
              }
            }
          }

          // 解析style属性（小程序支持内联样式）
          if (attribs.style) {
            const styleRules = this.parseInlineStyles(attribs.style);
            for (const rule of styleRules) {
              const className = this.utils.sanitizeClassName(`inline-${rule.property}-${rule.value}`);
              classes.push({
                name: className,
                rules: [rule]
              });
            }
          }

          // 解析wxss类名（小程序特有）
          if (attribs['wxss-class']) {
            const classNames = attribs['wxss-class'].split(/\s+/).filter(Boolean);
            for (const className of classNames) {
              const cssClass = this.parseClassName(className);
              if (cssClass) {
                classes.push(cssClass);
              }
            }
          }
        }
      }, {
        decodeEntities: true,
        lowerCaseAttributeNames: false
      });

      parser.parseComplete(content);

      return {
        classes,
        dependencies,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`解析WXML文件失败: ${filePath}, ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 检查是否支持该文件格式
   */
  supports(filePath: string): boolean {
    return path.extname(filePath).toLowerCase() === '.wxml';
  }

  /**
   * 获取支持的文件格式
   */
  getSupportedFormats(): string[] {
    return ['.wxml'];
  }

  /**
   * 解析CSS类名
   */
  private parseClassName(className: string): CSSClass | null {
    const parsed = this.utils.parseClassName(className);
    if (!parsed) {
      return null;
    }

    const mapping = this.utils.getPropertyMapping(parsed.prefix);
    if (!mapping) {
      return null;
    }

    // 生成规则，支持方向/轴向简写（mt/mr/mb/ml/mx/my 以及 pt/pr/pb/pl/px/py）
    const rules: CSSRule[] = [];
    if (mapping.property === 'margin' || mapping.property === 'padding') {
      const prefix = parsed.prefix;
      const base = mapping.property; // 'margin' | 'padding'

      if (prefix.length >= 2) {
        const dir = prefix[1];
        if (dir === 't') {
          const rule = this.generateCSSRule(`${base}-top`, parsed.value, mapping.category);
          if (rule) rules.push(rule);
        } else if (dir === 'r') {
          const rule = this.generateCSSRule(`${base}-right`, parsed.value, mapping.category);
          if (rule) rules.push(rule);
        } else if (dir === 'b') {
          const rule = this.generateCSSRule(`${base}-bottom`, parsed.value, mapping.category);
          if (rule) rules.push(rule);
        } else if (dir === 'l') {
          const rule = this.generateCSSRule(`${base}-left`, parsed.value, mapping.category);
          if (rule) rules.push(rule);
        } else if (dir === 'x') {
          const left = this.generateCSSRule(`${base}-left`, parsed.value, mapping.category);
          const right = this.generateCSSRule(`${base}-right`, parsed.value, mapping.category);
          if (left) rules.push(left);
          if (right) rules.push(right);
        } else if (dir === 'y') {
          const top = this.generateCSSRule(`${base}-top`, parsed.value, mapping.category);
          const bottom = this.generateCSSRule(`${base}-bottom`, parsed.value, mapping.category);
          if (top) rules.push(top);
          if (bottom) rules.push(bottom);
        } else {
          const rule = this.generateCSSRule(base, parsed.value, mapping.category);
          if (rule) rules.push(rule);
        }
      } else {
        const rule = this.generateCSSRule(base, parsed.value, mapping.category);
        if (rule) rules.push(rule);
      }
    } else {
      const cssRule = this.generateCSSRule(mapping.property, parsed.value, mapping.category);
      if (!cssRule) {
        return null;
      }
      rules.push(cssRule);
    }

    const result: CSSClass = {
      name: className,
      rules
    };
    if (parsed.pseudoClass) {
      result.pseudoClass = parsed.pseudoClass;
    }
    if (parsed.responsive) {
      result.mediaQuery = `@media (min-width: ${this.utils.getBreakpointValue(parsed.responsive)})`;
    }
    return result;
  }

  /**
   * 生成CSS规则
   */
  private generateCSSRule(property: string, value: string, category: string): CSSRule | null {
    try {
      let unitType: keyof Utils['config']['units'] | undefined;

      if (['margin', 'padding', 'gap'].includes(property) || category === 'spacing') {
        unitType = 'spacing';
      } else if (['font-size', 'text'].includes(property) || category === 'fonts') {
        unitType = 'fontSize';
      } else if (['width', 'height', 'max-width', 'min-width', 'max-height', 'min-height'].includes(property)) {
        unitType = 'width';
      }

      // 处理颜色值
      if (['color', 'background-color', 'border-color', 'text-color'].includes(property)) {
        const parsedColor = this.utils.parseColor(value);
        if (parsedColor) {
          return { property, value: parsedColor };
        }
        return null;
      }

      // 处理数值+单位
      if (/^\d+(\.\d+)?$/.test(value)) {
        const rule = this.utils.generateCSSRule(property, value, unitType);
        return rule;
      }

      return { property, value };
    } catch (error) {
      return null;
    }
  }

  /**
   * 解析内联样式
   */
  private parseInlineStyles(styleString: string): CSSRule[] {
    const rules: CSSRule[] = [];
    const declarations = styleString.split(';');

    for (const declaration of declarations) {
      const [property, value] = declaration.split(':').map(s => s.trim());
      if (property && value) {
        rules.push({ property, value });
      }
    }

    return rules;
  }
}

/**
 * 解析器管理器
 */
export class ParserManager {
  private parsers: Parser[] = [];

  constructor(utils: Utils) {
    this.parsers = [
      new HTMLParser(utils),
      new VueParser(utils),
      new WXMLParser(utils)
    ];
  }

  /**
   * 获取合适的解析器
   */
  getParser(filePath: string): Parser | null {
    return this.parsers.find(parser => parser.supports(filePath)) || null;
  }

  /**
   * 解析文件
   */
  async parseFile(filePath: string, content: string): Promise<ParseResult> {
    const parser = this.getParser(filePath);
    if (!parser) {
      throw new Error(`不支持的文件格式: ${filePath}`);
    }

    return parser.parse(filePath, content);
  }

  /**
   * 获取所有支持的格式
   */
  getAllSupportedFormats(): string[] {
    const formats = new Set<string>();
    this.parsers.forEach(parser => {
      parser.getSupportedFormats().forEach(format => formats.add(format));
    });
    return Array.from(formats);
  }

  /**
   * 检查是否支持指定格式
   */
  supportsFormat(format: string): boolean {
    return this.getAllSupportedFormats().includes(format.toLowerCase());
  }
}