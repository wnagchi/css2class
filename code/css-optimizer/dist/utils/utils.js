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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Utils = void 0;
const color_1 = __importDefault(require("color"));
const path = __importStar(require("path"));
/**
 * 工具类
 */
class Utils {
    constructor(config) {
        this.config = config;
    }
    /**
     * 解析颜色值
     * @param colorValue 颜色值
     * @returns 解析后的颜色值，解析失败返回null
     */
    parseColor(colorValue) {
        if (!colorValue)
            return null;
        // 检查自定义颜色映射
        if (this.config.colors.customColors[colorValue]) {
            return this.config.colors.customColors[colorValue];
        }
        // 检查直接颜色值解析
        if (this.config.colors.directColorParsing) {
            try {
                // 尝试解析为颜色对象
                const parsedColor = (0, color_1.default)(colorValue);
                return parsedColor.hex();
            }
            catch (error) {
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
    isValidColor(colorValue) {
        return this.parseColor(colorValue) !== null;
    }
    /**
     * 单位转换
     * @param value 数值
     * @param fromUnit 源单位
     * @param toUnit 目标单位
     * @returns 转换后的数值
     */
    convertUnit(value, fromUnit, toUnit) {
        if (fromUnit === toUnit)
            return value;
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
    getUnitFactor(unit) {
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
    generateClassName(pattern, value) {
        return `${pattern}-${value}`;
    }
    /**
     * 获取断点值
     * @param breakpoint 断点名称
     * @returns 断点值
     */
    getBreakpointValue(breakpoint) {
        return this.config.breakpoints[breakpoint] || breakpoint;
    }
    /**
     * 解析CSS类名
     * @param className CSS类名
     * @returns 解析结果
     */
    parseClassName(className) {
        // 处理响应式前缀 (md:container)
        let responsive;
        let remainingClass = className;
        if (className.includes(':')) {
            const parts = className.split(':');
            if (parts.length === 2 && this.config.breakpoints[parts[0]]) {
                responsive = parts[0];
                remainingClass = parts[1];
            }
        }
        // 处理伪类 (hover:button)
        let pseudoClass;
        if (remainingClass.includes(':')) {
            const parts = remainingClass.split(':');
            if (parts.length === 2 && this.isPseudoClass(parts[0])) {
                pseudoClass = parts[0];
                remainingClass = parts[1];
            }
        }
        // 解析前缀和值
        const match = remainingClass.match(/^([a-zA-Z-]+)-(.+)$/);
        if (!match) {
            return null;
        }
        const result = {
            prefix: match[1],
            value: match[2]
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
    isPseudoClass(pseudo) {
        const pseudoClasses = ['hover', 'focus', 'active', 'disabled', 'checked', 'selected'];
        return pseudoClasses.includes(pseudo);
    }
    /**
     * 获取属性映射
     * @param prefix 前缀
     * @returns 属性映射
     */
    getPropertyMapping(prefix) {
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
    generateCSSRule(property, value, unitType) {
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
    sanitizeClassName(className) {
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
    shouldProcessFile(filePath) {
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
    matchPattern(filePath, pattern) {
        // 简单的glob模式匹配
        const regex = new RegExp(pattern
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/\?/g, '.'));
        return regex.test(filePath);
    }
    /**
     * 获取文件相对路径
     * @param filePath 文件绝对路径
     * @param basePath 基础路径
     * @returns 相对路径
     */
    getRelativePath(filePath, basePath) {
        const relative = path.relative(basePath, filePath);
        return relative.replace(/\\/g, '/');
    }
    /**
     * 生成唯一标识符
     * @param prefix 前缀
     * @returns 唯一标识符
     */
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.Utils = Utils;
//# sourceMappingURL=utils.js.map