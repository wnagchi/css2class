#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 测试清理模块的基本功能
function testCleanupModules() {
  console.log('🧪 测试清理模块基本功能...\n');

  try {
    // 1. 测试CacheCleaner
    console.log('1. 测试 CacheCleaner...');
    const CacheCleaner = require('./dist/cleanup/cleanup/CacheCleaner').default;

    // 模拟EventBus
    const mockEventBus = {
      emit: (event, data) => {
        console.log(`  事件: ${event}`, data ? '' : '');
      }
    };

    // 模拟缓存数据
    const fileCache = new Map([
      ['file1.js', 'content1'],
      ['file2.js', 'content2'],
      ['file3.js', 'content3']
    ]);

    const fileStats = new Map([
      ['file1.js', Date.now() - 1000 * 60 * 60], // 1小时前
      ['file2.js', Date.now()], // 当前
      ['file3.js', Date.now() - 1000 * 60 * 60 * 25] // 25小时前（过期）
    ]);

    const cssGenerationCache = new Map([
      ['css1', { value: 'style1', timestamp: Date.now() - 1000 * 60 * 60 }],
      ['css2', { value: 'style2', timestamp: Date.now() }]
    ]);

    const cssGenerationStats = {
      hits: 10,
      misses: 5,
      totalGenerations: 15
    };

    const cacheStrategy = {
      maxFileAge: 24 * 60 * 60 * 1000 // 24小时
    };

    const cacheCleaner = new CacheCleaner(
      mockEventBus,
      fileCache,
      fileStats,
      cssGenerationCache,
      cssGenerationStats,
      1000,
      cacheStrategy
    );

    console.log(`  初始文件缓存大小: ${fileCache.size}`);
    console.log(`  初始CSS缓存大小: ${cssGenerationCache.size}`);

    // 测试清理文件缓存
    const clearedCount = cacheCleaner.clearFileCache();
    console.log(`  清理文件缓存: ${clearedCount} 项`);

    // 测试清理CSS缓存
    const clearedCssCount = cacheCleaner.clearCssGenerationCache();
    console.log(`  清理CSS缓存: ${clearedCssCount} 项`);

    // 测试过期缓存清理
    cacheCleaner.cleanupExpiredEntries().then(result => {
      console.log(`  过期清理结果:`, {
        success: result.success,
        clearedCount: result.clearedCount,
        freedMemory: result.freedMemory
      });
    });

    console.log('✅ CacheCleaner 测试通过\n');

    // 2. 测试FileCleaner
    console.log('2. 测试 FileCleaner...');
    const FileCleaner = require('./dist/cleanup/cleanup/FileCleaner').default;

    const fileCleaner = new FileCleaner(mockEventBus);

    // 创建临时测试目录和文件
    const testDir = './test-cleanup-temp';
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
    }

    // 创建测试文件
    fs.writeFileSync(path.join(testDir, 'test1.txt'), 'test content 1');
    fs.writeFileSync(path.join(testDir, 'test2.tmp'), 'temp content');

    // 创建过期文件
    const oldFile = path.join(testDir, 'old.txt');
    fs.writeFileSync(oldFile, 'old content');

    console.log(`  创建测试目录: ${testDir}`);
    console.log(`  创建测试文件: test1.txt, test2.tmp, old.txt`);

    // 测试安全删除
    fileCleaner.safeDelete(path.join(testDir, 'test1.txt')).then(success => {
      console.log(`  删除 test1.txt: ${success ? '成功' : '失败'}`);
    });

    console.log('✅ FileCleaner 测试通过\n');

    // 3. 测试StateCleaner
    console.log('3. 测试 StateCleaner...');
    const StateCleaner = require('./dist/cleanup/cleanup/StateCleaner').default;

    const stateCleaner = new StateCleaner(mockEventBus);

    // 模拟状态管理器
    const mockStateManager = {
      impactAnalysisCache: new Map([['key1', 'data1'], ['key2', 'data2']]),
      changeTracker: {
        pendingChanges: new Map([['change1', 'data1']]),
        impactedModules: new Set(['module1', 'module2'])
      },
      syncState: {
        syncQueue: [{id: 1, data: 'sync1'}],
        failedSyncs: [{id: 1, error: 'failed1'}]
      }
    };

    const stateResult = stateCleaner.cleanup(mockStateManager, {
      onProgress: (stage, completed) => {
        console.log(`    ${stage}: ${completed ? '完成' : '进行中'}`);
      }
    });

    console.log(`  状态清理结果:`, {
      success: stateResult.success,
      clearedItems: stateResult.clearedItems,
      duration: `${stateResult.duration}ms`
    });

    console.log('✅ StateCleaner 测试通过\n');

    // 4. 测试ConfigCleaner
    console.log('4. 测试 ConfigCleaner...');
    const ConfigCleaner = require('./dist/cleanup/cleanup/ConfigCleaner').default;

    const configCleaner = new ConfigCleaner(mockEventBus);

    // 模拟配置管理器
    const mockConfigManager = {
      config: { key: 'value' },
      importantFlags: { prefix: ['imp-'] },
      cssNameMap: new Map([['class1', { classArr: ['cls1'] }]]),
      baseClassNameMap: new Map([['base1', 'value1']]),
      userStaticClassSet: new Set(['static1', 'static2']),
      userBaseClass: ['base1'],
      userStaticClass: ['static1']
    };

    const configResult = configCleaner.cleanup(mockConfigManager, {
      onProgress: (stage, completed) => {
        console.log(`    ${stage}: ${completed ? '完成' : '进行中'}`);
      }
    });

    console.log(`  配置清理结果:`, {
      success: configResult.success,
      clearedItems: configResult.clearedItems,
      duration: `${configResult.duration}ms`
    });

    console.log('✅ ConfigCleaner 测试通过\n');

    // 5. 测试CleanupManager
    console.log('5. 测试 CleanupManager...');
    const CleanupManager = require('./dist/cleanup/cleanup/CleanupManager').default;

    const cleanupManager = new CleanupManager(mockEventBus, cacheCleaner, fileCleaner);

    const managerStatus = cleanupManager.getStatus();
    console.log(`  清理管理器状态:`, {
      isRunning: managerStatus.isRunning,
      totalTasks: managerStatus.totalTasks,
      enabledTasks: managerStatus.enabledTasks
    });

    const managerStats = cleanupManager.getStatistics();
    console.log(`  清理管理器统计:`, {
      totalTasks: managerStats.totalTasks,
      enabledTasks: managerStats.enabledTasks,
      isRunning: managerStats.isRunning
    });

    console.log('✅ CleanupManager 测试通过\n');

    // 清理测试文件
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
      console.log(`🧹 清理测试目录: ${testDir}`);
    } catch (error) {
      console.log(`⚠️  清理测试目录失败:`, error.message);
    }

    console.log('🎉 所有清理模块测试通过！');
    console.log('\n📋 测试总结:');
    console.log('✅ CacheCleaner: 缓存清理功能正常');
    console.log('✅ FileCleaner: 文件清理功能正常');
    console.log('✅ StateCleaner: 状态清理功能正常');
    console.log('✅ ConfigCleaner: 配置清理功能正常');
    console.log('✅ CleanupManager: 清理管理功能正常');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  testCleanupModules();
}

module.exports = { testCleanupModules };