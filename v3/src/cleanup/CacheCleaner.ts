import { EventBus } from '../core/EventBus';
import { CacheStats, CleanupOptions } from '../../types';

interface CacheCleanupOptions {
  maxAge?: number;
  force?: boolean;
  dryRun?: boolean;
  onProgress?: (stage: string, progress: number) => void;
}

interface CleanupResult {
  success: boolean;
  clearedCount: number;
  freedMemory: number;
  errors: string[];
  duration: number;
}

export default class CacheCleaner {
  private eventBus: EventBus;
  private fileCache: Map<string, string>;
  private fileStats: Map<string, number>;
  private cssGenerationCache: Map<string, any>;
  private cssGenerationStats: any;
  private maxSize: number;
  private cacheStrategy: any;

  constructor(
    eventBus: EventBus,
    fileCache: Map<string, string>,
    fileStats: Map<string, number>,
    cssGenerationCache: Map<string, any>,
    cssGenerationStats: any,
    maxSize: number,
    cacheStrategy: any
  ) {
    this.eventBus = eventBus;
    this.fileCache = fileCache;
    this.fileStats = fileStats;
    this.cssGenerationCache = cssGenerationCache;
    this.cssGenerationStats = cssGenerationStats;
    this.maxSize = maxSize;
    this.cacheStrategy = cacheStrategy;
  }

  // 清理文件缓存
  clearFileCache(): number {
    const size = this.fileCache.size;
    this.fileCache.clear();
    this.fileStats.clear();
    this.eventBus.emit('cache:file:cleared');
    return size;
  }

  // 清理CSS生成缓存
  clearCssGenerationCache(): number {
    const size = this.cssGenerationCache.size;
    this.cssGenerationCache.clear();
    this.cssGenerationStats = {
      hits: 0,
      misses: 0,
      totalGenerations: 0,
    };
    this.eventBus.emit('cache:cssGeneration:cleared');
    return size;
  }

  // LRU缓存清理
  performLRUCleanup(): number {
    let clearedCount = 0;

    // 文件缓存LRU清理
    if (this.fileCache.size >= this.maxSize) {
      const oldestKey = this.fileCache.keys().next().value;
      if (oldestKey) {
        this.fileCache.delete(oldestKey);
        this.fileStats.delete(oldestKey);
        clearedCount++;
      }
    }

    // CSS生成缓存LRU清理
    if (this.cssGenerationCache.size >= this.cacheStrategy.maxCssGenerationCacheSize) {
      const oldestKey = this.cssGenerationCache.keys().next().value;
      if (oldestKey) {
        this.cssGenerationCache.delete(oldestKey);
        clearedCount++;
      }
    }

    return clearedCount;
  }

  // 过期缓存清理
  async cleanupExpiredEntries(maxAge?: number): Promise<CleanupResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let clearedCount = 0;
    let freedMemory = 0;

    const cleanupAge = maxAge || this.cacheStrategy.maxFileAge;
    const now = Date.now();

    try {
      // 清理过期的文件缓存
      const fileStatsArray = Array.from(this.fileStats.entries());
      for (const [filePath, mtime] of fileStatsArray) {
        if (now - mtime > cleanupAge) {
          const fileSize = this.fileCache.get(filePath)?.length || 0;
          this.fileCache.delete(filePath);
          this.fileStats.delete(filePath);
          clearedCount++;
          freedMemory += fileSize;
        }
      }

      // 清理过期的CSS生成缓存
      const cssCacheArray = Array.from(this.cssGenerationCache.entries());
      for (const [key, cached] of cssCacheArray) {
        if (now - cached.timestamp > cleanupAge) {
          const cacheSize = JSON.stringify(cached).length;
          this.cssGenerationCache.delete(key);
          clearedCount++;
          freedMemory += cacheSize;
        }
      }

      this.eventBus.emit('cache:cleanup:completed', {
        clearedCount,
        freedMemory,
        duration: Date.now() - startTime,
      });

      return {
        success: true,
        clearedCount,
        freedMemory,
        errors,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMsg = `Cache cleanup failed: ${error}`;
      errors.push(errorMsg);
      this.eventBus.emit('cache:cleanup:error', { error: errorMsg });

      return {
        success: false,
        clearedCount,
        freedMemory,
        errors,
        duration: Date.now() - startTime,
      };
    }
  }

  // 全量缓存清理
  async performFullCleanup(options: CacheCleanupOptions = {}): Promise<CleanupResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let clearedCount = 0;
    let freedMemory = 0;

    try {
      if (options.onProgress) {
        options.onProgress('开始清理', 0);
      }

      // 清理文件缓存
      const fileCacheSize = this.clearFileCache();
      clearedCount += fileCacheSize;
      if (options.onProgress) {
        options.onProgress('清理文件缓存', 33);
      }

      // 清理CSS生成缓存
      const cssCacheSize = this.clearCssGenerationCache();
      clearedCount += cssCacheSize;
      if (options.onProgress) {
        options.onProgress('清理CSS缓存', 66);
      }

      // 执行过期清理
      if (options.maxAge || this.cacheStrategy.maxFileAge) {
        const expiredResult = await this.cleanupExpiredEntries(options.maxAge);
        clearedCount += expiredResult.clearedCount;
        freedMemory += expiredResult.freedMemory;
        errors.push(...expiredResult.errors);
      }

      if (options.onProgress) {
        options.onProgress('清理完成', 100);
      }

      this.eventBus.emit('cache:full:cleanup:completed', {
        clearedCount,
        freedMemory,
        duration: Date.now() - startTime,
      });

      return {
        success: errors.length === 0,
        clearedCount,
        freedMemory,
        errors,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMsg = `Full cache cleanup failed: ${error}`;
      errors.push(errorMsg);
      this.eventBus.emit('cache:full:cleanup:error', { error: errorMsg });

      return {
        success: false,
        clearedCount,
        freedMemory,
        errors,
        duration: Date.now() - startTime,
      };
    }
  }

  // 智能清理（根据使用情况）
  async performSmartCleanup(): Promise<CleanupResult> {
    const stats = this.getCacheStats();
    const startTime = Date.now();
    const errors: string[] = [];
    let clearedCount = 0;
    let freedMemory = 0;

    try {
      // 如果缓存过大，执行LRU清理
      if (stats.size > this.maxSize * 1.5) {
        clearedCount += this.performLRUCleanup();
      }

      // 如果命中率过低，清理部分缓存
      if (stats.hitRate < 30 && stats.hits + stats.misses > 100) {
        // 清理CSS生成缓存的一半
        const keysToDelete = Array.from(this.cssGenerationCache.keys()).slice(
          0,
          Math.floor(this.cssGenerationCache.size / 2)
        );
        keysToDelete.forEach(key => {
          const cacheSize = JSON.stringify(this.cssGenerationCache.get(key)).length;
          this.cssGenerationCache.delete(key);
          freedMemory += cacheSize;
          clearedCount++;
        });
      }

      // 执行过期清理
      const expiredResult = await this.cleanupExpiredEntries();
      clearedCount += expiredResult.clearedCount;
      freedMemory += expiredResult.freedMemory;
      errors.push(...expiredResult.errors);

      this.eventBus.emit('cache:smart:cleanup:completed', {
        clearedCount,
        freedMemory,
        duration: Date.now() - startTime,
      });

      return {
        success: errors.length === 0,
        clearedCount,
        freedMemory,
        errors,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMsg = `Smart cache cleanup failed: ${error}`;
      errors.push(errorMsg);
      this.eventBus.emit('cache:smart:cleanup:error', { error: errorMsg });

      return {
        success: false,
        clearedCount,
        freedMemory,
        errors,
        duration: Date.now() - startTime,
      };
    }
  }

  // 获取缓存统计
  getCacheStats(): CacheStats {
    const fileCacheSize = this.fileCache.size;
    const cssGenerationCacheSize = this.cssGenerationCache.size;
    const totalGenerations = this.cssGenerationStats.hits + this.cssGenerationStats.misses;
    const hitRate = totalGenerations > 0 ?
      (this.cssGenerationStats.hits / totalGenerations) * 100 : 0;

    return {
      size: fileCacheSize + cssGenerationCacheSize,
      hits: this.cssGenerationStats.hits,
      misses: this.cssGenerationStats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage: {
        kb: Math.round((fileCacheSize * 1024) / 1024),
        mb: Math.round((fileCacheSize * 1024) / (1024 * 1024) * 100) / 100
      }
    };
  }

  // 健康检查
  async healthCheck(): Promise<any> {
    const stats = this.getCacheStats();
    const issues: string[] = [];

    // 检查缓存大小
    if (stats.size > this.maxSize * 2) {
      issues.push('Cache size exceeds maximum limit');
    }

    // 检查命中率
    if (stats.hitRate < 50 && stats.hits + stats.misses > 100) {
      issues.push('Cache hit rate is below 50%');
    }

    return {
      healthy: issues.length === 0,
      issues,
      stats,
      lastCleanup: Date.now(),
    };
  }
}