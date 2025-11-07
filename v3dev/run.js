#!/usr/bin/env node

/**
 * Class2CSS 快速启动脚本
 * 使用方法: node run.js
 */

const Class2CSS = require('./src/index');
const path = require('path');

async function run() {
  try {
    console.log('🚀 启动 Class2CSS 工具...');

    // 创建 Class2CSS 实例
    const class2css = new Class2CSS({
      configPath: './class2css.config.js',
      cacheSize: 1000,
      logger: {
        level: 'info',
        enableDebug: true,
        enableTimestamp: true,
      },
    });

    // 获取事件总线
    const eventBus = class2css.getEventBus();

    // 监听事件
    eventBus.on('class2css:started', () => {
      console.log('✅ Class2CSS 启动成功');
    });

    eventBus.on('config:loaded', (config) => {
      console.log('📋 配置文件加载成功');
    });

    eventBus.on('parser:completed', (stats) => {
      console.log(`🔍 解析完成: 发现 ${stats.totalCount} 个类名`);
    });

    eventBus.on('generator:dynamic:completed', (stats) => {
      console.log(`🎨 动态CSS生成完成: ${stats.generatedCount} 个类`);
    });

    eventBus.on('log:error', (data) => {
      console.error('❌ 错误:', data);
    });

    // 启动工具
    await class2css.start();

    // 显示状态
    console.log('\n📊 当前状态:');
    const status = class2css.getStatus();
    console.log(JSON.stringify(status, null, 2));

    console.log('\n🎯 Class2CSS 正在监听文件变化...');
    console.log('按 Ctrl+C 停止');

    // 处理进程信号
    process.on('SIGINT', async () => {
      console.log('\n🛑 收到停止信号，正在关闭 Class2CSS...');
      await class2css.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 收到终止信号，正在关闭 Class2CSS...');
      await class2css.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ 启动失败:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// 运行
if (require.main === module) {
  run().catch((error) => {
    console.error('❌ 未处理的错误:', error);
    process.exit(1);
  });
}

module.exports = { run };
