import { Parser, ParseResult } from '../types';
import { Utils } from '../utils/utils';
/**
 * HTML解析器
 */
export declare class HTMLParser implements Parser {
    private utils;
    constructor(utils: Utils);
    /**
     * 解析HTML内容
     */
    parse(filePath: string, content: string): Promise<ParseResult>;
    /**
     * 检查是否支持该文件格式
     */
    supports(filePath: string): boolean;
    /**
     * 获取支持的文件格式
     */
    getSupportedFormats(): string[];
    /**
     * 解析CSS类名
     */
    private parseClassName;
    /**
     * 生成CSS规则
     */
    private generateCSSRule;
    /**
     * 解析内联样式
     */
    private parseInlineStyles;
}
/**
 * Vue解析器
 */
export declare class VueParser implements Parser {
    private utils;
    private htmlParser;
    constructor(utils: Utils);
    /**
     * 解析Vue文件
     */
    parse(filePath: string, content: string): Promise<ParseResult>;
    /**
     * 检查是否支持该文件格式
     */
    supports(filePath: string): boolean;
    /**
     * 获取支持的文件格式
     */
    getSupportedFormats(): string[];
    /**
     * 解析样式块
     */
    private parseStyleBlock;
}
/**
 * WXML解析器（微信小程序）
 */
export declare class WXMLParser implements Parser {
    private utils;
    constructor(utils: Utils);
    /**
     * 解析WXML文件
     */
    parse(filePath: string, content: string): Promise<ParseResult>;
    /**
     * 检查是否支持该文件格式
     */
    supports(filePath: string): boolean;
    /**
     * 获取支持的文件格式
     */
    getSupportedFormats(): string[];
    /**
     * 解析CSS类名
     */
    private parseClassName;
    /**
     * 生成CSS规则
     */
    private generateCSSRule;
    /**
     * 解析内联样式
     */
    private parseInlineStyles;
}
/**
 * 解析器管理器
 */
export declare class ParserManager {
    private parsers;
    constructor(utils: Utils);
    /**
     * 获取合适的解析器
     */
    getParser(filePath: string): Parser | null;
    /**
     * 解析文件
     */
    parseFile(filePath: string, content: string): Promise<ParseResult>;
    /**
     * 获取所有支持的格式
     */
    getAllSupportedFormats(): string[];
    /**
     * 检查是否支持指定格式
     */
    supportsFormat(format: string): boolean;
}
//# sourceMappingURL=parsers.d.ts.map