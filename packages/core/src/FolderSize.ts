import {promises as fs} from 'fs';
import {join} from 'path';
import {FolderSizeError, FolderSizeOptions, FolderSizeResult} from './types';
import {BigNumber} from "bignumber.js";
import * as path from "node:path";
import {SimpleSemaphore} from "./SimpleSemaphore";

/**
 * 文件夹大小计算器类
 */
export class FolderSize {
  private readonly options: Required<FolderSizeOptions>;
  private readonly processedInodes = new Set<string>();

  /**
   * 快捷获取文件夹大小
   * @param folderPath 文件夹路径
   * @param options 大小计算选项
   * @returns 文件夹大小结果 Promise
   */
  static getSize(folderPath: string, options: FolderSizeOptions = {}): Promise<FolderSizeResult> {
    return FolderSize.of(options).size(folderPath);
  }

  /**
   * 与构造函数一致
   * @param options 大小计算选项
   */
  static of(options: FolderSizeOptions = {}): FolderSize {
    return new FolderSize(options);
  }

  /**
   * 构造函数
   * @param options 大小计算选项
   */
  constructor(options: FolderSizeOptions = {}) {
    this.options = {
      maxDepth: Number.MAX_SAFE_INTEGER,
      ignores: [],
      includeHidden: true,
      concurrency: 20,
      ignoreErrors: false,
      // 默认继续
      onError: () => true,
      ...options
    };
  }

  /**
   * 计算文件夹大小
   * @param folderPath 文件夹路径
   * @returns 文件夹大小结果 Promise
   */
  async size(folderPath: string): Promise<FolderSizeResult> {
    this.processedInodes.clear();
    const normalizePath = path.normalize(folderPath);

    // 使用 Node.js 实现
    return await this.calculateSizeNodeJs(normalizePath);
  }

  /**
   * 计算文件夹大小
   * @param folderPath 文件夹路径
   * @returns 计算结果
   */
  private async calculateSizeNodeJs(folderPath: string): Promise<FolderSizeResult> {
    let totalSize = new BigNumber(0);
    let fileCount = 0;
    let directoryCount = 0;
    let linkCount = 0;

    /**
     * 递归处理文件夹项目
     * @param itemPath 项目路径
     * @param depth 当前深度
     */
    const processItem = async (itemPath: string, depth: number = 0): Promise<void> => {
      // 检查深度限制
      if (depth > this.options.maxDepth) {
        return;
      }

      // 检查是否应该忽略此路径
      if (this.shouldIgnorePath(itemPath)) {
        return;
      }

      let stats;
      try {
        // 获取文件统计信息
        stats = await fs.lstat(itemPath, {bigint: true});
      } catch (error) {
        return this.handleError(error as Error, `无法获取文件信息: ${(error as Error).message}`, itemPath);
      }

      // 检查是否已处理过此 inode（避免硬链接重复计算）
      const inodeKey = `${stats.dev}-${stats.ino}`;
      if (this.processedInodes.has(inodeKey)) {
        return;
      }
      this.processedInodes.add(inodeKey);

      // 累加文件大小
      totalSize = totalSize.plus(stats.size.toString());

      if (stats.isSymbolicLink()) {
        linkCount++;
      }

      if (stats.isDirectory()) {
        if (itemPath !== folderPath) {
          // 排除当前文件夹
          directoryCount++;
        }

        let entries;
        try {
          // 读取目录内容
          entries = await fs.readdir(itemPath);
        } catch (error) {
          return this.handleError(error as Error, `无法读取目录: ${(error as Error).message}`, itemPath);
        }

        // 简化的并发控制
        const semaphore = new SimpleSemaphore(this.options.concurrency);
        await Promise.all(entries.map(async (entry) => {
          await semaphore.acquire();
          try {
            const childPath = join(itemPath, entry);
            await processItem(childPath, depth + 1);
          } catch (error) {
            // 子项目错误不影响其他项目
          } finally {
            semaphore.release();
          }
        }));

      } else if (stats.isFile()) {
        fileCount++;
      }
    };

    await processItem(folderPath);

    return {
      size: totalSize,
      fileCount,
      directoryCount,
      linkCount
    };
  }

  /**
   * 处理错误
   * @param error 错误对象
   * @param message 错误消息
   * @param path 错误路径
   */
  private handleError(error: Error, message: string, path: string): void {
    const errorRes: FolderSizeError = {error, message, path};

    // 如果设置了错误回调，调用它
    if (this.options.onError) {
      const shouldContinue = this.options.onError(errorRes);
      if (!shouldContinue) {
        throw new Error(`计算被用户停止: ${message}`);
      }
    }
    // 否则根据 ignoreErrors 设置决定是否继续
    else if (!this.options.ignoreErrors) {
      throw new Error(message);
    }
  }

  /**
   * 检查是否应该忽略指定路径
   * @param itemPath 项目路径
   * @returns 是否应该忽略
   */
  private shouldIgnorePath(itemPath: string): boolean {
    const name = path.basename(itemPath);
    // 检查隐藏文件
    if (!this.options.includeHidden && name.startsWith('.')) {
      return true;
    }

    // 检查忽略模式
    return this.options.ignores.some(pattern => pattern.test(itemPath));
  }
}
