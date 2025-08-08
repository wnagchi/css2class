/*
 * @LastEditors: biz
 */
class StateManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    
    // 核心状态集合
    this.classListSet = new Set();
    this.userStaticClassListSet = new Set();
    this.userBaseClassListSet = new Set();
    this.cssWrite = new Set();
    
    // 扫描状态
    this.isScanning = false;
    this.scanCompletedTime = null;
    this.initialScanComplete = false;
    
    // 全量扫描只读数据
    this.fullScanReadOnlyData = {
      classListSet: new Set(),
      userStaticClassListSet: new Set(),
      userBaseClassListSet: new Set(),
      scanTime: null,
      isLocked: false
    };
    
    // 全局样式缓存
    this.globalStyleCache = {
      classListSet: new Set(),
      userStaticClassListSet: new Set(),
      userBaseClassListSet: new Set(),
      fileClassMap: new Map(),
      lastUpdateTime: Date.now()
    };

    // 配置状态管理
    this.configState = {
      currentConfig: null,
      configHash: null,
      lastConfigUpdate: null,
      configHistory: [],
      maxHistorySize: 10
    };

    // 状态变更追踪
    this.changeTracker = {
      pendingChanges: new Set(),
      lastStateSnapshot: null,
      changeTimestamp: null,
      impactedModules: new Set()
    };

    // 影响分析缓存
    this.impactAnalysisCache = new Map();
    
    // 同步状态
    this.syncState = {
      isSyncing: false,
      lastSyncTime: null,
      syncQueue: [],
      failedSyncs: []
    };

    // 性能监控
    this.performanceMetrics = {
      stateUpdateCount: 0,
      averageUpdateTime: 0,
      lastUpdateDuration: 0,
      totalUpdateTime: 0
    };
  }

  // 状态获取方法
  getClassListSet() {
    return this.classListSet;
  }

  getUserStaticClassListSet() {
    return this.userStaticClassListSet;
  }

  getUserBaseClassListSet() {
    return this.userBaseClassListSet;
  }

  getCssWrite() {
    return this.cssWrite;
  }

  getFullScanData() {
    return this.fullScanReadOnlyData;
  }

  getGlobalStyleCache() {
    return this.globalStyleCache;
  }

  // 扫描状态管理
  setScanning(scanning) {
    this.isScanning = scanning;
    this.eventBus.emit('scanning:changed', scanning);
  }

  isCurrentlyScanning() {
    return this.isScanning;
  }

  setScanCompleted() {
    this.scanCompletedTime = Date.now();
    this.initialScanComplete = true;
    this.eventBus.emit('scan:completed', this.scanCompletedTime);
  }

  isInitialScanComplete() {
    return this.initialScanComplete;
  }

  // 状态更新方法
  updateClassListSet(classList) {
    this.classListSet.clear();
    classList.forEach(cls => this.classListSet.add(cls));
    this.eventBus.emit('classList:updated', this.classListSet);
  }

  updateUserStaticClassListSet(staticClassList) {
    this.userStaticClassListSet.clear();
    staticClassList.forEach(cls => this.userStaticClassListSet.add(cls));
    this.eventBus.emit('staticClassList:updated', this.userStaticClassListSet);
  }

  updateFullScanData(data) {
    this.fullScanReadOnlyData = {
      ...data,
      isLocked: true,
      scanTime: Date.now()
    };
    this.eventBus.emit('fullScanData:updated', this.fullScanReadOnlyData);
  }

  // 缓存管理
  clearCssWrite() {
    this.cssWrite.clear();
    this.eventBus.emit('cssWrite:cleared');
  }

  addToCssWrite(key) {
    this.cssWrite.add(key);
  }

  hasInCssWrite(key) {
    return this.cssWrite.has(key);
  }

  // 状态重置
  reset() {
    this.classListSet.clear();
    this.userStaticClassListSet.clear();
    this.userBaseClassListSet.clear();
    this.cssWrite.clear();
    this.isScanning = false;
    this.scanCompletedTime = null;
    this.initialScanComplete = false;
    
    this.fullScanReadOnlyData = {
      classListSet: new Set(),
      userStaticClassListSet: new Set(),
      userBaseClassListSet: new Set(),
      scanTime: null,
      isLocked: false
    };
    
    this.globalStyleCache = {
      classListSet: new Set(),
      userStaticClassListSet: new Set(),
      userBaseClassListSet: new Set(),
      fileClassMap: new Map(),
      lastUpdateTime: Date.now()
    };
    
    this.eventBus.emit('state:reset');
  }

  // 统一文件模式状态管理
  setUnifiedFileMode(enabled) {
    this.isUnifiedFileMode = enabled;
    this.eventBus.emit('unifiedFileMode:changed', enabled);
  }

  isInUnifiedFileMode() {
    return this.isUnifiedFileMode || false;
  }

  // 全量扫描管理器状态同步
  syncWithFullScanManager(fullScanManagerData) {
    this.fullScanReadOnlyData = {
      classListSet: new Set(fullScanManagerData.classListSet),
      userStaticClassListSet: new Set(fullScanManagerData.userStaticClassListSet),
      scanTime: fullScanManagerData.scanTime,
      isLocked: fullScanManagerData.isLocked
    };
    this.eventBus.emit('fullScanData:synced', this.fullScanReadOnlyData);
  }

  // ==================== 配置变更影响分析 ====================

  // 更新配置状态
  updateConfigState(config, configHash) {
    const previousConfig = this.configState.currentConfig;
    const previousHash = this.configState.configHash;

    // 保存配置历史
    if (previousConfig) {
      this.configState.configHistory.unshift({
        config: previousConfig,
        hash: previousHash,
        timestamp: this.configState.lastConfigUpdate
      });

      // 限制历史大小
      if (this.configState.configHistory.length > this.configState.maxHistorySize) {
        this.configState.configHistory.pop();
      }
    }

    // 更新当前配置
    this.configState.currentConfig = config;
    this.configState.configHash = configHash;
    this.configState.lastConfigUpdate = Date.now();

    // 分析配置变更影响
    if (previousConfig) {
      const impactAnalysis = this.analyzeConfigChangeImpact(previousConfig, config);
      this.eventBus.emit('config:impact:analyzed', impactAnalysis);
      
      // 如果有重大影响，触发状态同步
      if (impactAnalysis.requiresStateSync) {
        this.scheduleStateSync('config_change', impactAnalysis);
      }
    }

    this.eventBus.emit('config:state:updated', {
      configHash,
      timestamp: this.configState.lastConfigUpdate,
      hasHistory: this.configState.configHistory.length > 0
    });
  }

  // 分析配置变更影响
  analyzeConfigChangeImpact(oldConfig, newConfig) {
    const cacheKey = `${this.getConfigHash(oldConfig)}-${this.getConfigHash(newConfig)}`;
    
    // 检查缓存
    if (this.impactAnalysisCache.has(cacheKey)) {
      return this.impactAnalysisCache.get(cacheKey);
    }

    const impact = {
      timestamp: Date.now(),
      requiresStateSync: false,
      requiresCacheReset: false,
      requiresFullRescan: false,
      affectedModules: new Set(),
      changedProperties: [],
      severity: 'low' // low, medium, high, critical
    };

    // 分析具体变更
    const changes = this.detectConfigChanges(oldConfig, newConfig);
    impact.changedProperties = changes;

    // 评估影响严重程度
    for (const change of changes) {
      this.evaluateChangeImpact(change, impact);
    }

    // 确定整体严重程度
    if (impact.affectedModules.has('parser') || impact.affectedModules.has('generator')) {
      impact.severity = 'high';
      impact.requiresStateSync = true;
    } else if (impact.affectedModules.has('cache') || impact.affectedModules.has('config')) {
      impact.severity = 'medium';
      impact.requiresCacheReset = true;
    }

    // 缓存分析结果
    this.impactAnalysisCache.set(cacheKey, impact);

    // 限制缓存大小
    if (this.impactAnalysisCache.size > 100) {
      const firstKey = this.impactAnalysisCache.keys().next().value;
      this.impactAnalysisCache.delete(firstKey);
    }

    return impact;
  }

  // 检测配置变更
  detectConfigChanges(oldConfig, newConfig) {
    const changes = [];
    const allKeys = new Set([...Object.keys(oldConfig), ...Object.keys(newConfig)]);

    for (const key of allKeys) {
      const oldValue = oldConfig[key];
      const newValue = newConfig[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          property: key,
          oldValue,
          newValue,
          type: this.getChangeType(oldValue, newValue)
        });
      }
    }

    return changes;
  }

  // 获取变更类型
  getChangeType(oldValue, newValue) {
    if (oldValue === undefined) return 'added';
    if (newValue === undefined) return 'removed';
    return 'modified';
  }

  // 评估单个变更的影响
  evaluateChangeImpact(change, impact) {
    const { property, type } = change;

    // 关键配置属性的影响评估
    const criticalProperties = ['cssName', 'baseClassName', 'atomicClassMap'];
    const moduleProperties = {
      'system': ['cache', 'config'],
      'output': ['writer'],
      'cssName': ['parser', 'generator'],
      'baseClassName': ['parser', 'generator'],
      'atomicClassMap': ['parser', 'generator'],
      'importantFlags': ['parser'],
      'multiFile': ['writer'],
      'variants': ['generator']
    };

    if (criticalProperties.includes(property)) {
      impact.requiresFullRescan = true;
      impact.severity = 'critical';
    }

    if (moduleProperties[property]) {
      moduleProperties[property].forEach(module => {
        impact.affectedModules.add(module);
      });
    }
  }

  // 获取配置哈希
  getConfigHash(config) {
    return require('crypto')
      .createHash('md5')
      .update(JSON.stringify(config))
      .digest('hex');
  }

  // ==================== 状态同步逻辑 ====================

  // 调度状态同步
  scheduleStateSync(reason, metadata = {}) {
    const syncTask = {
      id: this.generateSyncId(),
      reason,
      metadata,
      timestamp: Date.now(),
      priority: this.getSyncPriority(reason)
    };

    this.syncState.syncQueue.push(syncTask);
    this.syncState.syncQueue.sort((a, b) => b.priority - a.priority);

    this.eventBus.emit('state:sync:scheduled', syncTask);

    // 如果当前没有在同步，立即开始
    if (!this.syncState.isSyncing) {
      this.processNextSync();
    }
  }

  // 处理下一个同步任务
  async processNextSync() {
    if (this.syncState.syncQueue.length === 0 || this.syncState.isSyncing) {
      return;
    }

    this.syncState.isSyncing = true;
    const syncTask = this.syncState.syncQueue.shift();

    const startTime = Date.now();

    try {
      this.eventBus.emit('state:sync:started', syncTask);

      await this.executeSyncTask(syncTask);

      const duration = Date.now() - startTime;
      this.syncState.lastSyncTime = Date.now();

      this.eventBus.emit('state:sync:completed', {
        ...syncTask,
        duration,
        success: true
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.syncState.failedSyncs.push({
        ...syncTask,
        error: error.message,
        duration,
        timestamp: Date.now()
      });

      this.eventBus.emit('state:sync:failed', {
        ...syncTask,
        error: error.message,
        duration
      });

      // 限制失败记录数量
      if (this.syncState.failedSyncs.length > 50) {
        this.syncState.failedSyncs.shift();
      }

    } finally {
      this.syncState.isSyncing = false;
      
      // 处理下一个同步任务
      if (this.syncState.syncQueue.length > 0) {
        setTimeout(() => this.processNextSync(), 10);
      }
    }
  }

  // 执行同步任务
  async executeSyncTask(syncTask) {
    const { reason, metadata } = syncTask;

    switch (reason) {
      case 'config_change':
        await this.syncConfigChange(metadata);
        break;
      case 'file_change':
        await this.syncFileChange(metadata);
        break;
      case 'cache_update':
        await this.syncCacheUpdate(metadata);
        break;
      case 'full_rescan':
        await this.syncFullRescan(metadata);
        break;
      default:
        await this.syncGeneric(metadata);
    }
  }

  // 配置变更同步
  async syncConfigChange(impactAnalysis) {
    if (impactAnalysis.requiresFullRescan) {
      this.eventBus.emit('state:sync:triggerFullRescan', impactAnalysis);
    }

    if (impactAnalysis.requiresCacheReset) {
      this.eventBus.emit('state:sync:triggerCacheReset', impactAnalysis);
    }

    // 更新影响的模块状态
    for (const module of impactAnalysis.affectedModules) {
      this.eventBus.emit(`state:sync:updateModule`, { module, impactAnalysis });
    }
  }

  // 文件变更同步
  async syncFileChange(metadata) {
    // 标记需要重新扫描的文件
    this.changeTracker.pendingChanges.add('file_change');
    this.changeTracker.impactedModules.add('parser');
    this.changeTracker.changeTimestamp = Date.now();
  }

  // 缓存更新同步
  async syncCacheUpdate(metadata) {
    this.changeTracker.pendingChanges.add('cache_update');
    this.changeTracker.impactedModules.add('cache');
  }

  // 全量重扫描同步
  async syncFullRescan(metadata) {
    this.reset();
    this.eventBus.emit('state:sync:fullRescanRequested', metadata);
  }

  // 通用同步
  async syncGeneric(metadata) {
    this.eventBus.emit('state:sync:generic', metadata);
  }

  // 生成同步ID
  generateSyncId() {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 获取同步优先级
  getSyncPriority(reason) {
    const priorities = {
      'config_change': 10,
      'full_rescan': 9,
      'file_change': 5,
      'cache_update': 3,
      'generic': 1
    };
    return priorities[reason] || 1;
  }

  // ==================== 性能监控 ====================

  // 开始状态更新监控
  startUpdateMonitoring() {
    this.updateStartTime = Date.now();
  }

  // 结束状态更新监控
  endUpdateMonitoring() {
    if (this.updateStartTime) {
      const duration = Date.now() - this.updateStartTime;
      this.performanceMetrics.stateUpdateCount++;
      this.performanceMetrics.lastUpdateDuration = duration;
      this.performanceMetrics.totalUpdateTime += duration;
      this.performanceMetrics.averageUpdateTime = 
        this.performanceMetrics.totalUpdateTime / this.performanceMetrics.stateUpdateCount;
      
      this.eventBus.emit('state:performance:updated', {
        duration,
        averageTime: this.performanceMetrics.averageUpdateTime,
        updateCount: this.performanceMetrics.stateUpdateCount
      });
      
      this.updateStartTime = null;
    }
  }

  // ==================== 增强的状态统计 ====================

  // 获取完整状态统计
  getStats() {
    return {
      // 基础状态
      classListCount: this.classListSet.size,
      staticClassCount: this.userStaticClassListSet.size,
      baseClassCount: this.userBaseClassListSet.size,
      cssWriteCount: this.cssWrite.size,
      isScanning: this.isScanning,
      initialScanComplete: this.initialScanComplete,
      fullScanDataLocked: this.fullScanReadOnlyData.isLocked,
      fullScanDataTime: this.fullScanReadOnlyData.scanTime,
      isUnifiedFileMode: this.isInUnifiedFileMode(),

      // 配置状态
      config: {
        hasCurrentConfig: this.configState.currentConfig !== null,
        lastUpdate: this.configState.lastConfigUpdate,
        historySize: this.configState.configHistory.length,
        currentHash: this.configState.configHash
      },

      // 变更追踪
      changeTracking: {
        pendingChanges: this.changeTracker.pendingChanges.size,
        lastChangeTime: this.changeTracker.changeTimestamp,
        impactedModules: Array.from(this.changeTracker.impactedModules),
        hasSnapshot: this.changeTracker.lastStateSnapshot !== null
      },

      // 同步状态
      sync: {
        isSyncing: this.syncState.isSyncing,
        queueSize: this.syncState.syncQueue.length,
        lastSyncTime: this.syncState.lastSyncTime,
        failedSyncsCount: this.syncState.failedSyncs.length
      },

      // 性能指标
      performance: {
        ...this.performanceMetrics,
        impactAnalysisCacheSize: this.impactAnalysisCache.size
      }
    };
  }

  // 获取配置历史
  getConfigHistory() {
    return this.configState.configHistory;
  }

  // 获取同步队列状态
  getSyncQueueStatus() {
    return {
      queue: this.syncState.syncQueue,
      isSyncing: this.syncState.isSyncing,
      failedSyncs: this.syncState.failedSyncs.slice(-10) // 最近10个失败记录
    };
  }

  // 清理状态
  cleanup() {
    this.impactAnalysisCache.clear();
    this.changeTracker.pendingChanges.clear();
    this.changeTracker.impactedModules.clear();
    this.syncState.syncQueue.length = 0;
    this.syncState.failedSyncs.length = 0;
    
    this.eventBus.emit('state:cleaned');
  }

  // 重置性能指标
  resetPerformanceMetrics() {
    this.performanceMetrics = {
      stateUpdateCount: 0,
      averageUpdateTime: 0,
      lastUpdateDuration: 0,
      totalUpdateTime: 0
    };
    
    this.eventBus.emit('state:performance:reset');
  }
}

module.exports = StateManager; 