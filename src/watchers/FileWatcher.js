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
      const entryPaths = this.configManager.getMultiFileEntryPaths();
      if (!multiFile || !multiFile.entry || entryPaths.length === 0) {
        throw new Error('MultiFile configuration is required for file watching');
      }

      const fileTypes = multiFile.entry.fileType || ['html', 'wxml'];

      // 构建监听目标（支持多目录 + 多文件）
      const targets = [];
      for (const p of entryPaths) {
        const normalized = p.replace(/\\/g, '/');
        const ext = path.extname(normalized).slice(1).toLowerCase();
        // 如果看起来是具体文件且扩展名在监听范围内，则直接监听该文件
        if (ext && fileTypes.includes(ext)) {
          targets.push(normalized);
        } else {
          // 当作目录（或未知），监听其下指定类型文件
          for (const type of fileTypes) {
            targets.push(`${normalized}/**/*.${type}`);
          }
        }
      }

      // console.log('[FileWatcher] 监听目标:', targets);

      this.eventBus.emit('watcher:starting', { paths: entryPaths, targets });

      // 创建文件监听器
      this.watcher = chokidar.watch(targets, {
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
            paths: entryPaths,
            targets,
          });
        });

      // 记录监听的路径
      for (const p of entryPaths) this.watchedPaths.add(p);
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
