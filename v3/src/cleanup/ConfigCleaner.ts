import { EventBus } from '../core/EventBus';

interface ConfigCleanupOptions {
  clearConfig?: boolean;
  clearImportantFlags?: boolean;
  clearCssNameMap?: boolean;
  clearBaseClassNameMap?: boolean;
  clearUserStaticClassSet?: boolean;
  clearUserBaseClass?: boolean;
  clearUserStaticClass?: boolean;
  onProgress?: (stage: string, completed: boolean) => void;
}

interface ConfigCleanupResult {
  success: boolean;
  clearedItems: {
    config?: boolean;
    importantFlags?: boolean;
    cssNameMap?: boolean;
    baseClassNameMap?: boolean;
    userStaticClassSet?: boolean;
    userBaseClass?: boolean;
    userStaticClass?: boolean;
  };
  duration: number;
  errors: string[];
}

export default class ConfigCleaner {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  // 清理配置缓存
  cleanup(
    configManager: any,
    options: ConfigCleanupOptions = {}
  ): ConfigCleanupResult {
    const startTime = Date.now();
    const result: ConfigCleanupResult = {
      success: true,
      clearedItems: {},
      duration: 0,
      errors: [],
    };

    const {
      clearConfig = true,
      clearImportantFlags = true,
      clearCssNameMap = true,
      clearBaseClassNameMap = true,
      clearUserStaticClassSet = true,
      clearUserBaseClass = true,
      clearUserStaticClass = true,
      onProgress,
    } = options;

    try {
      if (onProgress) {
        onProgress('开始配置清理', false);
      }

      // 清理主配置
      if (clearConfig && configManager.config !== null) {
        configManager.config = null;
        result.clearedItems.config = true;

        if (onProgress) {
          onProgress('清理主配置', false);
        }
      }

      // 清理重要标志
      if (clearImportantFlags && configManager.importantFlags !== null) {
        configManager.importantFlags = null;
        result.clearedItems.importantFlags = true;

        if (onProgress) {
          onProgress('清理重要标志', false);
        }
      }

      // 清理CSS名称映射
      if (clearCssNameMap && configManager.cssNameMap !== null) {
        configManager.cssNameMap = null;
        result.clearedItems.cssNameMap = true;

        if (onProgress) {
          onProgress('清理CSS名称映射', false);
        }
      }

      // 清理基础类名映射
      if (clearBaseClassNameMap && configManager.baseClassNameMap !== null) {
        configManager.baseClassNameMap = null;
        result.clearedItems.baseClassNameMap = true;

        if (onProgress) {
          onProgress('清理基础类名映射', false);
        }
      }

      // 清理用户静态类集合
      if (clearUserStaticClassSet && configManager.userStaticClassSet !== null) {
        const size = configManager.userStaticClassSet.size || 0;
        configManager.userStaticClassSet = null;
        result.clearedItems.userStaticClassSet = true;

        if (onProgress) {
          onProgress(`清理用户静态类集合 (${size}项)`, false);
        }
      }

      // 清理用户基础类
      if (clearUserBaseClass && configManager.userBaseClass !== null) {
        configManager.userBaseClass = null;
        result.clearedItems.userBaseClass = true;

        if (onProgress) {
          onProgress('清理用户基础类', false);
        }
      }

      // 清理用户静态类
      if (clearUserStaticClass && configManager.userStaticClass !== null) {
        const size = configManager.userStaticClass.size || 0;
        configManager.userStaticClass = null;
        result.clearedItems.userStaticClass = true;

        if (onProgress) {
          onProgress(`清理用户静态类 (${size}项)`, false);
        }
      }

      if (onProgress) {
        onProgress('配置清理完成', true);
      }

      this.eventBus.emit('configCleaner:cleanup:completed', result);
    } catch (error) {
      result.success = false;
      result.errors.push(String(error));
      this.eventBus.emit('configCleaner:cleanup:error', { error });
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  // 强制重置配置
  forceReset(configManager: any): ConfigCleanupResult {
    const startTime = Date.now();
    const result: ConfigCleanupResult = {
      success: true,
      clearedItems: {},
      duration: 0,
      errors: [],
    };

    try {
      // 检查哪些项目需要清理
      result.clearedItems.config = configManager.config !== null;
      result.clearedItems.importantFlags = configManager.importantFlags !== null;
      result.clearedItems.cssNameMap = configManager.cssNameMap !== null;
      result.clearedItems.baseClassNameMap = configManager.baseClassNameMap !== null;
      result.clearedItems.userStaticClassSet = configManager.userStaticClassSet !== null;
      result.clearedItems.userBaseClass = configManager.userBaseClass !== null;
      result.clearedItems.userStaticClass = configManager.userStaticClass !== null;

      // 执行完整的清理
      if (configManager.cleanup && typeof configManager.cleanup === 'function') {
        configManager.cleanup();
      } else {
        // 手动清理
        this.cleanup(configManager, {
          clearConfig: true,
          clearImportantFlags: true,
          clearCssNameMap: true,
          clearBaseClassNameMap: true,
          clearUserStaticClassSet: true,
          clearUserBaseClass: true,
          clearUserStaticClass: true,
        });
      }

      this.eventBus.emit('configCleaner:forceReset:completed', result);
    } catch (error) {
      result.success = false;
      result.errors.push(String(error));
      this.eventBus.emit('configCleaner:forceReset:error', { error });
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  // 获取配置清理统计
  getCleanupStats(configManager: any): {
    hasConfig: boolean;
    hasImportantFlags: boolean;
    hasCssNameMap: boolean;
    hasBaseClassNameMap: boolean;
    userStaticClassSetSize: number;
    hasUserBaseClass: boolean;
    userStaticClassSize: number;
    memoryItems: number;
  } {
    const stats = {
      hasConfig: false,
      hasImportantFlags: false,
      hasCssNameMap: false,
      hasBaseClassNameMap: false,
      userStaticClassSetSize: 0,
      hasUserBaseClass: false,
      userStaticClassSize: 0,
      memoryItems: 0,
    };

    try {
      stats.hasConfig = configManager.config !== null;
      stats.hasImportantFlags = configManager.importantFlags !== null;
      stats.hasCssNameMap = configManager.cssNameMap !== null;
      stats.hasBaseClassNameMap = configManager.baseClassNameMap !== null;

      if (configManager.userStaticClassSet && configManager.userStaticClassSet.size) {
        stats.userStaticClassSetSize = configManager.userStaticClassSet.size;
      }

      stats.hasUserBaseClass = configManager.userBaseClass !== null;

      if (configManager.userStaticClass && configManager.userStaticClass.size) {
        stats.userStaticClassSize = configManager.userStaticClass.size;
      }

      stats.memoryItems =
        (stats.hasConfig ? 1 : 0) +
        (stats.hasImportantFlags ? 1 : 0) +
        (stats.hasCssNameMap ? 1 : 0) +
        (stats.hasBaseClassNameMap ? 1 : 0) +
        stats.userStaticClassSetSize +
        (stats.hasUserBaseClass ? 1 : 0) +
        stats.userStaticClassSize;
    } catch (error) {
      this.eventBus.emit('configCleaner:stats:error', { error });
    }

    return stats;
  }

  // 检查配置是否已加载
  isConfigLoaded(configManager: any): boolean {
    return configManager.config !== null;
  }

  // 安全清理（只在配置未使用时清理）
  safeCleanup(
    configManager: any,
    isConfigInUse: () => boolean,
    options?: ConfigCleanupOptions
  ): ConfigCleanupResult | null {
    if (isConfigInUse()) {
      this.eventBus.emit('configCleaner:safeCleanup:skipped', {
        reason: 'Configuration is currently in use',
      });
      return null;
    }

    return this.cleanup(configManager, options);
  }

  // 部分清理（只清理指定的项目）
  partialCleanup(
    configManager: any,
    itemsToClear: string[],
    onProgress?: (stage: string, completed: boolean) => void
  ): ConfigCleanupResult {
    const options: ConfigCleanupOptions = {
      clearConfig: itemsToClear.includes('config'),
      clearImportantFlags: itemsToClear.includes('importantFlags'),
      clearCssNameMap: itemsToClear.includes('cssNameMap'),
      clearBaseClassNameMap: itemsToClear.includes('baseClassNameMap'),
      clearUserStaticClassSet: itemsToClear.includes('userStaticClassSet'),
      clearUserBaseClass: itemsToClear.includes('userBaseClass'),
      clearUserStaticClass: itemsToClear.includes('userStaticClass'),
      onProgress,
    };

    return this.cleanup(configManager, options);
  }
}