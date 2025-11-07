import { EventBus } from '../core/EventBus';

interface StateCleanupOptions {
  clearImpactAnalysis?: boolean;
  clearPendingChanges?: boolean;
  clearImpactedModules?: boolean;
  clearSyncQueue?: boolean;
  clearFailedSyncs?: boolean;
  onProgress?: (stage: string, completed: boolean) => void;
}

interface StateCleanupResult {
  success: boolean;
  clearedItems: {
    impactAnalysis?: number;
    pendingChanges?: number;
    impactedModules?: number;
    syncQueue?: number;
    failedSyncs?: number;
  };
  duration: number;
  errors: string[];
}

export default class StateCleaner {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  // 清理状态缓存和临时数据
  cleanup(
    stateManager: any,
    options: StateCleanupOptions = {}
  ): StateCleanupResult {
    const startTime = Date.now();
    const result: StateCleanupResult = {
      success: true,
      clearedItems: {},
      duration: 0,
      errors: [],
    };

    const {
      clearImpactAnalysis = true,
      clearPendingChanges = true,
      clearImpactedModules = true,
      clearSyncQueue = true,
      clearFailedSyncs = true,
      onProgress,
    } = options;

    try {
      if (onProgress) {
        onProgress('开始状态清理', false);
      }

      // 清理影响分析缓存
      if (clearImpactAnalysis && stateManager.impactAnalysisCache) {
        const size = stateManager.impactAnalysisCache.size || 0;
        stateManager.impactAnalysisCache.clear();
        result.clearedItems.impactAnalysis = size;

        if (onProgress) {
          onProgress('清理影响分析缓存', false);
        }
      }

      // 清理待处理的变更
      if (clearPendingChanges && stateManager.changeTracker?.pendingChanges) {
        const size = stateManager.changeTracker.pendingChanges.size || 0;
        stateManager.changeTracker.pendingChanges.clear();
        result.clearedItems.pendingChanges = size;

        if (onProgress) {
          onProgress('清理待处理变更', false);
        }
      }

      // 清理受影响的模块
      if (clearImpactedModules && stateManager.changeTracker?.impactedModules) {
        const size = stateManager.changeTracker.impactedModules.size || 0;
        stateManager.changeTracker.impactedModules.clear();
        result.clearedItems.impactedModules = size;

        if (onProgress) {
          onProgress('清理受影响模块', false);
        }
      }

      // 清理同步队列
      if (clearSyncQueue && stateManager.syncState?.syncQueue) {
        const size = stateManager.syncState.syncQueue.length || 0;
        stateManager.syncState.syncQueue.length = 0;
        result.clearedItems.syncQueue = size;

        if (onProgress) {
          onProgress('清理同步队列', false);
        }
      }

      // 清理失败的同步
      if (clearFailedSyncs && stateManager.syncState?.failedSyncs) {
        const size = stateManager.syncState.failedSyncs.length || 0;
        stateManager.syncState.failedSyncs.length = 0;
        result.clearedItems.failedSyncs = size;

        if (onProgress) {
          onProgress('清理失败同步', false);
        }
      }

      if (onProgress) {
        onProgress('状态清理完成', true);
      }

      this.eventBus.emit('stateCleaner:cleanup:completed', result);
    } catch (error) {
      result.success = false;
      result.errors.push(String(error));
      this.eventBus.emit('stateCleaner:cleanup:error', { error });
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  // 强制重置所有状态
  forceReset(stateManager: any): StateCleanupResult {
    const startTime = Date.now();
    const result: StateCleanupResult = {
      success: true,
      clearedItems: {},
      duration: 0,
      errors: [],
    };

    try {
      // 获取当前状态大小
      if (stateManager.impactAnalysisCache) {
        result.clearedItems.impactAnalysis = stateManager.impactAnalysisCache.size || 0;
      }
      if (stateManager.changeTracker?.pendingChanges) {
        result.clearedItems.pendingChanges = stateManager.changeTracker.pendingChanges.size || 0;
      }
      if (stateManager.changeTracker?.impactedModules) {
        result.clearedItems.impactedModules = stateManager.changeTracker.impactedModules.size || 0;
      }
      if (stateManager.syncState?.syncQueue) {
        result.clearedItems.syncQueue = stateManager.syncState.syncQueue.length || 0;
      }
      if (stateManager.syncState?.failedSyncs) {
        result.clearedItems.failedSyncs = stateManager.syncState.failedSyncs.length || 0;
      }

      // 执行完整的清理
      if (stateManager.cleanup && typeof stateManager.cleanup === 'function') {
        stateManager.cleanup();
      } else {
        // 手动清理
        this.cleanup(stateManager, {
          clearImpactAnalysis: true,
          clearPendingChanges: true,
          clearImpactedModules: true,
          clearSyncQueue: true,
          clearFailedSyncs: true,
        });
      }

      this.eventBus.emit('stateCleaner:forceReset:completed', result);
    } catch (error) {
      result.success = false;
      result.errors.push(String(error));
      this.eventBus.emit('stateCleaner:forceReset:error', { error });
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  // 获取状态清理统计
  getCleanupStats(stateManager: any): {
    impactAnalysisSize: number;
    pendingChangesSize: number;
    impactedModulesSize: number;
    syncQueueSize: number;
    failedSyncsSize: number;
    totalSize: number;
  } {
    const stats = {
      impactAnalysisSize: 0,
      pendingChangesSize: 0,
      impactedModulesSize: 0,
      syncQueueSize: 0,
      failedSyncsSize: 0,
      totalSize: 0,
    };

    try {
      if (stateManager.impactAnalysisCache) {
        stats.impactAnalysisSize = stateManager.impactAnalysisCache.size || 0;
      }
      if (stateManager.changeTracker?.pendingChanges) {
        stats.pendingChangesSize = stateManager.changeTracker.pendingChanges.size || 0;
      }
      if (stateManager.changeTracker?.impactedModules) {
        stats.impactedModulesSize = stateManager.changeTracker.impactedModules.size || 0;
      }
      if (stateManager.syncState?.syncQueue) {
        stats.syncQueueSize = stateManager.syncState.syncQueue.length || 0;
      }
      if (stateManager.syncState?.failedSyncs) {
        stats.failedSyncsSize = stateManager.syncState.failedSyncs.length || 0;
      }

      stats.totalSize = stats.impactAnalysisSize +
                       stats.pendingChangesSize +
                       stats.impactedModulesSize +
                       stats.syncQueueSize +
                       stats.failedSyncsSize;
    } catch (error) {
      this.eventBus.emit('stateCleaner:stats:error', { error });
    }

    return stats;
  }

  // 检查是否需要清理
  needsCleanup(stateManager: any, thresholds: {
    maxImpactAnalysis?: number;
    maxPendingChanges?: number;
    maxImpactedModules?: number;
    maxSyncQueue?: number;
    maxFailedSyncs?: number;
  } = {}): boolean {
    const defaultThresholds = {
      maxImpactAnalysis: 1000,
      maxPendingChanges: 500,
      maxImpactedModules: 200,
      maxSyncQueue: 100,
      maxFailedSyncs: 50,
    };

    const finalThresholds = { ...defaultThresholds, ...thresholds };
    const stats = this.getCleanupStats(stateManager);

    return (
      stats.impactAnalysisSize > finalThresholds.maxImpactAnalysis ||
      stats.pendingChangesSize > finalThresholds.maxPendingChanges ||
      stats.impactedModulesSize > finalThresholds.maxImpactedModules ||
      stats.syncQueueSize > finalThresholds.maxSyncQueue ||
      stats.failedSyncsSize > finalThresholds.maxFailedSyncs
    );
  }

  // 自动清理（基于阈值）
  autoCleanup(
    stateManager: any,
    thresholds?: any,
    options?: StateCleanupOptions
  ): StateCleanupResult | null {
    if (this.needsCleanup(stateManager, thresholds)) {
      return this.cleanup(stateManager, options);
    }
    return null;
  }
}