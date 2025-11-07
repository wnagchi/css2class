import { Watcher, FileChangeEvent, WatcherConfig } from '../types';
import { Config } from '../types';
/**
 * 文件监听器
 */
export declare class FileWatcher implements Watcher {
    private watcher;
    private config;
    private onChangeCallback;
    private isRunningFlag;
    private fileStates;
    constructor(config: WatcherConfig);
    /**
     * 启动监听
     */
    start(): Promise<void>;
    /**
     * 停止监听
     */
    stop(): Promise<void>;
    /**
     * 设置文件变化回调
     */
    onFileChange(callback: (event: FileChangeEvent) => void): void;
    /**
     * 检查是否正在运行
     */
    isRunning(): boolean;
    /**
     * 获取监听状态
     */
    getStatus(): {
        isRunning: boolean;
        watchedPaths: string[];
        ignoredPatterns: string[];
        fileCount: number;
    };
    /**
     * 手动触发重新扫描
     */
    rescan(): Promise<void>;
    /**
     * 添加监听路径
     */
    addPath(watchPath: string): Promise<void>;
    /**
     * 移除监听路径
     */
    removePath(watchPath: string): Promise<void>;
    /**
     * 获取文件统计信息
     */
    getFileStats(): Array<{
        path: string;
        size: number;
        mtime: number;
        hash: string;
    }>;
    /**
     * 处理文件变化
     */
    private handleFileChange;
    /**
     * 处理文件变化（实际逻辑）
     */
    private processFileChange;
    /**
     * 处理错误
     */
    private handleError;
    /**
     * 初始化文件状态
     */
    private initializeFileStates;
    /**
     * 扫描目录
     */
    private scanDirectory;
    /**
     * 计算文件哈希
     */
    private calculateFileHash;
    /**
     * 创建忽略匹配器
     */
    private createIgnoreMatcher;
    /**
     * 路径模式匹配
     */
    private matchPattern;
    /**
     * 检查是否应该处理该文件
     */
    private shouldProcessFile;
    /**
     * 防抖处理
     */
    private debouncePromise;
    private debounceTimer;
    private debounce;
    /**
     * 清理资源
     */
    dispose(): void;
}
/**
 * 监听器工厂
 */
export declare class WatcherFactory {
    /**
     * 创建监听器
     */
    static create(config: Config, paths: string[]): FileWatcher;
}
//# sourceMappingURL=file-watcher.d.ts.map