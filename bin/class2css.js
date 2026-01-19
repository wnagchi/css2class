#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const Class2CSS = require('../src/index');
const DocsServer = require('../src/docs/DocsServer');

// 命令行参数解析
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    config: './class2css.config.js',
    watch: true,
    help: false,
    version: false,
    inputPath: null,
    outputPath: null,
    outputFileName: null,
    outputType: null,
    docs: false,
    docsPort: 5173,
    docsHost: '127.0.0.1',
    docsOpen: false,
    docsOnly: false,
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
      case '--input':
      case '-i':
        options.inputPath = args[++i];
        break;
      case '--output':
      case '-o':
        options.outputPath = args[++i];
        break;
      case '--output-file':
      case '-f':
        options.outputFileName = args[++i];
        break;
      case '--output-type':
      case '-t':
        options.outputType = args[++i];
        break;
      case '--docs':
        options.docs = true;
        break;
      case '--docs-port':
        options.docsPort = parseInt(args[++i], 10);
        break;
      case '--docs-host':
        options.docsHost = args[++i];
        break;
      case '--docs-open':
        options.docsOpen = true;
        break;
      case '--docs-only':
        options.docsOnly = true;
        options.docs = true;
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

  if (Number.isNaN(options.docsPort)) {
    console.error('❌ Invalid --docs-port value. It must be a number.');
    process.exit(1);
  }

  return options;
}

function openUrl(url) {
  try {
    if (process.platform === 'win32') {
      // Use "start" via cmd
      const child = spawn('cmd', ['/c', 'start', '""', url], { stdio: 'ignore', detached: true });
      child.unref();
    } else if (process.platform === 'darwin') {
      const child = spawn('open', [url], { stdio: 'ignore', detached: true });
      child.unref();
    } else {
      const child = spawn('xdg-open', [url], { stdio: 'ignore', detached: true });
      child.unref();
    }
  } catch (_) {
    // ignore
  }
}

// 显示帮助信息
function showHelp() {
  console.log(`
Class2CSS - Dynamic CSS Generator for WeChat Mini Program

Usage: class2css [options]

Options:
  -c, --config <path>         Configuration file path (default: ./class2css.config.js)
  -i, --input <path>         Override input directory path (runtime override)
  -o, --output <path>        Override output directory path (runtime override)
  -f, --output-file <name>   Override output file name (runtime override)
  -t, --output-type <type>   Override output type: filePath or uniFile (runtime override)
  --no-watch                 Disable file watching mode
  --docs                     Start VitePress docs server alongside Class2CSS
  --docs-port <port>         Docs server port (default: 5173; auto-increment if occupied)
  --docs-host <host>         Docs server host (default: 127.0.0.1)
  --docs-open                Open docs URL in browser after start (default: off)
  --docs-only                Only start docs server (no Class2CSS run)
  -h, --help                 Show this help message
  -v, --version              Show version information

Examples:
  class2css                                    # Run with default config
  class2css -c ./config.js                     # Run with custom config
  class2css --no-watch                         # Run without file watching
  class2css -i ./src -o ./dist                 # Override input and output directories
  class2css -i ./pages -o ./styles -f app.wxss # Override input, output and filename
  class2css -i ./src -o ./dist -t uniFile     # Override input, output and output type
  class2css --docs                             # Run and start docs server
  class2css --docs-only --docs-open            # Only start docs and open browser

Configuration:
  The tool reads configuration from class2css.config.js by default.
  Runtime overrides (--input, --output, etc.) will override values in the config file.
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
  let docsServer = null;
  let class2css = null;
  let shuttingDown = false;

  const shutdown = async (signal, exitCode = 0, error = null) => {
    if (shuttingDown) return;
    shuttingDown = true;

    if (error) {
      console.error(`\n❌ ${signal}:`, error);
    } else {
      console.log(`\n🛑 Received ${signal}, stopping...`);
    }

    try {
      if (class2css) {
        await class2css.stop();
      }
    } catch (_) {}

    try {
      if (docsServer) {
        await docsServer.stop();
      }
    } catch (_) {}

    process.exit(exitCode);
  };

  // 兜底：异常/拒绝时也清理 docs 子进程
  process.on('uncaughtException', (err) => shutdown('uncaughtException', 1, err));
  process.on('unhandledRejection', (reason) => shutdown('unhandledRejection', 1, reason));

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

    // docs-only mode: only start docs server
    if (options.docsOnly) {
      docsServer = new DocsServer();
      const { url } = await docsServer.start({ port: options.docsPort, host: options.docsHost });
      console.log(`📚 Docs: ${url}`);
      if (options.docsOpen) {
        openUrl(url);
      }

      process.once('SIGINT', () => shutdown('SIGINT', 0));
      process.once('SIGTERM', () => shutdown('SIGTERM', 0));

      console.log('🎯 Docs server is running...');
      console.log('Press Ctrl+C to stop');
      return;
    }

    // 检查配置文件
    const configPath = checkConfig(options.config);

    console.log('🚀 Starting Class2CSS...');
    console.log(`📁 Config: ${configPath}`);
    console.log(`👀 Watch mode: ${options.watch ? 'enabled' : 'disabled'}`);

    // 创建Class2CSS实例
    class2css = new Class2CSS({
      configPath: configPath,
      cacheSize: 1000,
      logger: {
        level: 'info',
        enableDebug: true,
        enableTimestamp: true,
      },
    });

    // 应用运行时配置覆盖
    if (options.inputPath || options.outputPath || options.outputFileName || options.outputType) {
      const overrides = {};
      
      // 解析输入路径为绝对路径
      if (options.inputPath) {
        overrides.inputPath = path.isAbsolute(options.inputPath)
          ? path.normalize(options.inputPath)
          : path.resolve(process.cwd(), options.inputPath);
      }
      
      // 解析输出路径为绝对路径
      if (options.outputPath) {
        overrides.outputPath = path.isAbsolute(options.outputPath)
          ? path.normalize(options.outputPath)
          : path.resolve(process.cwd(), options.outputPath);
      }
      
      if (options.outputFileName) {
        overrides.outputFileName = options.outputFileName;
      }
      
      if (options.outputType) {
        if (options.outputType !== 'filePath' && options.outputType !== 'uniFile') {
          console.error(`❌ Invalid output type: ${options.outputType}. Must be 'filePath' or 'uniFile'`);
          process.exit(1);
        }
        overrides.outputType = options.outputType;
      }
      
      class2css.configManager.overrideConfig(overrides);
      
      // 如果输出类型改变，更新统一文件模式状态
      if (options.outputType) {
        const isUnifiedMode = options.outputType === 'uniFile';
        class2css.stateManager.setUnifiedFileMode(isUnifiedMode);
      }
      
      // 显示运行时覆盖信息
      console.log('⚙️  Runtime overrides applied:');
      if (overrides.inputPath) console.log(`   Input: ${overrides.inputPath}`);
      if (overrides.outputPath) console.log(`   Output: ${overrides.outputPath}`);
      if (overrides.outputFileName) console.log(`   Output file: ${overrides.outputFileName}`);
      if (overrides.outputType) console.log(`   Output type: ${overrides.outputType}`);
    }

    // 获取事件总线用于监听事件
    const eventBus = class2css.getEventBus();

    // docs mode: start docs server alongside
    if (options.docs) {
      docsServer = new DocsServer(eventBus);
      const { url } = await docsServer.start({ port: options.docsPort, host: options.docsHost });
      console.log(`📚 Docs: ${url}`);
      if (options.docsOpen) {
        openUrl(url);
      }
    }

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
      await shutdown('no-watch', 0);
    }

    // 监听模式：处理进程信号
    process.once('SIGINT', () => shutdown('SIGINT', 0));

    process.once('SIGTERM', () => shutdown('SIGTERM', 0));

    // 显示状态信息
    // console.log('\n📊 Current Status:');
    const status = class2css.getStatus();
    // console.log(JSON.stringify(status, null, 2));

    console.log('\n🎯 Class2CSS is running in watch mode...');
    console.log('Press Ctrl+C to stop');
  } catch (error) {
    console.error('❌ Failed to start Class2CSS:', error.message);
    if (error.stack) console.error(error.stack);
    await shutdown('startup-error', 1, error);
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
