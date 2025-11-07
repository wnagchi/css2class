import color from 'color';
import * as path from 'path';
import { Config } from '../types';

/**
 * 工具类
 */
export class Utils {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * 解析颜色值
   * @param colorValue 颜色值
   * @returns 解析后的颜色值，解析失败返回null
   */
  parseColor(colorValue: string): string | null {
    if (!colorValue) return null;

    // 检查自定义颜色映射
    if (this.config.colors.customColors[colorValue]) {
      return this.config.colors.customColors[colorValue];
    }

    // 检查直接颜色值解析
    if (this.config.colors.directColorParsing) {
      try {
        // 尝试解析为颜色对象
        const parsedColor = color(colorValue);
        return parsedColor.hex();
      } catch (error) {
        // 解析失败，忽略错误
      }
    }

    return null;
  }

  /**
   * 检查是否为有效颜色
   * @param colorValue 颜色值
   * @returns 是否为有效颜色
   */
  isValidColor(colorValue: string): boolean {
    return this.parseColor(colorValue) !== null;
  }

  /**
   * 单位转换
   * @param value 数值
   * @param fromUnit 源单位
   * @param toUnit 目标单位
   * @returns 转换后的数值
   */
  convertUnit(value: number, fromUnit: string, toUnit: string): number {
    if (fromUnit === toUnit) return value;

    // 获取转换因子
    const fromFactor = this.getUnitFactor(fromUnit);
    const toFactor = this.getUnitFactor(toUnit);

    if (fromFactor === null || toFactor === null) {
      throw new Error(`不支持的单位转换: ${fromUnit} -> ${toUnit}`);
    }

    return (value * fromFactor) / toFactor;
  }

  /**
   * 获取单位转换因子
   * @param unit 单位
   * @returns 转换因子，null表示不支持该单位
   */
  private getUnitFactor(unit: string): number | null {
    // 检查spacing单位配置
    for (const category of Object.values(this.config.units)) {
      if (category.conversions[unit] !== undefined) {
        return category.conversions[unit];
      }
    }
    return null;
  }

  /**
   * 生成CSS类名
   * @param pattern 模式
   * @param value 值
   * @returns CSS类名
   */
  generateClassName(pattern: string, value: string): string {
    return `${pattern}-${value}`;
  }

  /**
   * 获取断点值
   * @param breakpoint 断点名称
   * @returns 断点值
   */
  getBreakpointValue(breakpoint: string): string {
    return this.config.breakpoints[breakpoint] || breakpoint;
  }

  /**
   * 解析CSS类名
   * @param className CSS类名
   * @returns 解析结果
   */
  parseClassName(className: string): {
    prefix: string;
    value: string;
    pseudoClass?: string;
    responsive?: string;
  } | null {
    // 处理响应式前缀 (md:container)
    let responsive: string | undefined;
    let remainingClass = className;

    if (className.includes(':')) {
      const parts = className.split(':');
      if (parts.length === 2 && this.config.breakpoints[parts[0]!]) {
        responsive = parts[0]!;
        remainingClass = parts[1]!;
      }
    }

    // 处理伪类 (hover:button)
    let pseudoClass: string | undefined;
    if (remainingClass.includes(':')) {
      const parts = remainingClass.split(':');
      if (parts.length === 2 && this.isPseudoClass(parts[0]!)) {
        pseudoClass = parts[0]!;
        remainingClass = parts[1]!;
      }
    }

    // 解析前缀和值
    const match = remainingClass.match(/^([a-zA-Z-]+)-(.+)$/);
    if (!match) {
      return null;
    }

    const result: { prefix: string; value: string; pseudoClass?: string; responsive?: string } = {
      prefix: match[1]!,
      value: match[2]!
    };

    if (pseudoClass) {
      result.pseudoClass = pseudoClass;
    }
    if (responsive) {
      result.responsive = responsive;
    }

    return result;
  }

  /**
   * 检查是否为伪类
   * @param pseudo 伪类名称
   * @returns 是否为伪类
   */
  private isPseudoClass(pseudo: string): boolean {
    const pseudoClasses = ['hover', 'focus', 'active', 'disabled', 'checked', 'selected'];
    return pseudoClasses.includes(pseudo);
  }

  /**
   * 获取属性映射
   * @param prefix 前缀
   * @returns 属性映射
   */
  getPropertyMapping(prefix: string): {
    property: string;
    category: string;
  } | null {
    for (const [category, mappings] of Object.entries(this.config.rules)) {
      for (const [property, prefixes] of Object.entries(mappings)) {
        if (prefixes.includes(prefix)) {
          return { property, category };
        }
      }
    }
    return null;
  }

  /**
   * 生成CSS规则
   * @param property 属性名
   * @param value 属性值
   * @param unitType 单位类型
   * @returns CSS规则
   */
  generateCSSRule(property: string, value: string, unitType?: keyof Config['units']): {
    property: string;
    value: string;
  } {
    // 如果值是纯数字，添加默认单位
    if (/^\d+(\.\d+)?$/.test(value)) {
      const unitConfig = unitType ? this.config.units[unitType] : null;
      if (unitConfig) {
        const unit = unitConfig.defaultUnit;
        return { property, value: `${value}${unit}` };
      }
    }

    return { property, value };
  }

  /**
   * 清理CSS类名
   * @param className CSS类名
   * @returns 清理后的类名
   */
  sanitizeClassName(className: string): string {
    return className
      .replace(/[^a-zA-Z0-9:_-]/g, '-') // 替换非法字符为短横线
      .replace(/--+/g, '-') // 合并多个短横线
      .replace(/^-+|-+$/g, ''); // 移除首尾短横线
  }

  /**
   * 检查文件是否应该被处理
   * @param filePath 文件路径
   * @returns 是否应该被处理
   */
  shouldProcessFile(filePath: string): boolean {
    // 检查文件格式
    const ext = path.extname(filePath).toLowerCase();
    if (!this.config.targetFormats.includes(ext)) {
      return false;
    }

    // 检查忽略模式
    for (const pattern of this.config.watch.ignorePatterns) {
      if (this.matchPattern(filePath, pattern)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 路径模式匹配
   * @param filePath 文件路径
   * @param pattern 模式
   * @returns 是否匹配
   */
  private matchPattern(filePath: string, pattern: string): boolean {
    // 简单的glob模式匹配
    const regex = new RegExp(
      pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '.')
    );
    return regex.test(filePath);
  }

  /**
   * 获取文件相对路径
   * @param filePath 文件绝对路径
   * @param basePath 基础路径
   * @returns 相对路径
   */
  getRelativePath(filePath: string, basePath: string): string {
    const relative = path.relative(basePath, filePath);
    return relative.replace(/\\/g, '/');
  }

  /**
   * 生成唯一标识符
   * @param prefix 前缀
   * @returns 唯一标识符
   */
  generateId(prefix: string = 'id'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}