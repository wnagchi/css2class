const chokidar = require('chokidar');
const path = require('path');

class FileWatcher {
  constructor(eventBus, configManager) {
    this.eventBus = eventBus;
    this.configManager = configManager;
    this.watcher = null;
    this.isWatching = false;
    this.watchedPaths = new Set();
  }

  // 启动文件监听
  async startWatching() {
    if (this.isWatching) {
      this.eventBus.emit('watcher:already-running');
      return;
    }

    try {
      const multiFile = this.configManager.getMultiFile();
      if (!multiFile || !multiFile.entry || !multiFile.entry.path) {
        throw new Error('MultiFile configuration is required for file watching');
      }

      // 使用相对路径，并规范化为正斜杠
      const watchPath = multiFile.entry.path.replace(/\\/g, '/');
      const fileTypes = multiFile.entry.fileType || ['html', 'wxml'];

      // 构建文件匹配模式
      const patterns = fileTypes.map((type) => `${watchPath}/**/*.${type}`);

      // console.log('[FileWatcher] 监听路径:', watchPath);
      // console.log('[FileWatcher] 监听模式:', patterns);

      this.eventBus.emit('watcher:starting', { path: watchPath, patterns });

      // 创建文件监听器
      this.watcher = chokidar.watch(patterns, {
        ignoreInitial: false,
        persistent: true,
        usePolling: true,
        interval: 150,
        binaryInterval: 300,
        awaitWriteFinish: {
          // Windows/编辑器保存时可能经历“清空/重写/替换”的瞬时状态，适当加大稳定窗口降低误触发
          stabilityThreshold: 400,
          pollInterval: 100,
        },
      });

      // 监听文件变化事件
      this.watcher
        .on('all', (event, filePath) => {
         // console.log(`[FileWatcher] 文件事件: ${event} -> ${filePath}`);
          if (event === 'add') {
            this.eventBus.emit('file:added', filePath);
            this.eventBus.emit('file:changed', filePath);
          } else if (event === 'change') {
            this.eventBus.emit('file:changed', filePath);
          } else if (event === 'unlink') {
            this.eventBus.emit('file:removed', filePath);
          }
        })
        .on('error', (error) => {
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
  stopWatching() {
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
  getWatchStats() {
    return {
      isWatching: this.isWatching,
      watchedPaths: Array.from(this.watchedPaths),
      watcherActive: !!this.watcher,
    };
  }

  // 检查是否正在监听
  isCurrentlyWatching() {
    return this.isWatching && !!this.watcher;
  }

  // 获取监听的路径列表
  getWatchedPaths() {
    return Array.from(this.watchedPaths);
  }
}

module.exports = FileWatcher;
