import { promises as fs } from 'fs';
import * as path from 'path';
import { EventBus } from '../core/EventBus';

interface FileCleanupOptions {
  dryRun?: boolean;
  recursive?: boolean;
  pattern?: RegExp;
  maxAge?: number;
  force?: boolean;
  onProgress?: (processed: number, total: number, currentFile: string) => void;
}

interface CleanupResult {
  success: boolean;
  deletedCount: number;
  deletedFiles: string[];
  errors: string[];
  freedSpace: number;
  duration: number;
}

interface FileInfo {
  path: string;
  size: number;
  mtime: Date;
  isDirectory: boolean;
}

export default class FileCleaner {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  // 安全删除文件或目录
  async safeDelete(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);

      if (stats.isDirectory()) {
        // 递归删除目录
        await fs.rmdir(filePath, { recursive: true });
      } else {
        // 删除文件
        await fs.unlink(filePath);
      }

      this.eventBus.emit('fileCleaner:deleted', { filePath });
      return true;
    } catch (error) {
      this.eventBus.emit('fileCleaner:error', {
        operation: 'safeDelete',
        filePath,
        error
      });
      return false;
    }
  }

  // 获取文件信息
  private async getFileInfo(filePath: string): Promise<FileInfo | null> {
    try {
      const stats = await fs.stat(filePath);
      return {
        path: filePath,
        size: stats.size,
        mtime: stats.mtime,
        isDirectory: stats.isDirectory(),
      };
    } catch (error) {
      return null;
    }
  }

  // 扫描目录
  private async scanDirectory(
    dirPath: string,
    pattern?: RegExp,
    recursive: boolean = true
  ): Promise<FileInfo[]> {
    const files: FileInfo[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory() && recursive) {
          const subFiles = await this.scanDirectory(fullPath, pattern, recursive);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          if (!pattern || pattern.test(entry.name)) {
            const fileInfo = await this.getFileInfo(fullPath);
            if (fileInfo) {
              files.push(fileInfo);
            }
          }
        }
      }
    } catch (error) {
      this.eventBus.emit('fileCleaner:error', {
        operation: 'scanDirectory',
        dirPath,
        error
      });
    }

    return files;
  }

  // 清理过期文件
  async cleanupExpiredFiles(
    targetPath: string,
    options: FileCleanupOptions = {}
  ): Promise<CleanupResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const deletedFiles: string[] = [];
    let deletedCount = 0;
    let freedSpace = 0;

    try {
      const {
        dryRun = false,
        recursive = true,
        pattern,
        maxAge = 24 * 60 * 60 * 1000, // 默认24小时
        force = false,
        onProgress
      } = options;

      const stats = await fs.stat(targetPath);
      let filesToClean: FileInfo[] = [];

      if (stats.isDirectory()) {
        filesToClean = await this.scanDirectory(targetPath, pattern, recursive);
      } else if (stats.isFile() && (!pattern || pattern.test(path.basename(targetPath)))) {
        const fileInfo = await this.getFileInfo(targetPath);
        if (fileInfo) {
          filesToClean = [fileInfo];
        }
      }

      // 过滤过期文件
      const now = Date.now();
      const expiredFiles = filesToClean.filter(file =>
        now - file.mtime.getTime() > maxAge
      );

      // 删除过期文件
      for (let i = 0; i < expiredFiles.length; i++) {
        const file = expiredFiles[i];
        if (!file) continue;

        if (onProgress) {
          onProgress(i, expiredFiles.length, file.path);
        }

        try {
          if (!dryRun) {
            const success = await this.safeDelete(file.path);
            if (success) {
              deletedCount++;
              deletedFiles.push(file.path);
              freedSpace += file.size;
            }
          } else {
            // Dry run模式，只记录将要删除的文件
            deletedCount++;
            deletedFiles.push(file.path);
            freedSpace += file.size;
          }

          this.eventBus.emit('fileCleaner:file:processed', {
            file: file.path,
            deleted: !dryRun,
            size: file.size,
          });
        } catch (error) {
          const errorMsg = `Failed to delete ${file.path}: ${error}`;
          errors.push(errorMsg);
          this.eventBus.emit('fileCleaner:file:error', {
            file: file.path,
            error
          });
        }
      }

      const result: CleanupResult = {
        success: errors.length === 0,
        deletedCount,
        deletedFiles,
        errors,
        freedSpace,
        duration: Date.now() - startTime,
      };

      this.eventBus.emit('fileCleaner:expired:completed', {
        targetPath,
        result,
        dryRun,
      });

      return result;
    } catch (error) {
      const errorMsg = `Expired files cleanup failed: ${error}`;
      errors.push(errorMsg);
      this.eventBus.emit('fileCleaner:expired:error', {
        targetPath,
        error: errorMsg
      });

      return {
        success: false,
        deletedCount,
        deletedFiles,
        errors,
        freedSpace,
        duration: Date.now() - startTime,
      };
    }
  }

  // 清理临时文件
  async cleanupTempFiles(
    basePaths: string[],
    options: FileCleanupOptions = {}
  ): Promise<CleanupResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const deletedFiles: string[] = [];
    let deletedCount = 0;
    let freedSpace = 0;

    try {
      const tempPatterns = [
        /\.tmp$/i,
        /\.temp$/i,
        /^\.~.*$/i,
        /~$/i,
        /\.bak$/i,
        /\.backup$/i,
        /\.swp$/i,
        /\.log$/i,
      ];

      for (const basePath of basePaths) {
        try {
          const stats = await fs.stat(basePath);

          if (stats.isDirectory()) {
            for (const pattern of tempPatterns) {
              const result = await this.cleanupExpiredFiles(basePath, {
                ...options,
                pattern,
                maxAge: options.maxAge || 60 * 60 * 1000, // 默认1小时
              });

              deletedCount += result.deletedCount;
              deletedFiles.push(...result.deletedFiles);
              freedSpace += result.freedSpace;
              errors.push(...result.errors);
            }
          }
        } catch (error) {
          const errorMsg = `Failed to process path ${basePath}: ${error}`;
          errors.push(errorMsg);
        }
      }

      const result: CleanupResult = {
        success: errors.length === 0,
        deletedCount,
        deletedFiles,
        errors,
        freedSpace,
        duration: Date.now() - startTime,
      };

      this.eventBus.emit('fileCleaner:temp:completed', {
        basePaths,
        result,
      });

      return result;
    } catch (error) {
      const errorMsg = `Temp files cleanup failed: ${error}`;
      errors.push(errorMsg);
      this.eventBus.emit('fileCleaner:temp:error', {
        basePaths,
        error: errorMsg
      });

      return {
        success: false,
        deletedCount,
        deletedFiles,
        errors,
        freedSpace,
        duration: Date.now() - startTime,
      };
    }
  }

  // 清理空目录
  async cleanupEmptyDirectories(
    rootPath: string,
    options: { dryRun?: boolean; onProgress?: (path: string) => void } = {}
  ): Promise<{ deletedDirs: string[]; errors: string[] }> {
    const { dryRun = false, onProgress } = options;
    const deletedDirs: string[] = [];
    const errors: string[] = [];

    const isDirEmpty = async (dirPath: string): Promise<boolean> => {
      try {
        const entries = await fs.readdir(dirPath);
        return entries.length === 0;
      } catch {
        return false;
      }
    };

    const cleanEmptyDirs = async (dirPath: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory()) {
            const fullPath = path.join(dirPath, entry.name);
            await cleanEmptyDirs(fullPath);
          }
        }

        if (await isDirEmpty(dirPath)) {
          if (onProgress) {
            onProgress(dirPath);
          }

          if (!dryRun) {
            await fs.rmdir(dirPath);
          }
          deletedDirs.push(dirPath);

          this.eventBus.emit('fileCleaner:directory:deleted', {
            path: dirPath,
            dryRun
          });
        }
      } catch (error) {
        const errorMsg = `Failed to clean directory ${dirPath}: ${error}`;
        errors.push(errorMsg);
        this.eventBus.emit('fileCleaner:directory:error', {
          path: dirPath,
          error
        });
      }
    };

    await cleanEmptyDirs(rootPath);

    this.eventBus.emit('fileCleaner:emptyDirs:completed', {
      rootPath,
      deletedDirs,
      errors,
      dryRun,
    });

    return { deletedDirs, errors };
  }

  // 批量文件操作清理
  async batchFileCleanup(
    operations: Array<{
      action: 'delete' | 'move' | 'copy';
      source: string;
      destination?: string;
    }>,
    options: { dryRun?: boolean; onProgress?: (index: number, total: number) => void } = {}
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const { dryRun = false, onProgress } = options;
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];

      if (!operation) {
        failed++;
        errors.push(`Operation at index ${i} is undefined`);
        continue;
      }

      if (onProgress) {
        onProgress(i, operations.length);
      }

      try {
        switch (operation.action) {
          case 'delete':
            if (!dryRun) {
              const deleteSuccess = await this.safeDelete(operation.source);
              if (deleteSuccess) {
                success++;
              } else {
                failed++;
                errors.push(`Failed to delete: ${operation.source}`);
              }
            } else {
              success++;
            }
            break;

          case 'move':
            if (operation.destination) {
              if (!dryRun) {
                await fs.rename(operation.source, operation.destination);
              }
              success++;
            } else {
              failed++;
              errors.push(`Move operation missing destination: ${operation.source}`);
            }
            break;

          case 'copy':
            if (operation.destination) {
              if (!dryRun) {
                await fs.copyFile(operation.source, operation.destination);
              }
              success++;
            } else {
              failed++;
              errors.push(`Copy operation missing destination: ${operation.source}`);
            }
            break;

          default:
            failed++;
            errors.push(`Unknown operation: ${operation.action}`);
        }

        this.eventBus.emit('fileCleaner:batch:operation:completed', {
          operation,
          success: true,
          dryRun,
        });
      } catch (error) {
        failed++;
        const errorMsg = `Operation failed: ${operation.action} on ${operation.source}: ${error}`;
        errors.push(errorMsg);
        this.eventBus.emit('fileCleaner:batch:operation:error', {
          operation,
          error: errorMsg,
        });
      }
    }

    this.eventBus.emit('fileCleaner:batch:completed', {
      total: operations.length,
      success,
      failed,
      errors,
      dryRun,
    });

    return { success, failed, errors };
  }

  // 格式化文件大小
  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}