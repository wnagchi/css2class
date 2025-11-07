#!/usr/bin/env node

const { Class2CSS } = require('./dist');

async function demonstrateCleanup() {
  console.log('🧹 演示清理功能...\n');

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

    // 演示1: 获取清理状态
    console.log('\n📊 获取清理管理器状态...');
    const cleanupStatus = class2css.getCleanupStatus();
    console.log('清理管理器状态:', {
      isRunning: cleanupStatus.isRunning,
      totalTasks: cleanupStatus.totalTasks,
      enabledTasks: cleanupStatus.enabledTasks,
      currentTask: cleanupStatus.currentTask?.name || '无',
    });

    // 演示2: 获取清理统计
    console.log('\n📈 获取清理统计信息...');
    const cleanupStats = class2css.getCleanupStatistics();
    console.log('清理统计:', {
      totalTasks: cleanupStats.totalTasks,
      enabledTasks: cleanupStats.enabledTasks,
      cacheStats: {
        size: cleanupStats.cacheStats.size,
        hitRate: cleanupStats.cacheStats.hitRate,
        memoryUsage: cleanupStats.cacheStats.memoryUsage,
      },
    });

    // 演示3: 快速清理（dry-run模式）
    console.log('\n🧹 执行快速清理 (dry-run模式)...');
    const quickCleanupResult = await class2css.quickCleanup({
      dryRun: true,
      includeCache: true,
      includeFiles: false,
      onProgress: (stage, progress) => {
        console.log(`  进度: ${stage} (${progress}%)`);
      },
    });

    console.log('快速清理结果:', {
      success: quickCleanupResult.success,
      duration: `${quickCleanupResult.duration}ms`,
      summary: quickCleanupResult.summary,
    });

    // 演示4: 执行特定清理任务
    console.log('\n🗂️ 执行缓存过期清理任务...');
    const cacheCleanupResult = await class2css.executeCleanupTask('cache-expired', {
      dryRun: true,
      onProgress: (stage, progress) => {
        console.log(`  ${stage}: ${progress}%`);
      },
    });

    if (cacheCleanupResult.success) {
      console.log('✅ 缓存清理任务执行成功');
      console.log(`  清理了 ${cacheCleanupResult.summary.totalDeleted} 项`);
      console.log(`  释放空间: ${formatBytes(cacheCleanupResult.summary.totalFreedSpace)}`);
    } else {
      console.log('❌ 缓存清理任务执行失败:', cacheCleanupResult.errors);
    }

    // 演示5: 临时文件清理（如果存在temp目录）
    console.log('\n📁 检查临时文件清理...');
    const fs = require('fs');
    const path = require('path');

    const tempDirs = ['./temp', './cache', './logs'];
    const existingTempDirs = tempDirs.filter(dir => {
      try {
        return fs.statSync(dir).isDirectory();
      } catch {
        return false;
      }
    });

    if (existingTempDirs.length > 0) {
      console.log(`发现临时目录: ${existingTempDirs.join(', ')}`);

      const tempCleanupResult = await class2css.cleanupTempFiles(existingTempDirs, {
        dryRun: true,
        maxAge: 60 * 60 * 1000, // 1小时
        onProgress: (processed, total, currentFile) => {
          console.log(`  处理文件: ${currentFile}`);
        },
      });

      console.log('临时文件清理结果:', {
        success: tempCleanupResult.success,
        deletedCount: tempCleanupResult.deletedCount,
        freedSpace: formatBytes(tempCleanupResult.freedSpace),
      });
    } else {
      console.log('  未发现临时目录，跳过临时文件清理演示');
    }

    // 演示6: 获取所有清理任务
    console.log('\n📋 获取所有清理任务...');
    // 这里需要通过内部方式获取，因为API没有暴露
    console.log('  预定义的清理任务包括:');
    console.log('  - cache-expired: 清理过期缓存');
    console.log('  - cache-smart: 智能缓存清理');
    console.log('  - temp-files: 清理临时文件');
    console.log('  - log-files: 清理日志文件');

    console.log('\n🎉 清理功能演示完成！');

    // 显示功能总结
    console.log('\n📋 功能总结:');
    console.log('✅ 缓存清理: 支持LRU、过期、智能清理');
    console.log('✅ 文件清理: 支持过期文件、临时文件、空目录清理');
    console.log('✅ 状态清理: 支持状态缓存和临时数据清理');
    console.log('✅ 配置清理: 支持配置缓存和安全清理');
    console.log('✅ 任务管理: 支持定时任务和批量操作');
    console.log('✅ 安全模式: 支持dry-run模式避免误删除');
    console.log('✅ 进度监控: 支持详细的进度回调和统计');

  } catch (error) {
    console.error('❌ 演示过程中出现错误:', error);
    process.exit(1);
  }
}

// 辅助函数：格式化字节大小
function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// 检查是否已构建
if (!require('fs').existsSync('./dist')) {
  console.log('❌ 未找到dist目录，请先运行 npm run build');
  process.exit(1);
}

// 运行演示
if (require.main === module) {
  demonstrateCleanup().catch(console.error);
}

module.exports = { demonstrateCleanup };