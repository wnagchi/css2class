"use strict";
/**
 * CSS Optimizer 主入口文件
 */
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = exports.CSSOptimizerCLI = exports.WatcherFactory = exports.FileWatcher = exports.CSSGenerator = exports.WXMLParser = exports.VueParser = exports.HTMLParser = exports.ParserManager = exports.MultiLevelCache = exports.LRUCache = exports.CacheManager = exports.Utils = exports.ConfigManager = exports.CSSOptimizer = void 0;
var css_optimizer_1 = require("./css-optimizer");
Object.defineProperty(exports, "CSSOptimizer", { enumerable: true, get: function () { return css_optimizer_1.CSSOptimizer; } });
var config_manager_1 = require("./config/config-manager");
Object.defineProperty(exports, "ConfigManager", { enumerable: true, get: function () { return config_manager_1.ConfigManager; } });
var utils_1 = require("./utils/utils");
Object.defineProperty(exports, "Utils", { enumerable: true, get: function () { return utils_1.Utils; } });
var cache_manager_1 = require("./cache/cache-manager");
Object.defineProperty(exports, "CacheManager", { enumerable: true, get: function () { return cache_manager_1.CacheManager; } });
Object.defineProperty(exports, "LRUCache", { enumerable: true, get: function () { return cache_manager_1.LRUCache; } });
Object.defineProperty(exports, "MultiLevelCache", { enumerable: true, get: function () { return cache_manager_1.MultiLevelCache; } });
var parsers_1 = require("./parser/parsers");
Object.defineProperty(exports, "ParserManager", { enumerable: true, get: function () { return parsers_1.ParserManager; } });
Object.defineProperty(exports, "HTMLParser", { enumerable: true, get: function () { return parsers_1.HTMLParser; } });
Object.defineProperty(exports, "VueParser", { enumerable: true, get: function () { return parsers_1.VueParser; } });
Object.defineProperty(exports, "WXMLParser", { enumerable: true, get: function () { return parsers_1.WXMLParser; } });
var css_generator_1 = require("./generator/css-generator");
Object.defineProperty(exports, "CSSGenerator", { enumerable: true, get: function () { return css_generator_1.CSSGenerator; } });
var file_watcher_1 = require("./watcher/file-watcher");
Object.defineProperty(exports, "FileWatcher", { enumerable: true, get: function () { return file_watcher_1.FileWatcher; } });
Object.defineProperty(exports, "WatcherFactory", { enumerable: true, get: function () { return file_watcher_1.WatcherFactory; } });
var cli_1 = require("./cli");
Object.defineProperty(exports, "CSSOptimizerCLI", { enumerable: true, get: function () { return cli_1.CSSOptimizerCLI; } });
// 类型导出
__exportStar(require("./types"), exports);
// 默认配置
exports.DEFAULT_CONFIG = {
    targetFormats: ['.vue', '.wxml', '.html'],
    colors: {
        customColors: {},
        directColorParsing: true
    },
    units: {
        spacing: {
            defaultUnit: 'px',
            conversions: { px: 1, rpx: 2, rem: 16 }
        },
        fontSize: {
            defaultUnit: 'px',
            conversions: { px: 1, rpx: 2, rem: 16 }
        },
        width: {
            defaultUnit: 'px',
            conversions: { px: 1, rpx: 2, rem: 16 }
        }
    },
    breakpoints: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px'
    },
    rules: {
        spacing: {
            margin: ['m', 'mt', 'mr', 'mb', 'ml', 'mx', 'my'],
            padding: ['p', 'pt', 'pr', 'pb', 'pl', 'px', 'py'],
            gap: ['gap', 'gap-x', 'gap-y']
        },
        layout: {
            display: ['block', 'inline', 'inline-block', 'flex', 'grid'],
            flex: ['flex', 'flex-row', 'flex-col', 'flex-wrap', 'flex-nowrap'],
            justify: ['justify-start', 'justify-center', 'justify-end', 'justify-between', 'justify-around'],
            align: ['items-start', 'items-center', 'items-end', 'items-stretch'],
            position: ['relative', 'absolute', 'fixed', 'sticky']
        },
        colors: {
            background: ['bg'],
            text: ['text'],
            border: ['border', 'border-t', 'border-r', 'border-b', 'border-l']
        },
        fonts: {
            fontSize: ['text'],
            fontWeight: ['font'],
            fontFamily: ['font-family']
        },
        interactions: {
            hover: ['hover:'],
            focus: ['focus:'],
            active: ['active:'],
            disabled: ['disabled:']
        }
    },
    output: {
        outputMode: 'separate',
        cssFileName: 'styles.css',
        minify: false,
        sourceMap: true
    },
    watch: {
        debounceMs: 300,
        enabled: true,
        ignorePatterns: [
            'node_modules/**',
            'dist/**',
            'build/**',
            '.git/**',
            '**/*.css',
            '**/*.js',
            '**/*.ts'
        ]
    },
    performance: {
        cache: {
            enabled: true,
            maxSize: 1000,
            ttl: 300000
        },
        parallel: {
            enabled: true,
            maxWorkers: 4
        },
        memoryLimit: '512MB'
    }
};
//# sourceMappingURL=index.js.map