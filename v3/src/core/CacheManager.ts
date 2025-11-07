import { promises as fs } from 'fs';
import { EventBus } from './EventBus';
import { CacheStats } from '../../types';
import { CacheCleaner } from '../cleanup';

interface FullScanCache {
  classListSet: Set<string>;
  userStaticClassListSet: Set<string>;
  userBaseClassListSet: Set<string>;
  scanTime: number | null;
  isLocked: boolean;
}

interface GlobalStyleCache {
  classListSet: Set<string>;
  userStaticClassListSet: Set<string>;
  userBaseClassListSet: Set<string>;
  fileClassMap: Map<string, any>;
  lastUpdateTime: number;
}

interface ConfigCache {
  config: any;
  hash: string | null;
  lastModified: number | null;
  validationResults: any;
  dependencyGraph: Map<string, string[]>;
}

interface IncrementalTracker {
  changedFiles: Set<string>;
  deletedFiles: Set<string>;
  lastIncrementalUpdate: number | null;
  pendingUpdates: Map<string, any>;
}

interface CacheStrategy {
  enableFileCache: boolean;
  enableConfigCache: boolean;
  enableCssGenerationCache: boolean;
  enableIncrementalUpdates: boolean;
  maxCssGenerationCacheSize: number;
  maxFileAge: number;
  compressionEnabled: boolean;
}

export default class CacheManager {
  private eventBus: EventBus;
  private maxSize: number;
  private cacheCleaner: CacheCleaner;

  // 文件缓存
  private fileCache: Map<string, string> = new Map();
  private fileStats: Map<string, number> = new Map();

  // 全量扫描缓存
  private fullScanCache: FullScanCache = {
    classListSet: new Set(),
    userStaticClassListSet: new Set(),
    userBaseClassListSet: new Set(),
    scanTime: null,
    isLocked: false,
  };

  // 全局样式缓存
  private globalStyleCache: GlobalStyleCache = {
    classListSet: new Set(),
    userStaticClassListSet: new Set(),
    userBaseClassListSet: new Set(),
    fileClassMap: new Map(),
    lastUpdateTime: Date.now(),
  };

  // 配置缓存
  private configCache: ConfigCache = {
    config: null,
    hash: null,
    lastModified: null,
    validationResults: null,
    dependencyGraph: new Map(),
  };

  // CSS生成缓存
  private cssGenerationCache: Map<string, any> = new Map();
  private cssGenerationStats = {
    hits: 0,
    misses: 0,
    totalGenerations: 0,
  };

  // 增量更新追踪
  private incrementalTracker: IncrementalTracker = {
    changedFiles: new Set(),
    deletedFiles: new Set(),
    lastIncrementalUpdate: null,
    pendingUpdates: new Map(),
  };

  // 缓存策略配置
  private cacheStrategy: CacheStrategy = {
    enableFileCache: true,
    enableConfigCache: true,
    enableCssGenerationCache: true,
    enableIncrementalUpdates: true,
    maxCssGenerationCacheSize: 5000,
    maxFileAge: 24 * 60 * 60 * 1000, // 24小时
    compressionEnabled: false,
  };

  constructor(eventBus: EventBus, maxSize = 1000) {
    this.eventBus = eventBus;
    this.maxSize = maxSize;
    this.cacheCleaner = new CacheCleaner(
      eventBus,
      this.fileCache,
      this.fileStats,
      this.cssGenerationCache,
      this.cssGenerationStats,
      maxSize,
      this.cacheStrategy
    );
  }

  // 文件缓存方法
  async getFileContent(filePath: string): Promise<string | null> {
    try {
      const stat = await fs.stat(filePath);
      const cached = this.fileCache.get(filePath);
      const cachedStat = this.fileStats.get(filePath);

      if (cached && cachedStat && stat.mtime.getTime() === cachedStat) {
        return cached;
      }

      const content = await fs.readFile(filePath, 'utf-8');

      // LRU缓存清理
      if (this.fileCache.size >= this.maxSize) {
        const oldestKey = this.fileCache.keys().next().value;
        if (oldestKey) {
          this.fileCache.delete(oldestKey);
          this.fileStats.delete(oldestKey);
        }
      }

      this.fileCache.set(filePath, content);
      this.fileStats.set(filePath, stat.mtime.getTime());

      this.eventBus.emit('cache:file:updated', { filePath });
      return content;
    } catch (error) {
      this.eventBus.emit('cache:file:error', { filePath, error });
      return null;
    }
  }

  // 全量扫描缓存方法
  updateFullScanCache(classList: string[], staticClassList: string[], baseClassList: string[]): void {
    this.fullScanCache.classListSet.clear();
    this.fullScanCache.userStaticClassListSet.clear();
    this.fullScanCache.userBaseClassListSet.clear();

    classList.forEach((cls) => this.fullScanCache.classListSet.add(cls));
    staticClassList.forEach((cls) => this.fullScanCache.userStaticClassListSet.add(cls));
    baseClassList.forEach((cls) => this.fullScanCache.userBaseClassListSet.add(cls));

    this.fullScanCache.scanTime = Date.now();
    this.fullScanCache.isLocked = true;

    this.eventBus.emit('cache:fullScan:updated', this.fullScanCache);
  }

  getFullScanCache(): FullScanCache {
    return this.fullScanCache;
  }

  isFullScanCacheLocked(): boolean {
    return this.fullScanCache.isLocked;
  }

  // 全局样式缓存方法
  updateGlobalStyleCache(
    classList: string[],
    staticClassList: string[],
    baseClassList: string[],
    fileClassMap: Map<string, any>
  ): void {
    this.globalStyleCache.classListSet.clear();
    this.globalStyleCache.userStaticClassListSet.clear();
    this.globalStyleCache.userBaseClassListSet.clear();
    this.globalStyleCache.fileClassMap.clear();

    classList.forEach((cls) => this.globalStyleCache.classListSet.add(cls));
    staticClassList.forEach((cls) => this.globalStyleCache.userStaticClassListSet.add(cls));
    baseClassList.forEach((cls) => this.globalStyleCache.userBaseClassListSet.add(cls));

    // 复制fileClassMap
    fileClassMap.forEach((value, key) => {
      this.globalStyleCache.fileClassMap.set(key, value);
    });

    this.globalStyleCache.lastUpdateTime = Date.now();
    this.eventBus.emit('cache:globalStyle:updated', this.globalStyleCache);
  }

  getGlobalStyleCache(): GlobalStyleCache {
    return this.globalStyleCache;
  }

  // CSS生成缓存方法
  setCssGenerationCache(key: string, value: any): void {
    if (!this.cacheStrategy.enableCssGenerationCache) {
      return;
    }

    // 缓存大小限制清理
    if (this.cssGenerationCache.size >= this.cacheStrategy.maxCssGenerationCacheSize) {
      const oldestKey = this.cssGenerationCache.keys().next().value;
      if (oldestKey) {
        this.cssGenerationCache.delete(oldestKey);
      }
    }

    this.cssGenerationCache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  getCssGenerationCache(key: string): any | null {
    if (!this.cacheStrategy.enableCssGenerationCache) {
      return null;
    }

    const cached = this.cssGenerationCache.get(key);
    if (cached) {
      this.cssGenerationStats.hits++;
      return cached.value;
    }

    this.cssGenerationStats.misses++;
    return null;
  }

  // 增量更新方法
  markFileChanged(filePath: string): void {
    this.incrementalTracker.changedFiles.add(filePath);
    this.incrementalTracker.lastIncrementalUpdate = Date.now();
    this.eventBus.emit('cache:incremental:fileChanged', { filePath });
  }

  markFileDeleted(filePath: string): void {
    this.incrementalTracker.deletedFiles.add(filePath);
    this.incrementalTracker.lastIncrementalUpdate = Date.now();
    this.eventBus.emit('cache:incremental:fileDeleted', { filePath });
  }

  clearIncrementalChanges(): void {
    this.incrementalTracker.changedFiles.clear();
    this.incrementalTracker.deletedFiles.clear();
    this.incrementalTracker.pendingUpdates.clear();
    this.eventBus.emit('cache:incremental:cleared');
  }

  getIncrementalChanges(): IncrementalTracker {
    return { ...this.incrementalTracker };
  }

  // 缓存统计
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

  // 清理缓存 - 使用CacheCleaner
  clearFileCache(): number {
    return this.cacheCleaner.clearFileCache();
  }

  clearCssGenerationCache(): number {
    return this.cacheCleaner.clearCssGenerationCache();
  }

  clearAll(): void {
    this.clearFileCache();
    this.clearCssGenerationCache();
    this.clearIncrementalChanges();

    // 清理其他缓存
    this.fullScanCache = {
      classListSet: new Set(),
      userStaticClassListSet: new Set(),
      userBaseClassListSet: new Set(),
      scanTime: null,
      isLocked: false,
    };

    this.globalStyleCache = {
      classListSet: new Set(),
      userStaticClassListSet: new Set(),
      userBaseClassListSet: new Set(),
      fileClassMap: new Map(),
      lastUpdateTime: Date.now(),
    };

    this.eventBus.emit('cache:all:cleared');
  }

  // 缓存策略更新
  updateCacheStrategy(strategy: Partial<CacheStrategy>): void {
    this.cacheStrategy = { ...this.cacheStrategy, ...strategy };
    this.eventBus.emit('cache:strategy:updated', this.cacheStrategy);
  }

  getCacheStrategy(): CacheStrategy {
    return { ...this.cacheStrategy };
  }

  // 过期清理 - 使用CacheCleaner
  async cleanupExpiredEntries(): Promise<any> {
    return await this.cacheCleaner.cleanupExpiredEntries();
  }

  // 新增：全量清理
  async performFullCleanup(options?: any): Promise<any> {
    return await this.cacheCleaner.performFullCleanup(options);
  }

  // 新增：智能清理
  async performSmartCleanup(): Promise<any> {
    return await this.cacheCleaner.performSmartCleanup();
  }

  // 预热缓存
  async preloadCache(filePaths: string[]): Promise<void> {
    const loadPromises = filePaths.map(filePath =>
      this.getFileContent(filePath).catch(error => {
        this.eventBus.emit('cache:preload:error', { filePath, error });
      })
    );

    await Promise.all(loadPromises);
    this.eventBus.emit('cache:preload:completed', { count: filePaths.length });
  }

  // 导出/导入缓存状态
  exportCacheState(): any {
    return {
      fileCacheSize: this.fileCache.size,
      cssGenerationCacheSize: this.cssGenerationCache.size,
      cssGenerationStats: this.cssGenerationStats,
      fullScanCacheLocked: this.fullScanCache.isLocked,
      incrementalChanges: this.incrementalTracker.changedFiles.size,
      cacheStrategy: this.cacheStrategy,
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

    // 检查增量更新
    if (this.incrementalTracker.changedFiles.size > 1000) {
      issues.push('Too many pending incremental changes');
    }

    return {
      healthy: issues.length === 0,
      issues,
      stats,
      lastCleanup: Date.now(),
    };
  }
}