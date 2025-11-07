import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs-extra';
import { Watcher, FileChangeEvent, WatcherConfig } from '../types';
import { Config } from '../types';

/**
 * 文件监听器
 */
export class FileWatcher implements Watcher {
  private watcher: chokidar.FSWatcher | null = null;
  private config: WatcherConfig;
  private onChangeCallback: ((event: FileChangeEvent) => void) | null = null;
  private isRunningFlag = false;
  private fileStates = new Map<string, { size: number; mtime: number; hash: string }>();

  constructor(config: WatcherConfig) {
    this.config = config;
  }

  /**
   * 启动监听
   */
  async start(): Promise<void> {
    if (this.isRunning()) {
      throw new Error('监听器已经在运行中');
    }

    try {
      // 验证路径
      for (const watchPath of this.config.paths) {
        if (!await fs.pathExists(watchPath)) {
          throw new Error(`监听路径不存在: ${watchPath}`);
        }
      }

      // 初始化文件状态
      await this.initializeFileStates();

      // 创建监听器
      this.watcher = chokidar.watch(this.config.paths, {
        ignored: this.createIgnoreMatcher(),
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 100
        }
      });

      // 绑定事件
      this.watcher
        .on('add', (filePath) => this.handleFileChange('add', filePath))
        .on('change', (filePath) => this.handleFileChange('change', filePath))
        .on('unlink', (filePath) => this.handleFileChange('unlink', filePath))
        .on('error', (error) => this.handleError(error));

      this.isRunningFlag = true;
      console.log(`文件监听器已启动，监听路径: ${this.config.paths.join(', ')}`);
    } catch (error) {
      throw new Error(`启动文件监听器失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 停止监听
   */
  async stop(): Promise<void> {
    if (!this.isRunning()) {
      return;
    }

    try {
      if (this.watcher) {
        await this.watcher.close();
        this.watcher = null;
      }

      this.fileStates.clear();
      this.isRunningFlag = false;
      console.log('文件监听器已停止');
    } catch (error) {
      throw new Error(`停止文件监听器失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 设置文件变化回调
   */
  onFileChange(callback: (event: FileChangeEvent) => void): void {
    this.onChangeCallback = callback;
  }

  /**
   * 检查是否正在运行
   */
  isRunning(): boolean {
    return this.isRunningFlag;
  }

  /**
   * 获取监听状态
   */
  getStatus(): {
    isRunning: boolean;
    watchedPaths: string[];
    ignoredPatterns: string[];
    fileCount: number;
  } {
    return {
      isRunning: this.isRunning(),
      watchedPaths: this.config.paths,
      ignoredPatterns: this.config.ignorePatterns,
      fileCount: this.fileStates.size
    };
  }

  /**
   * 手动触发重新扫描
   */
  async rescan(): Promise<void> {
    if (!this.isRunning()) {
      throw new Error('监听器未运行');
    }

    try {
      await this.initializeFileStates();
      console.log('文件监听器已重新扫描');
    } catch (error) {
      throw new Error(`重新扫描失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 添加监听路径
   */
  async addPath(watchPath: string): Promise<void> {
    if (!this.isRunning()) {
      throw new Error('监听器未运行');
    }

    try {
      if (!await fs.pathExists(watchPath)) {
        throw new Error(`监听路径不存在: ${watchPath}`);
      }

      await this.watcher!.add(watchPath);
      
      // 扫描新路径中的文件
      await this.scanDirectory(watchPath);
      
      console.log(`已添加监听路径: ${watchPath}`);
    } catch (error) {
      throw new Error(`添加监听路径失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 移除监听路径
   */
  async removePath(watchPath: string): Promise<void> {
    if (!this.isRunning()) {
      throw new Error('监听器未运行');
    }

    try {
      await this.watcher!.unwatch(watchPath);
      
      // 清理相关文件状态
      for (const [filePath, state] of this.fileStates.entries()) {
        if (filePath.startsWith(watchPath)) {
          this.fileStates.delete(filePath);
        }
      }
      
      console.log(`已移除监听路径: ${watchPath}`);
    } catch (error) {
      throw new Error(`移除监听路径失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取文件统计信息
   */
  getFileStats(): Array<{
    path: string;
    size: number;
    mtime: number;
    hash: string;
  }> {
    return Array.from(this.fileStates.entries()).map(([path, state]) => ({
      path,
      ...state
    }));
  }

  /**
   * 处理文件变化
   */
  private async handleFileChange(type: 'add' | 'change' | 'unlink', filePath: string): Promise<void> {
    try {
      // 检查是否应该处理该文件
      if (!this.shouldProcessFile(filePath)) {
        return;
      }

      // 防抖处理
      await this.debounce(() => this.processFileChange(type, filePath), this.config.debounceMs);
    } catch (error) {
      console.error(`处理文件变化失败: ${filePath}`, error);
    }
  }

  /**
   * 处理文件变化（实际逻辑）
   */
  private async processFileChange(type: 'add' | 'change' | 'unlink', filePath: string): Promise<void> {
    try {
      let stats: { size: number; mtime: number } | undefined;

      if (type !== 'unlink') {
        const fileStats = await fs.stat(filePath);
        stats = {
          size: fileStats.size,
          mtime: fileStats.mtimeMs
        };
      }

      // 更新文件状态
      if (type === 'unlink') {
        this.fileStates.delete(filePath);
      } else if (stats) {
        const hash = await this.calculateFileHash(filePath);
        this.fileStates.set(filePath, {
          ...stats,
          hash
        });
      }

      // 触发回调
      if (this.onChangeCallback) {
        const event: FileChangeEvent = {
          type,
          path: filePath
        };
        if (stats) {
          event.stats = stats;
        }
        this.onChangeCallback(event);
      }
    } catch (error) {
      console.error(`处理文件变化时出错: ${filePath}`, error);
    }
  }

  /**
   * 处理错误
   */
  private handleError(error: Error): void {
    console.error('文件监听器错误:', error);
  }

  /**
   * 初始化文件状态
   */
  private async initializeFileStates(): Promise<void> {
    this.fileStates.clear();

    for (const watchPath of this.config.paths) {
      await this.scanDirectory(watchPath);
    }
  }

  /**
   * 扫描目录
   */
  private async scanDirectory(dirPath: string): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // 递归扫描子目录
          await this.scanDirectory(fullPath);
        } else if (entry.isFile()) {
          // 处理文件
          if (this.shouldProcessFile(fullPath)) {
            const stats = await fs.stat(fullPath);
            const hash = await this.calculateFileHash(fullPath);
            
            this.fileStates.set(fullPath, {
              size: stats.size,
              mtime: stats.mtimeMs,
              hash
            });
          }
        }
      }
    } catch (error) {
      console.warn(`扫描目录失败: ${dirPath}`, error);
    }
  }

  /**
   * 计算文件哈希
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath);
      const crypto = require('crypto');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch (error) {
      return '';
    }
  }

  /**
   * 创建忽略匹配器
   */
  private createIgnoreMatcher(): (path: string) => boolean {
    return (filePath: string) => {
      // 检查忽略模式
      for (const pattern of this.config.ignorePatterns) {
        if (this.matchPattern(filePath, pattern)) {
          return true;
        }
      }

      // 检查文件格式
      const ext = path.extname(filePath).toLowerCase();
      return !this.config.patterns.some(pattern => pattern === ext);
    };
  }

  /**
   * 路径模式匹配
   */
  private matchPattern(filePath: string, pattern: string): boolean {
    const regex = new RegExp(
      pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '.')
    );
    return regex.test(filePath);
  }

  /**
   * 检查是否应该处理该文件
   */
  private shouldProcessFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.config.patterns.some(pattern => pattern === ext);
  }

  /**
   * 防抖处理
   */
  private debouncePromise: Promise<void> | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;

  private debounce(func: () => Promise<void>, delay: number): Promise<void> {
    if (this.debouncePromise) {
      return this.debouncePromise;
    }

    return new Promise((resolve) => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = setTimeout(async () => {
        try {
          await func();
          resolve();
        } catch (error) {
          console.error('防抖函数执行失败:', error);
          resolve();
        } finally {
          this.debouncePromise = null;
          this.debounceTimer = null;
        }
      }, delay);
    });
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.stop().catch(console.error);
  }
}

/**
 * 监听器工厂
 */
export class WatcherFactory {
  /**
   * 创建监听器
   */
  static create(config: Config, paths: string[]): FileWatcher {
    const watcherConfig: WatcherConfig = {
      paths,
      patterns: config.targetFormats,
      ignorePatterns: config.watch.ignorePatterns,
      debounceMs: config.watch.debounceMs
    };

    return new FileWatcher(watcherConfig);
  }
}