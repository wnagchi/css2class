import { Cache } from '../types';
/**
 * LRU缓存实现
 */
export declare class LRUCache implements Cache {
    private cache;
    private maxSize;
    private ttl;
    constructor(maxSize?: number, ttl?: number);
    /**
     * 获取缓存项
     */
    get(key: string): any;
    /**
     * 设置缓存项
     */
    set(key: string, value: any, ttl?: number): void;
    /**
     * 删除缓存项
     */
    delete(key: string): boolean;
    /**
     * 清空缓存
     */
    clear(): void;
    /**
     * 获取缓存统计信息
     */
    getStats(): {
        hits: number;
        misses: number;
        size: number;
    };
    /**
     * 获取缓存大小
     */
    getSize(): number;
    /**
     * 检查是否包含指定键
     */
    has(key: string): boolean;
    /**
     * 获取所有键
     */
    keys(): string[];
    /**
     * 清理过期项
     */
    cleanup(): number;
    /**
     * 获取内存使用情况
     */
    getMemoryUsage(): {
        size: number;
        approximateSize: number;
    };
}
/**
 * 多级缓存实现
 */
export declare class MultiLevelCache implements Cache {
    private l1Cache;
    private l2Cache;
    private maxL2Size;
    constructor(l1MaxSize?: number, l1TTL?: number, // 1分钟
    l2MaxSize?: number, l2TTL?: number);
    /**
     * 获取缓存项
     */
    get(key: string): any;
    /**
     * 设置缓存项
     */
    set(key: string, value: any, ttl?: number): void;
    /**
     * 删除缓存项
     */
    delete(key: string): boolean;
    /**
     * 清空缓存
     */
    clear(): void;
    /**
     * 获取缓存统计信息
     */
    getStats(): {
        hits: number;
        misses: number;
        size: number;
    };
    /**
     * 清理过期项
     */
    cleanup(): number;
    /**
     * 获取内存使用情况
     */
    getMemoryUsage(): {
        size: number;
        approximateSize: number;
    };
}
/**
 * 缓存管理器
 */
export declare class CacheManager {
    private cache;
    private cleanupInterval;
    constructor(cacheType?: 'lru' | 'multilevel', config?: any);
    /**
     * 获取缓存实例
     */
    getCache(): Cache;
    /**
     * 启动清理调度器
     */
    private startCleanupScheduler;
    /**
     * 停止清理调度器
     */
    stopCleanupScheduler(): void;
    /**
     * 获取缓存统计信息
     */
    getStats(): {
        memory: {
            size: number;
            approximateSize: number;
        };
        cleanup: number;
        hits: number;
        misses: number;
        size: number;
    };
    /**
     * 预热缓存
     */
    warmup(warmupData: Record<string, any>): Promise<void>;
    /**
     * 导出缓存数据
     */
    exportData(): Record<string, any>;
    /**
     * 导入缓存数据
     */
    importData(data: Record<string, any>): void;
}
//# sourceMappingURL=cache-manager.d.ts.map