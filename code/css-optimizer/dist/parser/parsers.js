"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParserManager = exports.WXMLParser = exports.VueParser = exports.HTMLParser = void 0;
const path = __importStar(require("path"));
const htmlparser2 = __importStar(require("htmlparser2"));
/**
 * HTML解析器
 */
class HTMLParser {
    constructor(utils) {
        this.utils = utils;
    }
    /**
     * 解析HTML内容
     */
    async parse(filePath, content) {
        const classes = [];
        const dependencies = [];
        try {
            const parser = new htmlparser2.Parser({
                onopentag: (name, attribs) => {
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
                ontext: (text) => {
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
        }
        catch (error) {
            throw new Error(`解析HTML文件失败: ${filePath}, ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 检查是否支持该文件格式
     */
    supports(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return ['.html', '.htm'].includes(ext);
    }
    /**
     * 获取支持的文件格式
     */
    getSupportedFormats() {
        return ['.html', '.htm'];
    }
    /**
     * 解析CSS类名
     */
    parseClassName(className) {
        const parsed = this.utils.parseClassName(className);
        if (!parsed) {
            return null;
        }
        const mapping = this.utils.getPropertyMapping(parsed.prefix);
        if (!mapping) {
            return null;
        }
        // 生成规则，支持方向/轴向简写（mt/mr/mb/ml/mx/my 以及 pt/pr/pb/pl/px/py）
        const rules = [];
        if (mapping.property === 'margin' || mapping.property === 'padding') {
            const prefix = parsed.prefix;
            const base = mapping.property; // 'margin' | 'padding'
            if (prefix.length >= 2) {
                const dir = prefix[1];
                if (dir === 't') {
                    const rule = this.generateCSSRule(`${base}-top`, parsed.value, mapping.category);
                    if (rule)
                        rules.push(rule);
                }
                else if (dir === 'r') {
                    const rule = this.generateCSSRule(`${base}-right`, parsed.value, mapping.category);
                    if (rule)
                        rules.push(rule);
                }
                else if (dir === 'b') {
                    const rule = this.generateCSSRule(`${base}-bottom`, parsed.value, mapping.category);
                    if (rule)
                        rules.push(rule);
                }
                else if (dir === 'l') {
                    const rule = this.generateCSSRule(`${base}-left`, parsed.value, mapping.category);
                    if (rule)
                        rules.push(rule);
                }
                else if (dir === 'x') {
                    const left = this.generateCSSRule(`${base}-left`, parsed.value, mapping.category);
                    const right = this.generateCSSRule(`${base}-right`, parsed.value, mapping.category);
                    if (left)
                        rules.push(left);
                    if (right)
                        rules.push(right);
                }
                else if (dir === 'y') {
                    const top = this.generateCSSRule(`${base}-top`, parsed.value, mapping.category);
                    const bottom = this.generateCSSRule(`${base}-bottom`, parsed.value, mapping.category);
                    if (top)
                        rules.push(top);
                    if (bottom)
                        rules.push(bottom);
                }
                else {
                    const rule = this.generateCSSRule(base, parsed.value, mapping.category);
                    if (rule)
                        rules.push(rule);
                }
            }
            else {
                const rule = this.generateCSSRule(base, parsed.value, mapping.category);
                if (rule)
                    rules.push(rule);
            }
        }
        else {
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
        const result = {
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
    generateCSSRule(property, value, category) {
        try {
            let unitType;
            // 根据类别确定单位类型
            if (['margin', 'padding', 'gap'].includes(property) || category === 'spacing') {
                unitType = 'spacing';
            }
            else if (['font-size', 'text'].includes(property) || category === 'fonts') {
                unitType = 'fontSize';
            }
            else if (['width', 'height', 'max-width', 'min-width', 'max-height', 'min-height'].includes(property)) {
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
        }
        catch (error) {
            return null;
        }
    }
    /**
     * 解析内联样式
     */
    parseInlineStyles(styleString) {
        const rules = [];
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
exports.HTMLParser = HTMLParser;
/**
 * Vue解析器
 */
class VueParser {
    constructor(utils) {
        this.utils = utils;
        this.htmlParser = new HTMLParser(utils);
    }
    /**
     * 解析Vue文件
     */
    async parse(filePath, content) {
        const classes = [];
        const dependencies = [];
        try {
            // 提取template部分
            const templateMatch = content.match(/<template[^>]*>([\s\S]*?)<\/template>/i);
            if (templateMatch && templateMatch[1] !== undefined) {
                const templateContent = templateMatch[1];
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
        }
        catch (error) {
            throw new Error(`解析Vue文件失败: ${filePath}, ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 检查是否支持该文件格式
     */
    supports(filePath) {
        return path.extname(filePath).toLowerCase() === '.vue';
    }
    /**
     * 获取支持的文件格式
     */
    getSupportedFormats() {
        return ['.vue'];
    }
    /**
     * 解析样式块
     */
    parseStyleBlock(styleContent) {
        const classes = [];
        const cssRules = /([^{]+)\{([^}]+)\}/g;
        let match;
        while ((match = cssRules.exec(styleContent)) !== null) {
            if (!match[1] || !match[2]) {
                continue;
            }
            const selector = match[1].trim();
            const declarations = match[2].trim();
            // 只处理类选择器
            if (selector.startsWith('.')) {
                const className = selector.substring(1);
                const rules = [];
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
exports.VueParser = VueParser;
/**
 * WXML解析器（微信小程序）
 */
class WXMLParser {
    constructor(utils) {
        this.utils = utils;
    }
    /**
     * 解析WXML文件
     */
    async parse(filePath, content) {
        const classes = [];
        const dependencies = [];
        try {
            const parser = new htmlparser2.Parser({
                onopentag: (name, attribs) => {
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
        }
        catch (error) {
            throw new Error(`解析WXML文件失败: ${filePath}, ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 检查是否支持该文件格式
     */
    supports(filePath) {
        return path.extname(filePath).toLowerCase() === '.wxml';
    }
    /**
     * 获取支持的文件格式
     */
    getSupportedFormats() {
        return ['.wxml'];
    }
    /**
     * 解析CSS类名
     */
    parseClassName(className) {
        const parsed = this.utils.parseClassName(className);
        if (!parsed) {
            return null;
        }
        const mapping = this.utils.getPropertyMapping(parsed.prefix);
        if (!mapping) {
            return null;
        }
        // 生成规则，支持方向/轴向简写（mt/mr/mb/ml/mx/my 以及 pt/pr/pb/pl/px/py）
        const rules = [];
        if (mapping.property === 'margin' || mapping.property === 'padding') {
            const prefix = parsed.prefix;
            const base = mapping.property; // 'margin' | 'padding'
            if (prefix.length >= 2) {
                const dir = prefix[1];
                if (dir === 't') {
                    const rule = this.generateCSSRule(`${base}-top`, parsed.value, mapping.category);
                    if (rule)
                        rules.push(rule);
                }
                else if (dir === 'r') {
                    const rule = this.generateCSSRule(`${base}-right`, parsed.value, mapping.category);
                    if (rule)
                        rules.push(rule);
                }
                else if (dir === 'b') {
                    const rule = this.generateCSSRule(`${base}-bottom`, parsed.value, mapping.category);
                    if (rule)
                        rules.push(rule);
                }
                else if (dir === 'l') {
                    const rule = this.generateCSSRule(`${base}-left`, parsed.value, mapping.category);
                    if (rule)
                        rules.push(rule);
                }
                else if (dir === 'x') {
                    const left = this.generateCSSRule(`${base}-left`, parsed.value, mapping.category);
                    const right = this.generateCSSRule(`${base}-right`, parsed.value, mapping.category);
                    if (left)
                        rules.push(left);
                    if (right)
                        rules.push(right);
                }
                else if (dir === 'y') {
                    const top = this.generateCSSRule(`${base}-top`, parsed.value, mapping.category);
                    const bottom = this.generateCSSRule(`${base}-bottom`, parsed.value, mapping.category);
                    if (top)
                        rules.push(top);
                    if (bottom)
                        rules.push(bottom);
                }
                else {
                    const rule = this.generateCSSRule(base, parsed.value, mapping.category);
                    if (rule)
                        rules.push(rule);
                }
            }
            else {
                const rule = this.generateCSSRule(base, parsed.value, mapping.category);
                if (rule)
                    rules.push(rule);
            }
        }
        else {
            const cssRule = this.generateCSSRule(mapping.property, parsed.value, mapping.category);
            if (!cssRule) {
                return null;
            }
            rules.push(cssRule);
        }
        const result = {
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
    generateCSSRule(property, value, category) {
        try {
            let unitType;
            if (['margin', 'padding', 'gap'].includes(property) || category === 'spacing') {
                unitType = 'spacing';
            }
            else if (['font-size', 'text'].includes(property) || category === 'fonts') {
                unitType = 'fontSize';
            }
            else if (['width', 'height', 'max-width', 'min-width', 'max-height', 'min-height'].includes(property)) {
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
        }
        catch (error) {
            return null;
        }
    }
    /**
     * 解析内联样式
     */
    parseInlineStyles(styleString) {
        const rules = [];
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
exports.WXMLParser = WXMLParser;
/**
 * 解析器管理器
 */
class ParserManager {
    constructor(utils) {
        this.parsers = [];
        this.parsers = [
            new HTMLParser(utils),
            new VueParser(utils),
            new WXMLParser(utils)
        ];
    }
    /**
     * 获取合适的解析器
     */
    getParser(filePath) {
        return this.parsers.find(parser => parser.supports(filePath)) || null;
    }
    /**
     * 解析文件
     */
    async parseFile(filePath, content) {
        const parser = this.getParser(filePath);
        if (!parser) {
            throw new Error(`不支持的文件格式: ${filePath}`);
        }
        return parser.parse(filePath, content);
    }
    /**
     * 获取所有支持的格式
     */
    getAllSupportedFormats() {
        const formats = new Set();
        this.parsers.forEach(parser => {
            parser.getSupportedFormats().forEach(format => formats.add(format));
        });
        return Array.from(formats);
    }
    /**
     * 检查是否支持指定格式
     */
    supportsFormat(format) {
        return this.getAllSupportedFormats().includes(format.toLowerCase());
    }
}
exports.ParserManager = ParserManager;
//# sourceMappingURL=parsers.js.map