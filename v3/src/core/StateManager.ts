import { EventBus } from './EventBus';
import { StateCleaner } from '../cleanup';

interface ConfigState {
  currentConfig: any;
  configHash: string | null;
  lastConfigUpdate: number | null;
  configHistory: Array<{
    config: any;
    hash: string;
    timestamp: number | null;
  }>;
  maxHistorySize: number;
}

interface ChangeTracker {
  pendingChanges: Set<string>;
  lastStateSnapshot: any;
  changeTimestamp: number | null;
  impactedModules: Set<string>;
}

interface SyncState {
  isSyncing: boolean;
  lastSyncTime: number | null;
  syncQueue: Array<{
    id: string;
    reason: string;
    metadata: any;
    timestamp: number;
    priority: number;
  }>;
  failedSyncs: Array<{
    id: string;
    reason: string;
    metadata: any;
    error: string;
    duration: number;
    timestamp: number;
  }>;
}

interface PerformanceMetrics {
  stateUpdateCount: number;
  averageUpdateTime: number;
  lastUpdateDuration: number;
  totalUpdateTime: number;
}

interface FullScanReadOnlyData {
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

export class StateManager {
  private eventBus: EventBus;
  private stateCleaner: StateCleaner;

  // 核心状态集合
  private classListSet: Set<string> = new Set();
  private userStaticClassListSet: Set<string> = new Set();
  private userBaseClassListSet: Set<string> = new Set();
  private cssWrite: Set<string> = new Set();

  // 扫描状态
  private isScanning: boolean = false;
  private scanCompletedTime: number | null = null;
  private initialScanComplete: boolean = false;
  private isUnifiedFileMode: boolean = false;

  // 全量扫描只读数据
  private fullScanReadOnlyData: FullScanReadOnlyData = {
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

  // 配置状态管理
  private configState: ConfigState = {
    currentConfig: null,
    configHash: null,
    lastConfigUpdate: null,
    configHistory: [],
    maxHistorySize: 10,
  };

  // 状态变更追踪
  private changeTracker: ChangeTracker = {
    pendingChanges: new Set(),
    lastStateSnapshot: null,
    changeTimestamp: null,
    impactedModules: new Set(),
  };

  // 影响分析缓存
  private impactAnalysisCache: Map<string, any> = new Map();

  // 同步状态
  private syncState: SyncState = {
    isSyncing: false,
    lastSyncTime: null,
    syncQueue: [],
    failedSyncs: [],
  };

  // 性能监控
  private performanceMetrics: PerformanceMetrics = {
    stateUpdateCount: 0,
    averageUpdateTime: 0,
    lastUpdateDuration: 0,
    totalUpdateTime: 0,
  };

  private updateStartTime: number | null = null;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.stateCleaner = new StateCleaner(eventBus);
  }

  // 状态获取方法
  getClassListSet(): Set<string> {
    return this.classListSet;
  }

  getUserStaticClassListSet(): Set<string> {
    return this.userStaticClassListSet;
  }

  getUserBaseClassListSet(): Set<string> {
    return this.userBaseClassListSet;
  }

  getCssWrite(): Set<string> {
    return this.cssWrite;
  }

  getFullScanData(): FullScanReadOnlyData {
    return this.fullScanReadOnlyData;
  }

  getGlobalStyleCache(): GlobalStyleCache {
    return this.globalStyleCache;
  }

  // 扫描状态管理
  setScanning(scanning: boolean): void {
    this.isScanning = scanning;
    this.eventBus.emit('scanning:changed', { scanning });
  }

  isCurrentlyScanning(): boolean {
    return this.isScanning;
  }

  setScanCompleted(): void {
    this.scanCompletedTime = Date.now();
    this.initialScanComplete = true;
    this.eventBus.emit('scan:completed', { timestamp: this.scanCompletedTime });
  }

  isInitialScanComplete(): boolean {
    return this.initialScanComplete;
  }

  // 状态更新方法
  updateClassListSet(classList: string[]): void {
    this.classListSet.clear();
    classList.forEach((cls) => this.classListSet.add(cls));
    this.eventBus.emit('classList:updated', this.classListSet);
  }

  updateUserStaticClassListSet(staticClassList: string[]): void {
    this.userStaticClassListSet.clear();
    staticClassList.forEach((cls) => this.userStaticClassListSet.add(cls));
    this.eventBus.emit('staticClassList:updated', this.userStaticClassListSet);
  }

  updateFullScanData(data: Partial<FullScanReadOnlyData>): void {
    this.fullScanReadOnlyData = {
      ...this.fullScanReadOnlyData,
      ...data,
      isLocked: true,
      scanTime: Date.now(),
    };
    this.eventBus.emit('fullScanData:updated', this.fullScanReadOnlyData);
  }

  // 缓存管理
  clearCssWrite(): void {
    this.cssWrite.clear();
    this.eventBus.emit('cssWrite:cleared');
  }

  addToCssWrite(key: string): void {
    this.cssWrite.add(key);
  }

  hasInCssWrite(key: string): boolean {
    return this.cssWrite.has(key);
  }

  // 状态重置
  reset(): void {
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
      isLocked: false,
    };

    this.globalStyleCache = {
      classListSet: new Set(),
      userStaticClassListSet: new Set(),
      userBaseClassListSet: new Set(),
      fileClassMap: new Map(),
      lastUpdateTime: Date.now(),
    };

    this.eventBus.emit('state:reset');
  }

  // 统一文件模式状态管理
  setUnifiedFileMode(enabled: boolean): void {
    this.isUnifiedFileMode = enabled;
    this.eventBus.emit('unifiedFileMode:changed', { enabled });
  }

  isInUnifiedFileMode(): boolean {
    return this.isUnifiedFileMode;
  }

  // 全量扫描管理器状态同步
  syncWithFullScanManager(fullScanManagerData: FullScanReadOnlyData): void {
    this.fullScanReadOnlyData = {
      classListSet: new Set(fullScanManagerData.classListSet),
      userStaticClassListSet: new Set(fullScanManagerData.userStaticClassListSet),
      userBaseClassListSet: new Set(fullScanManagerData.userBaseClassListSet),
      scanTime: fullScanManagerData.scanTime,
      isLocked: fullScanManagerData.isLocked,
    };
    this.eventBus.emit('fullScanData:synced', this.fullScanReadOnlyData);
  }

  // ==================== 配置变更影响分析 ====================

  // 更新配置状态
  updateConfigState(config: any, configHash: string): void {
    const previousConfig = this.configState.currentConfig;
    const previousHash = this.configState.configHash;

    // 保存配置历史
    if (previousConfig) {
      this.configState.configHistory.unshift({
        config: previousConfig,
        hash: previousHash!,
        timestamp: this.configState.lastConfigUpdate,
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
      hasHistory: this.configState.configHistory.length > 0,
    });
  }

  // 分析配置变更影响
  private analyzeConfigChangeImpact(oldConfig: any, newConfig: any): any {
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
      affectedModules: new Set<string>(),
      changedProperties: [] as any[],
      severity: 'low' as 'low' | 'medium' | 'high' | 'critical',
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
      if (firstKey) {
        this.impactAnalysisCache.delete(firstKey);
      }
    }

    return impact;
  }

  // 检测配置变更
  private detectConfigChanges(oldConfig: any, newConfig: any): any[] {
    const changes: any[] = [];
    const allKeys = new Set([...Object.keys(oldConfig), ...Object.keys(newConfig)]);

    for (const key of allKeys) {
      const oldValue = oldConfig[key];
      const newValue = newConfig[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          property: key,
          oldValue,
          newValue,
          type: this.getChangeType(oldValue, newValue),
        });
      }
    }

    return changes;
  }

  // 获取变更类型
  private getChangeType(oldValue: any, newValue: any): string {
    if (oldValue === undefined) return 'added';
    if (newValue === undefined) return 'removed';
    return 'modified';
  }

  // 评估单个变更的影响
  private evaluateChangeImpact(change: any, impact: any): void {
    const { property } = change;

    // 关键配置属性的影响评估
    const criticalProperties = ['cssName', 'baseClassName', 'atomicClassMap'];
    const moduleProperties: Record<string, string[]> = {
      system: ['cache', 'config'],
      output: ['writer'],
      cssName: ['parser', 'generator'],
      baseClassName: ['parser', 'generator'],
      atomicClassMap: ['parser', 'generator'],
      importantFlags: ['parser'],
      multiFile: ['writer'],
      variants: ['generator'],
    };

    if (criticalProperties.includes(property)) {
      impact.requiresFullRescan = true;
      impact.severity = 'critical';
    }

    if (moduleProperties[property]) {
      moduleProperties[property].forEach((module) => {
        impact.affectedModules.add(module);
      });
    }
  }

  // 获取配置哈希
  private getConfigHash(config: any): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(JSON.stringify(config)).digest('hex');
  }

  // ==================== 状态同步逻辑 ====================

  // 调度状态同步
  private scheduleStateSync(reason: string, metadata = {}): void {
    const syncTask = {
      id: this.generateSyncId(),
      reason,
      metadata,
      timestamp: Date.now(),
      priority: this.getSyncPriority(reason),
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
  private async processNextSync(): Promise<void> {
    if (this.syncState.syncQueue.length === 0 || this.syncState.isSyncing) {
      return;
    }

    this.syncState.isSyncing = true;
    const syncTask = this.syncState.syncQueue.shift()!;

    const startTime = Date.now();

    try {
      this.eventBus.emit('state:sync:started', syncTask);

      await this.executeSyncTask(syncTask);

      const duration = Date.now() - startTime;
      this.syncState.lastSyncTime = Date.now();

      this.eventBus.emit('state:sync:completed', {
        ...syncTask,
        duration,
        success: true,
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;

      this.syncState.failedSyncs.push({
        ...syncTask,
        error: error.message,
        duration,
        timestamp: Date.now(),
      });

      this.eventBus.emit('state:sync:failed', {
        ...syncTask,
        error: error.message,
        duration,
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
  private async executeSyncTask(syncTask: any): Promise<void> {
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
  private async syncConfigChange(impactAnalysis: any): Promise<void> {
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
  private async syncFileChange(metadata: any): Promise<void> {
    // 标记需要重新扫描的文件
    this.changeTracker.pendingChanges.add('file_change');
    this.changeTracker.impactedModules.add('parser');
    this.changeTracker.changeTimestamp = Date.now();
  }

  // 缓存更新同步
  private async syncCacheUpdate(metadata: any): Promise<void> {
    this.changeTracker.pendingChanges.add('cache_update');
    this.changeTracker.impactedModules.add('cache');
  }

  // 全量重扫描同步
  private async syncFullRescan(metadata: any): Promise<void> {
    this.reset();
    this.eventBus.emit('state:sync:fullRescanRequested', metadata);
  }

  // 通用同步
  private async syncGeneric(metadata: any): Promise<void> {
    this.eventBus.emit('state:sync:generic', metadata);
  }

  // 生成同步ID
  private generateSyncId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // 获取同步优先级
  private getSyncPriority(reason: string): number {
    const priorities: Record<string, number> = {
      config_change: 10,
      full_rescan: 9,
      file_change: 5,
      cache_update: 3,
      generic: 1,
    };
    return priorities[reason] || 1;
  }

  // ==================== 性能监控 ====================

  // 开始状态更新监控
  startUpdateMonitoring(): void {
    this.updateStartTime = Date.now();
  }

  // 结束状态更新监控
  endUpdateMonitoring(): void {
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
        updateCount: this.performanceMetrics.stateUpdateCount,
      });

      this.updateStartTime = null;
    }
  }

  // ==================== 增强的状态统计 ====================

  // 获取完整状态统计
  getStats(): any {
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
        currentHash: this.configState.configHash,
      },

      // 变更追踪
      changeTracking: {
        pendingChanges: this.changeTracker.pendingChanges.size,
        lastChangeTime: this.changeTracker.changeTimestamp,
        impactedModules: Array.from(this.changeTracker.impactedModules),
        hasSnapshot: this.changeTracker.lastStateSnapshot !== null,
      },

      // 同步状态
      sync: {
        isSyncing: this.syncState.isSyncing,
        queueSize: this.syncState.syncQueue.length,
        lastSyncTime: this.syncState.lastSyncTime,
        failedSyncsCount: this.syncState.failedSyncs.length,
      },

      // 性能指标
      performance: {
        ...this.performanceMetrics,
        impactAnalysisCacheSize: this.impactAnalysisCache.size,
      },
    };
  }

  // 获取配置历史
  getConfigHistory(): any[] {
    return this.configState.configHistory;
  }

  // 获取同步队列状态
  getSyncQueueStatus(): any {
    return {
      queue: this.syncState.syncQueue,
      isSyncing: this.syncState.isSyncing,
      failedSyncs: this.syncState.failedSyncs.slice(-10), // 最近10个失败记录
    };
  }

  // 清理状态 - 使用StateCleaner
  cleanup(): void {
    const result = this.stateCleaner.cleanup(this);
    if (!result.success) {
      this.eventBus.emit('state:cleanup:error', { errors: result.errors });
    }
  }

  // 新增：获取状态清理统计
  getStateCleanupStats(): any {
    return this.stateCleaner.getCleanupStats(this);
  }

  // 新增：检查是否需要清理
  needsStateCleanup(thresholds?: any): boolean {
    return this.stateCleaner.needsCleanup(this, thresholds);
  }

  // 新增：自动状态清理
  autoStateCleanup(options?: any): any {
    return this.stateCleaner.autoCleanup(this, undefined, options);
  }

  // 重置性能指标
  resetPerformanceMetrics(): void {
    this.performanceMetrics = {
      stateUpdateCount: 0,
      averageUpdateTime: 0,
      lastUpdateDuration: 0,
      totalUpdateTime: 0,
    };

    this.eventBus.emit('state:performance:reset');
  }
}

export default StateManager;