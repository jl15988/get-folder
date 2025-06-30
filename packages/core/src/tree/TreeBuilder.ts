import { promises as fs } from 'fs';
import { join, basename, extname } from 'path';
import {
  TreeNode,
  DirectoryTreeNode,
  FileTreeNode,
  ItemType,
  TreeBuildOptions,
  ProgressCallback,
  ErrorCallback,
  AccelerationType
} from '../types';

/**
 * 树构建器类
 * 提供目录树和文件树的构建功能
 */
export class TreeBuilder {
  private readonly options: Required<TreeBuildOptions>;
  private readonly errors: Error[] = [];
  private readonly processedInodes = new Set<number>();

  /**
   * 构造函数
   * @param options 树构建选项
   */
  constructor(options: TreeBuildOptions = {}) {
    this.options = {
      followSymlinks: false,
      maxDepth: Number.MAX_SAFE_INTEGER,
      ignorePatterns: [],
      includeHidden: false,
      concurrency: 10,
      directoriesOnly: false,
      filesOnly: false,
      includeSizes: true,
      sortBy: 'name',
      sortOrder: 'asc',
      systemAcceleration: {
        enabled: false,
        type: AccelerationType.NODEJS,
        fallbackToNodeJs: true
      },
      ...options
    };

    // 验证选项冲突
    if (this.options.directoriesOnly && this.options.filesOnly) {
      throw new Error('Cannot set both directoriesOnly and filesOnly to true');
    }
  }

  /**
   * 构建文件系统树
   * @param rootPath 根路径
   * @param progressCallback 进度回调函数
   * @param errorCallback 错误处理回调函数
   * @returns 文件系统树根节点
   */
  async buildTree(
    rootPath: string,
    progressCallback?: ProgressCallback,
    errorCallback?: ErrorCallback
  ): Promise<TreeNode> {
    this.errors.length = 0;
    this.processedInodes.clear();

    try {
      const rootNode = await this.buildNode(rootPath, 0, progressCallback, errorCallback);
      return this.sortNode(rootNode);
    } catch (error) {
      const analysisError = error instanceof Error ? error : new Error(String(error));
      this.handleError(analysisError, rootPath, errorCallback);
      throw analysisError;
    }
  }

  /**
   * 构建目录树（仅包含目录）
   * @param rootPath 根路径
   * @param progressCallback 进度回调函数
   * @param errorCallback 错误处理回调函数
   * @returns 目录树根节点
   */
  async buildDirectoryTree(
    rootPath: string,
    progressCallback?: ProgressCallback,
    errorCallback?: ErrorCallback
  ): Promise<DirectoryTreeNode> {
    const originalOptions = { ...this.options };
    this.options.directoriesOnly = true;
    this.options.filesOnly = false;

    try {
      const result = await this.buildTree(rootPath, progressCallback, errorCallback);
      return result as DirectoryTreeNode;
    } finally {
      Object.assign(this.options, originalOptions);
    }
  }

  /**
   * 构建文件树（仅包含文件）
   * @param rootPath 根路径
   * @param progressCallback 进度回调函数
   * @param errorCallback 错误处理回调函数
   * @returns 文件树根节点
   */
  async buildFileTree(
    rootPath: string,
    progressCallback?: ProgressCallback,
    errorCallback?: ErrorCallback
  ): Promise<TreeNode> {
    const originalOptions = { ...this.options };
    this.options.directoriesOnly = false;
    this.options.filesOnly = true;

    try {
      const result = await this.buildTree(rootPath, progressCallback, errorCallback);
      return result;
    } finally {
      Object.assign(this.options, originalOptions);
    }
  }

  /**
   * 构建单个树节点
   * @param itemPath 项目路径
   * @param depth 当前深度
   * @param progressCallback 进度回调函数
   * @param errorCallback 错误处理回调函数
   * @param parentPath 父节点路径
   * @returns 树节点
   */
  private async buildNode(
    itemPath: string,
    depth: number,
    progressCallback?: ProgressCallback,
    errorCallback?: ErrorCallback,
    parentPath?: string
  ): Promise<TreeNode> {
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
    const inode = Number(stats.ino);
    if (this.processedInodes.has(inode)) {
      throw new Error(`Inode already processed: ${itemPath}`);
    }
    this.processedInodes.add(inode);

    // 确定项目类型
    const itemType = this.getItemType(stats);
    
    // 创建基础节点信息
    const baseNode: TreeNode = {
      name: basename(itemPath),
      path: itemPath,
      type: itemType,
      size: this.options.includeSizes ? BigInt(stats.size) : 0n,
      depth,
      parentPath
    };

    // 更新进度
    if (progressCallback) {
      progressCallback(1, 1, itemPath);
    }

    // 根据类型和选项处理节点
    if (itemType === ItemType.DIRECTORY) {
      return await this.buildDirectoryNode(baseNode, depth, progressCallback, errorCallback);
    } else if (itemType === ItemType.FILE) {
      return this.buildFileNode(baseNode);
    } else {
      return baseNode;
    }
  }

  /**
   * 构建目录节点
   * @param baseNode 基础节点信息
   * @param depth 当前深度
   * @param progressCallback 进度回调函数
   * @param errorCallback 错误处理回调函数
   * @returns 目录树节点
   */
  private async buildDirectoryNode(
    baseNode: TreeNode,
    depth: number,
    progressCallback?: ProgressCallback,
    errorCallback?: ErrorCallback
  ): Promise<DirectoryTreeNode> {
    // 如果只构建文件树，跳过目录节点
    if (this.options.filesOnly) {
      throw new Error('Skipping directory in files-only mode');
    }

    const directoryNode: DirectoryTreeNode = {
      ...baseNode,
      type: ItemType.DIRECTORY,
      children: [],
      totalSize: baseNode.size,
      expanded: false
    };

    try {
      // 读取目录内容
      const entries = await fs.readdir(baseNode.path, { withFileTypes: true });
      
      // 过滤和处理子项目
      const validEntries = entries.filter(entry => {
        const entryPath = join(baseNode.path, entry.name);
        return !this.shouldIgnorePath(entryPath);
      });

      // 并发处理子项目
      const semaphore = new Semaphore(this.options.concurrency);
      const childPromises = validEntries.map(async (entry) => {
        await semaphore.acquire();
        try {
          const childPath = join(baseNode.path, entry.name);
          return await this.buildNode(childPath, depth + 1, progressCallback, errorCallback, baseNode.path);
        } catch (error) {
          const analysisError = error instanceof Error ? error : new Error(String(error));
          this.handleError(analysisError, join(baseNode.path, entry.name), errorCallback);
          return null;
        } finally {
          semaphore.release();
        }
      });

      const children = (await Promise.all(childPromises)).filter(Boolean) as TreeNode[];
      
      // 计算总大小
      let totalSize = baseNode.size;
      for (const child of children) {
        if (child.type === ItemType.DIRECTORY) {
          const dirChild = child as DirectoryTreeNode;
          totalSize += dirChild.totalSize;
        } else {
          totalSize += child.size;
        }
      }

      directoryNode.children = children;
      directoryNode.totalSize = this.options.includeSizes ? totalSize : 0n;

    } catch (error) {
      const analysisError = error instanceof Error ? error : new Error(String(error));
      this.handleError(analysisError, baseNode.path, errorCallback);
    }

    return directoryNode;
  }

  /**
   * 构建文件节点
   * @param baseNode 基础节点信息
   * @returns 文件树节点
   */
  private buildFileNode(baseNode: TreeNode): FileTreeNode {
    // 如果只构建目录树，跳过文件节点
    if (this.options.directoriesOnly) {
      throw new Error('Skipping file in directories-only mode');
    }

    const extension = extname(baseNode.path).toLowerCase();
    
    return {
      ...baseNode,
      type: ItemType.FILE,
      extension
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
   * 对节点进行排序
   * @param node 要排序的节点
   * @returns 排序后的节点
   */
  private sortNode(node: TreeNode): TreeNode {
    if (node.type !== ItemType.DIRECTORY) {
      return node;
    }

    const dirNode = node as DirectoryTreeNode;
    
    // 递归排序子节点
    dirNode.children = dirNode.children.map(child => this.sortNode(child));

    // 对子节点进行排序
    dirNode.children.sort((a, b) => {
      // 目录优先排序
      if (a.type === ItemType.DIRECTORY && b.type !== ItemType.DIRECTORY) {
        return -1;
      }
      if (a.type !== ItemType.DIRECTORY && b.type === ItemType.DIRECTORY) {
        return 1;
      }

      let compareValue = 0;
      
      switch (this.options.sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'size':
          compareValue = Number(a.size - b.size);
          break;
        case 'date':
          // 这里需要文件统计信息，暂时使用名称排序
          compareValue = a.name.localeCompare(b.name);
          break;
        default:
          compareValue = a.name.localeCompare(b.name);
      }

      return this.options.sortOrder === 'desc' ? -compareValue : compareValue;
    });

    return dirNode;
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
   * 获取构建过程中的错误列表
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
   * 扁平化树结构为数组
   * @param rootNode 根节点
   * @returns 扁平化的节点数组
   */
  static flattenTree(rootNode: TreeNode): TreeNode[] {
    const result: TreeNode[] = [];
    
    const flatten = (node: TreeNode) => {
      result.push(node);
      if (node.type === ItemType.DIRECTORY) {
        const dirNode = node as DirectoryTreeNode;
        for (const child of dirNode.children) {
          flatten(child);
        }
      }
    };

    flatten(rootNode);
    return result;
  }

  /**
   * 获取树的统计信息
   * @param rootNode 根节点
   * @returns 统计信息
   */
  static getTreeStats(rootNode: TreeNode): {
    totalNodes: number;
    fileCount: number;
    directoryCount: number;
    totalSize: bigint;
    maxDepth: number;
  } {
    let totalNodes = 0;
    let fileCount = 0;
    let directoryCount = 0;
    let totalSize = 0n;
    let maxDepth = 0;

    const traverse = (node: TreeNode, depth: number) => {
      totalNodes++;
      maxDepth = Math.max(maxDepth, depth);
      
      if (node.type === ItemType.FILE) {
        fileCount++;
        totalSize += node.size;
      } else if (node.type === ItemType.DIRECTORY) {
        directoryCount++;
        const dirNode = node as DirectoryTreeNode;
        for (const child of dirNode.children) {
          traverse(child, depth + 1);
        }
      }
    };

    traverse(rootNode, 0);

    return {
      totalNodes,
      fileCount,
      directoryCount,
      totalSize,
      maxDepth
    };
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