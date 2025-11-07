import { Cache, CacheItem } from '../types';

/**
 * LRU缓存实现
 */
export class LRUCache implements Cache {
  private cache = new Map<string, CacheItem>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = 1000, ttl: number = 300000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  /**
   * 获取缓存项
   */
  get(key: string): any {
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
  set(key: string, value: any, ttl?: number): void {
    // 如果缓存已满，删除最旧的项
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const item: CacheItem = {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || this.ttl
    };

    this.cache.set(key, item);
  }

  /**
   * 删除缓存项
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { hits: number; misses: number; size: number } {
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
  getSize(): number {
    return this.cache.size;
  }

  /**
   * 检查是否包含指定键
   */
  has(key: string): boolean {
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
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 清理过期项
   */
  cleanup(): number {
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
  getMemoryUsage(): { size: number; approximateSize: number } {
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

/**
 * 多级缓存实现
 */
export class MultiLevelCache implements Cache {
  private l1Cache: LRUCache; // 内存缓存
  private l2Cache: Map<string, CacheItem> = new Map(); // 简单内存缓存
  private maxL2Size: number;

  constructor(
    l1MaxSize: number = 500,
    l1TTL: number = 60000, // 1分钟
    l2MaxSize: number = 2000,
    l2TTL: number = 300000 // 5分钟
  ) {
    this.l1Cache = new LRUCache(l1MaxSize, l1TTL);
    this.maxL2Size = l2MaxSize;
  }

  /**
   * 获取缓存项
   */
  get(key: string): any {
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
  set(key: string, value: any, ttl?: number): void {
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
  delete(key: string): boolean {
    const l1Deleted = this.l1Cache.delete(key);
    const l2Deleted = this.l2Cache.delete(key);
    return l1Deleted || l2Deleted;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.l1Cache.clear();
    this.l2Cache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { hits: number; misses: number; size: number } {
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
  cleanup(): number {
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
  getMemoryUsage(): { size: number; approximateSize: number } {
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

/**
 * 缓存管理器
 */
export class CacheManager {
  private cache: Cache;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(cacheType: 'lru' | 'multilevel' = 'multilevel', config?: any) {
    if (cacheType === 'lru') {
      this.cache = new LRUCache(
        config?.maxSize || 1000,
        config?.ttl || 300000
      );
    } else {
      this.cache = new MultiLevelCache(
        config?.l1MaxSize || 500,
        config?.l1TTL || 60000,
        config?.l2MaxSize || 2000,
        config?.l2TTL || 300000
      );
    }

    this.startCleanupScheduler();
  }

  /**
   * 获取缓存实例
   */
  getCache(): Cache {
    return this.cache;
  }

  /**
   * 启动清理调度器
   */
  private startCleanupScheduler(): void {
    // 每5分钟清理一次过期项
    this.cleanupInterval = setInterval(() => {
      this.cache.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * 停止清理调度器
   */
  stopCleanupScheduler(): void {
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
  async warmup(warmupData: Record<string, any>): Promise<void> {
    for (const [key, value] of Object.entries(warmupData)) {
      this.cache.set(key, value);
    }
  }

  /**
   * 导出缓存数据
   */
  exportData(): Record<string, any> {
    const data: Record<string, any> = {};
    
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
  importData(data: Record<string, any>): void {
    for (const [key, value] of Object.entries(data)) {
      this.cache.set(key, value);
    }
  }
}