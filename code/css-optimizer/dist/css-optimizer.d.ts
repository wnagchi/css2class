import { Config, PerformanceStats } from './types';
/**
 * CSS优化器主类
 */
export declare class CSSOptimizer {
    private configManager;
    private utils;
    private cacheManager;
    private parserManager;
    private generator;
    private watcher;
    private isInitialized;
    private performanceStats;
    constructor(configPath?: string);
    /**
     * 初始化优化器
     */
    initialize(): Promise<void>;
    /**
     * 重新初始化
     */
    private reinitialize;
    /**
     * 处理单个文件
     */
    processFile(filePath: string): Promise<string>;
    /**
     * 处理目录
     */
    processDirectory(dirPath: string, outputPath?: string): Promise<{
        css: string;
        files: string[];
        stats: any;
    }>;
    /**
     * 启动监听模式
     */
    startWatch(dirPath: string, outputPath?: string): Promise<void>;
    /**
     * 停止监听
     */
    stopWatch(): Promise<void>;
    /**
     * 获取性能统计
     */
    getPerformanceStats(): PerformanceStats;
    /**
     * 重置统计信息
     */
    resetStats(): void;
    /**
     * 清理缓存
     */
    clearCache(): void;
    /**
     * 获取配置
     */
    getConfig(): Config;
    /**
     * 重新加载配置
     */
    reloadConfig(): Promise<void>;
    /**
     * 验证配置
     */
    validateConfig(): {
        valid: boolean;
        errors: string[];
    };
    /**
     * 查找目标文件
     */
    private findTargetFiles;
    /**
     * 检查是否应该忽略路径
     */
    private shouldIgnorePath;
    /**
     * 路径模式匹配
     */
    private matchPattern;
    /**
     * 加载Base样式
     */
    private loadBaseStyles;
    /**
     * 更新输出文件
     */
    private updateOutputFile;
    /**
     * 确保已初始化
     */
    private ensureInitialized;
    /**
     * 清理资源
     */
    dispose(): void;
}
//# sourceMappingURL=css-optimizer.d.ts.map