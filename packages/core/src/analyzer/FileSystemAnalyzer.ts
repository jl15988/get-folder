import { promises as fs } from 'fs';
import { join, extname, basename } from 'path';
import {
  FileSystemItem,
  DirectoryItem,
  FileItem,
  ItemType,
  AnalyzerOptions,
  AccelerationType,
  ProgressCallback,
  ErrorCallback
} from '../types';

/**
 * 文件系统分析器类
 * 提供文件系统扫描和分析功能，支持系统级加速
 */
export class FileSystemAnalyzer {
  private readonly options: Required<AnalyzerOptions>;
  private readonly errors: Error[] = [];
  private readonly processedInodes = new Set<number>();

  /**
   * 构造函数
   * @param options 分析器选项
   */
  constructor(options: AnalyzerOptions = {}) {
    this.options = {
      followSymlinks: false,
      maxDepth: Number.MAX_SAFE_INTEGER,
      ignorePatterns: [],
      includeHidden: false,
      concurrency: 10,
      systemAcceleration: {
        enabled: false,
        type: AccelerationType.NODEJS,
        fallbackToNodeJs: true
      },
      ...options
    };
  }

  /**
   * 分析指定路径的文件系统项目
   * @param targetPath 目标路径
   * @param progressCallback 进度回调函数
   * @param errorCallback 错误处理回调函数
   * @returns 文件系统项目信息
   */
  async analyze(
    targetPath: string,
    progressCallback?: ProgressCallback,
    errorCallback?: ErrorCallback
  ): Promise<FileSystemItem> {
    this.errors.length = 0;
    this.processedInodes.clear();

    try {
      return await this.analyzeItem(targetPath, 0, progressCallback, errorCallback);
    } catch (error) {
      const analysisError = error instanceof Error ? error : new Error(String(error));
      this.handleError(analysisError, targetPath, errorCallback);
      throw analysisError;
    }
  }

  /**
   * 获取分析过程中的错误列表
   * @returns 错误列表
   */
  getErrors(): Error[] {
    return [...this.errors];
  }

  /**
   * 清除错误列表
   */
  clearErrors(): void {
    this.errors.length = 0;
  }

  /**
   * 分析单个文件系统项目
   * @param itemPath 项目路径
   * @param depth 当前深度
   * @param progressCallback 进度回调函数
   * @param errorCallback 错误处理回调函数
   * @returns 文件系统项目信息
   */
  private async analyzeItem(
    itemPath: string,
    depth: number,
    progressCallback?: ProgressCallback,
    errorCallback?: ErrorCallback
  ): Promise<FileSystemItem> {
    // 检查深度限制
    if (depth > this.options.maxDepth) {
      throw new Error(`Maximum depth ${this.options.maxDepth} exceeded at path: ${itemPath}`);
    }

    // 检查是否应该忽略此路径
    if (this.shouldIgnorePath(itemPath)) {
      throw new Error(`Path ignored by pattern: ${itemPath}`);
    }

    // 获取文件统计信息
    const stats = await this.getFileStats(itemPath);
    
    // 检查是否已处理过此 inode（避免硬链接重复计算）
    if (this.processedInodes.has(stats.ino)) {
      throw new Error(`Inode already processed: ${itemPath}`);
    }
    this.processedInodes.add(stats.ino);

    // 确定项目类型
    const itemType = this.getItemType(stats);
    
    // 创建基础项目信息
    const baseItem: FileSystemItem = {
      name: basename(itemPath),
      path: itemPath,
      type: itemType,
      size: BigInt(stats.size),
      createdAt: stats.birthtime || stats.ctime,
      modifiedAt: stats.mtime,
      accessedAt: stats.atime,
      stats
    };

    // 更新进度
    if (progressCallback) {
      progressCallback(1, 1, itemPath);
    }

    // 根据类型处理项目
    if (itemType === ItemType.DIRECTORY) {
      return await this.analyzeDirectory(baseItem, depth, progressCallback, errorCallback);
    } else if (itemType === ItemType.FILE) {
      return this.analyzeFile(baseItem);
    } else {
      return baseItem;
    }
  }

  /**
   * 分析目录项目
   * @param baseItem 基础项目信息
   * @param depth 当前深度
   * @param progressCallback 进度回调函数
   * @param errorCallback 错误处理回调函数
   * @returns 目录项目信息
   */
  private async analyzeDirectory(
    baseItem: FileSystemItem,
    depth: number,
    progressCallback?: ProgressCallback,
    errorCallback?: ErrorCallback
  ): Promise<DirectoryItem> {
    const directoryItem: DirectoryItem = {
      ...baseItem,
      type: ItemType.DIRECTORY,
      children: [],
      totalSize: 0n,
      directoryCount: 0,
      fileCount: 0
    };

    try {
      // 读取目录内容
      const entries = await fs.readdir(baseItem.path, { withFileTypes: true });
      
      // 过滤和处理子项目
      const validEntries = entries.filter(entry => {
        const entryPath = join(baseItem.path, entry.name);
        return !this.shouldIgnorePath(entryPath);
      });

      // 并发处理子项目
      const semaphore = new Semaphore(this.options.concurrency);
      const childPromises = validEntries.map(async (entry) => {
        await semaphore.acquire();
        try {
          const childPath = join(baseItem.path, entry.name);
          return await this.analyzeItem(childPath, depth + 1, progressCallback, errorCallback);
        } catch (error) {
          const analysisError = error instanceof Error ? error : new Error(String(error));
          this.handleError(analysisError, join(baseItem.path, entry.name), errorCallback);
          return null;
        } finally {
          semaphore.release();
        }
      });

      const children = (await Promise.all(childPromises)).filter(Boolean) as FileSystemItem[];
      
      // 计算总大小和统计信息
      let totalSize = baseItem.size;
      let directoryCount = 0;
      let fileCount = 0;

      for (const child of children) {
        if (child.type === ItemType.DIRECTORY) {
          const dirChild = child as DirectoryItem;
          totalSize += dirChild.totalSize;
          directoryCount += 1 + dirChild.directoryCount;
          fileCount += dirChild.fileCount;
        } else if (child.type === ItemType.FILE) {
          totalSize += child.size;
          fileCount += 1;
        }
      }

      directoryItem.children = children;
      directoryItem.totalSize = totalSize;
      directoryItem.directoryCount = directoryCount;
      directoryItem.fileCount = fileCount;

    } catch (error) {
      const analysisError = error instanceof Error ? error : new Error(String(error));
      this.handleError(analysisError, baseItem.path, errorCallback);
    }

    return directoryItem;
  }

  /**
   * 分析文件项目
   * @param baseItem 基础项目信息
   * @returns 文件项目信息
   */
  private analyzeFile(baseItem: FileSystemItem): FileItem {
    const extension = extname(baseItem.path).toLowerCase();
    
    return {
      ...baseItem,
      type: ItemType.FILE,
      extension,
      mimeType: this.getMimeType(extension)
    };
  }

  /**
   * 获取文件统计信息
   * @param itemPath 文件路径
   * @returns 文件统计信息
   */
  private async getFileStats(itemPath: string) {
    if (this.options.followSymlinks) {
      return await fs.stat(itemPath, { bigint: true });
    } else {
      return await fs.lstat(itemPath, { bigint: true });
    }
  }

  /**
   * 确定项目类型
   * @param stats 文件统计信息
   * @returns 项目类型
   */
  private getItemType(stats: any): ItemType {
    if (stats.isFile()) {
      return ItemType.FILE;
    } else if (stats.isDirectory()) {
      return ItemType.DIRECTORY;
    } else if (stats.isSymbolicLink()) {
      return ItemType.SYMBOLIC_LINK;
    } else {
      return ItemType.UNKNOWN;
    }
  }

  /**
   * 检查是否应该忽略指定路径
   * @param itemPath 项目路径
   * @returns 是否应该忽略
   */
  private shouldIgnorePath(itemPath: string): boolean {
    const name = basename(itemPath);
    
    // 检查隐藏文件
    if (!this.options.includeHidden && name.startsWith('.')) {
      return true;
    }

    // 检查忽略模式
    return this.options.ignorePatterns.some(pattern => pattern.test(itemPath));
  }

  /**
   * 根据文件扩展名获取 MIME 类型
   * @param extension 文件扩展名
   * @returns MIME 类型
   */
  private getMimeType(extension: string): string | undefined {
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.js': 'text/javascript',
      '.ts': 'text/typescript',
      '.json': 'application/json',
      '.html': 'text/html',
      '.css': 'text/css',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip'
    };

    return mimeTypes[extension];
  }

  /**
   * 处理错误
   * @param error 错误对象
   * @param path 错误路径
   * @param errorCallback 错误处理回调函数
   */
  private handleError(error: Error, path: string, errorCallback?: ErrorCallback): void {
    this.errors.push(error);
    if (errorCallback) {
      errorCallback(error, path);
    }
  }
}

/**
 * 信号量类，用于控制并发数量
 */
class Semaphore {
  private readonly maxConcurrency: number;
  private currentConcurrency = 0;
  private readonly waitingQueue: Array<() => void> = [];

  constructor(maxConcurrency: number) {
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * 获取信号量
   */
  async acquire(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.currentConcurrency < this.maxConcurrency) {
        this.currentConcurrency++;
        resolve();
      } else {
        this.waitingQueue.push(() => {
          this.currentConcurrency++;
          resolve();
        });
      }
    });
  }

  /**
   * 释放信号量
   */
  release(): void {
    this.currentConcurrency--;
    const next = this.waitingQueue.shift();
    if (next) {
      next();
    }
  }
} 