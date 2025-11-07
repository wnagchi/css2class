import { EventBus } from '../core/EventBus';
import CacheCleaner from './CacheCleaner';
import FileCleaner from './FileCleaner';
import { CleanupTask, CleanupOptions, CleanupReport } from '../../types';

export default class CleanupManager {
  private eventBus: EventBus;
  private cacheCleaner: CacheCleaner;
  private fileCleaner: FileCleaner;
  private tasks: Map<string, CleanupTask> = new Map();
  private isRunning = false;
  private currentTask?: CleanupTask;

  constructor(
    eventBus: EventBus,
    cacheCleaner: CacheCleaner,
    fileCleaner: FileCleaner
  ) {
    this.eventBus = eventBus;
    this.cacheCleaner = cacheCleaner;
    this.fileCleaner = fileCleaner;

    // 初始化默认清理任务
    this.initializeDefaultTasks();
  }

  // 初始化默认清理任务
  private initializeDefaultTasks(): void {
    const defaultTasks: CleanupTask[] = [
      {
        id: 'cache-expired',
        name: '清理过期缓存',
        type: 'cache',
        priority: 1,
        schedule: '0 */6 * * *', // 每6小时执行一次
        enabled: true,
        options: { maxAge: 24 * 60 * 60 * 1000 }, // 24小时
      },
      {
        id: 'cache-smart',
        name: '智能缓存清理',
        type: 'cache',
        priority: 2,
        schedule: '0 0 * * *', // 每天执行一次
        enabled: true,
        options: {},
      },
      {
        id: 'temp-files',
        name: '清理临时文件',
        type: 'file',
        priority: 3,
        schedule: '0 2 * * *', // 每天凌晨2点执行
        enabled: true,
        options: {
          basePaths: ['./temp', './cache', './logs'],
          maxAge: 60 * 60 * 1000, // 1小时
        },
      },
      {
        id: 'log-files',
        name: '清理日志文件',
        type: 'file',
        priority: 4,
        schedule: '0 0 * * 0', // 每周日执行
        enabled: true,
        options: {
          basePaths: ['./logs'],
          pattern: /\.log$/i,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
        },
      },
    ];

    defaultTasks.forEach(task => {
      this.tasks.set(task.id, task);
    });

    this.eventBus.emit('cleanupManager:initialized', {
      tasksCount: this.tasks.size,
    });
  }

  // 添加清理任务
  addTask(task: CleanupTask): void {
    this.tasks.set(task.id, task);
    this.eventBus.emit('cleanupManager:task:added', { task });
  }

  // 删除清理任务
  removeTask(taskId: string): boolean {
    const removed = this.tasks.delete(taskId);
    if (removed) {
      this.eventBus.emit('cleanupManager:task:removed', { taskId });
    }
    return removed;
  }

  // 启用/禁用任务
  toggleTask(taskId: string, enabled: boolean): boolean {
    const task = this.tasks.get(taskId);
    if (task) {
      task.enabled = enabled;
      this.eventBus.emit('cleanupManager:task:toggled', { taskId, enabled });
      return true;
    }
    return false;
  }

  // 获取所有任务
  getTasks(): CleanupTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => a.priority - b.priority);
  }

  // 获取启用的任务
  getEnabledTasks(): CleanupTask[] {
    return this.getTasks().filter(task => task.enabled);
  }

  // 执行单个任务
  async executeTask(taskId: string, options: CleanupOptions = {}): Promise<CleanupReport> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (!task.enabled && !options.force) {
      throw new Error(`Task is disabled: ${taskId}`);
    }

    if (this.isRunning) {
      throw new Error('Cleanup manager is already running');
    }

    this.isRunning = true;
    this.currentTask = task;

    const startTime = new Date();
    const report: CleanupReport = {
      taskId,
      startTime,
      endTime: new Date(),
      duration: 0,
      success: true,
      results: {},
      errors: [],
      summary: {
        totalDeleted: 0,
        totalFreedSpace: 0,
        tasksExecuted: 0,
      },
    };

    try {
      this.eventBus.emit('cleanupManager:task:started', { task, options });

      if (options.onProgress) {
        options.onProgress(`开始执行任务: ${task.name}`, 0);
      }

      switch (task.type) {
        case 'cache':
          report.results.cache = await this.executeCacheCleanup(task.options, options);
          break;
        case 'file':
          report.results.files = await this.executeFileCleanup(task.options, options);
          break;
        case 'custom':
          // 自定义任务处理逻辑
          break;
      }

      // 计算汇总信息
      if (report.results.cache) {
        report.summary.totalDeleted += report.results.cache.clearedCount || 0;
        report.summary.totalFreedSpace += report.results.cache.freedMemory || 0;
      }

      if (report.results.files) {
        report.summary.totalDeleted += report.results.files.deletedCount || 0;
        report.summary.totalFreedSpace += report.results.files.freedSpace || 0;
      }

      report.summary.tasksExecuted = 1;

      // 更新任务执行时间
      task.lastRun = startTime;
      // 这里应该根据schedule计算下次执行时间，简化处理
      task.nextRun = new Date(startTime.getTime() + 60 * 60 * 1000); // 1小时后

      if (options.onProgress) {
        options.onProgress(`任务完成: ${task.name}`, 100);
      }

      this.eventBus.emit('cleanupManager:task:completed', { task, report });
    } catch (error) {
      report.success = false;
      report.errors.push(String(error));
      this.eventBus.emit('cleanupManager:task:error', { task, error });
    } finally {
      report.endTime = new Date();
      report.duration = report.endTime.getTime() - startTime.getTime();
      this.isRunning = false;
      this.currentTask = undefined;
    }

    return report;
  }

  // 执行缓存清理
  private async executeCacheCleanup(taskOptions: any, options: CleanupOptions): Promise<any> {
    if (options.onProgress) {
      options.onProgress('执行缓存清理', 50);
    }

    if (taskOptions.smart) {
      return await this.cacheCleaner.performSmartCleanup();
    } else {
      return await this.cacheCleaner.performFullCleanup({
        maxAge: taskOptions.maxAge,
        force: options.force,
        dryRun: options.dryRun,
      });
    }
  }

  // 执行文件清理
  private async executeFileCleanup(taskOptions: any, options: CleanupOptions): Promise<any> {
    if (options.onProgress) {
      options.onProgress('执行文件清理', 50);
    }

    const { basePaths, pattern, maxAge, type = 'expired' } = taskOptions;

    if (type === 'temp') {
      return await this.fileCleaner.cleanupTempFiles(basePaths, {
        dryRun: options.dryRun,
        force: options.force,
        maxAge,
        pattern: pattern ? new RegExp(pattern) : undefined,
      });
    } else {
      // 默认清理过期文件
      let totalResult: any = {
        deletedCount: 0,
        deletedFiles: [],
        errors: [],
        freedSpace: 0,
        duration: 0,
      };

      for (const basePath of basePaths) {
        const result = await this.fileCleaner.cleanupExpiredFiles(basePath, {
          dryRun: options.dryRun,
          force: options.force,
          maxAge,
          pattern: pattern ? new RegExp(pattern) : undefined,
        });

        totalResult.deletedCount += result.deletedCount;
        totalResult.deletedFiles.push(...result.deletedFiles);
        totalResult.errors.push(...result.errors);
        totalResult.freedSpace += result.freedSpace;
      }

      return totalResult;
    }
  }

  // 执行所有启用的任务
  async executeAllTasks(options: CleanupOptions = {}): Promise<CleanupReport[]> {
    const enabledTasks = this.getEnabledTasks();
    const reports: CleanupReport[] = [];

    for (const task of enabledTasks) {
      try {
        const report = await this.executeTask(task.id, options);
        reports.push(report);
      } catch (error) {
        const errorReport: CleanupReport = {
          taskId: task.id,
          startTime: new Date(),
          endTime: new Date(),
          duration: 0,
          success: false,
          results: {},
          errors: [String(error)],
          summary: {
            totalDeleted: 0,
            totalFreedSpace: 0,
            tasksExecuted: 0,
          },
        };
        reports.push(errorReport);
      }
    }

    this.eventBus.emit('cleanupManager:all:completed', {
      tasksCount: enabledTasks.length,
      reports,
    });

    return reports;
  }

  // 快速清理（一键清理）
  async quickCleanup(options: CleanupOptions = {}): Promise<CleanupReport> {
    const quickTask: CleanupTask = {
      id: 'quick-cleanup',
      name: '快速清理',
      type: 'custom',
      priority: 0,
      enabled: true,
      options: {
        cache: true,
        tempFiles: true,
        force: options.force,
        dryRun: options.dryRun,
      },
    };

    return await this.executeCustomCleanup(quickTask, options);
  }

  // 执行自定义清理
  async executeCustomCleanup(task: CleanupTask, options: CleanupOptions): Promise<CleanupReport> {
    const startTime = new Date();
    const report: CleanupReport = {
      taskId: task.id,
      startTime,
      endTime: new Date(),
      duration: 0,
      success: true,
      results: {},
      errors: [],
      summary: {
        totalDeleted: 0,
        totalFreedSpace: 0,
        tasksExecuted: 0,
      },
    };

    try {
      this.isRunning = true;
      this.currentTask = task;

      const { cache, tempFiles, targets } = task.options;

      // 缓存清理
      if (cache && (!options.includeFiles || options.includeCache !== false)) {
        if (options.onProgress) {
          options.onProgress('清理缓存', 25);
        }

        report.results.cache = await this.cacheCleaner.performFullCleanup({
          force: options.force,
          dryRun: options.dryRun,
        });

        report.summary.totalDeleted += report.results.cache.clearedCount || 0;
        report.summary.totalFreedSpace += report.results.cache.freedMemory || 0;
        report.summary.tasksExecuted++;
      }

      // 临时文件清理
      if (tempFiles && (!options.includeCache || options.includeFiles !== false)) {
        if (options.onProgress) {
          options.onProgress('清理临时文件', 75);
        }

        const defaultPaths = ['./temp', './cache'];
        const cleanupPaths = targets && targets.length > 0 ? targets : defaultPaths;

        report.results.files = await this.fileCleaner.cleanupTempFiles(cleanupPaths, {
          dryRun: options.dryRun,
          force: options.force,
        });

        report.summary.totalDeleted += report.results.files.deletedCount || 0;
        report.summary.totalFreedSpace += report.results.files.freedSpace || 0;
        report.summary.tasksExecuted++;
      }

      if (options.onProgress) {
        options.onProgress('清理完成', 100);
      }

      this.eventBus.emit('cleanupManager:custom:completed', { task, report });
    } catch (error) {
      report.success = false;
      report.errors.push(String(error));
      this.eventBus.emit('cleanupManager:custom:error', { task, error });
    } finally {
      report.endTime = new Date();
      report.duration = report.endTime.getTime() - startTime.getTime();
      this.isRunning = false;
      this.currentTask = undefined;
    }

    return report;
  }

  // 获取当前状态
  getStatus(): {
    isRunning: boolean;
    currentTask?: CleanupTask;
    totalTasks: number;
    enabledTasks: number;
  } {
    return {
      isRunning: this.isRunning,
      currentTask: this.currentTask,
      totalTasks: this.tasks.size,
      enabledTasks: this.getEnabledTasks().length,
    };
  }

  // 停止当前执行的任务
  async stopCurrentTask(): Promise<boolean> {
    if (this.isRunning && this.currentTask) {
      // 这里可以实现任务停止逻辑
      this.eventBus.emit('cleanupManager:task:stopped', {
        task: this.currentTask,
      });

      this.isRunning = false;
      this.currentTask = undefined;
      return true;
    }
    return false;
  }

  // 清理统计
  getStatistics(): {
    totalTasks: number;
    enabledTasks: number;
    cacheStats: any;
    isRunning: boolean;
  } {
    return {
      totalTasks: this.tasks.size,
      enabledTasks: this.getEnabledTasks().length,
      cacheStats: this.cacheCleaner.getCacheStats(),
      isRunning: this.isRunning,
    };
  }
}