import {promises as fs} from 'fs';
import {join} from 'path';
import {FolderSizeError, FolderSizeOptions, FolderSizeResult} from './types';
import {BigNumber} from "bignumber.js";
import * as path from "node:path";
import {SimpleSemaphore} from "./SimpleSemaphore";
import {BaseScene} from "./BaseScene";

/**
 * 文件夹大小计算器类
 */
export class FolderSize extends BaseScene {
  private readonly options: Required<FolderSizeOptions>;

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
    super();
    this.options = {
      maxDepth: Number.MAX_SAFE_INTEGER,
      ignores: [],
      includeHidden: true,
      includeLink: true,
      concurrency: 2,
      ignoreErrors: false,
      inodeCheck: true,
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
    this.clearInode();
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
      if (this.shouldIgnorePath(this.options.ignores, itemPath, this.options.includeHidden)) {
        return;
      }

      let stats;
      try {
        // 获取文件统计信息
        stats = await fs.lstat(itemPath, {bigint: true});
      } catch (error) {
        return this.handleError(error as Error, `无法获取文件信息: ${(error as Error).message}`, itemPath);
      }

      if (this.options.inodeCheck) {
        if (this.checkInode(stats)) return;
      }

      const isSymbolicLink = stats.isSymbolicLink();
      const isDirectory = stats.isDirectory();
      const isFile = stats.isFile();
      const fileSize = stats.size;

      if (isSymbolicLink) {
        linkCount++;
        if (this.options.includeLink) {
          totalSize = totalSize.plus(fileSize.toString());
        }
      } else {
        totalSize = totalSize.plus(fileSize.toString());
      }

      if (isDirectory) {
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

      } else if (isFile) {
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
}
