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
const WxssClassExtractor = require('./utils/WxssClassExtractor');
const path = require('path');

class Class2CSS {
  constructor(options = {}) {
    this.options = options;
    this.isInitialized = false;
    this.isRunning = false;
    
    // 构建时间追踪：存储文件路径到开始时间的映射
    this.buildStartTimes = new Map();
    
    // appendDelta 模式：追踪已写入的 class（用于判断哪些是新增的）
    this.everWrittenClassSet = new Set();
    this.everWrittenStaticClassSet = new Set();

    // 解析失败追踪：用于抑制保存期的瞬时失败噪音（连续失败才告警）
    this.parseFailureCounts = new Map(); // filePath -> count

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

      // 17. 创建 WXSS class 提取器（用于增量模式）
      this.wxssExtractor = new WxssClassExtractor(this.eventBus);

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
    // this.eventBus.on('parser:completed', (stats) => {
    //   this.logger.parser(`Parsing completed: ${stats.totalCount} classes found`);
    // });

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
    // this.eventBus.on('watcher:ready', (data) => {
    //   this.logger.info(`文件监听器就绪: ${data.path}`);
    // });

    this.eventBus.on('file:changed', (filePath) => {
      // this.logger.info(`文件已更改: ${filePath}`);
      this.handleFileChange(filePath);
    });

    this.eventBus.on('file:added', (filePath) => {
      // this.logger.info(`文件已添加: ${filePath}`);
      this.handleFileChange(filePath);
    });

    this.eventBus.on('file:removed', (filePath) => {
      this.logger.info(`文件已删除: ${filePath}`);
    });

    // 文件写入相关事件
    this.eventBus.on('file:css:written', (data) => {
      this.logger.info(`CSS 已写入: ${data.outputFile} (${data.cssLength} 字符)`);
      
      // 计算并记录构建时间（统一文件模式跳过，由 unifiedWriter:completed 处理）
      if (data.sourceFile !== 'unified-output') {
        this.logBuildTime(data.sourceFile, data.outputFile);
      }
    });

    this.eventBus.on('file:css:write:error', (data) => {
      this.logger.error(`CSS 写入错误 ${data.sourceFile}: ${data.error}`);
      // 清除构建时间记录
      this.buildStartTimes.delete(data.sourceFile);
    });
    
    // 统一文件写入完成事件
    this.eventBus.on('unifiedWriter:completed', (data) => {
      // 统一文件模式：计算所有待处理文件的构建时间
      if (data.processedFiles && data.processedFiles.length > 0) {
        const buildTime = this.calculateBuildTimeForUnified(data.processedFiles);
        if (buildTime !== null) {
          this.logger.info(`📦 统一文件构建完成: ${data.cssLength} 字符, ${data.classCount} 个类, 耗时 ${buildTime}ms`);
        }
      }
    });
    
    // 统一文件写入错误事件
    this.eventBus.on('unifiedWriter:error', (data) => {
      // 清除所有待处理文件的构建时间记录
      if (data.pendingWrites && data.pendingWrites.length > 0) {
        for (const filePath of data.pendingWrites) {
          this.buildStartTimes.delete(filePath);
        }
      }
    });

    // 配置监听相关事件
    // this.eventBus.on('config:watcher:ready', (data) => {
    //   this.logger.info(`配置监听器就绪: ${data.configPath}`);
    // });

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

      const multiFile = this.configManager.getMultiFile();
      const isIncrementalMode = this.stateManager.isInUnifiedFileMode() && multiFile?.output?.incrementalOnlyAdd;
      const rebuildOnStart = multiFile?.output?.rebuildOnStart !== false; // 默认 true
      const uniFileWriteMode = multiFile?.output?.uniFileWriteMode || 'rewrite';

      // 如果是 appendDelta 模式
      if (this.stateManager.isInUnifiedFileMode() && uniFileWriteMode === 'appendDelta') {
        // appendDelta 模式要求 rebuildOnStart=true
        if (!rebuildOnStart) {
          throw new Error('uniFileWriteMode="appendDelta" requires rebuildOnStart=true');
        }

        // 1. 读取旧输出文件，提取 oldBaselineSet（用于后续 unused 提示）
        let oldBaselineClassSet = new Set();
        let oldBaselineStaticSet = new Set();
        
        try {
          const outputPath = multiFile.output.path;
          const fileName = multiFile.output.fileName || 'index.wxss';
          const outputFilePath = path.join(outputPath, fileName);
          
          this.logger.info(`appendDelta 模式启动重建: 正在读取旧输出文件 ${outputFilePath}`);
          const { classList, staticClassList } = await this.wxssExtractor.extractClassesFromFile(
            outputFilePath
          );
          oldBaselineClassSet = classList;
          oldBaselineStaticSet = staticClassList;
          
          if (classList.size > 0 || staticClassList.size > 0) {
            this.logger.info(
              `读取到旧输出文件: ${classList.size} 个动态类, ${staticClassList.size} 个静态类`
            );
          }
        } catch (error) {
          // 文件不存在或读取失败，继续执行重建（当作首次运行）
          this.logger.info('旧输出文件不存在或读取失败，将执行首次重建');
        }

        // 2. 执行全量扫描（不保留旧基线，完全重建）
        const rebuildScanStart = Date.now();
        this.logger.info('执行全量扫描（appendDelta 重建模式）...');
        await this.performFullScan(false); // preserveBaseline = false
        const rebuildScanMs = Date.now() - rebuildScanStart;
        this.logger.info(`appendDelta 启动重建：全量扫描耗时 ${rebuildScanMs}ms`);

        // 3. 生成 BASE CSS（全量生成，压缩+排序）
        const mergedData = this.fullScanManager.getMergedData();
        const baseGenStart = Date.now();
        const baseCssContent = await this.unifiedWriter.generateUnifiedCSS(
          mergedData.classListSet,
          mergedData.userStaticClassListSet
        );
        const baseGenMs = Date.now() - baseGenStart;
        this.logger.info(`appendDelta 启动重建：BASE CSS 生成耗时 ${baseGenMs}ms`);

        // 4. 写入 BASE + DELTA_START 标记（覆盖写，清空旧 DELTA）
        this.logger.info('正在写入 BASE 区块和 DELTA_START 标记...');
        const baseWriteStart = Date.now();
        await this.fileWriter.writeBaseWithDeltaMarker(baseCssContent, 'startup-rebuild', {
          forceUniFile: true,
          outputPath: multiFile.output.path,
          fileName: multiFile.output.fileName,
        });
        const baseWriteMs = Date.now() - baseWriteStart;
        this.logger.info(`appendDelta 启动重建：BASE 写入耗时 ${baseWriteMs}ms`);

        // 5. 记录已写入的 class（用于后续判断新增）
        this.everWrittenClassSet = new Set(mergedData.classListSet);
        this.everWrittenStaticClassSet = new Set(mergedData.userStaticClassListSet);

        // 6. 计算并打印 unused：oldBaselineSet - scannedSet
        await this.reportUnusedClassesOnRebuild(oldBaselineClassSet, oldBaselineStaticSet);

        // 7. 初始化运行期 baseline：把当前扫描集合写入 baseline，并开启增量模式
        this.fullScanManager.addBaselineClasses(
          Array.from(mergedData.classListSet),
          Array.from(mergedData.userStaticClassListSet)
        );
        this.fullScanManager.setIncrementalMode(true);
        this.logger.info('appendDelta 模式已启用：运行期将只追加新增 class');
      }
      // 如果是增量模式且开启了启动重建（rewrite 模式）
      else if (isIncrementalMode && rebuildOnStart) {
        // 1. 读取旧输出文件，提取 oldBaselineSet（用于后续 unused 提示）
        let oldBaselineClassSet = new Set();
        let oldBaselineStaticSet = new Set();
        
        try {
          const outputPath = multiFile.output.path;
          const fileName = multiFile.output.fileName || 'index.wxss';
          const outputFilePath = path.join(outputPath, fileName);
          
          this.logger.info(`增量模式启动重建: 正在读取旧输出文件 ${outputFilePath}`);
          const { classList, staticClassList } = await this.wxssExtractor.extractClassesFromFile(
            outputFilePath
          );
          oldBaselineClassSet = classList;
          oldBaselineStaticSet = staticClassList;
          
          if (classList.size > 0 || staticClassList.size > 0) {
            this.logger.info(
              `读取到旧输出文件: ${classList.size} 个动态类, ${staticClassList.size} 个静态类`
            );
          }
        } catch (error) {
          // 文件不存在或读取失败，继续执行重建（当作首次运行）
          this.logger.info('旧输出文件不存在或读取失败，将执行首次重建');
        }

        // 2. 执行全量扫描（不保留旧基线，完全重建）
        this.logger.info('执行全量扫描（重建模式）...');
        await this.performFullScan(false); // preserveBaseline = false

        // 3. 立即写入一次 uniFile（覆盖写，得到干净、排序好的输出）
        this.logger.info('正在写入重建后的输出文件...');
        await this.unifiedWriter.immediateWrite(
          this.fullScanManager,
          this.fileWriter,
          'startup-rebuild'
        );

        // 4. 计算并打印 unused：oldBaselineSet - scannedSet
        await this.reportUnusedClassesOnRebuild(oldBaselineClassSet, oldBaselineStaticSet);

        // 5. 初始化运行期 baseline：把当前扫描集合写入 baseline，并开启增量模式
        const mergedData = this.fullScanManager.getMergedData();
        this.fullScanManager.addBaselineClasses(
          Array.from(mergedData.classListSet),
          Array.from(mergedData.userStaticClassListSet)
        );
        this.fullScanManager.setIncrementalMode(true);
        this.logger.info('运行期增量模式已启用（只增不删）');
      } else if (isIncrementalMode && !rebuildOnStart) {
        // 增量模式但 rebuildOnStart=false：按原有逻辑从输出文件加载基线
        await this.loadIncrementalBaseline();
        await this.performFullScan();
        // 初始化运行期 baseline
        const mergedData = this.fullScanManager.getMergedData();
        this.fullScanManager.addBaselineClasses(
          Array.from(mergedData.classListSet),
          Array.from(mergedData.userStaticClassListSet)
        );
        this.fullScanManager.setIncrementalMode(true);
      } else {
        // 标准模式：正常执行全量扫描
        await this.performFullScan();
      }

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
  async performFullScan(preserveBaseline = true) {
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
        this.cacheManager,
        preserveBaseline
      );

      // 同步状态到StateManager
      this.stateManager.syncWithFullScanManager(this.fullScanManager.getMergedData());

      this.logger.scan(
        `Full scan completed: ${result.fileCount} files, ${result.classCount} classes, ${result.staticClassCount} static classes`
      );
      this.stateManager.setScanCompleted();

      // 如果是统一文件模式，执行初始写入（仅在非重建场景，重建场景已在 start() 中处理）
      if (this.stateManager.isInUnifiedFileMode() && preserveBaseline) {
        this.logger.info('检测到统一文件模式，正在执行初始写入...');
        await this.unifiedWriter.immediateWrite(
          this.fullScanManager,
          this.fileWriter,
          'initial-scan'
        );

        // 如果是增量模式但未开启 rebuildOnStart，检查并报告未使用的 class
        const multiFile = this.configManager.getMultiFile();
        if (multiFile?.output?.incrementalOnlyAdd && !multiFile?.output?.rebuildOnStart) {
          await this.reportUnusedClasses();
        }
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
      // 记录构建开始时间
      this.buildStartTimes.set(filePath, Date.now());
      
      // this.logger.info(`正在处理文件变更: ${filePath}`);

      // 解析文件
      let classInfo = null;
      // 保存过程中可能读到空内容/锁定，做轻量重试；若仍失败，延迟再试并抑制噪音
      for (let attempt = 0; attempt < 3; attempt++) {
        classInfo = await this.classParser.parseFile(filePath, this.cacheManager);
        if (classInfo) break;
        await new Promise((resolve) => setTimeout(resolve, 120 * Math.pow(2, attempt)));
      }

      if (!classInfo) {
        const nextCount = (this.parseFailureCounts.get(filePath) || 0) + 1;
        this.parseFailureCounts.set(filePath, nextCount);

        // 用节流做一次“稍后重试”，避免保存风暴期间疯狂刷 warn
        this.throttle.throttle(
          `reparse:${filePath}`,
          () => {
            // 重新触发处理（异步，不阻塞 throttle 回调）
            this.handleFileChange(filePath).catch(() => {});
          },
          800,
          1
        );

        // 连续失败到一定次数才告警（默认 3 次）
        if (nextCount >= 3) {
          this.logger.warn(`解析文件失败(连续${nextCount}次): ${filePath}，已安排重试`);
        }
        return;
      }

      // 成功则清零失败计数
      if (this.parseFailureCounts.has(filePath)) {
        this.parseFailureCounts.delete(filePath);
      }

      // console.log(
      //   `🔍 解析完成: 发现 ${classInfo.classArr.length + classInfo.userStaticClassArr.length} 个类名`
      // );

      // 根据输出模式选择处理策略
      if (this.stateManager.isInUnifiedFileMode()) {
        const multiFile = this.configManager.getMultiFile();
        const uniFileWriteMode = multiFile?.output?.uniFileWriteMode || 'rewrite';

        // 更新全量数据
        this.fullScanManager.updateFileData(filePath, classInfo);
        this.stateManager.syncWithFullScanManager(this.fullScanManager.getMergedData());

        // appendDelta 模式：只追加新增的 class
        if (uniFileWriteMode === 'appendDelta') {
          const mergedData = this.fullScanManager.getMergedData();
          
          // 计算新增的 class（当前扫描到的 - 已写入的）
          const newClasses = Array.from(mergedData.classListSet).filter(
            (cls) => !this.everWrittenClassSet.has(cls)
          );
          const newStaticClasses = Array.from(mergedData.userStaticClassListSet).filter(
            (cls) => !this.everWrittenStaticClassSet.has(cls)
          );

          if (newClasses.length > 0 || newStaticClasses.length > 0) {
            // 生成新增 class 的 CSS
            const deltaGenStart = Date.now();
            const deltaCssContent = await this.generateDeltaCSS(newClasses, newStaticClasses);
            const deltaGenMs = Date.now() - deltaGenStart;

            if (deltaCssContent.trim()) {
              // 追加到文件末尾
              const appendStart = Date.now();
              await this.fileWriter.appendCSS(deltaCssContent, filePath, {
                forceUniFile: true,
                outputPath: multiFile.output.path,
                fileName: multiFile.output.fileName,
              });
              const appendMs = Date.now() - appendStart;

              // 记录已写入的 class
              newClasses.forEach((cls) => this.everWrittenClassSet.add(cls));
              newStaticClasses.forEach((cls) => this.everWrittenStaticClassSet.add(cls));

              // 同时加入 baseline（保证只增不删）
              this.fullScanManager.addBaselineClasses(newClasses, newStaticClasses);

              // 打印新增动态类名（限制数量，避免刷屏）
              const maxLogClasses = 20;
              const dynamicPreview = newClasses.slice(0, maxLogClasses);
              const dynamicMore = newClasses.length > maxLogClasses ? ` ...(+${newClasses.length - maxLogClasses})` : '';

              this.logger.info(
                `appendDelta: 追加了 ${newClasses.length} 个动态类, ${newStaticClasses.length} 个静态类（生成 ${deltaGenMs}ms，写入 ${appendMs}ms）` +
                  (newClasses.length > 0
                    ? ` 新增动态类: ${dynamicPreview.join(', ')}${dynamicMore}`
                    : '')
              );
            }
          }
        } else {
          // rewrite 模式：使用防抖写入（全量覆盖）
          this.unifiedWriter.debouncedWrite(this.fullScanManager, this.fileWriter, filePath);
        }

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
      // 清除构建时间记录
      this.buildStartTimes.delete(filePath);
    }
  }

  // 记录构建时间
  logBuildTime(sourceFile, outputFile) {
    const startTime = this.buildStartTimes.get(sourceFile);
    if (startTime) {
      const buildTime = Date.now() - startTime;
      this.logger.info(`⏱️  构建完成: ${sourceFile} -> ${outputFile}, 耗时 ${buildTime}ms`);
      this.buildStartTimes.delete(sourceFile);
    }
  }
  
  // 加载增量模式的基线（从输出文件读取已存在的 class）
  async loadIncrementalBaseline() {
    try {
      const multiFile = this.configManager.getMultiFile();
      if (!multiFile || !multiFile.output) {
        return;
      }

      const outputPath = multiFile.output.path;
      const fileName = multiFile.output.fileName || 'index.wxss';
      const outputFilePath = path.join(outputPath, fileName);

      this.logger.info(`正在加载增量基线: ${outputFilePath}`);

      const { classList, staticClassList } = await this.wxssExtractor.extractClassesFromFile(
        outputFilePath
      );

      if (classList.size > 0 || staticClassList.size > 0) {
        this.fullScanManager.addBaselineClasses(
          Array.from(classList),
          Array.from(staticClassList)
        );
        this.logger.info(
          `增量基线加载完成: ${classList.size} 个动态类, ${staticClassList.size} 个静态类`
        );
      } else {
        this.logger.info('输出文件不存在或为空，跳过基线加载');
      }
    } catch (error) {
      this.logger.warn(`加载增量基线失败: ${error.message}`);
      // 基线加载失败不影响正常流程
    }
  }

  // 生成增量 CSS（仅生成新增 class 的规则，用于 appendDelta 模式）
  async generateDeltaCSS(newClasses, newStaticClasses) {
    try {
      if ((!newClasses || newClasses.length === 0) && (!newStaticClasses || newStaticClasses.length === 0)) {
        return '';
      }

      // 生成动态CSS（仅新增的 class）
      const dynamicResult = this.dynamicClassGenerator.getClassList(newClasses);

      // 生成用户基础类CSS（基于新增动态类）
      const userBaseResult = this.dynamicClassGenerator.createUserBaseClassList(
        dynamicResult.userBaseClassArr
      );

      // 生成静态类CSS（仅新增的静态类）
      const staticResult = await this.unifiedWriter.generateStaticCSS(newStaticClasses);

      // 合并CSS内容（不包含 commonCss，因为已经在 BASE 中）
      let cssContent = [dynamicResult.cssStr, staticResult, userBaseResult]
        .filter(Boolean)
        .join('\n');

      // 格式化（压缩），但不排序（因为只是追加）
      const cssFormat = this.configManager.getCssFormat();
      const CssFormatter = require('./utils/CssFormatter');
      const cssFormatter = new CssFormatter(cssFormat);
      cssContent = cssFormatter.formatCSS(cssContent, cssFormat);

      return cssContent;
    } catch (error) {
      this.logger.error(`生成增量 CSS 失败: ${error.message}`);
      return '';
    }
  }

  // 报告未使用的 class（重建场景：旧输出文件中存在但当前扫描未使用的）
  async reportUnusedClassesOnRebuild(oldBaselineClassSet, oldBaselineStaticSet) {
    try {
      const multiFile = this.configManager.getMultiFile();
      if (!multiFile || !multiFile.output) {
        return;
      }

      const unusedReportLimit = multiFile.output.unusedReportLimit || 200;

      // 获取当前扫描到的 class
      const mergedData = this.fullScanManager.getMergedData();
      const scannedClassSet = mergedData.classListSet;
      const scannedStaticSet = mergedData.userStaticClassListSet;

      // 计算未使用的 class
      const unusedClasses = Array.from(oldBaselineClassSet).filter(
        (cls) => !scannedClassSet.has(cls)
      );
      const unusedStaticClasses = Array.from(oldBaselineStaticSet).filter(
        (cls) => !scannedStaticSet.has(cls)
      );

      const totalUnused = unusedClasses.length + unusedStaticClasses.length;

      if (totalUnused > 0) {
        console.log('\n⚠️  启动重建：检测到未使用的 class（已从输出文件中清理）:');
        console.log(`   总数: ${totalUnused} (动态类: ${unusedClasses.length}, 静态类: ${unusedStaticClasses.length})`);

        // 显示前 N 个示例
        const displayLimit = Math.min(unusedReportLimit, totalUnused);
        const displayClasses = [
          ...unusedClasses.slice(0, Math.min(unusedReportLimit, unusedClasses.length)),
          ...unusedStaticClasses.slice(0, Math.min(unusedReportLimit, unusedStaticClasses.length)),
        ].slice(0, displayLimit);

        if (displayClasses.length > 0) {
          console.log(`   示例 (前 ${displayLimit} 个):`);
          displayClasses.forEach((cls, index) => {
            if (index < 20) {
              // 只显示前 20 个，避免输出过长
              console.log(`     - ${cls}`);
            }
          });
          if (displayClasses.length > 20) {
            console.log(`     ... 还有 ${displayClasses.length - 20} 个未显示`);
          }
        }

        if (totalUnused > displayLimit) {
          console.log(`   (仅显示前 ${displayLimit} 个，实际清理了 ${totalUnused} 个未使用的 class)`);
        }

        console.log('   提示: 这些 class 在上一版输出文件中存在，但当前项目扫描未使用，已在重建时清理。\n');
      } else {
        console.log('\n✅ 启动重建完成：未发现未使用的 class，输出文件已是最新状态。\n');
      }
    } catch (error) {
      // 报告失败不影响正常流程
      this.logger.warn(`检查未使用 class 失败: ${error.message}`);
    }
  }

  // 报告未使用的 class（输出文件中存在但当前扫描未使用的）- 旧版本（用于非重建场景）
  async reportUnusedClasses() {
    try {
      const multiFile = this.configManager.getMultiFile();
      if (!multiFile || !multiFile.output) {
        return;
      }

      const outputPath = multiFile.output.path;
      const fileName = multiFile.output.fileName || 'index.wxss';
      const outputFilePath = path.join(outputPath, fileName);
      const unusedReportLimit = multiFile.output.unusedReportLimit || 200;

      // 从输出文件提取所有 class
      const { classList: baselineClassList, staticClassList: baselineStaticList } =
        await this.wxssExtractor.extractClassesFromFile(outputFilePath);

      // 获取当前扫描到的 class
      const mergedData = this.fullScanManager.getMergedData();
      const scannedClassSet = mergedData.classListSet;
      const scannedStaticSet = mergedData.userStaticClassListSet;

      // 计算未使用的 class
      const unusedClasses = Array.from(baselineClassList).filter(
        (cls) => !scannedClassSet.has(cls)
      );
      const unusedStaticClasses = Array.from(baselineStaticList).filter(
        (cls) => !scannedStaticSet.has(cls)
      );

      const totalUnused = unusedClasses.length + unusedStaticClasses.length;

      if (totalUnused > 0) {
        console.log('\n⚠️  检测到未使用的 class:');
        console.log(`   总数: ${totalUnused} (动态类: ${unusedClasses.length}, 静态类: ${unusedStaticClasses.length})`);

        // 显示前 N 个示例
        const displayLimit = Math.min(unusedReportLimit, totalUnused);
        const displayClasses = [
          ...unusedClasses.slice(0, Math.min(unusedReportLimit, unusedClasses.length)),
          ...unusedStaticClasses.slice(0, Math.min(unusedReportLimit, unusedStaticClasses.length)),
        ].slice(0, displayLimit);

        if (displayClasses.length > 0) {
          console.log(`   示例 (前 ${displayLimit} 个):`);
          displayClasses.forEach((cls, index) => {
            if (index < 20) {
              // 只显示前 20 个，避免输出过长
              console.log(`     - ${cls}`);
            }
          });
          if (displayClasses.length > 20) {
            console.log(`     ... 还有 ${displayClasses.length - 20} 个未显示`);
          }
        }

        if (totalUnused > displayLimit) {
          console.log(`   (仅显示前 ${displayLimit} 个，实际有 ${totalUnused} 个未使用的 class)`);
        }

        console.log('   提示: 这些 class 在输出文件中存在，但当前项目扫描未使用。');
        console.log('   建议: 可以手动清理输出文件中的这些 class，或保留它们以备将来使用。\n');
      }
    } catch (error) {
      // 报告失败不影响正常流程
      this.logger.warn(`检查未使用 class 失败: ${error.message}`);
    }
  }

  // 计算统一文件模式的构建时间（取最早开始时间）
  calculateBuildTimeForUnified(filePaths) {
    if (!filePaths || filePaths.length === 0) {
      return null;
    }
    
    // 找到最早的开始时间
    let earliestStartTime = null;
    for (const filePath of filePaths) {
      const startTime = this.buildStartTimes.get(filePath);
      if (startTime && (earliestStartTime === null || startTime < earliestStartTime)) {
        earliestStartTime = startTime;
      }
    }
    
    if (earliestStartTime) {
      const buildTime = Date.now() - earliestStartTime;
      // 清除所有相关文件的构建时间记录
      for (const filePath of filePaths) {
        this.buildStartTimes.delete(filePath);
      }
      return buildTime;
    }
    
    return null;
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
