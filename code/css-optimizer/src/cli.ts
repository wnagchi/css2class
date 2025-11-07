#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import { CSSOptimizer } from './css-optimizer';

/**
 * CLI主程序
 */
class CSSOptimizerCLI {
  private program: Command;
  private optimizer: CSSOptimizer;

  constructor() {
    this.program = new Command();
    this.optimizer = new CSSOptimizer();
    this.setupCLI();
  }

  /**
   * 设置CLI命令
   */
  private setupCLI(): void {
    this.program
      .name('css-optimizer')
      .description('高性能CSS生成工具，支持多格式代码解析和自定义规则')
      .version('1.0.0')
      .option('-c, --config <path>', '配置文件路径', './config.yaml')
      .option('-o, --output <path>', '输出CSS文件路径')
      .option('--watch', '启用监听模式')
      .option('--minify', '压缩CSS输出')
      .option('--stats', '显示性能统计')
      .option('--clear-cache', '清理缓存')
      .option('--validate', '验证配置')
      .option('--init', '初始化示例项目');

    // init命令 - 创建示例项目
    this.program
      .command('init <projectName>')
      .description('初始化示例项目')
      .action(async (projectName: string) => {
        await this.initProject(projectName);
      });

    // build命令 - 构建CSS
    this.program
      .command('build <source>')
      .description('构建CSS文件')
      .option('-o, --output <path>', '输出文件路径')
      .option('--minify', '压缩输出')
      .action(async (source: string, options: any) => {
        await this.build(source, options);
      });

    // watch命令 - 监听模式
    this.program
      .command('watch <source>')
      .description('启动监听模式')
      .option('-o, --output <path>', '输出文件路径')
      .action(async (source: string, options: any) => {
        await this.watch(source, options);
      });

    // stats命令 - 显示统计
    this.program
      .command('stats')
      .description('显示性能统计')
      .action(async () => {
        await this.showStats();
      });

    // cache命令 - 缓存管理
    this.program
      .command('cache')
      .description('缓存管理')
      .option('--clear', '清理缓存')
      .option('--info', '显示缓存信息')
      .action(async (options: any) => {
        await this.manageCache(options);
      });
  }

  /**
   * 初始化示例项目
   */
  private async initProject(projectName: string): Promise<void> {
    try {
      const projectPath = path.resolve(projectName);
      
      if (await fs.pathExists(projectPath)) {
        console.error(`目录已存在: ${projectPath}`);
        process.exit(1);
      }

      await fs.ensureDir(projectPath);

      // 创建项目结构
      const dirs = ['src', 'dist', 'config'];
      for (const dir of dirs) {
        await fs.ensureDir(path.join(projectPath, dir));
      }

      // 复制配置文件
      const configPath = path.join(projectPath, 'config', 'config.yaml');
      const cliConfigPath = path.resolve(__dirname, '../config.yaml');
      
      if (await fs.pathExists(cliConfigPath)) {
        await fs.copy(cliConfigPath, configPath);
      } else {
        // 创建默认配置
        await this.createDefaultConfig(configPath);
      }

      // 创建示例文件
      await this.createExampleFiles(projectPath);

      // 创建package.json
      await this.createPackageJson(projectPath, projectName);

      console.log(`\n✅ 示例项目已创建: ${projectPath}`);
      console.log('\n📁 项目结构:');
      console.log('  ├── config/');
      console.log('  │   └── config.yaml    # 配置文件');
      console.log('  ├── src/');
      console.log('  │   ├── example.vue    # Vue示例文件');
      console.log('  │   ├── example.wxml   # 小程序示例文件');
      console.log('  │   └── example.html   # HTML示例文件');
      console.log('  ├── dist/');
      console.log('  │   └── styles.css     # 生成的CSS文件');
      console.log('  └── package.json');
      console.log('\n🚀 快速开始:');
      console.log(`  cd ${projectName}`);
      console.log('  npm install');
      console.log('  npm run build');
      console.log('  npm run watch    # 监听模式');

    } catch (error) {
      console.error('初始化项目失败:', error);
      process.exit(1);
    }
  }

  /**
   * 构建CSS
   */
  private async build(source: string, options: any): Promise<void> {
    try {
      await this.optimizer.initialize();

      const sourcePath = path.resolve(source);
      const outputPath = options.output ? path.resolve(options.output) : undefined;

      if (await fs.pathExists(sourcePath)) {
        const stats = await fs.stat(sourcePath);

        if (stats.isDirectory()) {
          // 处理目录
          const result = await this.optimizer.processDirectory(sourcePath, outputPath);
          
          console.log(`\n📊 构建统计:`);
          console.log(`  处理文件: ${result.files.length} 个`);
          console.log(`  生成CSS: ${result.css.length} 字符`);
          console.log(`  类数量: ${result.stats.totalClasses}`);
          console.log(`  规则数量: ${result.stats.totalRules}`);

          if (outputPath) {
            console.log(`\n💾 输出文件: ${outputPath}`);
          }
        } else {
          // 处理单个文件
          const css = await this.optimizer.processFile(sourcePath);
          
          if (outputPath) {
            await fs.ensureDir(path.dirname(outputPath));
            await fs.writeFile(outputPath, css, 'utf-8');
            console.log(`\n💾 CSS已生成: ${outputPath}`);
          } else {
            console.log('\n📄 生成的CSS:');
            console.log(css);
          }
        }
      } else {
        throw new Error(`源文件/目录不存在: ${sourcePath}`);
      }

      // 显示性能统计
      if (options.stats) {
        await this.showStats();
      }

    } catch (error) {
      console.error('构建失败:', error);
      process.exit(1);
    }
  }

  /**
   * 监听模式
   */
  private async watch(source: string, options: any): Promise<void> {
    try {
      await this.optimizer.initialize();

      const sourcePath = path.resolve(source);
      const outputPath = options.output ? path.resolve(options.output) : undefined;

      if (!await fs.pathExists(sourcePath)) {
        throw new Error(`源目录不存在: ${sourcePath}`);
      }

      console.log(`\n👀 监听模式已启动`);
      console.log(`📁 监听目录: ${sourcePath}`);
      if (outputPath) {
        console.log(`💾 输出文件: ${outputPath}`);
      }
      console.log('按 Ctrl+C 停止监听\n');

      await this.optimizer.startWatch(sourcePath, outputPath);

      // 优雅退出
      process.on('SIGINT', async () => {
        console.log('\n\n🛑 正在停止监听...');
        await this.optimizer.stopWatch();
        process.exit(0);
      });

    } catch (error) {
      console.error('启动监听模式失败:', error);
      process.exit(1);
    }
  }

  /**
   * 显示统计信息
   */
  private async showStats(): Promise<void> {
    try {
      await this.optimizer.initialize();
      const stats = this.optimizer.getPerformanceStats();

      console.log('\n📊 性能统计:');
      console.log(`  解析时间: ${stats.parseTime}ms`);
      console.log(`  生成时间: ${stats.generateTime}ms`);
      console.log(`  总文件数: ${stats.totalFiles}`);
      console.log(`  处理文件: ${stats.processedFiles}`);
      console.log(`  缓存命中: ${stats.cacheHits}`);
      console.log(`  缓存未命中: ${stats.cacheMisses}`);
      console.log(`  内存使用: ${this.formatBytes(stats.memoryUsage)}`);

      const hitRate = stats.cacheHits + stats.cacheMisses > 0 
        ? (stats.cacheHits / (stats.cacheHits + stats.cacheMisses) * 100).toFixed(1)
        : '0';
      console.log(`  缓存命中率: ${hitRate}%`);

    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  }

  /**
   * 缓存管理
   */
  private async manageCache(options: any): Promise<void> {
    try {
      await this.optimizer.initialize();

      if (options.clear) {
        this.optimizer.clearCache();
        console.log('✅ 缓存已清理');
      } else if (options.info) {
        const stats = this.optimizer.getPerformanceStats();
        console.log('\n💾 缓存信息:');
        console.log(`  缓存命中: ${stats.cacheHits}`);
        console.log(`  缓存未命中: ${stats.cacheMisses}`);
        console.log(`  内存使用: ${this.formatBytes(stats.memoryUsage)}`);
      } else {
        console.log('请指定操作: --clear 或 --info');
      }

    } catch (error) {
      console.error('缓存管理失败:', error);
    }
  }

  /**
   * 运行CLI
   */
  async run(): Promise<void> {
    try {
      // 处理全局选项
      const options = this.program.opts();

      if (options.init) {
        // init命令在其他地方处理
        return;
      }

      if (options.clearCache) {
        await this.optimizer.initialize();
        this.optimizer.clearCache();
        console.log('✅ 缓存已清理');
        return;
      }

      if (options.validate) {
        await this.optimizer.initialize();
        const validation = this.optimizer.validateConfig();
        
        if (validation.valid) {
          console.log('✅ 配置验证通过');
        } else {
          console.log('❌ 配置验证失败:');
          validation.errors.forEach(error => console.log(`  - ${error}`));
          process.exit(1);
        }
        return;
      }

      // 如果没有指定子命令，显示帮助
      if (process.argv.length === 2) {
        this.program.help();
      }

      // 解析命令
      this.program.parse(process.argv);

    } catch (error) {
      console.error('CLI执行失败:', error);
      process.exit(1);
    }
  }

  /**
   * 创建默认配置
   */
  private async createDefaultConfig(configPath: string): Promise<void> {
    const defaultConfig = `# CSS Optimizer 配置文件

# 目标文件格式
targetFormats:
  - '.vue'
  - '.wxml'
  - '.html'

# 颜色配置
colors:
  customColors:
    primary: '#1890ff'
    success: '#52c41a'
    warning: '#faad14'
    error: '#ff4d4f'
  
  directColorParsing: true

# 单位配置
units:
  spacing:
    defaultUnit: 'px'
    conversions:
      px: 1
      rpx: 2

# 输出配置
output:
  cssFileName: 'styles.css'
  minify: false
  sourceMap: true

# 监听配置
watch:
  enabled: true
  debounceMs: 300
`;

    await fs.writeFile(configPath, defaultConfig, 'utf-8');
  }

  /**
   * 创建示例文件
   */
  private async createExampleFiles(projectPath: string): Promise<void> {
    const srcPath = path.join(projectPath, 'src');

    // Vue示例文件
    const vueExample = `<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold text-primary mb-4">
      Vue示例页面
    </h1>
    <div class="bg-light p-6 rounded-lg shadow-md">
      <p class="text-gray-600 mb-2">这是一个Vue组件示例</p>
      <button class="bg-primary text-white px-4 py-2 rounded hover:bg-blue-600">
        点击按钮
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 这里可以写额外的样式 */
</style>
`;

    // WXML示例文件
    const wxmlExample = `<view class="container mx-auto p-4">
  <view class="bg-headerblue p-6 rounded-lg">
    <text class="text-white text-xl font-bold">
      微信小程序示例
    </text>
    <view class="mt-4 flex justify-center">
      <button class="bg-success text-white px-4 py-2 rounded">
        小程序按钮
      </button>
    </view>
  </view>
</view>
`;

    // HTML示例文件
    const htmlExample = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CSS Optimizer 示例</title>
</head>
<body class="bg-gray-100">
  <div class="container mx-auto p-8">
    <h1 class="text-3xl font-bold text-primary text-center mb-8">
      CSS Optimizer 示例页面
    </h1>
    <div class="bg-white p-6 rounded-lg shadow-lg">
      <p class="text-gray-700 mb-4">
        这是一个HTML示例页面，展示了CSS Optimizer的功能。
      </p>
      <button class="bg-primary text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
        示例按钮
      </button>
    </div>
  </div>
</body>
</html>
`;

    await fs.writeFile(path.join(srcPath, 'example.vue'), vueExample, 'utf-8');
    await fs.writeFile(path.join(srcPath, 'example.wxml'), wxmlExample, 'utf-8');
    await fs.writeFile(path.join(srcPath, 'example.html'), htmlExample, 'utf-8');
  }

  /**
   * 创建package.json
   */
  private async createPackageJson(projectPath: string, projectName: string): Promise<void> {
    const packageJson = {
      name: projectName,
      version: '1.0.0',
      description: 'CSS Optimizer 示例项目',
      scripts: {
        build: 'css-optimizer build src -o dist/styles.css',
        watch: 'css-optimizer watch src -o dist/styles.css',
        'build:minify': 'css-optimizer build src -o dist/styles.min.css --minify',
        stats: 'css-optimizer stats',
        'clear-cache': 'css-optimizer --clear-cache'
      },
      devDependencies: {
        'css-optimizer': '^1.0.0'
      }
    };

    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2),
      'utf-8'
    );
  }

  /**
   * 格式化字节数
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// 运行CLI
if (require.main === module) {
  const cli = new CSSOptimizerCLI();
  cli.run().catch(error => {
    console.error('CLI运行失败:', error);
    process.exit(1);
  });
}

export { CSSOptimizerCLI };