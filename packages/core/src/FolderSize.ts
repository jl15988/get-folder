import {promises as fs} from 'fs';
import {join} from 'path';
import {FolderSizeOptions, FolderSizeResult} from './types';
import {BigNumber} from "bignumber.js";
import * as path from "node:path";

/**
 * 文件夹大小计算器类
 * 提供高效的文件夹大小计算功能，支持系统级加速
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
      followSymlinks: true,
      maxDepth: Number.MAX_SAFE_INTEGER,
      ignorePatterns: [],
      includeHidden: true,
      concurrency: 20,
      fast: false,
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

    // 尝试使用系统级加速
    if (this.options.fast) {
      const result = await this.trySystemAcceleration(folderPath);
      if (result) {
        return {
          ...result
        };
      }
      throw new Error('System acceleration failed and fallback is disabled');
    }

    // 使用 Node.js 实现
    const result = await this.calculateSizeNodeJs(normalizePath);
    return {
      ...result
    };
  }

  /**
   * 尝试系统级加速计算
   * @param folderPath 文件夹路径
   * @returns 计算结果或 null（如果失败）
   */
  private async trySystemAcceleration(folderPath: string): Promise<FolderSizeResult | null> {
    return null;
  }

  /**
   * 使用 Node.js 原生 API 计算文件夹大小
   * @param folderPath 文件夹路径
   * @returns 计算结果
   */
  private async calculateSizeNodeJs(folderPath: string): Promise<FolderSizeResult> {
    let totalSize = new BigNumber(0);
    let fileCount = 0;
    let directoryCount = 0;

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

      try {
        // 获取文件统计信息
        const stats = this.options.followSymlinks
          ? await fs.stat(itemPath, {bigint: true})
          : await fs.lstat(itemPath, {bigint: true});

        // 检查是否已处理过此 inode（避免硬链接重复计算）
        const inodeKey = `${stats.dev}-${stats.ino}`;
        if (this.processedInodes.has(inodeKey)) {
          return;
        }
        this.processedInodes.add(inodeKey);

        // 累加文件大小
        totalSize = totalSize.plus(stats.size.toString());

        if (stats.isDirectory()) {
          if (itemPath !== folderPath) {
            // 排除当前文件夹
            directoryCount++;
          }

          // 读取目录内容并递归处理
          const entries = await fs.readdir(itemPath);

          // 简化的并发控制
          const semaphore = new SimpleSemaphore(this.options.concurrency);
          await Promise.all(entries.map(async (entry) => {
            await semaphore.acquire();
            try {
              const childPath = join(itemPath, entry);
              await processItem(childPath, depth + 1);
            } finally {
              semaphore.release();
            }
          }));

        } else if (stats.isFile()) {
          fileCount++;
        }
      } catch (error) {
        // 跳过无法访问的文件/目录
      }
    };

    await processItem(folderPath);

    return {
      size: totalSize,
      fileCount,
      directoryCount
    };
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
    return this.options.ignorePatterns.some(pattern => pattern.test(itemPath));
  }
}

/**
 * 简化的信号量类，用于控制并发数量
 */
class SimpleSemaphore {
  private available: number;
  private waiters: Array<() => void> = [];

  constructor(concurrency: number) {
    this.available = concurrency;
  }

  /**
   * 获取信号量
   */
  async acquire(): Promise<void> {
    if (this.available > 0) {
      this.available--;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waiters.push(() => {
        this.available--;
        resolve();
      });
    });
  }

  /**
   * 释放信号量
   */
  release(): void {
    if (this.waiters.length > 0) {
      const resolve = this.waiters.shift()!;
      resolve();
    } else {
      this.available++;
    }
  }
} 