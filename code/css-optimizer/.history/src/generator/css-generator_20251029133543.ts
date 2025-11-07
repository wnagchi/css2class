import { Generator, CSSClass, CSSRule, GenerateOptions } from '../types';
import { Config } from '../types';
import * as postcss from 'postcss';
import * as cssnano from 'cssnano';

/**
 * CSS生成器
 */
export class CSSGenerator implements Generator {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * 生成CSS代码
   */
  generate(classes: CSSClass[], options: GenerateOptions = {}): string {
    const {
      minify = this.config.output.minify,
      baseStyles
    } = options;

    // 去重和合并类
    const uniqueClasses = this.mergeDuplicateClasses(classes);

    // 生成CSS
    let css = this.generateCSSFromClasses(uniqueClasses);

    // 添加Base样式
    if (baseStyles) {
      css = baseStyles + '\n\n' + css;
    }

    // 压缩CSS
    if (minify) {
      css = this.minifyCSS(css);
    }

    return css;
  }

  /**
   * 生成Source Map
   */
  generateSourceMap(css: string, originalFiles: string[]): string {
    // 简化实现，实际项目中可以使用更复杂的Source Map生成
    return `/*# sourceMappingURL=data:application/json;base64,${Buffer.from(JSON.stringify({
      version: 3,
      sources: originalFiles,
      mappings: '',
      names: []
    })).toString('base64')} */`;
  }

  /**
   * 压缩CSS
   */
  minifyCSS(css: string): string {
    try {
      const result = postcss([
        cssnano({
          preset: ['default', {
            discardComments: {
              removeAll: true,
            },
            reduceIdents: false,
            zindex: false,
          }]
        })
      ]).process(css, { from: undefined });

      return result.css;
    } catch (error) {
      console.warn('CSS压缩失败，使用原始CSS:', error);
      return css;
    }
  }

  /**
   * 合并重复的CSS类
   */
  private mergeDuplicateClasses(classes: CSSClass[]): CSSClass[] {
    const classMap = new Map<string, CSSClass>();

    for (const cssClass of classes) {
      const key = this.getClassKey(cssClass);
      
      if (classMap.has(key)) {
        // 合并规则
        const existing = classMap.get(key)!;
        existing.rules = this.mergeRules(existing.rules, cssClass.rules);
      } else {
        classMap.set(key, { ...cssClass });
      }
    }

    return Array.from(classMap.values());
  }

  /**
   * 获取类的唯一键
   */
  private getClassKey(cssClass: CSSClass): string {
    const rulesKey = cssClass.rules
      .map(rule => `${rule.property}:${rule.value}`)
      .sort()
      .join(';');
    
    return `${cssClass.name}|${cssClass.mediaQuery || ''}|${cssClass.pseudoClass || ''}|${rulesKey}`;
  }

  /**
   * 合并CSS规则
   */
  private mergeRules(existingRules: CSSRule[], newRules: CSSRule[]): CSSRule[] {
    const ruleMap = new Map<string, CSSRule>();

    // 添加现有规则
    for (const rule of existingRules) {
      ruleMap.set(rule.property, rule);
    }

    // 添加新规则，相同属性覆盖
    for (const rule of newRules) {
      ruleMap.set(rule.property, rule);
    }

    return Array.from(ruleMap.values());
  }

  /**
   * 从CSS类生成CSS代码
   */
  private generateCSSFromClasses(classes: CSSClass[]): string {
    const cssParts: string[] = [];

    // 按媒体查询分组
    const mediaGroups = this.groupByMediaQuery(classes);

    for (const [mediaQuery, mediaClasses] of mediaGroups.entries()) {
      if (mediaQuery) {
        cssParts.push(`${mediaQuery} {`);
      }

      // 按伪类分组
      const pseudoGroups = this.groupByPseudoClass(mediaClasses);

      for (const [pseudoClass, pseudoClasses] of pseudoGroups.entries()) {
        if (pseudoClass) {
          cssParts.push(`  .${pseudoClasses[0].name.split(':')[0]}:${pseudoClass} {`);
        } else {
          cssParts.push(`  .${pseudoClasses[0].name} {`);
        }

        // 生成规则
        for (const cssClass of pseudoClasses) {
          for (const rule of cssClass.rules) {
            cssParts.push(`    ${rule.property}: ${rule.value}${rule.important ? ' !important' : ''};`);
          }
        }

        cssParts.push('  }');
      }

      if (mediaQuery) {
        cssParts.push('}');
      }

      cssParts.push(''); // 空行分隔
    }

    return cssParts.join('\n').trim();
  }

  /**
   * 按媒体查询分组
   */
  private groupByMediaQuery(classes: CSSClass[]): Map<string, CSSClass[]> {
    const groups = new Map<string, CSSClass[]>();

    for (const cssClass of classes) {
      const mediaQuery = cssClass.mediaQuery || '';
      
      if (!groups.has(mediaQuery)) {
        groups.set(mediaQuery, []);
      }
      
      groups.get(mediaQuery)!.push(cssClass);
    }

    return groups;
  }

  /**
   * 按伪类分组
   */
  private groupByPseudoClass(classes: CSSClass[]): Map<string, CSSClass[]> {
    const groups = new Map<string, CSSClass[]>();

    for (const cssClass of classes) {
      let pseudoClass = '';
      let baseClassName = cssClass.name;

      // 提取伪类
      if (cssClass.name.includes(':')) {
        const parts = cssClass.name.split(':');
        if (parts.length === 2) {
          pseudoClass = parts[1];
          baseClassName = parts[0];
        }
      }

      // 优先使用类中定义的伪类
      if (cssClass.pseudoClass) {
        pseudoClass = cssClass.pseudoClass;
      }

      if (!groups.has(pseudoClass)) {
        groups.set(pseudoClass, []);
      }

      groups.get(pseudoClass)!.push({
        ...cssClass,
        name: baseClassName
      });
    }

    return groups;
  }

  /**
   * 生成优化的CSS类名
   */
  generateOptimizedClassName(originalName: string, rules: CSSRule[]): string {
    // 生成短哈希作为类名
    const hash = this.generateHash(rules);
    return `opt-${hash}`;
  }

  /**
   * 生成哈希值
   */
  private generateHash(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * 生成CSS变量
   */
  generateCSSVariables(colors: Record<string, string>): string {
    const variableParts: string[] = [':root {'];

    for (const [name, value] of Object.entries(colors)) {
      variableParts.push(`  --color-${name}: ${value};`);
    }

    variableParts.push('}');
    return variableParts.join('\n');
  }

  /**
   * 生成响应式CSS
   */
  generateResponsiveCSS(classes: CSSClass[]): string {
    const responsiveParts: string[] = [];

    // 按断点分组
    const breakpointGroups = this.groupByBreakpoint(classes);

    for (const [breakpoint, breakpointClasses] of breakpointGroups.entries()) {
      if (breakpoint) {
        const mediaQuery = `@media (min-width: ${breakpoint})`;
        responsiveParts.push(`${mediaQuery} {`);
      }

      const css = this.generateCSSFromClasses(breakpointClasses);
      responsiveParts.push(css);

      if (breakpoint) {
        responsiveParts.push('}');
      }

      responsiveParts.push('');
    }

    return responsiveParts.join('\n').trim();
  }

  /**
   * 按断点分组
   */
  private groupByBreakpoint(classes: CSSClass[]): Map<string, CSSClass[]> {
    const groups = new Map<string, CSSClass[]>();

    for (const cssClass of classes) {
      let breakpoint = '';
      let baseClassName = cssClass.name;

      // 从类名中提取断点
      if (cssClass.name.includes(':')) {
        const parts = cssClass.name.split(':');
        if (parts.length === 2 && this.config.breakpoints[parts[0]!]) {
          breakpoint = parts[0]!;
          baseClassName = parts[1]!;
        } else {
          // Fallback: treat entire name as base if malformed
          baseClassName = cssClass.name;
        }
      }

      if (!groups.has(breakpoint)) {
        groups.set(breakpoint, []);
      }

      groups.get(breakpoint)!.push({
        ...cssClass,
        name: baseClassName
      });
    }

    return groups;
  }

  /**
   * 生成CSS统计信息
   */
  generateStats(classes: CSSClass[]): {
    totalClasses: number;
    uniqueClasses: number;
    totalRules: number;
    mediaQueries: number;
    pseudoClasses: number;
    propertyCounts: Record<string, number>;
  } {
    const uniqueClasses = this.mergeDuplicateClasses(classes);
    const mediaQueries = new Set(classes.map(c => c.mediaQuery).filter(Boolean));
    const pseudoClasses = new Set(classes.map(c => c.pseudoClass).filter(Boolean));
    
    const propertyCounts: Record<string, number> = {};
    let totalRules = 0;

    for (const cssClass of uniqueClasses) {
      for (const rule of cssClass.rules) {
        propertyCounts[rule.property] = (propertyCounts[rule.property] || 0) + 1;
        totalRules++;
      }
    }

    return {
      totalClasses: classes.length,
      uniqueClasses: uniqueClasses.length,
      totalRules,
      mediaQueries: mediaQueries.size,
      pseudoClasses: pseudoClasses.size,
      propertyCounts
    };
  }

  /**
   * 验证CSS规则
   */
  validateCSSRules(rules: CSSRule[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const rule of rules) {
      // 检查属性名
      if (!rule.property || typeof rule.property !== 'string') {
        errors.push(`无效的属性名: ${rule.property}`);
      }

      // 检查值
      if (!rule.value || typeof rule.value !== 'string') {
        errors.push(`无效的属性值: ${rule.value}`);
      }

      // 检查颜色值
      if (['color', 'background-color', 'border-color'].includes(rule.property)) {
        if (!this.isValidColorValue(rule.value)) {
          errors.push(`无效的颜色值: ${rule.value}`);
        }
      }

      // 检查数值+单位
      if (/^\d+(\.\d+)?$/.test(rule.value)) {
        if (!this.hasValidUnit(rule.value)) {
          errors.push(`数值缺少单位: ${rule.value}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 检查是否为有效颜色值
   */
  private isValidColorValue(value: string): boolean {
    const colorKeywords = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'transparent'];
    const hexPattern = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
    const rgbPattern = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/;
    const rgbaPattern = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(0|1|0?\.\d+)\s*\)$/;

    return colorKeywords.includes(value.toLowerCase()) ||
           hexPattern.test(value) ||
           rgbPattern.test(value) ||
           rgbaPattern.test(value);
  }

  /**
   * 检查是否有有效单位
   */
  private hasValidUnit(value: string): boolean {
    const units = ['px', 'rem', 'em', '%', 'vh', 'vw', 'rpx'];
    return units.some(unit => value.endsWith(unit));
  }
}