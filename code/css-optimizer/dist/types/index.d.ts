/**
 * CSS规则接口
 */
export interface CSSRule {
    property: string;
    value: string;
    important?: boolean;
}
/**
 * CSS类接口
 */
export interface CSSClass {
    name: string;
    rules: CSSRule[];
    mediaQuery?: string;
    pseudoClass?: string;
}
/**
 * 配置文件接口
 */
export interface Config {
    targetFormats: string[];
    colors: {
        customColors: Record<string, string>;
        directColorParsing: boolean;
    };
    units: {
        spacing: {
            defaultUnit: string;
            conversions: Record<string, number>;
        };
        fontSize: {
            defaultUnit: string;
            conversions: Record<string, number>;
        };
        width: {
            defaultUnit: string;
            conversions: Record<string, number>;
        };
    };
    breakpoints: Record<string, string>;
    rules: {
        spacing: Record<string, string[]>;
        layout: Record<string, string[]>;
        colors: Record<string, string[]>;
        fonts: Record<string, string[]>;
        interactions: Record<string, string[]>;
    };
    output: {
        outputMode: 'separate' | 'inline';
        cssFileName: string;
        minify: boolean;
        sourceMap: boolean;
        baseStylesPath?: string;
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
}
/**
 * 解析结果接口
 */
export interface ParseResult {
    classes: CSSClass[];
    dependencies: string[];
    timestamp: number;
}
/**
 * 生成选项接口
 */
export interface GenerateOptions {
    minify?: boolean;
    sourceMap?: boolean;
    baseStyles?: string;
}
/**
 * 文件变更事件接口
 */
export interface FileChangeEvent {
    type: 'add' | 'change' | 'unlink';
    path: string;
    stats?: {
        size: number;
        mtime: number;
    };
}
/**
 * 监听器配置接口
 */
export interface WatcherConfig {
    paths: string[];
    patterns: string[];
    ignorePatterns: string[];
    debounceMs: number;
}
/**
 * 缓存项接口
 */
export interface CacheItem {
    data: any;
    timestamp: number;
    ttl: number;
}
/**
 * 性能统计接口
 */
export interface PerformanceStats {
    parseTime: number;
    generateTime: number;
    totalFiles: number;
    processedFiles: number;
    cacheHits: number;
    cacheMisses: number;
    memoryUsage: number;
}
/**
 * 错误接口
 */
export interface CSSOptimizerError {
    code: string;
    message: string;
    details?: any;
    stack?: string;
}
/**
 * 工具类接口
 */
export interface Utils {
    parseColor(color: string): string | null;
    convertUnit(value: number, fromUnit: string, toUnit: string): number;
    generateClassName(pattern: string, value: string): string;
    isValidColor(color: string): boolean;
    getBreakpointValue(breakpoint: string): string;
}
/**
 * 解析器接口
 */
export interface Parser {
    parse(filePath: string, content: string): Promise<ParseResult>;
    supports(filePath: string): boolean;
    getSupportedFormats(): string[];
}
/**
 * 生成器接口
 */
export interface Generator {
    generate(classes: CSSClass[], options?: GenerateOptions): string;
    generateSourceMap(css: string, originalFiles: string[]): string;
    minifyCSS(css: string): string;
}
/**
 * 监听器接口
 */
export interface Watcher {
    start(): Promise<void>;
    stop(): Promise<void>;
    onFileChange(callback: (event: FileChangeEvent) => void): void;
    isRunning(): boolean;
}
/**
 * 缓存接口
 */
export interface Cache {
    get(key: string): any;
    set(key: string, value: any, ttl?: number): void;
    delete(key: string): void;
    clear(): void;
    getStats(): {
        hits: number;
        misses: number;
        size: number;
    };
    cleanup(): number;
    getMemoryUsage(): {
        size: number;
        approximateSize: number;
    };
}
//# sourceMappingURL=index.d.ts.map