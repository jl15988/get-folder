import { promises as fs } from 'fs';
import { join } from 'path';
import {
  SizeCalculationOptions,
  FolderSizeResult,
  AccelerationType,
  ProgressCallback,
  ErrorCallback
} from '../types';

/**
 * 文件夹大小计算器类
 * 提供高效的文件夹大小计算功能，支持系统级加速
 */
export class FolderSizeCalculator {
  private readonly options: Required<SizeCalculationOptions>;
  private readonly errors: Error[] = [];
  private readonly processedInodes = new Set<number>();

  /**
   * 构造函数
   * @param options 大小计算选项
   */
  constructor(options: SizeCalculationOptions = {}) {
    this.options = {
      followSymlinks: false,
      maxDepth: Number.MAX_SAFE_INTEGER,
      ignorePatterns: [],
      includeHidden: false,
      concurrency: 20,
      useBigInt: true,
      includeErrors: false,
      strict: false,
      systemAcceleration: {
        enabled: false,
        type: AccelerationType.NODEJS,
        fallbackToNodeJs: true
      },
      ...options
    };
  }

  /**
   * 计算文件夹大小
   * @param folderPath 文件夹路径
   * @param progressCallback 进度回调函数
   * @param errorCallback 错误处理回调函数
   * @returns 计算结果
   */
  async calculateSize(
    folderPath: string,
    progressCallback?: ProgressCallback,
    errorCallback?: ErrorCallback
  ): Promise<FolderSizeResult> {
    const startTime = Date.now();
    this.errors.length = 0;
    this.processedInodes.clear();

    let accelerationType = AccelerationType.NODEJS;
    
    try {
      // 尝试使用系统级加速
      if (this.options.systemAcceleration.enabled) {
        const result = await this.trySystemAcceleration(folderPath, progressCallback, errorCallback);
        if (result) {
          return {
            ...result,
            duration: Date.now() - startTime,
            accelerationType: this.options.systemAcceleration.type
          };
        }
        
        // 如果系统加速失败且不允许回退，抛出错误
        if (!this.options.systemAcceleration.fallbackToNodeJs) {
          throw new Error('System acceleration failed and fallback is disabled');
        }
      }

      // 使用 Node.js 实现
      const result = await this.calculateSizeNodeJs(folderPath, progressCallback, errorCallback);
      
      return {
        ...result,
        duration: Date.now() - startTime,
        accelerationType
      };

    } catch (error) {
      if (this.options.strict) {
        throw error;
      }
      
      const analysisError = error instanceof Error ? error : new Error(String(error));
      this.handleError(analysisError, folderPath, errorCallback);
      
      return {
        size: this.options.useBigInt ? 0n : 0,
        fileCount: 0,
        directoryCount: 0,
        duration: Date.now() - startTime,
        errors: this.options.includeErrors ? this.errors : undefined,
        accelerationType
      };
    }
  }

  /**
   * 尝试系统级加速计算
   * @param folderPath 文件夹路径
   * @param progressCallback 进度回调函数
   * @param errorCallback 错误处理回调函数
   * @returns 计算结果或 null（如果失败）
   */
  private async trySystemAcceleration(
    folderPath: string,
    progressCallback?: ProgressCallback,
    errorCallback?: ErrorCallback
  ): Promise<Omit<FolderSizeResult, 'duration' | 'accelerationType'> | null> {
    try {
      switch (this.options.systemAcceleration.type) {
        case AccelerationType.WINDOWS_MFT:
          return await this.calculateSizeWindowsMft(folderPath, progressCallback, errorCallback);
        case AccelerationType.LINUX_SYSCALL:
          return await this.calculateSizeLinuxSyscall(folderPath, progressCallback, errorCallback);
        case AccelerationType.MACOS_SYSCALL:
          return await this.calculateSizeMacOsSyscall(folderPath, progressCallback, errorCallback);
        default:
          return null;
      }
    } catch (error) {
      // 系统加速失败，返回 null 以使用回退方案
      const analysisError = error instanceof Error ? error : new Error(String(error));
      this.handleError(analysisError, folderPath, errorCallback);
      return null;
    }
  }

  /**
   * 使用 Node.js 原生 API 计算文件夹大小
   * @param folderPath 文件夹路径
   * @param progressCallback 进度回调函数
   * @param errorCallback 错误处理回调函数
   * @returns 计算结果
   */
  private async calculateSizeNodeJs(
    folderPath: string,
    progressCallback?: ProgressCallback,
    errorCallback?: ErrorCallback
  ): Promise<Omit<FolderSizeResult, 'duration' | 'accelerationType'>> {
    let totalSize = 0n;
    let fileCount = 0;
    let directoryCount = 0;
    let processedCount = 0;

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
          ? await fs.stat(itemPath, { bigint: true })
          : await fs.lstat(itemPath, { bigint: true });

        // 检查是否已处理过此 inode（避免硬链接重复计算）
        const inode = Number(stats.ino);
        if (this.processedInodes.has(inode)) {
          return;
        }
        this.processedInodes.add(inode);

        // 累加文件大小
        totalSize += stats.size;
        processedCount++;

        // 更新进度
        if (progressCallback && processedCount % 100 === 0) {
          progressCallback(processedCount, processedCount, itemPath);
        }

        if (stats.isDirectory()) {
          directoryCount++;
          
          // 读取目录内容并递归处理
          const entries = await fs.readdir(itemPath);
          
          // 并发处理子项目
          const semaphore = new Semaphore(this.options.concurrency);
          const promises = entries.map(async (entry) => {
            await semaphore.acquire();
            try {
              const childPath = join(itemPath, entry);
              await processItem(childPath, depth + 1);
            } catch (error) {
              const analysisError = error instanceof Error ? error : new Error(String(error));
              this.handleError(analysisError, join(itemPath, entry), errorCallback);
            } finally {
              semaphore.release();
            }
          });

          await Promise.all(promises);
          
        } else if (stats.isFile()) {
          fileCount++;
        }

      } catch (error) {
        const analysisError = error instanceof Error ? error : new Error(String(error));
        this.handleError(analysisError, itemPath, errorCallback);
        
        if (this.options.strict) {
          throw analysisError;
        }
      }
    };

    await processItem(folderPath);

    // 处理 BigInt 转换
    let finalSize: bigint | number = totalSize;
    if (!this.options.useBigInt) {
      if (totalSize > BigInt(Number.MAX_SAFE_INTEGER)) {
        const error = new RangeError(
          'The folder size is too large to return as a Number. Use useBigInt: true option.'
        );
        
        if (this.options.strict) {
          throw error;
        }
        
        this.handleError(error, folderPath, errorCallback);
        finalSize = Number.MAX_SAFE_INTEGER;
      } else {
        finalSize = Number(totalSize);
      }
    }

    return {
      size: finalSize,
      fileCount,
      directoryCount,
      errors: this.options.includeErrors ? [...this.errors] : undefined
    };
  }

  /**
   * 使用 Windows NTFS MFT 加速计算（需要 C++ 扩展）
   * @param folderPath 文件夹路径
   * @param progressCallback 进度回调函数
   * @param errorCallback 错误处理回调函数
   * @returns 计算结果
   */
  private async calculateSizeWindowsMft(
    folderPath: string,
    progressCallback?: ProgressCallback,
    errorCallback?: ErrorCallback
  ): Promise<Omit<FolderSizeResult, 'duration' | 'accelerationType'>> {
    // TODO: 实现 Windows MFT 加速逻辑
    // 这里需要调用 packages/cc 中的 C++ 扩展
    throw new Error('Windows MFT acceleration not implemented yet');
  }

  /**
   * 使用 Linux 系统调用加速计算（需要 C++ 扩展）
   * @param folderPath 文件夹路径
   * @param progressCallback 进度回调函数
   * @param errorCallback 错误处理回调函数
   * @returns 计算结果
   */
  private async calculateSizeLinuxSyscall(
    folderPath: string,
    progressCallback?: ProgressCallback,
    errorCallback?: ErrorCallback
  ): Promise<Omit<FolderSizeResult, 'duration' | 'accelerationType'>> {
    // TODO: 实现 Linux 系统调用加速逻辑
    // 这里需要调用 packages/cc 中的 C++ 扩展
    throw new Error('Linux syscall acceleration not implemented yet');
  }

  /**
   * 使用 macOS 系统调用加速计算（需要 C++ 扩展）
   * @param folderPath 文件夹路径
   * @param progressCallback 进度回调函数
   * @param errorCallback 错误处理回调函数
   * @returns 计算结果
   */
  private async calculateSizeMacOsSyscall(
    folderPath: string,
    progressCallback?: ProgressCallback,
    errorCallback?: ErrorCallback
  ): Promise<Omit<FolderSizeResult, 'duration' | 'accelerationType'>> {
    // TODO: 实现 macOS 系统调用加速逻辑
    // 这里需要调用 packages/cc 中的 C++ 扩展
    throw new Error('macOS syscall acceleration not implemented yet');
  }

  /**
   * 检查是否应该忽略指定路径
   * @param itemPath 项目路径
   * @returns 是否应该忽略
   */
  private shouldIgnorePath(itemPath: string): boolean {
    const pathParts = itemPath.split(/[/\\]/);
    const name = pathParts[pathParts.length - 1];
    
    // 检查隐藏文件
    if (!this.options.includeHidden && name.startsWith('.')) {
      return true;
    }

    // 检查忽略模式
    return this.options.ignorePatterns.some(pattern => pattern.test(itemPath));
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

  /**
   * 获取计算过程中的错误列表
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