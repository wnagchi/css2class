import { Class2CSS } from './src';

async function testCleanupFeatures() {
  console.log('🧪 测试清理功能...');

  try {
    // 创建Class2CSS实例
    const class2css = new Class2CSS({
      configPath: './class2css.config.js',
      cacheSize: 100,
      logger: {
        level: 'info',
        enableDebug: true,
        enableTimestamp: true,
      },
    });

    console.log('✅ Class2CSS 实例创建成功');

    // 测试快速清理
    console.log('🧹 测试快速清理...');
    const cleanupResult = await class2css.quickCleanup({
      dryRun: true, // 使用dry-run模式，不实际删除文件
      includeCache: true,
      includeFiles: false,
    });

    console.log('清理结果:', cleanupResult);

    // 测试清理状态
    console.log('📊 获取清理状态...');
    const cleanupStatus = class2css.getCleanupStatus();
    console.log('清理状态:', cleanupStatus);

    // 测试清理统计
    console.log('📈 获取清理统计...');
    const cleanupStats = class2css.getCleanupStatistics();
    console.log('清理统计:', cleanupStats);

    console.log('🎉 清理功能测试完成！');
  } catch (error) {
    console.error('❌ 清理功能测试失败:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  testCleanupFeatures().catch(console.error);
}

export { testCleanupFeatures };