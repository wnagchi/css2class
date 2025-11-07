import { Config } from '../types';
/**
 * 工具类
 */
export declare class Utils {
    private config;
    constructor(config: Config);
    /**
     * 解析颜色值
     * @param colorValue 颜色值
     * @returns 解析后的颜色值，解析失败返回null
     */
    parseColor(colorValue: string): string | null;
    /**
     * 检查是否为有效颜色
     * @param colorValue 颜色值
     * @returns 是否为有效颜色
     */
    isValidColor(colorValue: string): boolean;
    /**
     * 单位转换
     * @param value 数值
     * @param fromUnit 源单位
     * @param toUnit 目标单位
     * @returns 转换后的数值
     */
    convertUnit(value: number, fromUnit: string, toUnit: string): number;
    /**
     * 获取单位转换因子
     * @param unit 单位
     * @returns 转换因子，null表示不支持该单位
     */
    private getUnitFactor;
    /**
     * 生成CSS类名
     * @param pattern 模式
     * @param value 值
     * @returns CSS类名
     */
    generateClassName(pattern: string, value: string): string;
    /**
     * 获取断点值
     * @param breakpoint 断点名称
     * @returns 断点值
     */
    getBreakpointValue(breakpoint: string): string;
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
    } | null;
    /**
     * 检查是否为伪类
     * @param pseudo 伪类名称
     * @returns 是否为伪类
     */
    private isPseudoClass;
    /**
     * 获取属性映射
     * @param prefix 前缀
     * @returns 属性映射
     */
    getPropertyMapping(prefix: string): {
        property: string;
        category: string;
    } | null;
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
    };
    /**
     * 清理CSS类名
     * @param className CSS类名
     * @returns 清理后的类名
     */
    sanitizeClassName(className: string): string;
    /**
     * 检查文件是否应该被处理
     * @param filePath 文件路径
     * @returns 是否应该被处理
     */
    shouldProcessFile(filePath: string): boolean;
    /**
     * 路径模式匹配
     * @param filePath 文件路径
     * @param pattern 模式
     * @returns 是否匹配
     */
    private matchPattern;
    /**
     * 获取文件相对路径
     * @param filePath 文件绝对路径
     * @param basePath 基础路径
     * @returns 相对路径
     */
    getRelativePath(filePath: string, basePath: string): string;
    /**
     * 生成唯一标识符
     * @param prefix 前缀
     * @returns 唯一标识符
     */
    generateId(prefix?: string): string;
}
//# sourceMappingURL=utils.d.ts.map