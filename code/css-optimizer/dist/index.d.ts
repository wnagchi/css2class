/**
 * CSS Optimizer 主入口文件
 */
export { CSSOptimizer } from './css-optimizer';
export { ConfigManager } from './config/config-manager';
export { Utils } from './utils/utils';
export { CacheManager, LRUCache, MultiLevelCache } from './cache/cache-manager';
export { ParserManager, HTMLParser, VueParser, WXMLParser } from './parser/parsers';
export { CSSGenerator } from './generator/css-generator';
export { FileWatcher, WatcherFactory } from './watcher/file-watcher';
export { CSSOptimizerCLI } from './cli';
export * from './types';
export declare const DEFAULT_CONFIG: {
    targetFormats: string[];
    colors: {
        customColors: {};
        directColorParsing: boolean;
    };
    units: {
        spacing: {
            defaultUnit: string;
            conversions: {
                px: number;
                rpx: number;
                rem: number;
            };
        };
        fontSize: {
            defaultUnit: string;
            conversions: {
                px: number;
                rpx: number;
                rem: number;
            };
        };
        width: {
            defaultUnit: string;
            conversions: {
                px: number;
                rpx: number;
                rem: number;
            };
        };
    };
    breakpoints: {
        sm: string;
        md: string;
        lg: string;
        xl: string;
        '2xl': string;
    };
    rules: {
        spacing: {
            margin: string[];
            padding: string[];
            gap: string[];
        };
        layout: {
            display: string[];
            flex: string[];
            justify: string[];
            align: string[];
            position: string[];
        };
        colors: {
            background: string[];
            text: string[];
            border: string[];
        };
        fonts: {
            fontSize: string[];
            fontWeight: string[];
            fontFamily: string[];
        };
        interactions: {
            hover: string[];
            focus: string[];
            active: string[];
            disabled: string[];
        };
    };
    output: {
        outputMode: string;
        cssFileName: string;
        minify: boolean;
        sourceMap: boolean;
    };
    watch: {
        debounceMs: number;
        enabled: boolean;
        ignorePatterns: string[];
    };
    performance: {
        cache: {
            enabled: boolean;
            maxSize: number;
            ttl: number;
        };
        parallel: {
            enabled: boolean;
            maxWorkers: number;
        };
        memoryLimit: string;
    };
};
//# sourceMappingURL=index.d.ts.map