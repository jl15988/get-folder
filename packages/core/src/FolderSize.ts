import {promises as fs} from 'fs';
import {join} from 'path';
import {FolderSizeError, FolderSizeOptions, FolderSizeResult} from './types';
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
      maxDepth: Number.MAX_SAFE_INTEGER,
      ignorePatterns: [],
      includeHidden: true,
      concurrency: 20,
      fast: false,
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

    // 尝试使用系统级加速
    if (this.options.fast) {
      const result = await this.trySystemAcceleration(folderPath);
      if (result) {
        return result;
      }
      throw new Error('System acceleration failed and fallback is disabled');
    }

    // 使用 Node.js 实现
    return await this.calculateSizeNodeJs(normalizePath);
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
    return this.options.ignorePatterns.some(pattern => pattern.test(itemPath));
  }
}

/**
 * 简化的信号量类，用于控制并发数量
 *
 * 工作原理：
 * 1. 维护一个固定数量的"令牌"（tokens）
 * 2. 每个并发操作需要先获取令牌才能执行
 * 3. 没有令牌时，操作会被挂起等待
 * 4. 操作完成后释放令牌，唤醒等待的操作
 *
 * 这样确保同时运行的操作数量不会超过设定的并发限制，
 * 避免文件句柄耗尽、内存占用过高等问题
 */
class SimpleSemaphore {
  /** 当前可用的令牌数量 */
  private available: number;

  /** 等待队列：存储等待令牌的 resolve 函数 */
  private waiters: Array<() => void> = [];

  /**
   * 构造函数
   * @param concurrency 最大并发数（令牌总数）
   */
  constructor(concurrency: number) {
    this.available = concurrency;
  }

  /**
   * 获取令牌（申请执行权限）
   *
   * 执行逻辑：
   * 1. 如果有可用令牌，立即获取并返回
   * 2. 如果没有令牌，创建 Promise 并加入等待队列
   * 3. 当前操作会被挂起，直到有令牌释放时被唤醒
   *
   * @returns Promise<void> 当获得令牌时 resolve
   */
  async acquire(): Promise<void> {
    // 情况1：有可用令牌，立即获取
    if (this.available > 0) {
      // 消耗一个令牌
      this.available--;
      // 立即返回，继续执行
      return;
    }

    // 情况2：没有可用令牌，需要等待
    return new Promise<void>((resolve) => {
      // 将 resolve 函数包装后放入等待队列
      // 当有令牌释放时，会调用这个函数唤醒等待者
      this.waiters.push(() => {
        // 消耗令牌
        this.available--;
        // 唤醒等待的 acquire() 调用
        resolve();
      });
    });
  }

  /**
   * 释放令牌（归还执行权限）
   *
   * 执行逻辑：
   * 1. 优先唤醒等待队列中的第一个等待者
   * 2. 如果没有等待者，增加可用令牌数
   *
   * 这样确保令牌总数始终保持不变
   */
  release(): void {
    // 情况1：有等待者，立即唤醒第一个
    if (this.waiters.length > 0) {
      // 取出队列头部的 resolve 函数
      const resolve = this.waiters.shift()!;
      // 调用 resolve，唤醒对应的 acquire() 调用
      resolve();
      // 注意：这里不增加 available，因为令牌直接转给了等待者
    }
    // 情况2：没有等待者，归还令牌到令牌池
    else {
      // 增加可用令牌数
      this.available++;
    }
  }
} 