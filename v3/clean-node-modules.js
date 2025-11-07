#!/usr/bin/env node

/**
 * 递归删除指定目录下的所有 node_modules 文件夹
 * 使用方法: node clean-node-modules.js [目录路径]
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 颜色输出函数
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

// 统计信息
let stats = {
  totalFound: 0,
  totalDeleted: 0,
  totalFailed: 0,
  totalSkipped: 0,
  totalSizeFreed: 0,
  startTime: Date.now(),
  scannedDirs: 0,
  lastProgressUpdate: 0
};

/**
 * 获取文件夹大小（优化版本，支持超时和进度显示）
 */
function getFolderSize(folderPath, timeout = 5000) {
  return new Promise((resolve) => {
    let totalSize = 0;
    let fileCount = 0;
    const startTime = Date.now();

    // 设置超时
    const timeoutId = setTimeout(() => {
      console.log(colors.yellow(`⚠️  计算大小超时: ${folderPath} (已检查 ${fileCount} 个文件)`));
      resolve(null); // 返回 null 表示超时
    }, timeout);

    try {
      const files = fs.readdirSync(folderPath);

      // 如果文件太多，先估算大小
      if (files.length > 1000) {
        clearTimeout(timeoutId);
        console.log(colors.yellow(`⚠️  文件过多 (${files.length})，跳过精确计算: ${folderPath}`));
        resolve(null);
        return;
      }

      const processFiles = () => {
        for (let i = 0; i < files.length; i++) {
          // 检查是否超时
          if (Date.now() - startTime > timeout) {
            clearTimeout(timeoutId);
            console.log(colors.yellow(`⚠️  计算大小超时: ${folderPath} (已检查 ${fileCount}/${files.length} 个文件)`));
            resolve(null);
            return;
          }

          const file = files[i];
          const filePath = path.join(folderPath, file);

          try {
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
              // 对于子目录，采用快速估算
              try {
                const subFiles = fs.readdirSync(filePath);
                totalSize += subFiles.length * 1024; // 估算每个文件 1KB
                fileCount++;
              } catch (e) {
                // 忽略无法访问的子目录
              }
            } else {
              totalSize += stat.size;
              fileCount++;
            }
          } catch (e) {
            // 忽略无法访问的文件
          }
        }

        clearTimeout(timeoutId);
        resolve(totalSize);
      };

      // 异步处理以避免阻塞
      setTimeout(processFiles, 0);

    } catch (error) {
      clearTimeout(timeoutId);
      resolve(null);
    }
  });
}

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * 删除文件夹（递归，增强错误处理）
 */
function removeFolder(folderPath) {
  try {
    // 检查文件夹是否存在
    if (!fs.existsSync(folderPath)) {
      return { success: false, error: 'Folder does not exist' };
    }

    // 检查是否为文件夹
    let stat;
    try {
      stat = fs.statSync(folderPath);
    } catch (statError) {
      return { success: false, error: `Cannot stat folder: ${statError.message}` };
    }

    if (!stat.isDirectory()) {
      return { success: false, error: 'Path is not a directory' };
    }

    // 递归删除文件和子文件夹
    let files;
    try {
      files = fs.readdirSync(folderPath);
    } catch (readError) {
      // 如果无法读取目录，尝试直接删除
      try {
        fs.rmdirSync(folderPath);
        return { success: true };
      } catch (rmdirError) {
        return { success: false, error: `Cannot read directory and cannot remove: ${readError.message}` };
      }
    }

    let hasErrors = false;
    let errorMessages = [];

    for (const file of files) {
      const filePath = path.join(folderPath, file);

      try {
        const fileStat = fs.statSync(filePath);

        if (fileStat.isDirectory()) {
          const result = removeFolder(filePath);
          if (!result.success) {
            hasErrors = true;
            errorMessages.push(`${filePath}: ${result.error}`);
          }
        } else {
          // 尝试删除文件
          try {
            fs.unlinkSync(filePath);
          } catch (unlinkError) {
            // 如果删除失败，可能是文件被占用，记录错误但继续
            hasErrors = true;
            errorMessages.push(`${filePath}: ${unlinkError.message}`);
          }
        }
      } catch (statError) {
        // 文件状态检查失败，可能是符号链接问题
        hasErrors = true;
        errorMessages.push(`${filePath}: Cannot stat - ${statError.message}`);

        // 尝试直接删除（可能是损坏的符号链接）
        try {
          fs.unlinkSync(filePath);
        } catch (directDeleteError) {
          // 忽略，继续处理其他文件
        }
      }
    }

    // 尝试删除空文件夹
    try {
      fs.rmdirSync(folderPath);

      if (hasErrors) {
        return {
          success: true,
          warnings: errorMessages.length,
          firstWarning: errorMessages[0]
        };
      }

      return { success: true };
    } catch (rmdirError) {
      return {
        success: false,
        error: `Cannot remove folder: ${rmdirError.message}`,
        warnings: errorMessages.length,
        warningMessages: errorMessages
      };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 检查是否有足够的权限删除文件
 */
function checkWritePermissions(folderPath) {
  try {
    // 尝试在目录中创建一个临时文件
    const testFile = path.join(folderPath, '.node_modules_cleaner_test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return { hasPermission: true };
  } catch (error) {
    return {
      hasPermission: false,
      error: error.message,
      suggestion: '请以管理员身份运行此脚本，或者关闭可能占用文件的程序（如IDE、终端等）'
    };
  }
}

/**
 * 创建同步输入接口（替代 readline-sync）
 */
function askQuestion(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * 显示进度信息
 */
function showProgress() {
  const now = Date.now();
  // 每秒最多更新一次进度
  if (now - stats.lastProgressUpdate < 1000) {
    return;
  }

  stats.lastProgressUpdate = now;
  const elapsed = ((now - stats.startTime) / 1000).toFixed(1);
  process.stdout.write(colors.blue(`\r⏳ 扫描中... 已扫描目录: ${stats.scannedDirs}, 发现: ${stats.totalFound}, 耗时: ${elapsed}s`));
}

/**
 * 递归扫描并删除 node_modules 文件夹
 */
async function scanAndDeleteNodeModules(dirPath, options = {}) {
  const {
    dryRun = false,
    maxSize = null, // 最大大小限制（字节），null表示无限制
    verbose = false,
    force = false
  } = options;

  try {
    stats.scannedDirs++;
    showProgress();

    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);

      // 如果是 node_modules 文件夹
      if (file === 'node_modules' && stat.isDirectory()) {
        stats.totalFound++;
        process.stdout.write('\r' + ' '.repeat(100) + '\r'); // 清除进度行

        try {
          const folderSize = await getFolderSize(fullPath);

          // 如果计算大小失败，使用默认值或跳过
          const displaySize = folderSize !== null ? folderSize : stat.size;

          // 检查大小限制
          if (maxSize && folderSize && folderSize > maxSize) {
            console.log(colors.yellow(`⚠️  跳过 (太大): ${fullPath} (${formatSize(displaySize)})`));
            stats.totalSkipped++;
            continue;
          }

          // 显示找到的文件夹
          const sizeText = folderSize !== null ? formatSize(displaySize) : `${formatSize(displaySize)} (估算)`;
          console.log(colors.cyan(`📦 发现: ${fullPath} (${sizeText})`));

          if (!dryRun) {
            // 确认删除（除非使用 --force）
            if (!force) {
              process.stdout.write(colors.yellow(`确认删除? [y/N]: `));
              const answer = await askQuestion('');

              if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
                console.log(colors.yellow('❌ 跳过'));
                stats.totalSkipped++;
                continue;
              }
            }

            // 检查权限（仅在第一个node_modules时检查）
            if (stats.totalFound === 1) {
              const parentDir = path.dirname(fullPath);
              const permissionCheck = checkWritePermissions(parentDir);
              if (!permissionCheck.hasPermission) {
                console.log(colors.yellow(`⚠️  权限警告: ${permissionCheck.suggestion}`));
              }
            }

            // 执行删除（带重试机制）
            console.log(colors.red(`🗑️  正在删除: ${fullPath}...`));
            let result = removeFolder(fullPath);
            let retryCount = 0;
            const maxRetries = 3;

            // 如果第一次失败，尝试重试
            while (!result.success && retryCount < maxRetries) {
              retryCount++;
              console.log(colors.yellow(`   重试 ${retryCount}/${maxRetries}...`));

              // 等待1秒再重试
              await new Promise(resolve => setTimeout(resolve, 1000));

              result = removeFolder(fullPath);
            }

            if (result.success) {
              const actualSize = folderSize !== null ? folderSize : displaySize;
              let successMessage = `✅ 删除成功: ${fullPath} (释放 ${formatSize(actualSize)})`;

              if (retryCount > 0) {
                successMessage += ` (重试 ${retryCount} 次)`;
              }

              if (result.warnings && result.warnings > 0) {
                console.log(colors.yellow(`⚠️  删除成功但有警告: ${successMessage.replace('✅', '⚠️')}`));
                console.log(colors.yellow(`   警告数量: ${result.warnings}`));
                if (verbose && result.firstWarning) {
                  console.log(colors.yellow(`   首个警告: ${result.firstWarning}`));
                }
              } else {
                console.log(colors.green(successMessage));
              }

              stats.totalDeleted++;
              stats.totalSizeFreed += actualSize;

              if (verbose) {
                console.log(colors.blue(`   详细信息: ${JSON.stringify(result)}`));
              }
            } else {
              console.log(colors.red(`❌ 删除失败: ${fullPath} (重试 ${retryCount} 次后仍失败)`));
              console.log(colors.red(`   错误: ${result.error}`));

              // 提供解决建议
              if (result.error.includes('EBUSY') || result.error.includes('ENOENT')) {
                console.log(colors.yellow(`   💡 建议: 请关闭可能占用文件的程序（如VS Code、WebStorm、终端等），然后重试`));
                console.log(colors.yellow(`   💡 或者以管理员身份运行此脚本`));
              }

              // 如果有警告信息，也显示出来
              if (result.warningMessages && result.warningMessages.length > 0) {
                console.log(colors.yellow(`   相关警告: ${result.warningMessages.slice(0, 3).join('; ')}`));
                if (result.warningMessages.length > 3) {
                  console.log(colors.yellow(`   ... 还有 ${result.warningMessages.length - 3} 个警告`));
                }
              }

              stats.totalFailed++;
            }
          } else {
            const actualSize = folderSize !== null ? folderSize : displaySize;
            console.log(colors.yellow(`🔍 [试运行] 将删除: ${fullPath} (${formatSize(actualSize)})`));
            stats.totalSizeFreed += actualSize;
          }

        } catch (sizeError) {
          console.log(colors.red(`❌ 获取大小失败: ${fullPath} - ${sizeError.message}`));
          stats.totalFailed++;
        }
      }

      // 如果是文件夹，递归扫描
      else if (stat.isDirectory()) {
        // 跳过一些常见的系统文件夹
        const skipFolders = ['.git', '.vscode', 'node_modules', '.idea', 'dist', 'build'];
        if (!skipFolders.includes(file)) {
          await scanAndDeleteNodeModules(fullPath, options);
        }
      }
    }
  } catch (error) {
    console.log(colors.red(`❌ 扫描失败: ${dirPath} - ${error.message}`));
  }
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(colors.bold('📦 Node_modules 清理工具\n'));
  console.log('使用方法:');
  console.log('  node clean-node-modules.js [选项] [目录路径]\n');
  console.log('选项:');
  console.log('  --dry-run, -d     试运行（只显示，不删除）');
  console.log('  --force, -f      强制删除（不询问确认）');
  console.log('  --max-size SIZE  最大删除大小限制（如: 500MB, 1GB）');
  console.log('  --verbose, -v    详细输出');
  console.log('  --help, -h       显示帮助信息\n');
  console.log('示例:');
  console.log('  node clean-node-modules.js ./');
  console.log('  node clean-node-modules.js --dry-run --force ./projects');
  console.log('  node clean-node-modules.js --max-size 500MB ./workspace');
}

/**
 * 解析大小字符串
 */
function parseSize(sizeStr) {
  const units = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024,
    'TB': 1024 * 1024 * 1024 * 1024
  };

  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)$/i);
  if (!match) {
    return null;
  }

  const [, size, unit] = match;
  return parseFloat(size) * units[unit.toUpperCase()];
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);

  // 解析参数
  const options = {
    dryRun: false,
    force: false,
    verbose: false,
    maxSize: null
  };

  let targetPath = './';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--dry-run':
      case '-d':
        options.dryRun = true;
        break;
      case '--force':
      case '-f':
        options.force = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        return;
      case '--max-size':
        i++;
        const size = parseSize(args[i]);
        if (size === null) {
          console.error(colors.red('❌ 无效的大小格式: ' + args[i]));
          process.exit(1);
        }
        options.maxSize = size;
        break;
      default:
        if (!arg.startsWith('-')) {
          targetPath = arg;
        } else {
          console.error(colors.red('❌ 未知参数: ' + arg));
          console.log(colors.cyan('使用 --help 查看帮助信息'));
          process.exit(1);
        }
    }
  }

  // 检查目标路径是否存在
  const absolutePath = path.resolve(targetPath);
  if (!fs.existsSync(absolutePath)) {
    console.error(colors.red(`❌ 路径不存在: ${absolutePath}`));
    process.exit(1);
  }

  // 开始扫描
  console.log(colors.bold('🔍 开始扫描 node_modules 文件夹...\n'));
  console.log(colors.blue(`📁 目标路径: ${absolutePath}`));
  console.log(colors.blue(`🔧 模式: ${options.dryRun ? '试运行' : '实际删除'}`));
  console.log(colors.blue(`⚡ 强制模式: ${options.force ? '是' : '否'}`));
  if (options.maxSize) {
    console.log(colors.blue(`📏 最大大小限制: ${formatSize(options.maxSize)}`));
  }
  console.log('');

  await scanAndDeleteNodeModules(absolutePath, options);

  // 显示统计信息
  const endTime = Date.now();
  const duration = ((endTime - stats.startTime) / 1000).toFixed(2);

  console.log('\n' + colors.bold('📊 扫完成绩统计:\n'));
  console.log(colors.blue(`📁 扫描目录数: ${stats.scannedDirs}`));
  console.log(colors.green(`✅ 发现数量: ${stats.totalFound}`));
  console.log(colors.green(`✅ 删除成功: ${stats.totalDeleted}`));
  console.log(colors.red(`❌ 删除失败: ${stats.totalFailed}`));
  console.log(colors.yellow(`⚠️  跳过数量: ${stats.totalSkipped}`));
  console.log(colors.cyan(`💾 释放空间: ${formatSize(stats.totalSizeFreed)}`));
  console.log(colors.blue(`⏱️  执行时间: ${duration}s`));

  if (options.dryRun) {
    console.log('\n' + colors.yellow('💡 这是试运行模式，没有实际删除文件'));
    console.log(colors.cyan('   如要实际删除，请移除 --dry-run 参数'));
  }

  // 退出码
  if (stats.totalFailed > 0) {
    process.exit(1);
  } else {
    console.log('\n' + colors.green('🎉 清理完成！'));
    process.exit(0);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  scanAndDeleteNodeModules,
  getFolderSize,
  removeFolder,
  formatSize
};