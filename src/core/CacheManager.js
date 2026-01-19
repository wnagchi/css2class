const fs = require('fs').promises;

class CacheManager {
  constructor(eventBus, maxSize = 1000) {
    this.eventBus = eventBus;
    this.maxSize = maxSize;

    // 文件缓存
    this.fileCache = new Map();
    this.fileStats = new Map();
    this.fileSizes = new Map();

    // 全量扫描缓存
    this.fullScanCache = {
      classListSet: new Set(),
      userStaticClassListSet: new Set(),
      userBaseClassListSet: new Set(),
      scanTime: null,
      isLocked: false,
    };

    // 全局样式缓存
    this.globalStyleCache = {
      classListSet: new Set(),
      userStaticClassListSet: new Set(),
      userBaseClassListSet: new Set(),
      fileClassMap: new Map(),
      lastUpdateTime: Date.now(),
    };

    // 配置缓存
    this.configCache = {
      config: null,
      hash: null,
      lastModified: null,
      validationResults: null,
      dependencyGraph: new Map(),
    };

    // CSS生成缓存
    this.cssGenerationCache = new Map();
    this.cssGenerationStats = {
      hits: 0,
      misses: 0,
      totalGenerations: 0,
    };

    // 增量更新追踪
    this.incrementalTracker = {
      changedFiles: new Set(),
      deletedFiles: new Set(),
      lastIncrementalUpdate: null,
      pendingUpdates: new Map(),
    };

    // 缓存策略配置
    this.cacheStrategy = {
      enableFileCache: true,
      enableConfigCache: true,
      enableCssGenerationCache: true,
      enableIncrementalUpdates: true,
      maxCssGenerationCacheSize: 5000,
      maxFileAge: 24 * 60 * 60 * 1000, // 24小时
      compressionEnabled: false,
    };
  }

  // 文件缓存方法
  async getFileContent(filePath) {
    const maxRetries = 3;
    const baseDelayMs = 80;

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const stat = await fs.stat(filePath);
        const mtimeMs = stat.mtimeMs ?? stat.mtime.getTime();
        const size = stat.size ?? 0;

        const cached = this.fileCache.get(filePath);
        const cachedMtime = this.fileStats.get(filePath);
        const cachedSize = this.fileSizes.get(filePath);

        // 同时校验 mtime 与 size，降低保存风暴/mtime 粒度导致的误命中
        if (cached && cachedMtime && cachedSize !== undefined && mtimeMs === cachedMtime && size === cachedSize) {
          return cached;
        }

        const content = await fs.readFile(filePath, 'utf-8');

        // 保存过程可能短暂读到空内容；若文件 size>0，则短暂重试
        if (content === '' && size > 0 && attempt < maxRetries) {
          await sleep(baseDelayMs * Math.pow(2, attempt));
          continue;
        }

        // LRU缓存清理
        if (this.fileCache.size >= this.maxSize) {
          const oldestKey = this.fileCache.keys().next().value;
          this.fileCache.delete(oldestKey);
          this.fileStats.delete(oldestKey);
          this.fileSizes.delete(oldestKey);
        }

        this.fileCache.set(filePath, content);
        this.fileStats.set(filePath, mtimeMs);
        this.fileSizes.set(filePath, size);

        this.eventBus.emit('cache:file:updated', filePath);
        return content;
      } catch (error) {
        // 保存/替换时常见的瞬时错误：ENOENT/EBUSY/EPERM 等，做短暂重试
        const code = error && error.code;
        const retryableCodes = new Set(['ENOENT', 'EBUSY', 'EPERM', 'EACCES']);
        if (attempt < maxRetries && retryableCodes.has(code)) {
          await sleep(baseDelayMs * Math.pow(2, attempt));
          continue;
        }

        this.eventBus.emit('cache:file:error', { filePath, error });
        return null;
      }
    }

    // 理论上不会走到这里
    return null;
  }

  // 全量扫描缓存方法
  updateFullScanCache(classList, staticClassList, baseClassList) {
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

  getFullScanCache() {
    return this.fullScanCache;
  }

  isFullScanCacheLocked() {
    return this.fullScanCache.isLocked;
  }

  // 全局样式缓存方法
  updateGlobalStyleCache(classList, staticClassList, baseClassList, fileClassMap) {
    this.globalStyleCache.classListSet.clear();
    this.globalStyleCache.userStaticClassListSet.clear();
    this.globalStyleCache.userBaseClassListSet.clear();
    this.globalStyleCache.fileClassMap.clear();

    classList.forEach((cls) => this.globalStyleCache.classListSet.add(cls));
    staticClassList.forEach((cls) => this.globalStyleCache.userStaticClassListSet.add(cls));
    baseClassList.forEach((cls) => this.globalStyleCache.userBaseClassListSet.add(cls));

    if (fileClassMap) {
      fileClassMap.forEach((value, key) => {
        this.globalStyleCache.fileClassMap.set(key, value);
      });
    }

    this.globalStyleCache.lastUpdateTime = Date.now();

    this.eventBus.emit('cache:globalStyle:updated', this.globalStyleCache);
  }

  getGlobalStyleCache() {
    return this.globalStyleCache;
  }

  // 缓存清理方法
  clearFileCache() {
    this.fileCache.clear();
    this.fileStats.clear();
    this.eventBus.emit('cache:file:cleared');
  }

  clearFullScanCache() {
    this.fullScanCache.classListSet.clear();
    this.fullScanCache.userStaticClassListSet.clear();
    this.fullScanCache.userBaseClassListSet.clear();
    this.fullScanCache.scanTime = null;
    this.fullScanCache.isLocked = false;
    this.eventBus.emit('cache:fullScan:cleared');
  }

  clearGlobalStyleCache() {
    this.globalStyleCache.classListSet.clear();
    this.globalStyleCache.userStaticClassListSet.clear();
    this.globalStyleCache.userBaseClassListSet.clear();
    this.globalStyleCache.fileClassMap.clear();
    this.globalStyleCache.lastUpdateTime = Date.now();
    this.eventBus.emit('cache:globalStyle:cleared');
  }

  clearAll() {
    this.clearFileCache();
    this.clearFullScanCache();
    this.clearGlobalStyleCache();
    this.eventBus.emit('cache:all:cleared');
  }

  // 缓存统计
  getCacheStats() {
    return {
      fileCacheSize: this.fileCache.size,
      fileCacheMaxSize: this.maxSize,
      fullScanCacheLocked: this.fullScanCache.isLocked,
      fullScanCacheTime: this.fullScanCache.scanTime,
      fullScanClassCount: this.fullScanCache.classListSet.size,
      fullScanStaticCount: this.fullScanCache.userStaticClassListSet.size,
      globalStyleCacheTime: this.globalStyleCache.lastUpdateTime,
      globalStyleClassCount: this.globalStyleCache.classListSet.size,
      globalStyleStaticCount: this.globalStyleCache.userStaticClassListSet.size,
      globalStyleFileMapCount: this.globalStyleCache.fileClassMap.size,
    };
  }

  // 缓存优化
  optimizeCache() {
    const stats = this.getCacheStats();

    // 如果文件缓存接近最大大小，清理最旧的文件
    if (stats.fileCacheSize > this.maxSize * 0.8) {
      const entries = Array.from(this.fileCache.entries());
      const sortedEntries = entries.sort((a, b) => {
        const statA = this.fileStats.get(a[0]) || 0;
        const statB = this.fileStats.get(b[0]) || 0;
        return statA - statB;
      });

      const toRemove = Math.floor(this.maxSize * 0.2);
      for (let i = 0; i < toRemove && i < sortedEntries.length; i++) {
        const [key] = sortedEntries[i];
        this.fileCache.delete(key);
        this.fileStats.delete(key);
      }

      this.eventBus.emit('cache:optimized', { removedCount: toRemove });
    }
  }
  // ==================== 配置缓存管理 ====================

  // 缓存配置
  cacheConfig(config, configHash) {
    if (!this.cacheStrategy.enableConfigCache) {
      return;
    }

    this.configCache.config = config;
    this.configCache.hash = configHash;
    this.configCache.lastModified = Date.now();

    this.eventBus.emit('cache:config:updated', {
      hash: configHash,
      timestamp: this.configCache.lastModified,
    });
  }

  // 获取缓存的配置
  getCachedConfig() {
    return this.configCache.config;
  }

  // 检查配置是否已缓存且有效
  isConfigCacheValid(configHash) {
    return this.configCache.hash === configHash && this.configCache.config !== null;
  }

  // 缓存配置验证结果
  cacheConfigValidation(validationResults) {
    this.configCache.validationResults = validationResults;
    this.eventBus.emit('cache:config:validation:cached', validationResults);
  }

  // 获取缓存的配置验证结果
  getCachedConfigValidation() {
    return this.configCache.validationResults;
  }

  // 更新配置依赖图
  updateConfigDependencyGraph(dependencies) {
    this.configCache.dependencyGraph.clear();
    Object.entries(dependencies).forEach(([key, deps]) => {
      this.configCache.dependencyGraph.set(key, deps);
    });
  }

  // ==================== CSS生成缓存管理 ====================

  // 缓存CSS生成结果
  cacheCssGeneration(classSignature, cssResult) {
    if (!this.cacheStrategy.enableCssGenerationCache) {
      return;
    }

    // 检查缓存大小限制
    if (this.cssGenerationCache.size >= this.cacheStrategy.maxCssGenerationCacheSize) {
      this.evictOldestCssCache();
    }

    this.cssGenerationCache.set(classSignature, {
      result: cssResult,
      timestamp: Date.now(),
      accessCount: 1,
    });

    this.cssGenerationStats.totalGenerations++;
    this.eventBus.emit('cache:css:cached', { classSignature });
  }

  // 获取缓存的CSS生成结果
  getCachedCssGeneration(classSignature) {
    if (!this.cacheStrategy.enableCssGenerationCache) {
      return null;
    }

    const cached = this.cssGenerationCache.get(classSignature);
    if (cached) {
      cached.accessCount++;
      this.cssGenerationStats.hits++;
      this.eventBus.emit('cache:css:hit', { classSignature });
      return cached.result;
    }

    this.cssGenerationStats.misses++;
    this.eventBus.emit('cache:css:miss', { classSignature });
    return null;
  }

  // 清除过期的CSS缓存
  evictOldestCssCache() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, value] of this.cssGenerationCache) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cssGenerationCache.delete(oldestKey);
      this.eventBus.emit('cache:css:evicted', { key: oldestKey });
    }
  }

  // 清除CSS生成缓存
  clearCssGenerationCache() {
    this.cssGenerationCache.clear();
    this.cssGenerationStats = { hits: 0, misses: 0, totalGenerations: 0 };
    this.eventBus.emit('cache:css:cleared');
  }

  // ==================== 增量更新管理 ====================

  // 标记文件为已更改
  markFileChanged(filePath) {
    if (!this.cacheStrategy.enableIncrementalUpdates) {
      return;
    }

    this.incrementalTracker.changedFiles.add(filePath);
    this.incrementalTracker.deletedFiles.delete(filePath); // 如果之前标记为删除，现在移除

    this.eventBus.emit('cache:incremental:fileChanged', { filePath });
  }

  // 标记文件为已删除
  markFileDeleted(filePath) {
    if (!this.cacheStrategy.enableIncrementalUpdates) {
      return;
    }

    this.incrementalTracker.deletedFiles.add(filePath);
    this.incrementalTracker.changedFiles.delete(filePath); // 如果之前标记为更改，现在移除

    // 从文件缓存中删除
    this.fileCache.delete(filePath);
    this.fileStats.delete(filePath);

    this.eventBus.emit('cache:incremental:fileDeleted', { filePath });
  }

  // 获取已更改的文件
  getChangedFiles() {
    return Array.from(this.incrementalTracker.changedFiles);
  }

  // 获取已删除的文件
  getDeletedFiles() {
    return Array.from(this.incrementalTracker.deletedFiles);
  }

  // 处理增量更新
  processIncrementalUpdate() {
    if (!this.cacheStrategy.enableIncrementalUpdates) {
      return null;
    }

    const changedFiles = this.getChangedFiles();
    const deletedFiles = this.getDeletedFiles();

    if (changedFiles.length === 0 && deletedFiles.length === 0) {
      return null; // 无需更新
    }

    const updateInfo = {
      changedFiles,
      deletedFiles,
      timestamp: Date.now(),
      updateId: this.generateUpdateId(),
    };

    // 清除增量追踪
    this.incrementalTracker.changedFiles.clear();
    this.incrementalTracker.deletedFiles.clear();
    this.incrementalTracker.lastIncrementalUpdate = updateInfo.timestamp;

    this.eventBus.emit('cache:incremental:processed', updateInfo);
    return updateInfo;
  }

  // 生成更新ID
  generateUpdateId() {
    return `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 添加待处理的更新
  addPendingUpdate(updateId, updateData) {
    this.incrementalTracker.pendingUpdates.set(updateId, {
      data: updateData,
      timestamp: Date.now(),
    });
  }

  // 完成待处理的更新
  completePendingUpdate(updateId) {
    const updated = this.incrementalTracker.pendingUpdates.delete(updateId);
    if (updated) {
      this.eventBus.emit('cache:incremental:updateCompleted', { updateId });
    }
    return updated;
  }

  // ==================== 缓存策略管理 ====================

  // 更新缓存策略
  updateCacheStrategy(newStrategy) {
    const oldStrategy = { ...this.cacheStrategy };
    this.cacheStrategy = { ...this.cacheStrategy, ...newStrategy };

    // 如果禁用了某些缓存，清除对应的缓存
    if (!this.cacheStrategy.enableFileCache && oldStrategy.enableFileCache) {
      this.clearFileCache();
    }

    if (!this.cacheStrategy.enableConfigCache && oldStrategy.enableConfigCache) {
      this.clearConfigCache();
    }

    if (!this.cacheStrategy.enableCssGenerationCache && oldStrategy.enableCssGenerationCache) {
      this.clearCssGenerationCache();
    }

    this.eventBus.emit('cache:strategy:updated', {
      oldStrategy,
      newStrategy: this.cacheStrategy,
    });
  }

  // 获取缓存策略
  getCacheStrategy() {
    return { ...this.cacheStrategy };
  }

  // 清除配置缓存
  clearConfigCache() {
    this.configCache = {
      config: null,
      hash: null,
      lastModified: null,
      validationResults: null,
      dependencyGraph: new Map(),
    };
    this.eventBus.emit('cache:config:cleared');
  }

  // ==================== 缓存统计和分析 ====================

  // 获取缓存统计
  getCacheStats() {
    const now = Date.now();

    return {
      file: {
        size: this.fileCache.size,
        maxSize: this.maxSize,
        hitRate: this.calculateFileHitRate(),
      },
      config: {
        isCached: this.configCache.config !== null,
        lastModified: this.configCache.lastModified,
        hasValidation: this.configCache.validationResults !== null,
        dependencyCount: this.configCache.dependencyGraph.size,
      },
      cssGeneration: {
        size: this.cssGenerationCache.size,
        maxSize: this.cacheStrategy.maxCssGenerationCacheSize,
        hits: this.cssGenerationStats.hits,
        misses: this.cssGenerationStats.misses,
        hitRate: this.calculateCssHitRate(),
        totalGenerations: this.cssGenerationStats.totalGenerations,
      },
      incremental: {
        changedFiles: this.incrementalTracker.changedFiles.size,
        deletedFiles: this.incrementalTracker.deletedFiles.size,
        pendingUpdates: this.incrementalTracker.pendingUpdates.size,
        lastUpdate: this.incrementalTracker.lastIncrementalUpdate,
      },
      fullScan: {
        isLocked: this.fullScanCache.isLocked,
        scanTime: this.fullScanCache.scanTime,
        classCount: this.fullScanCache.classListSet.size,
        staticClassCount: this.fullScanCache.userStaticClassListSet.size,
        baseClassCount: this.fullScanCache.userBaseClassListSet.size,
      },
      strategy: this.cacheStrategy,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  // 计算文件缓存命中率
  calculateFileHitRate() {
    // 这是一个简化的计算，实际应用中可能需要更复杂的统计
    return this.fileCache.size > 0 ? 0.8 : 0; // 示例值
  }

  // 计算CSS生成缓存命中率
  calculateCssHitRate() {
    const total = this.cssGenerationStats.hits + this.cssGenerationStats.misses;
    return total > 0 ? (this.cssGenerationStats.hits / total) * 100 : 0;
  }

  // 估算内存使用
  estimateMemoryUsage() {
    let totalSize = 0;

    // 文件缓存大小估算
    for (const content of this.fileCache.values()) {
      totalSize += content.length * 2; // 假设UTF-16编码
    }

    // CSS生成缓存大小估算
    for (const [key, value] of this.cssGenerationCache) {
      totalSize += key.length * 2;
      totalSize += JSON.stringify(value.result).length * 2;
    }

    return {
      bytes: totalSize,
      kb: Math.round(totalSize / 1024),
      mb: Math.round(totalSize / (1024 * 1024)),
    };
  }

  // 清理过期缓存
  cleanupExpiredCache() {
    const now = Date.now();
    const maxAge = this.cacheStrategy.maxFileAge;

    // 清理过期的CSS生成缓存
    for (const [key, value] of this.cssGenerationCache) {
      if (now - value.timestamp > maxAge) {
        this.cssGenerationCache.delete(key);
        this.eventBus.emit('cache:css:expired', { key });
      }
    }

    // 清理过期的待处理更新
    for (const [id, update] of this.incrementalTracker.pendingUpdates) {
      if (now - update.timestamp > maxAge) {
        this.incrementalTracker.pendingUpdates.delete(id);
        this.eventBus.emit('cache:incremental:updateExpired', { updateId: id });
      }
    }

    this.eventBus.emit('cache:cleanup:completed', {
      timestamp: now,
      removedItems: 0, // 这里应该统计实际删除的项目数
    });
  }

  // 优化缓存
  optimizeCache() {
    // 根据访问频率优化CSS缓存
    const cssEntries = Array.from(this.cssGenerationCache.entries());
    cssEntries.sort((a, b) => b[1].accessCount - a[1].accessCount);

    // 保留访问频率高的前80%
    const keepCount = Math.floor(cssEntries.length * 0.8);
    this.cssGenerationCache.clear();

    for (let i = 0; i < keepCount; i++) {
      const [key, value] = cssEntries[i];
      this.cssGenerationCache.set(key, value);
    }

    this.eventBus.emit('cache:optimized', {
      cssKeep: keepCount,
      cssRemoved: cssEntries.length - keepCount,
    });
  }

  // 重置所有缓存
  resetAllCaches() {
    this.clearFileCache();
    this.clearConfigCache();
    this.clearCssGenerationCache();
    this.clearFullScanCache();
    this.clearGlobalStyleCache();

    this.incrementalTracker = {
      changedFiles: new Set(),
      deletedFiles: new Set(),
      lastIncrementalUpdate: null,
      pendingUpdates: new Map(),
    };

    this.cssGenerationStats = {
      hits: 0,
      misses: 0,
      totalGenerations: 0,
    };

    this.eventBus.emit('cache:reset:completed', { timestamp: Date.now() });
  }
}

module.exports = CacheManager;
