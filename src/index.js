// 模块化 class2css 主入口文件
const EventBus = require('./core/EventBus');
const StateManager = require('./core/StateManager');
const ConfigManager = require('./core/ConfigManager');
const CacheManager = require('./core/CacheManager');
const FullScanManager = require('./core/FullScanManager');
const Logger = require('./utils/Logger');
const SmartThrottle = require('./utils/Throttle');
const FileUtils = require('./utils/FileUtils');
const RegexCompiler = require('./parsers/RegexCompiler');
const ImportantParser = require('./parsers/ImportantParser');
const ClassParser = require('./parsers/ClassParser');
const DynamicClassGenerator = require('./generators/DynamicClassGenerator');
const FileWatcher = require('./watchers/FileWatcher');
const ConfigWatcher = require('./watchers/ConfigWatcher');
const FileWriter = require('./writers/FileWriter');
const UnifiedWriter = require('./writers/UnifiedWriter');

class Class2CSS {
  constructor(options = {}) {
    this.options = options;
    this.isInitialized = false;
    this.isRunning = false;

    // 初始化核心模块
    this.initializeModules();

    // 绑定事件处理
    this.bindEvents();
  }

  // 初始化所有模块
  initializeModules() {
    try {
      // 1. 创建事件总线
      this.eventBus = new EventBus();

      // 2. 创建状态管理器
      this.stateManager = new StateManager(this.eventBus);

      // 3. 创建配置管理器
      this.configManager = new ConfigManager(this.eventBus, this.options.configPath);

      // 4. 创建缓存管理器
      this.cacheManager = new CacheManager(this.eventBus, this.options.cacheSize);

      // 5. 创建日志工具
      this.logger = new Logger(this.eventBus, this.options.logger);

      // 6. 创建节流工具
      this.throttle = new SmartThrottle(this.eventBus);

      // 7. 创建文件工具
      this.fileUtils = new FileUtils(this.eventBus);

      // 设置配置管理器的依赖（用于读取共用CSS）
      this.configManager.setDependencies(this.fileUtils, this.logger);

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
  bindEvents() {
    // 配置相关事件
    this.eventBus.on('config:loaded', (config) => {
      this.logger.config('Configuration loaded successfully');
      this.updateParsers();
    });

    this.eventBus.on('config:error', (error) => {
      this.logger.error('配置错误:', error);
    });

    // 解析相关事件
    this.eventBus.on('parser:completed', (stats) => {
      // this.logger.parser(`Parsing completed: ${stats.totalCount} classes found`);
    });

    this.eventBus.on('parser:error', (error) => {
      this.logger.error('解析器错误:', error);
    });

    // 生成相关事件
    this.eventBus.on('generator:dynamic:completed', (stats) => {
      this.logger.generator(`Dynamic CSS generation completed: ${stats.generatedCount} classes`);
    });

    this.eventBus.on('generator:userBase:completed', (stats) => {
      this.logger.generator(`User base CSS generation completed: ${stats.generatedCount} classes`);
    });

    // 缓存相关事件
    this.eventBus.on('cache:file:updated', (filePath) => {
      this.logger.cache(`File cache updated: ${filePath}`);
    });

    this.eventBus.on('cache:fullScan:updated', (cache) => {
      this.logger.cache(`Full scan cache updated: ${cache.classListSet.size} classes`);
    });

    // 文件监听相关事件
    this.eventBus.on('watcher:ready', (data) => {
      this.logger.info(`文件监听器就绪: ${data.path}`);
    });

    this.eventBus.on('file:changed', (filePath) => {
      this.logger.info(`文件已更改: ${filePath}`);
      this.handleFileChange(filePath);
    });

    this.eventBus.on('file:added', (filePath) => {
      this.logger.info(`文件已添加: ${filePath}`);
      this.handleFileChange(filePath);
    });

    this.eventBus.on('file:removed', (filePath) => {
      this.logger.info(`文件已删除: ${filePath}`);
    });

    // 文件写入相关事件
    this.eventBus.on('file:css:written', (data) => {
      this.logger.info(`CSS 已写入: ${data.outputFile} (${data.cssLength} 字符)`);
    });

    this.eventBus.on('file:css:write:error', (data) => {
      this.logger.error(`CSS 写入错误 ${data.sourceFile}: ${data.error}`);
    });

    // 配置监听相关事件
    this.eventBus.on('config:watcher:ready', (data) => {
      this.logger.info(`配置监听器就绪: ${data.configPath}`);
    });

    this.eventBus.on('config:reload:start', (data) => {
      this.logger.info(`配置重载开始 (第${data.reloadCount}次)`);
    });

    this.eventBus.on('config:reload:success', (data) => {
      this.logger.info(`配置重载成功: 检测到 ${data.changes.length} 个变更`);
      this.handleConfigReload(data);
    });

    this.eventBus.on('config:reload:error', (data) => {
      this.logger.error(`配置重载失败: ${data.error}`);
    });

    this.eventBus.on('config:file:deleted', (data) => {
      this.logger.warn(`配置文件已删除: ${data.filePath}`);
    });

    // 错误处理
    this.eventBus.on('log:error', (data) => {
      console.error('Error occurred:', data);
    });
  }

  // 更新解析器配置
  updateParsers() {
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

  // 处理配置重载
  async handleConfigReload(data) {
    try {
      this.logger.info('正在处理配置重载...');

      // 更新解析器配置
      this.updateParsers();

      // 检查是否需要重新设置文件监听
      const watchPathChanged = data.changes.some((change) => change.type === 'watchPath');
      if (watchPathChanged) {
        this.logger.info('监听路径已更改，正在重启文件监听器...');
        this.fileWatcher.stopWatching();
        const config = this.configManager.getConfig();
        this.fileWatcher.startWatching(config.multiFile.path, config.multiFile.pattern);
      }

      // 检查是否需要重新设置输出模式
      const outputTypeChanged = data.changes.some((change) => change.type === 'outputType');
      if (outputTypeChanged) {
        const config = this.configManager.getConfig();
        this.stateManager.setUnifiedFileMode(config.multiFile.output.cssOutType === 'uniFile');
        this.logger.info(`输出模式已更改为: ${config.multiFile.output.cssOutType}`);
      }

      // 检查是否需要重新生成CSS
      const needsRegeneration = data.changes.some((change) =>
        ['baseClassName', 'outputType', 'outputPath'].includes(change.type)
      );

      if (needsRegeneration) {
        this.logger.info('配置变更需要重新生成CSS');
        await this.performFullScan();
      }

      this.logger.info('配置重载完成');
    } catch (error) {
      this.logger.errorWithContext('处理配置重载失败', error);
    }
  }

  // 启动Class2CSS
  async start() {
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
  stop() {
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
  async performFullScan() {
    if (this.stateManager.isCurrentlyScanning()) {
      this.logger.scan('Full scan already in progress, skipping');
      return;
    }

    try {
      this.stateManager.setScanning(true);
      this.logger.scan('Starting full scan...');

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

      this.logger.scan(
        `Full scan completed: ${result.fileCount} files, ${result.classCount} classes, ${result.staticClassCount} static classes`
      );
      this.stateManager.setScanCompleted();

      // 如果是统一文件模式，执行初始写入
      if (this.stateManager.isInUnifiedFileMode()) {
        this.logger.info('检测到统一文件模式，正在执行初始写入...');
        await this.unifiedWriter.immediateWrite(
          this.fullScanManager,
          this.fileWriter,
          'initial-scan'
        );
      }

      return result;
    } catch (error) {
      this.logger.error('全量扫描失败:', error);
      throw error;
    } finally {
      this.stateManager.setScanning(false);
    }
  }

  // 处理文件变更
  async handleFileChange(filePath) {
    if (!this.isRunning) {
      this.logger.warn('Class2CSS 未运行，忽略文件变更');
      return;
    }

    try {
      this.logger.info(`正在处理文件变更: ${filePath}`);

      // 解析文件
      const classInfo = await this.classParser.parseFile(filePath, this.cacheManager);
      if (!classInfo) {
        this.logger.warn(`解析文件失败: ${filePath}`);
        return;
      }

      // console.log(
      //   `🔍 解析完成: 发现 ${classInfo.classArr.length + classInfo.userStaticClassArr.length} 个类名`
      // );

      // 根据输出模式选择处理策略
      if (this.stateManager.isInUnifiedFileMode()) {
        // 统一文件模式：更新全量数据并触发防抖写入
        this.fullScanManager.updateFileData(filePath, classInfo);
        this.stateManager.syncWithFullScanManager(this.fullScanManager.getMergedData());

        // 使用防抖写入
        this.unifiedWriter.debouncedWrite(this.fullScanManager, this.fileWriter, filePath);

        // this.logger.info(`统一文件模式: 已更新 ${filePath} 的数据，触发防抖写入`);
      } else {
        // 单文件模式：使用现有逻辑
        const dynamicResult = this.dynamicClassGenerator.getClassList(classInfo.classArr);
        const userBaseResult = this.dynamicClassGenerator.createUserBaseClassList(
          dynamicResult.userBaseClassArr
        );

        console.log(
          `🎨 动态CSS生成完成: ${dynamicResult.cssStr.split('\n').filter(Boolean).length} 个类`
        );

        // 获取共用CSS内容
        const commonCssContent = await this.configManager.getCommonCssContent();

        // 合并CSS内容（共用CSS前置）
        let cssContent = [commonCssContent, dynamicResult.cssStr, userBaseResult]
          .filter(Boolean)
          .join('\n');

        // 如果格式为compressed，对整个CSS进行压缩处理
        const cssFormat = this.configManager.getCssFormat();
        const CssFormatter = require('./utils/CssFormatter');
        const cssFormatter = new CssFormatter(cssFormat);

        // 如果启用了排序，对CSS规则进行字母排序（在格式化之前排序）
        const sortClasses = this.configManager.getSortClasses();
        if (sortClasses) {
          cssContent = cssFormatter.sortCSSRules(cssContent);
        }
        
        // 根据配置的格式对整个CSS进行格式化处理
        cssContent = cssFormatter.formatCSS(cssContent, cssFormat);

        // 写入CSS文件
        await this.fileWriter.writeCSS(cssContent, filePath);

        this.logger.info(`CSS 生成完成: ${filePath}`);
      }
    } catch (error) {
      this.logger.errorWithContext(`处理文件变更时出错: ${filePath}`, error);
    }
  }

  // 获取状态信息
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      state: this.stateManager.getStats(),
      config: this.configManager.getConfigInfo(),
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
  getEventBus() {
    return this.eventBus;
  }

  // 获取各个模块（用于高级用法）
  getModules() {
    return {
      stateManager: this.stateManager,
      configManager: this.configManager,
      cacheManager: this.cacheManager,
      logger: this.logger,
      throttle: this.throttle,
      fileUtils: this.fileUtils,
      regexCompiler: this.regexCompiler,
      importantParser: this.importantParser,
      classParser: this.classParser,
      dynamicClassGenerator: this.dynamicClassGenerator,
      fileWatcher: this.fileWatcher,
      configWatcher: this.configWatcher,
      fileWriter: this.fileWriter,
      fullScanManager: this.fullScanManager,
      unifiedWriter: this.unifiedWriter,
    };
  }

  // 重置所有状态
  reset() {
    try {
      this.stop();
      this.stateManager.reset();
      this.cacheManager.clearAll();
      this.logger.info('Class2CSS 重置完成');
    } catch (error) {
      this.logger.error('重置 Class2CSS 时出错:', error);
    }
  }
}

module.exports = Class2CSS;
