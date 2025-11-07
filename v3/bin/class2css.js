#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const Class2CSS = require('../src/index');

// 命令行参数解析
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    config: './class2css.config.js',
    watch: true,
    help: false,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--config':
      case '-c':
        options.config = args[++i];
        break;
      case '--no-watch':
        options.watch = false;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--version':
      case '-v':
        options.version = true;
        break;
      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return options;
}

// 显示帮助信息
function showHelp() {
  console.log(`
Class2CSS - Dynamic CSS Generator for WeChat Mini Program

Usage: class2css [options]

Options:
  -c, --config <path>     Configuration file path (default: ./class2css.config.js)
  --no-watch              Disable file watching mode
  -h, --help              Show this help message
  -v, --version           Show version information

Examples:
  class2css                    # Run with default config
  class2css -c ./config.js     # Run with custom config
  class2css --no-watch         # Run without file watching

Configuration:
  The tool reads configuration from class2css.config.js by default.
  See documentation for configuration options.
`);
}

// 显示版本信息
function showVersion() {
  const packagePath = path.join(__dirname, '../package.json');
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    console.log(`Class2CSS v${packageJson.version || '1.0.0'}`);
  } catch (error) {
    console.log('Class2CSS v1.0.0');
  }
}

// 检查配置文件是否存在
function checkConfig(configPath) {
  const absolutePath = path.resolve(configPath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`Configuration file not found: ${absolutePath}`);
    console.error('Please create a class2css.config.js file or specify a valid config path.');
    process.exit(1);
  }
  return absolutePath;
}

// 主函数
async function main() {
  try {
    const options = parseArgs();

    // 处理特殊命令
    if (options.help) {
      showHelp();
      return;
    }

    if (options.version) {
      showVersion();
      return;
    }

    // 检查配置文件
    const configPath = checkConfig(options.config);

    console.log('🚀 Starting Class2CSS...');
    console.log(`📁 Config: ${configPath}`);
    console.log(`👀 Watch mode: ${options.watch ? 'enabled' : 'disabled'}`);

    // 创建Class2CSS实例
    const class2css = new Class2CSS({
      configPath: configPath,
      cacheSize: 1000,
      logger: {
        level: 'info',
        enableDebug: true,
        enableTimestamp: true,
      },
    });

    // 获取事件总线用于监听事件
    const eventBus = class2css.getEventBus();

    // 监听重要事件
    eventBus.on('class2css:started', () => {
      console.log('✅ Class2CSS started successfully');
    });

    eventBus.on('class2css:stopped', () => {
      console.log('🛑 Class2CSS stopped');
    });

    eventBus.on('config:loaded', (config) => {
      console.log('📋 Configuration loaded successfully');
    });

    eventBus.on('parser:completed', (stats) => {
      // console.log(`🔍 Parsing completed: ${stats.totalCount} classes found`);
    });

    eventBus.on('generator:dynamic:completed', (stats) => {
      console.log(`🎨 Dynamic CSS generated: ${stats.generatedCount} classes`);
    });

    eventBus.on('log:error', (data) => {
      console.error('❌ Error:', data);
    });

    // 启动Class2CSS
    await class2css.start();

    // 如果不是监听模式，执行一次扫描后退出
    if (!options.watch) {
      console.log('🔍 Performing one-time scan...');
      await class2css.performFullScan();
      console.log('✅ Scan completed, exiting...');
      await class2css.stop();
      process.exit(0);
    }

    // 监听模式：处理进程信号
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, stopping Class2CSS...');
      await class2css.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, stopping Class2CSS...');
      await class2css.stop();
      process.exit(0);
    });

    // 显示状态信息
    console.log('\n📊 Current Status:');
    const status = class2css.getStatus();
    console.log(JSON.stringify(status, null, 2));

    console.log('\n🎯 Class2CSS is running in watch mode...');
    console.log('Press Ctrl+C to stop');
  } catch (error) {
    console.error('❌ Failed to start Class2CSS:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { main, parseArgs, showHelp, showVersion };
