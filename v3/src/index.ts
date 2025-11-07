import { EventBus } from './core/EventBus';
import { StateManager } from './core/StateManager';
import ConfigManager from './core/ConfigManager';
import Logger from './utils/Logger';
import CacheManager from './core/CacheManager';
import FileUtils from './utils/FileUtils';
import { CleanupManager, CacheCleaner, FileCleaner, StateCleaner, ConfigCleaner } from './cleanup';
import { Class2CSSOptions, Config, Class2CSSStatus } from '../types';

// 简化版的其他模块导入，将逐步完整迁移
// import FullScanManager from './core/FullScanManager';
// import SmartThrottle from './utils/Throttle';
// import RegexCompiler from './parsers/RegexCompiler';
// import ImportantParser from './parsers/ImportantParser';
// import ClassParser from './parsers/ClassParser';
// import DynamicClassGenerator from './generators/DynamicClassGenerator';
// import FileWatcher from './watchers/FileWatcher';
// import ConfigWatcher from './watchers/ConfigWatcher';
// import FileWriter from './writers/FileWriter';
// import UnifiedWriter from './writers/UnifiedWriter';

// 简化模块定义，实际项目中需要完整实现
interface SimplifiedModule {
  init?(): void;
  start?(): void;
  stop?(): void;
  getStats?(): any;
  [key: string]: any; // 允许其他属性
}

// ConfigManager 已迁移为单独的TypeScript模块

// CacheManager 已迁移为单独的TypeScript模块

class FullScanManager implements SimplifiedModule {
  constructor(private eventBus: EventBus) {}

  async performFullScan(path: string, fileTypes: string[], parser: any, cache: any) {
    return { fileCount: 0, classCount: 0, staticClassCount: 0 };
  }

  updateFileData(filePath: string, classInfo: any) {}
  getMergedData() {
    return {
      classListSet: new Set<string>(),
      userStaticClassListSet: new Set<string>(),
      userBaseClassListSet: new Set<string>(),
      scanTime: Date.now(),
      isLocked: false
    };
  }

  getStats() { return {}; }
}

// Logger 已迁移为单独的TypeScript模块

class SmartThrottle implements SimplifiedModule {
  constructor(private eventBus: EventBus) {}

  cancelAll() {}
  getStats() { return {}; }
}

// FileUtils 已迁移为单独的TypeScript模块

class RegexCompiler implements SimplifiedModule {
  constructor(private eventBus: EventBus, private importantFlags: any) {}

  updateImportantFlags(flags: any) {}
}

class ImportantParser implements SimplifiedModule {
  constructor(private eventBus: EventBus, private importantFlags: any) {}

  updateImportantFlags(flags: any) {}
}

class ClassParser implements SimplifiedModule {
  constructor(
    private eventBus: EventBus,
    private regexCompiler: RegexCompiler,
    private importantParser: ImportantParser,
    private userStaticClassSet: Set<string>,
    private configManager: ConfigManager
  ) {}

  async parseFile(filePath: string, cache: any) {
    return null;
  }

  updateUserStaticClassSet(set: Set<string>) {}
  getParseStats() {
    return { totalCount: 0, classCount: 0, staticClassCount: 0, importantClassCount: 0 };
  }
}

class DynamicClassGenerator implements SimplifiedModule {
  constructor(private eventBus: EventBus, private configManager: ConfigManager, private importantParser: ImportantParser) {}

  getClassList(classArr: string[]) {
    return { cssStr: '', userBaseClassArr: [] };
  }

  createUserBaseClassList(arr: string[]) {
    return '';
  }

  getGenerationStats() {
    return { generatedCount: 0, generationTime: 0, cssLength: 0 };
  }
}

class FileWatcher implements SimplifiedModule {
  constructor(private eventBus: EventBus, private configManager: ConfigManager) {}

  async startWatching() {}
  stopWatching() {}
  getWatchStats() {
    return { watchedPaths: [], isWatching: false, changeCount: 0 };
  }
}

class ConfigWatcher implements SimplifiedModule {
  constructor(private eventBus: EventBus, private configManager: ConfigManager, private logger: Logger) {}

  startWatching(configPath: string) {}
  stopWatching() {}
  getWatcherStats() {
    return {};
  }
}

class FileWriter implements SimplifiedModule {
  constructor(private eventBus: EventBus, private configManager: ConfigManager, private fileUtils: FileUtils) {}

  async writeCSS(cssContent: string, filePath: string) {}
  getWriteStats() {
    return {};
  }
}

class UnifiedWriter implements SimplifiedModule {
  constructor(private eventBus: EventBus, private configManager: ConfigManager, private dynamicClassGenerator: DynamicClassGenerator) {}

  debouncedWrite(fullScanManager: FullScanManager, fileWriter: FileWriter, filePath: string) {}
  async immediateWrite(fullScanManager: FullScanManager, fileWriter: FileWriter, reason: string) {}
  getWriteStats() {
    return {};
  }
}

export class Class2CSS {
  private options: Class2CSSOptions;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;

  // 核心模块
  private eventBus!: EventBus;
  private stateManager!: StateManager;
  private configManager!: ConfigManager;
  private cacheManager!: CacheManager;
  private logger!: Logger;
  private throttle!: SmartThrottle;
  private fileUtils!: FileUtils;
  private regexCompiler!: RegexCompiler;
  private importantParser!: ImportantParser;
  private classParser!: ClassParser;
  private dynamicClassGenerator!: DynamicClassGenerator;
  private fileWatcher!: FileWatcher;
  private configWatcher!: ConfigWatcher;
  private fullScanManager!: FullScanManager;
  private fileWriter!: FileWriter;
  private unifiedWriter!: UnifiedWriter;
  private cleanupManager!: CleanupManager;

  constructor(options: Class2CSSOptions = {}) {
    this.options = options;
    this.initializeModules();
    this.bindEvents();
  }

  // 初始化所有模块
  private initializeModules(): void {
    try {
      // 1. 创建事件总线
      this.eventBus = new EventBus();

      // 2. 创建状态管理器
      this.stateManager = new StateManager(this.eventBus);

      // 3. 创建配置管理器
      this.configManager = new ConfigManager(this.eventBus, this.options.configPath);

      // 4. 创建缓存管理器
      this.cacheManager = new CacheManager(this.eventBus);

      // 5. 创建日志工具
      this.logger = new Logger(this.eventBus);

      // 6. 创建节流工具
      this.throttle = new SmartThrottle(this.eventBus);

      // 7. 创建文件工具
      this.fileUtils = new FileUtils(this.eventBus);

      // 8. 创建正则编译器
      this.regexCompiler = new RegexCompiler(this.eventBus, this.configManager.getImportantFlags());

      // 9. 创建Important解析器
      this.importantParser = new ImportantParser(
        this.eventBus,
        this.configManager.getImportantFlags()
      );

      // 10. 创建类名解析器
      this.classParser = new ClassParser(
        this.eventBus,
        this.regexCompiler,
        this.importantParser,
        this.configManager.getUserStaticClassSet(),
        this.configManager
      );

      // 11. 创建动态类生成器
      this.dynamicClassGenerator = new DynamicClassGenerator(
        this.eventBus,
        this.configManager,
        this.importantParser
      );

      // 12. 创建文件监听器
      this.fileWatcher = new FileWatcher(this.eventBus, this.configManager);

      // 13. 创建配置文件监听器
      this.configWatcher = new ConfigWatcher(this.eventBus, this.configManager, this.logger);

      // 14. 创建全量扫描管理器
      this.fullScanManager = new FullScanManager(this.eventBus);

      // 15. 创建文件写入器
      this.fileWriter = new FileWriter(this.eventBus, this.configManager, this.fileUtils);

      // 16. 创建统一文件写入器
      this.unifiedWriter = new UnifiedWriter(
        this.eventBus,
        this.configManager,
        this.dynamicClassGenerator
      );

      // 17. 创建清理管理器
      const cacheCleaner = new CacheCleaner(
        this.eventBus,
        (this.cacheManager as any).fileCache,
        (this.cacheManager as any).fileStats,
        (this.cacheManager as any).cssGenerationCache,
        (this.cacheManager as any).cssGenerationStats,
        this.options.cacheSize || 1000,
        (this.cacheManager as any).cacheStrategy
      );

      const fileCleaner = new FileCleaner(this.eventBus);

      this.cleanupManager = new CleanupManager(
        this.eventBus,
        cacheCleaner,
        fileCleaner
      );

      // 检查并设置统一文件模式
      const multiFile = this.configManager.getMultiFile();
      const isUnifiedMode = multiFile?.output?.cssOutType === 'uniFile';
      this.stateManager.setUnifiedFileMode(isUnifiedMode);

      this.isInitialized = true;
      this.logger.info('Class2CSS 模块初始化成功');
    } catch (error) {
      // 如果logger还没有创建，使用console.error
      if (this.logger) {
        this.logger.errorWithContext('模块初始化失败', error);
      } else {
        console.error('Failed to initialize modules:', error);
      }
      throw error;
    }
  }

  // 绑定事件处理
  private bindEvents(): void {
    // 配置相关事件
    this.eventBus.on('config:loaded', (config) => {
      this.logger.info('Configuration loaded successfully');
      this.updateParsers();
    });

    this.eventBus.on('config:error', (error) => {
      this.logger.error('配置错误:', error);
    });

    // 解析相关事件
    this.eventBus.on('parser:completed', (stats) => {
      // this.logger.parser(`Parsing completed: ${stats?.totalCount} classes found`);
    });

    this.eventBus.on('parser:error', (error) => {
      this.logger.error('解析器错误:', error);
    });

    // 生成相关事件
    this.eventBus.on('generator:dynamic:completed', (stats) => {
      this.logger.info(`Dynamic CSS generation completed: ${stats?.generatedCount} classes`);
    });

    this.eventBus.on('generator:userBase:completed', (stats) => {
      this.logger.info(`User base CSS generation completed: ${stats?.generatedCount} classes`);
    });

    // 文件写入相关事件
    this.eventBus.on('file:css:written', (data) => {
      this.logger.info(`CSS 已写入: ${data?.outputFile} (${data?.cssLength} 字符)`);
    });

    this.eventBus.on('file:css:write:error', (data) => {
      this.logger.error(`CSS 写入错误 ${data?.sourceFile}: ${data?.error}`);
    });

    // 错误处理
    this.eventBus.on('log:error', (data) => {
      console.error('Error occurred:', data);
    });
  }

  // 更新解析器配置
  private updateParsers(): void {
    try {
      // 更新正则编译器
      this.regexCompiler.updateImportantFlags(this.configManager.getImportantFlags());

      // 更新Important解析器
      this.importantParser.updateImportantFlags(this.configManager.getImportantFlags());

      // 更新类名解析器
      this.classParser.updateUserStaticClassSet(this.configManager.getUserStaticClassSet());

      this.logger.info('解析器已使用新配置更新');
    } catch (error) {
      this.logger.error('更新解析器失败:', error);
    }
  }

  // 启动Class2CSS
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Class2CSS not initialized');
    }

    if (this.isRunning) {
      this.logger.warn('Class2CSS 已在运行中');
      return;
    }

    try {
      this.isRunning = true;
      this.logger.info('正在启动 Class2CSS...');

      // 验证配置
      const configErrors = this.configManager.validateConfig();
      if (configErrors.length > 0) {
        throw new Error(`Configuration validation failed: ${configErrors.join(', ')}`);
      }

      // 执行初始全量扫描
      await this.performFullScan();

      // 启动文件监听
      await this.fileWatcher.startWatching();

      // 启动配置文件监听
      this.configWatcher.startWatching(this.options.configPath || './class2css.config.js');

      this.logger.info('Class2CSS 启动成功');
      this.eventBus.emit('class2css:started');
    } catch (error) {
      this.isRunning = false;
      this.logger.errorWithContext('启动 Class2CSS 失败', error);
      throw error;
    }
  }

  // 停止Class2CSS
  stop(): void {
    if (!this.isRunning) {
      this.logger.warn('Class2CSS 未在运行');
      return;
    }

    try {
      this.isRunning = false;

      // 停止文件监听
      this.fileWatcher.stopWatching();

      // 停止配置文件监听
      this.configWatcher.stopWatching();

      // 清理资源
      this.throttle.cancelAll();
      this.cacheManager.clearAll();

      this.logger.info('Class2CSS 已停止');
      this.eventBus.emit('class2css:stopped');
    } catch (error) {
      this.logger.error('停止 Class2CSS 时出错:', error);
    }
  }

  // 执行全量扫描
  async performFullScan(): Promise<any> {
    if (this.stateManager.isCurrentlyScanning()) {
      this.logger.info('Full scan already in progress, skipping');
      return;
    }

    try {
      this.stateManager.setScanning(true);
      this.logger.info('Starting full scan...');

      const multiFile = this.configManager.getMultiFile();
      if (!multiFile || !multiFile.entry || !multiFile.entry.path) {
        throw new Error('MultiFile configuration is required for full scan');
      }

      // 执行真正的全量扫描
      const result = await this.fullScanManager.performFullScan(
        multiFile.entry.path,
        multiFile.entry.fileType || ['html', 'wxml'],
        this.classParser,
        this.cacheManager
      );

      // 同步状态到StateManager
      this.stateManager.syncWithFullScanManager(this.fullScanManager.getMergedData());

      this.logger.info(
        `Full scan completed: ${result.fileCount} files, ${result.classCount} classes, ${result.staticClassCount} static classes`
      );
      this.stateManager.setScanCompleted();

      return result;
    } catch (error) {
      this.logger.error('全量扫描失败:', error);
      throw error;
    } finally {
      this.stateManager.setScanning(false);
    }
  }

  // 获取状态信息
  getStatus(): Class2CSSStatus {
    return {
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      state: this.stateManager.getStats(),
      config: this.configManager.getStats(),
      cache: this.cacheManager.getCacheStats(),
      throttle: this.throttle.getStats(),
      parser: this.classParser.getParseStats(),
      generator: this.dynamicClassGenerator.getGenerationStats(),
      watcher: this.fileWatcher.getWatchStats(),
      configWatcher: this.configWatcher.getWatcherStats(),
      writer: this.fileWriter.getWriteStats(),
      fullScan: this.fullScanManager.getStats(),
      unifiedWriter: this.unifiedWriter.getWriteStats(),
    };
  }

  // 获取事件总线（用于外部监听）
  getEventBus(): EventBus {
    return this.eventBus;
  }

  // 重置所有状态
  reset(): void {
    try {
      this.stop();
      this.stateManager.reset();
      this.cacheManager.clearAll();
      this.logger.info('Class2CSS 重置完成');
    } catch (error) {
      this.logger.error('重置 Class2CSS 时出错:', error);
    }
  }

  // 清理相关方法
  async quickCleanup(options?: any): Promise<any> {
    return await this.cleanupManager.quickCleanup(options);
  }

  async cleanupExpiredFiles(targetPath: string, options?: any): Promise<any> {
    return await this.fileUtils.cleanupExpiredFiles(targetPath, options);
  }

  async cleanupTempFiles(basePaths?: string[], options?: any): Promise<any> {
    const paths = basePaths || ['./temp', './cache'];
    return await this.fileUtils.cleanupTempFiles(paths, options);
  }

  getCleanupStatus(): any {
    return this.cleanupManager.getStatus();
  }

  getCleanupStatistics(): any {
    return this.cleanupManager.getStatistics();
  }

  async executeCleanupTask(taskId: string, options?: any): Promise<any> {
    return await this.cleanupManager.executeTask(taskId, options);
  }

  async executeAllCleanupTasks(options?: any): Promise<any> {
    return await this.cleanupManager.executeAllTasks(options);
  }
}

export default Class2CSS;