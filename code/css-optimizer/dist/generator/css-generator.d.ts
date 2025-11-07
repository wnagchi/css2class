import { Generator, CSSClass, CSSRule, GenerateOptions } from '../types';
import { Config } from '../types';
/**
 * CSS生成器
 */
export declare class CSSGenerator implements Generator {
    private config;
    constructor(config: Config);
    /**
     * 生成CSS代码
     */
    generate(classes: CSSClass[], options?: GenerateOptions): string;
    /**
     * 生成Source Map
     */
    generateSourceMap(css: string, originalFiles: string[]): string;
    /**
     * 压缩CSS
     */
    minifyCSS(css: string): string;
    /**
     * 合并重复的CSS类
     */
    private mergeDuplicateClasses;
    /**
     * 获取类的唯一键
     */
    private getClassKey;
    /**
     * 合并CSS规则
     */
    private mergeRules;
    /**
     * 从CSS类生成CSS代码
     */
    private generateCSSFromClasses;
    /**
     * 按媒体查询分组
     */
    private groupByMediaQuery;
    /**
     * 按伪类分组
     */
    private groupByPseudoClass;
    /**
     * 生成优化的CSS类名
     */
    generateOptimizedClassName(originalName: string, rules: CSSRule[]): string;
    /**
     * 生成哈希值
     */
    private generateHash;
    /**
     * 生成CSS变量
     */
    generateCSSVariables(colors: Record<string, string>): string;
    /**
     * 生成响应式CSS
     */
    generateResponsiveCSS(classes: CSSClass[]): string;
    /**
     * 按断点分组
     */
    private groupByBreakpoint;
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
    };
    /**
     * 验证CSS规则
     */
    validateCSSRules(rules: CSSRule[]): {
        valid: boolean;
        errors: string[];
    };
    /**
     * 检查是否为有效颜色值
     */
    private isValidColorValue;
    /**
     * 检查是否有有效单位
     */
    private hasValidUnit;
}
//# sourceMappingURL=css-generator.d.ts.map