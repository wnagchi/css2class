import * as path from 'path';
import * as fs from 'fs-extra';
import { ConfigManager } from './config/config-manager';
import { Utils } from './utils/utils';
import { CacheManager } from './cache/cache-manager';
import { ParserManager } from './parser/parsers';
import { CSSGenerator } from './generator/css-generator';
import { FileWatcher, WatcherFactory } from './watcher/file-watcher';
import { Config, ParseResult, GenerateOptions, PerformanceStats, CSSClass, FileChangeEvent } from './types';

/**
 * CSS优化器主类
 */
export class CSSOptimizer {
  private configManager: ConfigManager;
  private utils!: Utils;
  private cacheManager!: CacheManager;
  private parserManager!: ParserManager;
  private generator!: CSSGenerator;
  private watcher: FileWatcher | null = null;
  private isInitialized = false;
  private performanceStats: PerformanceStats = {
    parseTime: 0,
    generateTime: 0,
    totalFiles: 0,
    processedFiles: 0,
    cacheHits: 0,
    cacheMisses: 0,
    memoryUsage: 0
  };

  constructor(configPath: string = './config.yaml') {
    this.configManager = new ConfigManager(configPath);
  }

  /**
   * 初始化优化器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // 加载配置
      const config = await this.configManager.load();

      // 初始化组件
      this.utils = new Utils(config);
      this.cacheManager = new CacheManager('multilevel', config.performance.cache);
      this.parserManager = new ParserManager(this.utils);
      this.generator = new CSSGenerator(config);

      // 监听配置文件变化
      this.configManager.watch(() => {
        console.log('配置文件已更新，重新初始化优化器...');
        this.reinitialize();
      });

      this.isInitialized = true;
      console.log('CSS优化器初始化完成');
    } catch (error) {
      throw new Error(`初始化CSS优化器失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 重新初始化
   */
  private async reinitialize(): Promise<void> {
    try {
      const config = await this.configManager.reload();
      this.utils = new Utils(config);
      this.cacheManager = new CacheManager('multilevel', config.performance.cache);
      this.parserManager = new ParserManager(this.utils);
      this.generator = new CSSGenerator(config);
      console.log('CSS优化器重新初始化完成');
    } catch (error) {
      console.error('重新初始化失败:', error);
    }
  }

  /**
   * 处理单个文件
   */
  async processFile(filePath: string): Promise<string> {
    this.ensureInitialized();

    const startTime = Date.now();
    this.performanceStats.totalFiles++;

    try {
      // 检查缓存
      const cacheKey = `file:${filePath}`;
      const cached = this.cacheManager.getCache().get(cacheKey);
      
      if (cached) {
        this.performanceStats.cacheHits++;
        this.performanceStats.processedFiles++;
        return cached;
      }

      this.performanceStats.cacheMisses++;

      // 读取文件
      if (!await fs.pathExists(filePath)) {
        throw new Error(`文件不存在: ${filePath}`);
      }

      const content = await fs.readFile(filePath, 'utf-8');

      // 解析文件
      const parseResult = await this.parserManager.parseFile(filePath, content);

      // 生成CSS
      const css = this.generator.generate(parseResult.classes);

      // 缓存结果
      this.cacheManager.getCache().set(cacheKey, css);

      this.performanceStats.processedFiles++;
      this.performanceStats.parseTime += Date.now() - startTime;

      return css;
    } catch (error) {
      this.performanceStats.parseTime += Date.now() - startTime;
      throw new Error(`处理文件失败: ${filePath}, ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 处理目录
   */
  async processDirectory(dirPath: string, outputPath?: string): Promise<{
    css: string;
    files: string[];
    stats: any;
  }> {
    this.ensureInitialized();

    const startTime = Date.now();
    const allClasses: CSSClass[] = [];
    const processedFiles: string[] = [];
    const errors: string[] = [];

    try {
      // 查找所有目标文件
      const files = await this.findTargetFiles(dirPath);

      // 并行处理文件
      const results = await Promise.allSettled(
        files.map(async (file) => {
          try {
            const css = await this.processFile(file);
            processedFiles.push(file);
            
            // 解析生成的CSS以提取类信息
            const parseResult = await this.parserManager.parseFile(file, await fs.readFile(file, 'utf-8'));
            return parseResult.classes;
          } catch (error) {
            errors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
            return [];
          }
        })
      );

      // 合并所有类
      for (const result of results) {
        if (result.status === 'fulfilled') {
          allClasses.push(...result.value);
        }
      }

      // 生成CSS
      const cssStartTime = Date.now();
      let css = this.generator.generate(allClasses);

      // 添加Base样式
      const baseStyles = await this.loadBaseStyles();
      if (baseStyles) {
        css = baseStyles + '\n\n' + css;
      }

      this.performanceStats.generateTime += Date.now() - cssStartTime;

      // 写入输出文件
      if (outputPath) {
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, css, 'utf-8');
      }

      // 生成统计信息
      const stats = this.generator.generateStats(allClasses);

      console.log(`处理完成: ${processedFiles.length} 个文件, ${errors.length} 个错误`);
      if (errors.length > 0) {
        console.warn('处理错误:', errors);
      }

      return {
        css,
        files: processedFiles,
        stats
      };
    } catch (error) {
      throw new Error(`处理目录失败: ${dirPath}, ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 启动监听模式
   */
  async startWatch(dirPath: string, outputPath?: string): Promise<void> {
    this.ensureInitialized();

    try {
      // 创建监听器
      this.watcher = WatcherFactory.create(this.configManager.getConfig(), [dirPath]);

      // 设置文件变化处理
      this.watcher.onFileChange(async (event: FileChangeEvent) => {
        try {
          console.log(`文件变化: ${event.type} - ${event.path}`);

          if (event.type === 'unlink') {
            // 文件删除，清理缓存
            this.cacheManager.getCache().delete(`file:${event.path}`);
            return;
          }

          // 重新处理文件
          const css = await this.processFile(event.path);

          // 更新输出文件
          if (outputPath) {
            await this.updateOutputFile(outputPath, event.path, css);
          }
        } catch (error) {
          console.error(`处理文件变化失败: ${event.path}`, error);
        }
      });

      // 启动监听
      await this.watcher.start();

      console.log(`监听模式已启动，监听目录: ${dirPath}`);
      
      // 初始处理
      if (outputPath) {
        await this.processDirectory(dirPath, outputPath);
      }
    } catch (error) {
      throw new Error(`启动监听模式失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 停止监听
   */
  async stopWatch(): Promise<void> {
    if (this.watcher) {
      await this.watcher.stop();
      this.watcher = null;
      console.log('监听模式已停止');
    }
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(): PerformanceStats {
    const cacheStats = this.cacheManager.getStats();
    
    return {
      ...this.performanceStats,
      cacheHits: cacheStats.hits,
      cacheMisses: cacheStats.misses,
      memoryUsage: cacheStats.memory.approximateSize
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.performanceStats = {
      parseTime: 0,
      generateTime: 0,
      totalFiles: 0,
      processedFiles: 0,
      cacheHits: 0,
      cacheMisses: 0,
      memoryUsage: 0
    };
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.cacheManager.getCache().clear();
    console.log('缓存已清理');
  }

  /**
   * 获取配置
   */
  getConfig(): Config {
    return this.configManager.getConfig();
  }

  /**
   * 重新加载配置
   */
  async reloadConfig(): Promise<void> {
    await this.configManager.reload();
    await this.reinitialize();
    console.log('配置已重新加载');
  }

  /**
   * 验证配置
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    try {
      const config = this.configManager.getConfig();
      const errors: string[] = [];

      // 验证目标格式
      if (!Array.isArray(config.targetFormats) || config.targetFormats.length === 0) {
        errors.push('目标文件格式配置错误');
      }

      // 验证颜色配置
      if (typeof config.colors !== 'object') {
        errors.push('颜色配置格式错误');
      }

      // 验证单位配置
      if (typeof config.units !== 'object') {
        errors.push('单位配置格式错误');
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * 查找目标文件
   */
  private async findTargetFiles(dirPath: string): Promise<string[]> {
    const config = this.configManager.getConfig();
    const files: string[] = [];

    const scanDirectory = async (currentPath: string) => {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          // 跳过忽略的目录
          if (!this.shouldIgnorePath(fullPath)) {
            await scanDirectory(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(fullPath).toLowerCase();
          if (config.targetFormats.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };

    await scanDirectory(dirPath);
    return files;
  }

  /**
   * 检查是否应该忽略路径
   */
  private shouldIgnorePath(filePath: string): boolean {
    const config = this.configManager.getConfig();
    
    for (const pattern of config.watch.ignorePatterns) {
      if (this.matchPattern(filePath, pattern)) {
        return true;
      }
    }

    return false;
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
   * 加载Base样式
   */
  private async loadBaseStyles(): Promise<string | null> {
    try {
      const config = this.configManager.getConfig();
      
      if (!config.output.baseStylesPath) {
        return null;
      }

      if (await fs.pathExists(config.output.baseStylesPath)) {
        return await fs.readFile(config.output.baseStylesPath, 'utf-8');
      }

      return null;
    } catch (error) {
      console.warn('加载Base样式失败:', error);
      return null;
    }
  }

  /**
   * 更新输出文件
   */
  private async updateOutputFile(outputPath: string, changedFile: string, newCSS: string): Promise<void> {
    try {
      // 简化实现：重新生成整个CSS文件
      // 在实际项目中可以实现更精细的增量更新
      const dirPath = path.dirname(outputPath);
      await fs.ensureDir(dirPath);
      
      const result = await this.processDirectory(dirPath);
      await fs.writeFile(outputPath, result.css, 'utf-8');
    } catch (error) {
      console.error(`更新输出文件失败: ${outputPath}`, error);
    }
  }

  /**
   * 确保已初始化
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('CSS优化器未初始化，请先调用 initialize() 方法');
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.stopWatch().catch(console.error);
    this.configManager.unwatchAll();
    this.cacheManager.stopCleanupScheduler();
  }
}