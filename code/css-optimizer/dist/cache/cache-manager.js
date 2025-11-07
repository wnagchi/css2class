"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = exports.MultiLevelCache = exports.LRUCache = void 0;
/**
 * LRU缓存实现
 */
class LRUCache {
    constructor(maxSize = 1000, ttl = 300000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
    }
    /**
     * 获取缓存项
     */
    get(key) {
        const item = this.cache.get(key);
        if (!item) {
            return undefined;
        }
        // 检查是否过期
        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            return undefined;
        }
        // 更新访问时间（LRU算法）
        this.cache.delete(key);
        this.cache.set(key, { ...item, timestamp: Date.now() });
        return item.data;
    }
    /**
     * 设置缓存项
     */
    set(key, value, ttl) {
        // 如果缓存已满，删除最旧的项
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }
        const item = {
            data: value,
            timestamp: Date.now(),
            ttl: ttl || this.ttl
        };
        this.cache.set(key, item);
    }
    /**
     * 删除缓存项
     */
    delete(key) {
        return this.cache.delete(key);
    }
    /**
     * 清空缓存
     */
    clear() {
        this.cache.clear();
    }
    /**
     * 获取缓存统计信息
     */
    getStats() {
        // 这里可以添加更详细的统计信息
        return {
            hits: 0, // 简化实现，实际可以添加命中计数
            misses: 0, // 简化实现，实际可以添加未命中计数
            size: this.cache.size
        };
    }
    /**
     * 获取缓存大小
     */
    getSize() {
        return this.cache.size;
    }
    /**
     * 检查是否包含指定键
     */
    has(key) {
        const item = this.cache.get(key);
        if (!item) {
            return false;
        }
        // 检查是否过期
        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }
    /**
     * 获取所有键
     */
    keys() {
        return Array.from(this.cache.keys());
    }
    /**
     * 清理过期项
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > item.ttl) {
                this.cache.delete(key);
                cleaned++;
            }
        }
        return cleaned;
    }
    /**
     * 获取内存使用情况
     */
    getMemoryUsage() {
        let approximateSize = 0;
        for (const [key, item] of this.cache.entries()) {
            // 估算内存使用
            approximateSize += key.length * 2; // 字符串内存
            approximateSize += JSON.stringify(item.data).length * 2; // 数据内存
        }
        return {
            size: this.cache.size,
            approximateSize
        };
    }
}
exports.LRUCache = LRUCache;
/**
 * 多级缓存实现
 */
class MultiLevelCache {
    constructor(l1MaxSize = 500, l1TTL = 60000, // 1分钟
    l2MaxSize = 2000, l2TTL = 300000 // 5分钟
    ) {
        this.l2Cache = new Map(); // 简单内存缓存
        this.l1Cache = new LRUCache(l1MaxSize, l1TTL);
        this.maxL2Size = l2MaxSize;
    }
    /**
     * 获取缓存项
     */
    get(key) {
        // 尝试从L1缓存获取
        let value = this.l1Cache.get(key);
        if (value !== undefined) {
            return value;
        }
        // 尝试从L2缓存获取
        const item = this.l2Cache.get(key);
        if (item && Date.now() - item.timestamp <= item.ttl) {
            // 提升到L1缓存
            this.l1Cache.set(key, item.data);
            return item.data;
        }
        // 从L2缓存中删除过期项
        if (item) {
            this.l2Cache.delete(key);
        }
        return undefined;
    }
    /**
     * 设置缓存项
     */
    set(key, value, ttl) {
        // 设置到L1缓存
        this.l1Cache.set(key, value, ttl);
        // 设置到L2缓存
        if (this.l2Cache.size >= this.maxL2Size) {
            // 删除最旧的项
            const firstKey = this.l2Cache.keys().next().value;
            if (firstKey) {
                this.l2Cache.delete(firstKey);
            }
        }
        this.l2Cache.set(key, {
            data: value,
            timestamp: Date.now(),
            ttl: ttl || 300000
        });
    }
    /**
     * 删除缓存项
     */
    delete(key) {
        const l1Deleted = this.l1Cache.delete(key);
        const l2Deleted = this.l2Cache.delete(key);
        return l1Deleted || l2Deleted;
    }
    /**
     * 清空缓存
     */
    clear() {
        this.l1Cache.clear();
        this.l2Cache.clear();
    }
    /**
     * 获取缓存统计信息
     */
    getStats() {
        const l1Stats = this.l1Cache.getStats();
        return {
            hits: l1Stats.hits,
            misses: l1Stats.misses,
            size: l1Stats.size + this.l2Cache.size
        };
    }
    /**
     * 清理过期项
     */
    cleanup() {
        const l1Cleaned = this.l1Cache.cleanup();
        let l2Cleaned = 0;
        const now = Date.now();
        for (const [key, item] of this.l2Cache.entries()) {
            if (now - item.timestamp > item.ttl) {
                this.l2Cache.delete(key);
                l2Cleaned++;
            }
        }
        return l1Cleaned + l2Cleaned;
    }
    /**
     * 获取内存使用情况
     */
    getMemoryUsage() {
        const l1Usage = this.l1Cache.getMemoryUsage();
        let l2Usage = 0;
        for (const [key, item] of this.l2Cache.entries()) {
            l2Usage += key.length * 2;
            l2Usage += JSON.stringify(item.data).length * 2;
        }
        return {
            size: l1Usage.size + this.l2Cache.size,
            approximateSize: l1Usage.approximateSize + l2Usage
        };
    }
}
exports.MultiLevelCache = MultiLevelCache;
/**
 * 缓存管理器
 */
class CacheManager {
    constructor(cacheType = 'multilevel', config) {
        this.cleanupInterval = null;
        if (cacheType === 'lru') {
            this.cache = new LRUCache(config?.maxSize || 1000, config?.ttl || 300000);
        }
        else {
            this.cache = new MultiLevelCache(config?.l1MaxSize || 500, config?.l1TTL || 60000, config?.l2MaxSize || 2000, config?.l2TTL || 300000);
        }
        this.startCleanupScheduler();
    }
    /**
     * 获取缓存实例
     */
    getCache() {
        return this.cache;
    }
    /**
     * 启动清理调度器
     */
    startCleanupScheduler() {
        // 每5分钟清理一次过期项
        this.cleanupInterval = setInterval(() => {
            this.cache.cleanup();
        }, 5 * 60 * 1000);
    }
    /**
     * 停止清理调度器
     */
    stopCleanupScheduler() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
    /**
     * 获取缓存统计信息
     */
    getStats() {
        const stats = this.cache.getStats();
        const memory = this.cache.getMemoryUsage();
        return {
            ...stats,
            memory,
            cleanup: this.cache.cleanup()
        };
    }
    /**
     * 预热缓存
     */
    async warmup(warmupData) {
        for (const [key, value] of Object.entries(warmupData)) {
            this.cache.set(key, value);
        }
    }
    /**
     * 导出缓存数据
     */
    exportData() {
        const data = {};
        if (this.cache instanceof LRUCache) {
            for (const key of this.cache.keys()) {
                const value = this.cache.get(key);
                if (value !== undefined) {
                    data[key] = value;
                }
            }
        }
        return data;
    }
    /**
     * 导入缓存数据
     */
    importData(data) {
        for (const [key, value] of Object.entries(data)) {
            this.cache.set(key, value);
        }
    }
}
exports.CacheManager = CacheManager;
//# sourceMappingURL=cache-manager.js.map