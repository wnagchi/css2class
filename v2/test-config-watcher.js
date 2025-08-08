const Class2CSS = require('./src/index');

async function testConfigWatcher() {
  console.log('🧪 Testing ConfigWatcher functionality...\n');

  try {
    // 创建 Class2CSS 实例
    const class2css = new Class2CSS({
      configPath: './class2css.config.js',
      logger: { level: 'info', enableDebug: true }
    });

    // 监听配置相关事件
    const eventBus = class2css.getEventBus();
    
    eventBus.on('config:watcher:ready', (data) => {
      console.log('✅ Config watcher is ready:', data.configPath);
    });

    eventBus.on('config:reload:start', (data) => {
      console.log('🔄 Config reload started, count:', data.reloadCount);
    });

    eventBus.on('config:reload:success', (data) => {
      console.log('✅ Config reloaded successfully!');
      console.log('📝 Changes detected:', data.changes.length);
      data.changes.forEach(change => {
        console.log(`   - ${change.type}: ${change.field} (impact: ${change.impact})`);
      });
    });

    eventBus.on('config:reload:error', (data) => {
      console.log('❌ Config reload failed:', data.error);
    });

    // 启动 Class2CSS（包括配置监听）
    await class2css.start();
    
    console.log('\n🎯 Class2CSS is running with config watcher...');
    console.log('📝 Try modifying class2css.config.js to test hot reload');
    console.log('🔧 You can change colors, output settings, or base classes');
    console.log('⏰ Debounce delay: 300ms');
    console.log('\n📊 Current status:');
    
    // 显示状态信息
    const status = class2css.getStatus();
    console.log('Config Watcher Stats:');
    console.log(`  - Is watching: ${status.configWatcher.isWatching}`);
    console.log(`  - Config path: ${status.configWatcher.configPath}`);
    console.log(`  - Reload count: ${status.configWatcher.reloadCount}`);
    console.log(`  - Success count: ${status.configWatcher.successCount}`);
    console.log(`  - Error count: ${status.configWatcher.errorCount}`);
    
    console.log('\n⏱️  Waiting for config changes... (Press Ctrl+C to stop)');

    // 监听进程退出
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping Class2CSS...');
      class2css.stop();
      
      const finalStats = class2css.getStatus().configWatcher;
      console.log('\n📈 Final Config Watcher Stats:');
      console.log(`  - Total reloads: ${finalStats.reloadCount}`);
      console.log(`  - Success rate: ${finalStats.reloadCount > 0 ? (finalStats.successCount / finalStats.reloadCount * 100).toFixed(1) : 0}%`);
      console.log(`  - Uptime: ${Math.round(finalStats.uptime / 1000)}s`);
      
      console.log('\n✅ Test completed');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// 启动测试
testConfigWatcher(); 