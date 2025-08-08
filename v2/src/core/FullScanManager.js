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
  }

  // 全量扫描所有文件
  async performFullScan(watchPath, fileTypes, classParser, cacheManager) {
    try {
      this.eventBus.emit('fullScan:started', { watchPath, fileTypes });
      
      // 清空现有数据
      this.classListSet.clear();
      this.userStaticClassListSet.clear();
      this.fileDataMap.clear();
      
      // 扫描所有文件
      const files = await this.scanDirectory(watchPath, fileTypes);
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
              percentage: Math.round((processedCount / totalFiles) * 100)
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
        staticClassCount: this.userStaticClassListSet.size
      });
      
      return {
        success: true,
        classCount: this.classListSet.size,
        staticClassCount: this.userStaticClassListSet.size,
        fileCount: processedCount
      };
      
    } catch (error) {
      this.eventBus.emit('fullScan:error', { error: error.message });
      throw error;
    }
  }

  // 扫描目录获取所有匹配的文件
  async scanDirectory(watchPath, fileTypes) {
    const files = [];
    
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
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        this.eventBus.emit('fullScan:dirError', { dirPath, error: error.message });
      }
    };
    
    await scanDir(watchPath);
    return files;
  }

  // 更新单个文件的数据
  updateFileData(filePath, classInfo) {
    // 移除旧的文件数据
    if (this.fileDataMap.has(filePath)) {
      const oldData = this.fileDataMap.get(filePath);
      oldData.classArr.forEach(cls => this.classListSet.delete(cls));
      oldData.userStaticClassArr.forEach(cls => this.userStaticClassListSet.delete(cls));
    }
    
    // 添加新的文件数据
    this.fileDataMap.set(filePath, classInfo);
    classInfo.classArr.forEach(cls => this.classListSet.add(cls));
    classInfo.userStaticClassArr.forEach(cls => this.userStaticClassListSet.add(cls));
    
    this.eventBus.emit('fullScan:fileUpdated', {
      filePath,
      classCount: classInfo.classArr.length,
      staticClassCount: classInfo.userStaticClassArr.length,
      totalClassCount: this.classListSet.size,
      totalStaticClassCount: this.userStaticClassListSet.size
    });
  }

  // 移除文件数据
  removeFileData(filePath) {
    if (this.fileDataMap.has(filePath)) {
      const data = this.fileDataMap.get(filePath);
      data.classArr.forEach(cls => this.classListSet.delete(cls));
      data.userStaticClassArr.forEach(cls => this.userStaticClassListSet.delete(cls));
      this.fileDataMap.delete(filePath);
      
      this.eventBus.emit('fullScan:fileRemoved', {
        filePath,
        totalClassCount: this.classListSet.size,
        totalStaticClassCount: this.userStaticClassListSet.size
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
      staticClassCount: this.userStaticClassListSet.size
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
      fileCount: this.fileDataMap.size
    };
  }

  // 获取统计信息
  getStats() {
    return {
      isLocked: this.isLocked,
      scanTime: this.scanTime,
      classCount: this.classListSet.size,
      staticClassCount: this.userStaticClassListSet.size,
      fileCount: this.fileDataMap.size,
      timeSinceLastScan: this.scanTime ? Date.now() - this.scanTime : null
    };
  }

  // 检查是否需要等待数据锁定
  async waitForDataLock(maxRetries = 5, retryDelay = 200) {
    let retryCount = 0;
    
    while (!this.isLocked && retryCount < maxRetries) {
      this.eventBus.emit('fullScan:waitingForLock', { retryCount, maxRetries });
      await new Promise(resolve => setTimeout(resolve, retryDelay));
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
      warnings.push(`Class count mismatch: expected ${totalClassCount}, got ${this.classListSet.size}`);
    }
    
    if (totalStaticCount !== this.userStaticClassListSet.size) {
      warnings.push(`Static class count mismatch: expected ${totalStaticCount}, got ${this.userStaticClassListSet.size}`);
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
            staticCount: data.userStaticClassArr.length
          }
        ])
      )
    };
  }
}

module.exports = FullScanManager;