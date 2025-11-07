const path = require('path');
const fs = require('fs').promises;

class FileUtils {
  constructor(eventBus) {
    this.eventBus = eventBus;
  }

  // 文件信息提取
  getFileInfo(filePath) {
    try {
      const fileName = path.basename(filePath);
      const fileType = path.extname(filePath).substring(1);
      const fileDir = path.dirname(filePath);
      const fileTName = path.basename(filePath, path.extname(filePath));

      return {
        fileName,
        fileType,
        filePath: fileDir,
        fileTName,
        path: filePath,
        fullPath: path.resolve(filePath),
      };
    } catch (error) {
      this.eventBus.emit('fileUtils:error', { operation: 'getFileInfo', filePath, error });
      return null;
    }
  }

  // 路径标准化
  normalizePath(filePath) {
    return filePath.replace(/\\/g, '/');
  }

  // 路径合并
  joinPaths(...paths) {
    return path.join(...paths).replace(/\\/g, '/');
  }

  // 文件存在检查
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // 目录存在检查
  async directoryExists(dirPath) {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  // 创建目录
  async createDirectory(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      this.eventBus.emit('fileUtils:directory:created', dirPath);
      return true;
    } catch (error) {
      this.eventBus.emit('fileUtils:error', { operation: 'createDirectory', dirPath, error });
      return false;
    }
  }

  // 读取文件
  async readFile(filePath, encoding = 'utf-8') {
    try {
      const content = await fs.readFile(filePath, encoding);
      this.eventBus.emit('fileUtils:file:read', filePath);
      return content;
    } catch (error) {
      this.eventBus.emit('fileUtils:error', { operation: 'readFile', filePath, error });
      return null;
    }
  }

  // 写入文件
  async writeFile(filePath, content, encoding = 'utf-8') {
    try {
      // 确保目录存在
      const dirPath = path.dirname(filePath);
      await this.createDirectory(dirPath);

      await fs.writeFile(filePath, content, encoding);
      this.eventBus.emit('fileUtils:file:written', filePath);
      return true;
    } catch (error) {
      this.eventBus.emit('fileUtils:error', { operation: 'writeFile', filePath, error });
      return false;
    }
  }

  // 获取文件统计信息
  async getFileStats(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        mtime: stats.mtime,
        ctime: stats.ctime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      };
    } catch (error) {
      this.eventBus.emit('fileUtils:error', { operation: 'getFileStats', filePath, error });
      return null;
    }
  }

  // 文件类型检查
  isHtmlFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ['.html', '.htm'].includes(ext);
  }

  isWxmlFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.wxml';
  }

  isSupportedFile(filePath, supportedTypes = ['html', 'wxml']) {
    const ext = path.extname(filePath).toLowerCase().substring(1);
    return supportedTypes.includes(ext);
  }

  // 路径模式匹配
  matchPathPattern(filePath, patterns) {
    const normalizedPath = this.normalizePath(filePath);

    return patterns.some((pattern) => {
      // 简单的通配符匹配
      const regexPattern = pattern.replace(/\\/g, '/').replace(/\*/g, '.*').replace(/\?/g, '.');

      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(normalizedPath);
    });
  }

  // 相对路径计算
  getRelativePath(fromPath, toPath) {
    try {
      return path.relative(fromPath, toPath).replace(/\\/g, '/');
    } catch (error) {
      this.eventBus.emit('fileUtils:error', {
        operation: 'getRelativePath',
        fromPath,
        toPath,
        error,
      });
      return toPath;
    }
  }

  // 绝对路径转换
  getAbsolutePath(filePath, basePath = process.cwd()) {
    try {
      return path.resolve(basePath, filePath).replace(/\\/g, '/');
    } catch (error) {
      this.eventBus.emit('fileUtils:error', {
        operation: 'getAbsolutePath',
        filePath,
        basePath,
        error,
      });
      return filePath;
    }
  }

  // 文件扩展名处理
  changeExtension(filePath, newExt) {
    const ext = path.extname(filePath);
    const basePath = filePath.substring(0, filePath.length - ext.length);
    return `${basePath}${newExt.startsWith('.') ? newExt : `.${newExt}`}`;
  }

  // 批量文件操作
  async batchProcess(files, processor, options = {}) {
    const results = [];
    const { concurrency = 5, onProgress } = options;

    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      const batchPromises = batch.map(async (file) => {
        try {
          const result = await processor(file);
          return { file, success: true, result };
        } catch (error) {
          return { file, success: false, error };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      if (onProgress) {
        onProgress(i + batch.length, files.length);
      }
    }

    this.eventBus.emit('fileUtils:batch:completed', { totalFiles: files.length, results });
    return results;
  }

  // 文件监控辅助
  getFileChangeType(oldStats, newStats) {
    if (!oldStats || !newStats) {
      return 'unknown';
    }

    if (oldStats.mtime.getTime() !== newStats.mtime.getTime()) {
      return 'modified';
    }

    if (oldStats.size !== newStats.size) {
      return 'size_changed';
    }

    return 'unchanged';
  }
}

module.exports = FileUtils;
