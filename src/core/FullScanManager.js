const path = require('path');
const fs = require('fs').promises;

class FullScanManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.classListSet = new Set();
    this.userStaticClassListSet = new Set();
    this.isLocked = false;
    this.scanTime = null;
    this.fileDataMap = new Map(); // 存储每个文件的样式数据
    
    // 引用计数：用于防止共享 class 被误删
    this.classRefCount = new Map(); // className -> count
    this.staticRefCount = new Map(); // staticClassName -> count
    
    // 基线 class 集合（增量模式下从输出文件加载的 class，不应被删除）
    this.baselineClassSet = new Set();
    this.baselineStaticClassSet = new Set();
    
    // 增量模式开关（运行期新增 class 是否自动加入 baseline）
    this.incrementalMode = false;
  }

  // 全量扫描所有文件
  async performFullScan(watchPath, fileTypes, classParser, cacheManager, preserveBaseline = true) {
    try {
      const watchPaths = Array.isArray(watchPath) ? watchPath : [watchPath];
      this.eventBus.emit('fullScan:started', { watchPath: watchPaths, fileTypes });

      // 清空现有数据
      if (preserveBaseline) {
        // 保留基线 class
        const baselineClasses = Array.from(this.baselineClassSet);
        const baselineStaticClasses = Array.from(this.baselineStaticClassSet);
        
        this.classListSet.clear();
        this.userStaticClassListSet.clear();
        this.fileDataMap.clear();
        this.classRefCount.clear();
        this.staticRefCount.clear();
        
        // 恢复基线 class
        for (const cls of baselineClasses) {
          this.classListSet.add(cls);
          this.classRefCount.set(cls, 0);
        }
        for (const cls of baselineStaticClasses) {
          this.userStaticClassListSet.add(cls);
          this.staticRefCount.set(cls, 0);
        }
      } else {
        // 不保留基线，完全清空（用于重建场景）
        this.classListSet.clear();
        this.userStaticClassListSet.clear();
        this.fileDataMap.clear();
        this.classRefCount.clear();
        this.staticRefCount.clear();
        this.baselineClassSet.clear();
        this.baselineStaticClassSet.clear();
      }

      // 扫描所有文件（支持多目录/多文件）
      const files = await this.scanTargets(watchPaths, fileTypes);
      this.eventBus.emit('fullScan:filesFound', { count: files.length, files });

      let processedCount = 0;
      const totalFiles = files.length;

      for (const filePath of files) {
        try {
          const classInfo = await classParser.parseFile(filePath, cacheManager);
          if (classInfo) {
            this.updateFileData(filePath, classInfo);
          }
          processedCount++;

          // 进度报告
          if (processedCount % 10 === 0 || processedCount === totalFiles) {
            this.eventBus.emit('fullScan:progress', {
              processed: processedCount,
              total: totalFiles,
              percentage: Math.round((processedCount / totalFiles) * 100),
            });
          }
        } catch (error) {
          this.eventBus.emit('fullScan:fileError', { filePath, error: error.message });
        }
      }

      // 锁定数据
      this.lockData();

      this.eventBus.emit('fullScan:completed', {
        totalFiles,
        processedFiles: processedCount,
        classCount: this.classListSet.size,
        staticClassCount: this.userStaticClassListSet.size,
      });

      return {
        success: true,
        classCount: this.classListSet.size,
        staticClassCount: this.userStaticClassListSet.size,
        fileCount: processedCount,
      };
    } catch (error) {
      this.eventBus.emit('fullScan:error', { error: error.message });
      throw error;
    }
  }

  // 扫描多个入口（目录/文件）获取所有匹配的文件
  async scanTargets(targetPaths, fileTypes) {
    const files = [];
    const seen = new Set();

    const addFile = (fp) => {
      const norm = path.normalize(fp);
      if (!seen.has(norm)) {
        seen.add(norm);
        files.push(norm);
      }
    };

    const scanDir = async (dirPath) => {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          if (entry.isDirectory()) {
            await scanDir(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).slice(1).toLowerCase();
            if (fileTypes.includes(ext)) {
              addFile(fullPath);
            }
          }
        }
      } catch (error) {
        this.eventBus.emit('fullScan:dirError', { dirPath, error: error.message });
      }
    };

    for (const target of targetPaths.filter(Boolean)) {
      try {
        const stat = await fs.stat(target);
        if (stat.isDirectory()) {
          await scanDir(target);
        } else if (stat.isFile()) {
          const ext = path.extname(target).slice(1).toLowerCase();
          if (fileTypes.includes(ext)) {
            addFile(target);
          }
        }
      } catch (error) {
        // 入口不存在/不可访问：记录但不中断
        this.eventBus.emit('fullScan:dirError', { dirPath: target, error: error.message });
      }
    }

    return files;
  }

  // 更新单个文件的数据
  updateFileData(filePath, classInfo) {
    // 移除旧的文件数据（使用引用计数）
    if (this.fileDataMap.has(filePath)) {
      const oldData = this.fileDataMap.get(filePath);
      
      // 对旧数据的每个 class 减少引用计数
      for (const cls of oldData.classArr) {
        // 如果是基线 class，不删除
        if (this.baselineClassSet.has(cls)) {
          continue;
        }
        
        const count = (this.classRefCount.get(cls) || 0) - 1;
        if (count <= 0) {
          this.classRefCount.delete(cls);
          this.classListSet.delete(cls);
        } else {
          this.classRefCount.set(cls, count);
        }
      }
      
      for (const cls of oldData.userStaticClassArr) {
        // 如果是基线 class，不删除
        if (this.baselineStaticClassSet.has(cls)) {
          continue;
        }
        
        const count = (this.staticRefCount.get(cls) || 0) - 1;
        if (count <= 0) {
          this.staticRefCount.delete(cls);
          this.userStaticClassListSet.delete(cls);
        } else {
          this.staticRefCount.set(cls, count);
        }
      }
    }

    // 添加新的文件数据（使用引用计数）
    this.fileDataMap.set(filePath, classInfo);
    
    for (const cls of classInfo.classArr) {
      const count = (this.classRefCount.get(cls) || 0) + 1;
      this.classRefCount.set(cls, count);
      this.classListSet.add(cls);
      
      // 增量模式下，新增的 class 自动加入 baseline（保证只增不删）
      if (this.incrementalMode) {
        this.baselineClassSet.add(cls);
      }
    }
    
    for (const cls of classInfo.userStaticClassArr) {
      const count = (this.staticRefCount.get(cls) || 0) + 1;
      this.staticRefCount.set(cls, count);
      this.userStaticClassListSet.add(cls);
      
      // 增量模式下，新增的 class 自动加入 baseline（保证只增不删）
      if (this.incrementalMode) {
        this.baselineStaticClassSet.add(cls);
      }
    }

    this.eventBus.emit('fullScan:fileUpdated', {
      filePath,
      classCount: classInfo.classArr.length,
      staticClassCount: classInfo.userStaticClassArr.length,
      totalClassCount: this.classListSet.size,
      totalStaticClassCount: this.userStaticClassListSet.size,
    });
  }

  // 移除文件数据（使用引用计数）
  removeFileData(filePath) {
    if (this.fileDataMap.has(filePath)) {
      const data = this.fileDataMap.get(filePath);
      
      // 对每个 class 减少引用计数
      for (const cls of data.classArr) {
        // 如果是基线 class，不删除
        if (this.baselineClassSet.has(cls)) {
          continue;
        }
        
        const count = (this.classRefCount.get(cls) || 0) - 1;
        if (count <= 0) {
          this.classRefCount.delete(cls);
          this.classListSet.delete(cls);
        } else {
          this.classRefCount.set(cls, count);
        }
      }
      
      for (const cls of data.userStaticClassArr) {
        // 如果是基线 class，不删除
        if (this.baselineStaticClassSet.has(cls)) {
          continue;
        }
        
        const count = (this.staticRefCount.get(cls) || 0) - 1;
        if (count <= 0) {
          this.staticRefCount.delete(cls);
          this.userStaticClassListSet.delete(cls);
        } else {
          this.staticRefCount.set(cls, count);
        }
      }
      
      this.fileDataMap.delete(filePath);

      this.eventBus.emit('fullScan:fileRemoved', {
        filePath,
        totalClassCount: this.classListSet.size,
        totalStaticClassCount: this.userStaticClassListSet.size,
      });
    }
  }

  // 锁定数据
  lockData() {
    this.isLocked = true;
    this.scanTime = Date.now();
    this.eventBus.emit('fullScan:dataLocked', {
      scanTime: this.scanTime,
      classCount: this.classListSet.size,
      staticClassCount: this.userStaticClassListSet.size,
    });
  }

  // 解锁数据
  unlockData() {
    this.isLocked = false;
    this.scanTime = null;
    this.eventBus.emit('fullScan:dataUnlocked');
  }

  // 获取合并后的完整数据
  getMergedData() {
    return {
      classListSet: new Set(this.classListSet),
      userStaticClassListSet: new Set(this.userStaticClassListSet),
      isLocked: this.isLocked,
      scanTime: this.scanTime,
      fileCount: this.fileDataMap.size,
    };
  }

  // 添加基线 class（用于增量模式：从输出文件加载已存在的 class）
  addBaselineClasses(classList, staticClassList) {
    for (const cls of classList) {
      this.baselineClassSet.add(cls);
      if (!this.classListSet.has(cls)) {
        this.classListSet.add(cls);
        this.classRefCount.set(cls, 0); // 基线 class 引用计数为 0，但通过 baselineClassSet 保护
      }
    }
    
    for (const cls of staticClassList) {
      this.baselineStaticClassSet.add(cls);
      if (!this.userStaticClassListSet.has(cls)) {
        this.userStaticClassListSet.add(cls);
        this.staticRefCount.set(cls, 0); // 基线 class 引用计数为 0，但通过 baselineStaticClassSet 保护
      }
    }
    
    this.eventBus.emit('fullScan:baselineAdded', {
      classCount: classList.length,
      staticClassCount: staticClassList.length,
      totalClassCount: this.classListSet.size,
      totalStaticClassCount: this.userStaticClassListSet.size,
    });
  }

  // 设置增量模式开关（运行期新增 class 是否自动加入 baseline，从而“只增不删”）
  setIncrementalMode(enabled) {
    this.incrementalMode = !!enabled;
    if (this.eventBus && typeof this.eventBus.emit === 'function') {
      this.eventBus.emit('fullScan:incrementalModeChanged', { enabled: this.incrementalMode });
    }
  }

  // 获取统计信息
  getStats() {
    return {
      isLocked: this.isLocked,
      scanTime: this.scanTime,
      classCount: this.classListSet.size,
      staticClassCount: this.userStaticClassListSet.size,
      fileCount: this.fileDataMap.size,
      timeSinceLastScan: this.scanTime ? Date.now() - this.scanTime : null,
    };
  }

  // 检查是否需要等待数据锁定
  async waitForDataLock(maxRetries = 5, retryDelay = 200) {
    let retryCount = 0;

    while (!this.isLocked && retryCount < maxRetries) {
      this.eventBus.emit('fullScan:waitingForLock', { retryCount, maxRetries });
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      retryCount++;
    }

    return this.isLocked;
  }

  // 验证数据完整性
  validateData() {
    const errors = [];
    const warnings = [];

    if (this.classListSet.size === 0 && this.userStaticClassListSet.size === 0) {
      warnings.push('No style classes found in scan data');
    }

    if (this.fileDataMap.size === 0) {
      errors.push('No files processed in scan data');
    }

    // 检查数据一致性
    let totalClassCount = 0;
    let totalStaticCount = 0;

    for (const [filePath, data] of this.fileDataMap.entries()) {
      totalClassCount += data.classArr.length;
      totalStaticCount += data.userStaticClassArr.length;
    }

    if (totalClassCount !== this.classListSet.size) {
      warnings.push(
        `Class count mismatch: expected ${totalClassCount}, got ${this.classListSet.size}`
      );
    }

    if (totalStaticCount !== this.userStaticClassListSet.size) {
      warnings.push(
        `Static class count mismatch: expected ${totalStaticCount}, got ${this.userStaticClassListSet.size}`
      );
    }

    return { errors, warnings, isValid: errors.length === 0 };
  }

  // 调试信息
  debug() {
    return {
      stats: this.getStats(),
      validation: this.validateData(),
      sampleClasses: Array.from(this.classListSet).slice(0, 10),
      sampleStaticClasses: Array.from(this.userStaticClassListSet).slice(0, 10),
      fileDataMap: Object.fromEntries(
        Array.from(this.fileDataMap.entries()).map(([path, data]) => [
          path,
          {
            classCount: data.classArr.length,
            staticCount: data.userStaticClassArr.length,
          },
        ])
      ),
    };
  }
}

module.exports = FullScanManager;
