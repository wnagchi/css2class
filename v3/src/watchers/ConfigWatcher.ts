import { EventBus } from '../core/EventBus';
import ConfigManager from '../core/ConfigManager';
import Logger from '../utils/Logger';
import * as chokidar from 'chokidar';
import * as path from 'path';
import { Config } from '../../types';

interface WatcherStats {
  watchStartTime: Date | null;
  reloadCount: number;
  lastReloadTime: Date | null;
  successCount: number;
  errorCount: number;
  lastError: string | null;
}

interface ConfigChange {
  type: string;
  field: string;
  oldValue: any;
  newValue: any;
  impact: 'low' | 'medium' | 'high';
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  changes: ConfigChange[];
}

interface WatcherStatsResult {
  isWatching: boolean;
  configPath: string | null;
  watchStartTime: Date | null;
  reloadCount: number;
  lastReloadTime: Date | null;
  successCount: number;
  errorCount: number;
  lastError: string | null;
  debounceDelay: number;
  uptime: number;
}

/**
 * 配置文件监听器
 * 负责监听配置文件变化并触发热重载
 */
class ConfigWatcher {
  private eventBus: EventBus;
  private configManager: ConfigManager;
  private logger: Logger;

  // 监听器实例
  private watcher: chokidar.FSWatcher | null = null;

  // 监听状态
  private isWatching: boolean = false;

  // 配置文件路径
  private configPath: string | null = null;

  // 防抖延迟时间（毫秒）
  private debounceDelay: number = 300;

  // 防抖定时器
  private debounceTimer: NodeJS.Timeout | null = null;

  // 统计信息
  private stats: WatcherStats = {
    watchStartTime: null,
    reloadCount: 0,
    lastReloadTime: null,
    successCount: 0,
    errorCount: 0,
    lastError: null,
  };

  constructor(eventBus: EventBus, configManager: ConfigManager, logger: Logger) {
    this.eventBus = eventBus;
    this.configManager = configManager;
    this.logger = logger;

    this.logger.info('配置监听器已初始化');
  }

  /**
   * 开始监听配置文件
   * @param configPath - 配置文件路径
   */
  startWatching(configPath: string): void {
    try {
      if (this.isWatching) {
        this.logger.warn('配置监听器已在监听中');
        return;
      }

      this.configPath = path.resolve(configPath);
      this.logger.info(`开始监听配置文件: ${this.configPath}`);

      // 创建文件监听器
      this.watcher = chokidar.watch(this.configPath, {
        ignoreInitial: true,
        persistent: true,
        usePolling: true,
        interval: 300,
        binaryInterval: 600,
        awaitWriteFinish: {
          stabilityThreshold: 200,
          pollInterval: 100,
        },
      });

      // 监听文件变化事件
      this.watcher.on('change', (filePath: string) => {
        this.logger.debug(`配置文件已更改: ${filePath}`);
        this.debouncedReload();
      });

      // 监听文件删除事件
      this.watcher.on('unlink', (filePath: string) => {
        this.logger.warn(`配置文件已删除: ${filePath}`);
        this.eventBus.emit('config:file:deleted', { filePath });
      });

      // 监听错误事件
      this.watcher.on('error', (error: Error) => {
        this.logger.errorWithContext('配置监听器错误', error);
        this.stats.errorCount++;
        this.stats.lastError = error.message;
        this.eventBus.emit('config:watcher:error', { error: error.message });
      });

      // 监听准备就绪事件
      this.watcher.on('ready', () => {
        this.isWatching = true;
        this.stats.watchStartTime = new Date();
        this.logger.info(`配置监听器就绪: ${this.configPath}`);
        this.eventBus.emit('config:watcher:ready', { configPath: this.configPath });
      });
    } catch (error) {
      this.logger.errorWithContext('启动配置监听器失败', error);
      this.stats.errorCount++;
      this.stats.lastError = (error as Error).message;
      throw error;
    }
  }

  /**
   * 停止监听配置文件
   */
  stopWatching(): void {
    try {
      if (!this.isWatching || !this.watcher) {
        this.logger.warn('配置监听器未在监听');
        return;
      }

      // 清除防抖定时器
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }

      // 关闭监听器
      this.watcher.close();
      this.watcher = null;
      this.isWatching = false;

      this.logger.info('配置监听器已停止');
      this.eventBus.emit('config:watcher:stopped', {
        configPath: this.configPath,
        stats: this.getWatcherStats(),
      });
    } catch (error) {
      this.logger.errorWithContext('停止配置监听器失败', error);
      throw error;
    }
  }

  /**
   * 防抖重载配置
   */
  private debouncedReload(): void {
    // 清除之前的定时器
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // 设置新的防抖定时器
    this.debounceTimer = setTimeout(() => {
      this.reloadConfig();
    }, this.debounceDelay);
  }

  /**
   * 重新加载配置文件
   */
  private async reloadConfig(): Promise<void> {
    try {
      this.logger.info('正在重载配置...');

      // 更新统计信息
      this.stats.reloadCount++;
      this.stats.lastReloadTime = new Date();

      // 通知开始重载
      this.eventBus.emit('config:reload:start', {
        configPath: this.configPath,
        reloadCount: this.stats.reloadCount,
      });

      // 清除Node.js模块缓存
      this.clearModuleCache();

      // 重新加载配置
      const oldConfig = this.configManager.getConfig();
      await this.configManager.reloadConfig();
      const newConfig = this.configManager.getConfig();

      // 验证新配置
      const validation = this.validateConfigChange(oldConfig, newConfig);

      if (!validation.isValid) {
        throw new Error(`Config validation failed: ${validation.errors.join(', ')}`);
      }

      // 更新成功统计
      this.stats.successCount++;

      this.logger.info('配置重载成功');

      // 通知重载成功
      this.eventBus.emit('config:reload:success', {
        configPath: this.configPath,
        changes: validation.changes,
        reloadCount: this.stats.reloadCount,
        oldConfig,
        newConfig,
      });
    } catch (error) {
      this.stats.errorCount++;
      this.stats.lastError = (error as Error).message;

      this.logger.errorWithContext('重载配置失败', error);

      // 通知重载失败
      this.eventBus.emit('config:reload:error', {
        configPath: this.configPath,
        error: (error as Error).message,
        reloadCount: this.stats.reloadCount,
      });
    }
  }

  /**
   * 清除Node.js模块缓存
   */
  private clearModuleCache(): void {
    try {
      // 清除配置文件的缓存
      if (this.configPath && (require.cache as any)[this.configPath]) {
        delete (require.cache as any)[this.configPath];
        this.logger.debug(`已清除模块缓存: ${this.configPath}`);
      }

      // 清除相关模块的缓存（如果配置文件有依赖）
      if (this.configPath) {
        const configDir = path.dirname(this.configPath);
        Object.keys(require.cache).forEach((modulePath) => {
          if (modulePath.startsWith(configDir) && modulePath.endsWith('.js')) {
            delete (require.cache as any)[modulePath];
            this.logger.debug(`已清除相关模块缓存: ${modulePath}`);
          }
        });
      }
    } catch (error) {
      this.logger.warn(`清除模块缓存失败: ${(error as Error).message}`);
    }
  }

  /**
   * 验证配置变更
   * @param oldConfig - 旧配置
   * @param newConfig - 新配置
   * @returns 验证结果
   */
  private validateConfigChange(oldConfig: Config, newConfig: Config): ValidationResult {
    const validation: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      changes: [],
    };

    try {
      // 检查基本结构
      if (!newConfig || typeof newConfig !== 'object') {
        validation.isValid = false;
        validation.errors.push('Config must be a valid object');
        return validation;
      }

      // 检查必需字段
      const requiredFields = ['multiFile', 'baseClassName'];
      for (const field of requiredFields) {
        if (!newConfig[field as keyof Config]) {
          validation.isValid = false;
          validation.errors.push(`Missing required field: ${field}`);
        }
      }

      // 检查输出配置
      if (newConfig.multiFile && newConfig.multiFile.output) {
        const output = newConfig.multiFile.output;
        if (!output.cssOutType || !['filePath', 'uniFile'].includes(output.cssOutType)) {
          validation.errors.push('Invalid cssOutType, must be "filePath" or "uniFile"');
          validation.isValid = false;
        }
      }

      // 比较配置变化
      this.detectConfigChanges(oldConfig, newConfig, validation);

      if (validation.errors.length === 0) {
        this.logger.info(`配置验证通过，检测到 ${validation.changes.length} 个变更`);
      }
    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Validation error: ${(error as Error).message}`);
    }

    return validation;
  }

  /**
   * 检测配置变化
   * @param oldConfig - 旧配置
   * @param newConfig - 新配置
   * @param validation - 验证对象
   */
  private detectConfigChanges(oldConfig: Config, newConfig: Config, validation: ValidationResult): void {
    try {
      // 检查输出类型变化
      const oldOutputType = oldConfig?.multiFile?.output?.cssOutType;
      const newOutputType = newConfig?.multiFile?.output?.cssOutType;

      if (oldOutputType !== newOutputType) {
        validation.changes.push({
          type: 'outputType',
          field: 'multiFile.output.cssOutType',
          oldValue: oldOutputType,
          newValue: newOutputType,
          impact: 'high', // 需要重新扫描
        });
      }

      // 检查输出路径变化
      const oldOutputPath = oldConfig?.multiFile?.output?.path;
      const newOutputPath = newConfig?.multiFile?.output?.path;

      if (oldOutputPath !== newOutputPath) {
        validation.changes.push({
          type: 'outputPath',
          field: 'multiFile.output.path',
          oldValue: oldOutputPath,
          newValue: newOutputPath,
          impact: 'medium',
        });
      }

      // 检查监听路径变化
      const oldWatchPath = oldConfig?.multiFile?.entry?.path;
      const newWatchPath = newConfig?.multiFile?.entry?.path;

      if (JSON.stringify(oldWatchPath) !== JSON.stringify(newWatchPath)) {
        validation.changes.push({
          type: 'watchPath',
          field: 'multiFile.entry.path',
          oldValue: oldWatchPath,
          newValue: newWatchPath,
          impact: 'high', // 需要重新设置文件监听
        });
      }

      // 检查基础类名配置变化
      const oldBaseClassName = oldConfig?.baseClassName;
      const newBaseClassName = newConfig?.baseClassName;

      if (JSON.stringify(oldBaseClassName) !== JSON.stringify(newBaseClassName)) {
        validation.changes.push({
          type: 'baseClassName',
          field: 'baseClassName',
          oldValue: 'changed',
          newValue: 'changed',
          impact: 'medium', // 需要重新生成CSS
        });
      }
    } catch (error) {
      this.logger.warn(`检测配置变更失败: ${(error as Error).message}`);
    }
  }

  /**
   * 设置防抖延迟时间
   * @param delay - 延迟时间（毫秒）
   */
  setDebounceDelay(delay: number): void {
    if (typeof delay === 'number' && delay > 0) {
      this.debounceDelay = delay;
      this.logger.debug(`配置监听器防抖延迟设置为 ${delay}ms`);
    }
  }

  /**
   * 获取监听器统计信息
   * @returns 统计信息
   */
  getWatcherStats(): WatcherStatsResult {
    return {
      isWatching: this.isWatching,
      configPath: this.configPath,
      watchStartTime: this.stats.watchStartTime,
      reloadCount: this.stats.reloadCount,
      lastReloadTime: this.stats.lastReloadTime,
      successCount: this.stats.successCount,
      errorCount: this.stats.errorCount,
      lastError: this.stats.lastError,
      debounceDelay: this.debounceDelay,
      uptime: this.stats.watchStartTime ? Date.now() - this.stats.watchStartTime.getTime() : 0,
    };
  }

  /**
   * 获取当前监听状态
   * @returns 是否正在监听
   */
  isActive(): boolean {
    return this.isWatching;
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      watchStartTime: this.isWatching ? this.stats.watchStartTime : null,
      reloadCount: 0,
      lastReloadTime: null,
      successCount: 0,
      errorCount: 0,
      lastError: null,
    };

    this.logger.info('Config watcher stats reset');
    this.eventBus.emit('config:watcher:stats:reset');
  }
}

export default ConfigWatcher;