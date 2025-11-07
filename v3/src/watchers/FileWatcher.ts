import { EventBus } from '../core/EventBus';
import ConfigManager from '../core/ConfigManager';
import * as chokidar from 'chokidar';
import * as path from 'path';

interface WatchStats {
  isWatching: boolean;
  watchedPaths: string[];
  watcherActive: boolean;
}

interface MultiFileConfig {
  entry?: {
    path?: string;
    fileType?: string[];
  };
}

class FileWatcher {
  private eventBus: EventBus;
  private configManager: ConfigManager;
  private watcher: chokidar.FSWatcher | null = null;
  private isWatching: boolean = false;
  private watchedPaths: Set<string> = new Set();

  constructor(eventBus: EventBus, configManager: ConfigManager) {
    this.eventBus = eventBus;
    this.configManager = configManager;
  }

  // 启动文件监听
  async startWatching(): Promise<void> {
    if (this.isWatching) {
      this.eventBus.emit('watcher:already-running');
      return;
    }

    try {
      const multiFile = this.configManager.getMultiFile() as MultiFileConfig;
      if (!multiFile || !multiFile.entry || !multiFile.entry.path) {
        throw new Error('MultiFile configuration is required for file watching');
      }

      // 使用相对路径，并规范化为正斜杠
      const watchPath = multiFile.entry.path.replace(/\\/g, '/');
      const fileTypes = multiFile.entry.fileType || ['html', 'wxml'];

      // 构建文件匹配模式
      const patterns = fileTypes.map((type) => `${watchPath}/**/*.${type}`);

      console.log('[FileWatcher] 监听路径:', watchPath);
      console.log('[FileWatcher] 监听模式:', patterns);

      this.eventBus.emit('watcher:starting', { path: watchPath, patterns });

      // 创建文件监听器
      this.watcher = chokidar.watch(patterns, {
        ignoreInitial: false,
        persistent: true,
        usePolling: true,
        interval: 150,
        binaryInterval: 300,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 100,
        },
      });

      // 监听文件变化事件
      this.watcher
        .on('all', (event: string, filePath: string) => {
          console.log(`[FileWatcher] 文件事件: ${event} -> ${filePath}`);
          if (event === 'add') {
            this.eventBus.emit('file:added', filePath);
            this.eventBus.emit('file:changed', filePath);
          } else if (event === 'change') {
            this.eventBus.emit('file:changed', filePath);
          } else if (event === 'unlink') {
            this.eventBus.emit('file:removed', filePath);
          }
        })
        .on('error', (error: Error) => {
          this.eventBus.emit('watcher:error', error);
        })
        .on('ready', () => {
          this.isWatching = true;
          this.eventBus.emit('watcher:ready', {
            path: watchPath,
            patterns: patterns,
          });
        });

      // 记录监听的路径
      this.watchedPaths.add(watchPath);
    } catch (error) {
      this.eventBus.emit('watcher:error', error);
      throw error;
    }
  }

  // 停止文件监听
  stopWatching(): void {
    if (!this.isWatching || !this.watcher) {
      return;
    }

    try {
      this.watcher.close();
      this.watcher = null;
      this.isWatching = false;
      this.watchedPaths.clear();

      this.eventBus.emit('watcher:stopped');
    } catch (error) {
      this.eventBus.emit('watcher:error', error);
    }
  }

  // 获取监听状态
  getWatchStats(): WatchStats {
    return {
      isWatching: this.isWatching,
      watchedPaths: Array.from(this.watchedPaths),
      watcherActive: !!this.watcher,
    };
  }

  // 检查是否正在监听
  isCurrentlyWatching(): boolean {
    return this.isWatching && !!this.watcher;
  }

  // 获取监听的路径列表
  getWatchedPaths(): string[] {
    return Array.from(this.watchedPaths);
  }

  // 添加监听路径
  addWatchPath(watchPath: string): void {
    if (this.watcher && !this.watchedPaths.has(watchPath)) {
      this.watcher.add(watchPath);
      this.watchedPaths.add(watchPath);
      this.eventBus.emit('watcher:path:added', watchPath);
    }
  }

  // 移除监听路径
  removeWatchPath(watchPath: string): void {
    if (this.watcher && this.watchedPaths.has(watchPath)) {
      this.watcher.unwatch(watchPath);
      this.watchedPaths.delete(watchPath);
      this.eventBus.emit('watcher:path:removed', watchPath);
    }
  }

  // 重新加载配置
  reloadConfig(): void {
    if (this.isWatching) {
      this.stopWatching();
      this.startWatching().catch((error) => {
        this.eventBus.emit('watcher:reload:error', error);
      });
    }
  }

  // 获取监听器详细信息
  getWatcherInfo(): {
    stats: WatchStats;
    options: chokidar.WatchOptions | null;
    watched: string[];
  } {
    return {
      stats: this.getWatchStats(),
      options: this.watcher?.options || null,
      watched: this.watchedPaths.size > 0 ? Array.from(this.watchedPaths) : [],
    };
  }
}

export default FileWatcher;