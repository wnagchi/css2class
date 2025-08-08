// Class2CSS 模块化版本使用示例
const Class2CSS = require('./index');

async function example() {
  try {
    // 创建 Class2CSS 实例
    const class2css = new Class2CSS({
      configPath: './class2css.config.js',
      cacheSize: 1000,
      logger: {
        level: 'info',
        enableDebug: true,
        enableTimestamp: true
      }
    });

    // 获取事件总线进行监听
    const eventBus = class2css.getEventBus();
    
    // 监听重要事件
    eventBus.on('class2css:started', () => {
      console.log('Class2CSS started successfully!');
    });

    eventBus.on('parser:completed', (stats) => {
      console.log(`Parsing completed: ${stats.totalCount} classes found`);
    });

    eventBus.on('generator:dynamic:completed', (stats) => {
      console.log(`Dynamic CSS generated: ${stats.generatedCount} classes`);
    });

    // 启动 Class2CSS
    await class2css.start();

    // 获取状态信息
    const status = class2css.getStatus();
    console.log('Class2CSS Status:', JSON.stringify(status, null, 2));

    // 模拟文件变更处理
    await class2css.handleFileChange('./example.html');

    // 获取模块进行高级操作
    const modules = class2css.getModules();
    
    // 示例：直接使用解析器
    const htmlContent = '<div class="w-100 h-50 bg-red text-white">Hello World</div>';
    const parseResult = modules.classParser.parseClassOptimized(htmlContent);
    console.log('Parse result:', parseResult);

    // 示例：直接使用生成器
    const generateResult = modules.dynamicClassGenerator.getClassList(parseResult.classArr);
    console.log('Generated CSS length:', generateResult.cssStr.length);

    // 停止 Class2CSS
    class2css.stop();

  } catch (error) {
    console.error('Example failed:', error);
  }
}

// 高级用法示例
function advancedExample() {
  const class2css = new Class2CSS();
  const modules = class2css.getModules();

  // 直接使用各个模块
  const { logger, importantParser, regexCompiler } = modules;

  // 测试 Important 标识
  const testClasses = ['w-100', '!w-100', 'w-100_i', 'w-100-important'];
  const importantResults = importantParser.batchProcessImportant(testClasses);
  console.log('Important test results:', importantResults);

  // 测试正则表达式
  const regexStats = regexCompiler.getRegexStats();
  console.log('Regex stats:', regexStats);

  // 设置日志级别
  logger.setLevel('debug');
  logger.setDebugMode(true);

  // 监听特定事件
  const eventBus = class2css.getEventBus();
  eventBus.on('important:detected', (data) => {
    console.log('Important flag detected:', data);
  });

  eventBus.on('parser:static:found', (data) => {
    console.log('Static class found:', data);
  });
}

// 运行示例
if (require.main === module) {
  console.log('Running Class2CSS module example...');
  example().then(() => {
    console.log('Example completed');
  }).catch(error => {
    console.error('Example error:', error);
  });
}

module.exports = { example, advancedExample }; 