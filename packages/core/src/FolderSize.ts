import {promises as fs} from 'fs';
import {join} from 'path';
import {
  FolderSizeError, 
  FolderSizeOptions, 
  FolderSizeResult, 
  TreeNode, 
  FolderTreeResult,
  FileSystemItem,
  TraverseNodeCallback,
  LazyTreeNode,
  LazyTreeOptions,
  LazyTreeResult
} from './types';
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
   * 快捷构建目录树
   * @param folderPath 文件夹路径
   * @param options 构建选项
   * @returns 目录树结果 Promise
   */
  static getTree(folderPath: string, options: FolderSizeOptions = {}): Promise<FolderTreeResult> {
    return FolderSize.of(options).tree(folderPath);
  }

  /**
   * 快捷构建懒加载目录树
   * @param folderPath 文件夹路径
   * @param options 懒加载构建选项
   * @returns 懒加载目录树结果 Promise
   */
  static getLazyTree(folderPath: string, options: LazyTreeOptions = {}): Promise<LazyTreeResult> {
    return FolderSize.of(options).lazyTree(folderPath, options);
  }

  /**
   * 快捷展开懒加载树节点
   * @param node 要展开的节点
   * @param options 展开选项
   * @returns Promise<void>
   */
  static async expandNode(node: LazyTreeNode, options: FolderSizeOptions = {}): Promise<void> {
    const folder = FolderSize.of(options);
    return await folder.expandNode(node);
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
   * 构建目录树
   * @param folderPath 文件夹路径
   * @returns 目录树结果 Promise
   */
  async tree(folderPath: string): Promise<FolderTreeResult> {
    this.clearInode();
    const normalizePath = path.normalize(folderPath);

    // 使用 Node.js 实现
    return await this.buildTreeNodeJs(normalizePath);
  }

  /**
   * 构建懒加载目录树
   * @param folderPath 文件夹路径
   * @param options 懒加载选项
   * @returns 懒加载目录树结果 Promise
   */
  async lazyTree(folderPath: string, options: LazyTreeOptions = {}): Promise<LazyTreeResult> {
    this.clearInode();
    const normalizePath = path.normalize(folderPath);
    const initialDepth = options.initialDepth ?? 1;

    // 使用 Node.js 实现
    return await this.buildLazyTreeNodeJs(normalizePath, initialDepth, options);
  }

  /**
   * 展开懒加载树节点的子节点
   * @param node 要展开的节点
   * @returns Promise<void>
   */
  async expandNode(node: LazyTreeNode): Promise<void> {
    // 如果不是目录或已经加载过，直接返回
    if (node.type !== 'directory' || node.loaded) {
      return;
    }

    this.clearInode();
    
    try {
      // 读取目录内容
      const entries = await fs.readdir(node.path);
      
      // 使用并发控制处理子项目（不预检查子节点以提高性能）
      const children = await SimpleSemaphore.concurrentMapFiltered(
        entries,
        this.options.concurrency,
        async (entry) => {
          const childPath = join(node.path, entry);
          return await this.buildSingleLazyNode(childPath, node.depth + 1, false);
        }
      );

      node.children = children;
      node.loaded = true;
      node.hasChildren = children.length > 0;
      
      // 为新创建的目录子节点保持hasChildren为undefined状态
      // 等到真正需要展开时再通过expandNode确定是否有子节点
    } catch (error) {
      this.handleError(error as Error, `无法展开节点: ${(error as Error).message}`, node.path);
    }
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

    // 节点处理回调：对于大小计算，我们不需要返回值，只需要累积统计信息
    const nodeCallback: TraverseNodeCallback<void> = (item) => {
      if (item.isSymbolicLink) {
        linkCount++;
        if (this.options.includeLink) {
          totalSize = totalSize.plus(item.size.toString());
        }
      } else {
        totalSize = totalSize.plus(item.size.toString());
      }

      if (item.isDirectory) {
        if (item.path !== folderPath) {
          // 排除当前文件夹
          directoryCount++;
        }
      } else if (item.isFile) {
        fileCount++;
      }

      return undefined; // 大小计算不需要返回值
    };

    await this.traverseFileSystem(folderPath, nodeCallback);

    return {
      size: totalSize,
      fileCount,
      directoryCount,
      linkCount
    };
  }

  /**
   * 构建目录树
   * @param folderPath 文件夹路径
   * @returns 构建结果
   */
  private async buildTreeNodeJs(folderPath: string): Promise<FolderTreeResult> {
    let fileCount = 0;
    let directoryCount = 0;
    let linkCount = 0;

    // 节点处理回调：构建树节点并统计数量
    const nodeCallback: TraverseNodeCallback<TreeNode> = (item, children = []) => {
      // 统计数量
      if (item.isSymbolicLink) {
        linkCount++;
      } else if (item.isFile) {
        fileCount++;
      } else if (item.isDirectory) {
        if (item.path !== folderPath) {
          // 排除当前文件夹
          directoryCount++;
        }
      }

      // 构建树节点
      const node: TreeNode = {
        name: item.name,
        path: item.path,
        type: item.isSymbolicLink ? 'link' : (item.isDirectory ? 'directory' : 'file'),
        depth: item.depth
      };

      if (item.isSymbolicLink) {
        if (this.options.includeLink) {
          node.size = new BigNumber(item.size.toString());
        }
      } else if (item.isFile) {
        node.size = new BigNumber(item.size.toString());
      } else if (item.isDirectory) {
        node.children = children;
      }

      return node;
    };

    const rootNode = await this.traverseFileSystem(folderPath, nodeCallback);
    
    if (!rootNode) {
      throw new Error(`无法构建根节点: ${folderPath}`);
    }

    return {
      tree: rootNode,
      fileCount,
      directoryCount,
      linkCount
    };
  }

  /**
   * 构建懒加载目录树
   * @param folderPath 文件夹路径
   * @param initialDepth 初始加载深度
   * @param lazyOptions 懒加载选项
   * @returns 构建结果
   */
  private async buildLazyTreeNodeJs(folderPath: string, initialDepth: number, lazyOptions: LazyTreeOptions = {}): Promise<LazyTreeResult> {
    let loadedFileCount = 0;
    let loadedDirectoryCount = 0;
    let loadedLinkCount = 0;

    // 节点处理回调：构建懒加载树节点并统计数量
    const nodeCallback: TraverseNodeCallback<LazyTreeNode> = (item, children = []) => {
      // 统计数量（只统计已加载的节点）
      if (item.isSymbolicLink) {
        loadedLinkCount++;
      } else if (item.isFile) {
        loadedFileCount++;
      } else if (item.isDirectory) {
        if (item.path !== folderPath) {
          // 排除当前文件夹
          loadedDirectoryCount++;
        }
      }

      // 构建懒加载树节点
      const node: LazyTreeNode = {
        name: item.name,
        path: item.path,
        type: item.isSymbolicLink ? 'link' : (item.isDirectory ? 'directory' : 'file'),
        depth: item.depth,
        loaded: item.depth < initialDepth, // 在初始深度内的节点标记为已加载
        hasChildren: item.isDirectory ? undefined : undefined // 稍后设置
      };

      if (item.isSymbolicLink) {
        if (this.options.includeLink) {
          node.size = new BigNumber(item.size.toString());
        }
      } else if (item.isFile) {
        node.size = new BigNumber(item.size.toString());
      } else if (item.isDirectory) {
        node.children = children;
        // 如果在初始深度范围内，标记为已加载，否则需要检查是否有子节点
        if (item.depth < initialDepth) {
          node.loaded = true;
          node.hasChildren = children.length > 0;
        } else {
          node.loaded = false;
          // 需要检查是否有子节点，但不加载它们
          node.hasChildren = undefined; // 将在后续设置
        }
      }

      return node;
    };

    // 使用专门的懒加载遍历方法
    const rootNode = await this.traverseLazyFileSystem(folderPath, nodeCallback, initialDepth);
    
    if (!rootNode) {
      throw new Error(`无法构建懒加载根节点: ${folderPath}`);
    }

    // 根据配置决定是否预检查未加载的目录节点的hasChildren属性
    const preCheckChildren = lazyOptions.preCheckChildren ?? false;
    if (preCheckChildren) {
      await this.setHasChildrenForUnloadedNodes(rootNode);
    }

    return {
      tree: rootNode,
      loadedFileCount,
      loadedDirectoryCount,
      loadedLinkCount
    };
  }

  /**
   * 构建单个懒加载节点
   * @param itemPath 项目路径
   * @param depth 深度
   * @param preCheckChildren 是否预先检查子节点，默认false（性能优化）
   * @returns 懒加载节点或null
   */
  private async buildSingleLazyNode(itemPath: string, depth: number, preCheckChildren: boolean = false): Promise<LazyTreeNode | null> {
    // 检查是否应该忽略此路径
    if (this.shouldIgnorePath(this.options.ignores, itemPath, this.options.includeHidden)) {
      return null;
    }

    let stats;
    try {
      // 获取文件统计信息
      stats = await fs.lstat(itemPath, {bigint: true});
    } catch (error) {
      this.handleError(error as Error, `无法获取文件信息: ${(error as Error).message}`, itemPath);
      return null;
    }

    if (this.options.inodeCheck) {
      if (this.checkInode(stats)) return null;
    }

    const isSymbolicLink = stats.isSymbolicLink();
    const isDirectory = stats.isDirectory();
    const isFile = stats.isFile();
    const fileSize = stats.size;

    const node: LazyTreeNode = {
      name: path.basename(itemPath),
      path: itemPath,
      type: isSymbolicLink ? 'link' : (isDirectory ? 'directory' : 'file'),
      depth,
      loaded: !isDirectory, // 文件和链接默认已加载，目录默认未加载
      hasChildren: isDirectory ? undefined : undefined
    };

    if (isSymbolicLink) {
      if (this.options.includeLink) {
        node.size = new BigNumber(fileSize.toString());
      }
    } else if (isFile) {
      node.size = new BigNumber(fileSize.toString());
    } else if (isDirectory) {
      node.children = [];
      node.loaded = false;
      
      // 根据配置决定是否预先检查子节点
      if (preCheckChildren) {
        try {
          const entries = await fs.readdir(itemPath);
          node.hasChildren = entries.length > 0;
        } catch (error) {
          node.hasChildren = false;
        }
      } else {
        // 不预检查，设置为undefined，将在需要时检查
        node.hasChildren = undefined;
      }
    }

    return node;
  }

  /**
   * 为未加载的目录节点设置hasChildren属性
   * @param node 根节点
   */
  private async setHasChildrenForUnloadedNodes(node: LazyTreeNode): Promise<void> {
    if (node.type === 'directory' && !node.loaded && node.hasChildren === undefined) {
      try {
        const entries = await fs.readdir(node.path);
        node.hasChildren = entries.length > 0;
      } catch (error) {
        node.hasChildren = false;
      }
    }

    // 递归处理子节点
    if (node.children) {
      await Promise.all(node.children.map(child => this.setHasChildrenForUnloadedNodes(child)));
    }
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
   * 通用文件系统遍历方法
   * @param rootPath 根路径
   * @param nodeCallback 节点处理回调
   * @returns 遍历结果
   */
  private async traverseFileSystem<T>(rootPath: string, nodeCallback: TraverseNodeCallback<T>): Promise<T | null> {
    /**
     * 递归遍历项目
     * @param itemPath 项目路径
     * @param depth 当前深度
     * @returns 处理结果
     */
    const traverseItem = async (itemPath: string, depth: number = 0): Promise<T | null> => {
      // 检查深度限制
      if (depth > this.options.maxDepth) {
        return null;
      }

      // 检查是否应该忽略此路径
      if (this.shouldIgnorePath(this.options.ignores, itemPath, this.options.includeHidden)) {
        return null;
      }

      let stats;
      try {
        // 获取文件统计信息
        stats = await fs.lstat(itemPath, {bigint: true});
      } catch (error) {
        this.handleError(error as Error, `无法获取文件信息: ${(error as Error).message}`, itemPath);
        return null;
      }

      if (this.options.inodeCheck) {
        if (this.checkInode(stats)) return null;
      }

      const isSymbolicLink = stats.isSymbolicLink();
      const isDirectory = stats.isDirectory();
      const isFile = stats.isFile();
      const fileSize = stats.size;

      // 构建文件系统项目信息
      const item: FileSystemItem = {
        path: itemPath,
        stats,
        isFile,
        isDirectory,
        isSymbolicLink,
        size: fileSize,
        depth,
        name: path.basename(itemPath)
      };

      let children: T[] = [];

      if (isDirectory) {
        let entries;
        try {
          // 读取目录内容
          entries = await fs.readdir(itemPath);
        } catch (error) {
          this.handleError(error as Error, `无法读取目录: ${(error as Error).message}`, itemPath);
          // 目录读取失败，但仍然处理当前节点
          return nodeCallback(item, children);
        }

        // 使用并发控制处理子项目
        children = await SimpleSemaphore.concurrentMapFiltered(
          entries,
          this.options.concurrency,
          async (entry) => {
            const childPath = join(itemPath, entry);
            return await traverseItem(childPath, depth + 1);
          }
        ) as T[];
      }

      // 调用节点处理回调并返回结果
      return nodeCallback(item, children);
    };

    return await traverseItem(rootPath);
  }

  /**
   * 懒加载专用文件系统遍历方法
   * @param rootPath 根路径
   * @param nodeCallback 节点处理回调
   * @param maxDepth 最大遍历深度
   * @returns 遍历结果
   */
  private async traverseLazyFileSystem<T>(
    rootPath: string,
    nodeCallback: TraverseNodeCallback<T>,
    maxDepth: number
  ): Promise<T | null> {
    /**
     * 递归遍历项目
     * @param itemPath 项目路径
     * @param depth 当前深度
     * @returns 处理结果
     */
    const traverseItem = async (itemPath: string, depth: number = 0): Promise<T | null> => {
      // 检查深度限制（使用传入的maxDepth而不是options中的）
      if (depth > maxDepth) {
        return null;
      }

      // 检查是否应该忽略此路径
      if (this.shouldIgnorePath(this.options.ignores, itemPath, this.options.includeHidden)) {
        return null;
      }

      let stats;
      try {
        // 获取文件统计信息
        stats = await fs.lstat(itemPath, {bigint: true});
      } catch (error) {
        this.handleError(error as Error, `无法获取文件信息: ${(error as Error).message}`, itemPath);
        return null;
      }

      if (this.options.inodeCheck) {
        if (this.checkInode(stats)) return null;
      }

      const isSymbolicLink = stats.isSymbolicLink();
      const isDirectory = stats.isDirectory();
      const isFile = stats.isFile();
      const fileSize = stats.size;

      // 构建文件系统项目信息
      const item: FileSystemItem = {
        path: itemPath,
        stats,
        isFile,
        isDirectory,
        isSymbolicLink,
        size: fileSize,
        depth,
        name: path.basename(itemPath)
      };

      let children: T[] = [];

      if (isDirectory) {
        let entries;
        try {
          // 读取目录内容
          entries = await fs.readdir(itemPath);
        } catch (error) {
          this.handleError(error as Error, `无法读取目录: ${(error as Error).message}`, itemPath);
          // 目录读取失败，但仍然处理当前节点
          return nodeCallback(item, children);
        }

        // 使用并发控制处理子项目
        children = await SimpleSemaphore.concurrentMapFiltered(
          entries,
          this.options.concurrency,
          async (entry) => {
            const childPath = join(itemPath, entry);
            return await traverseItem(childPath, depth + 1);
          }
        ) as T[];
      }

      // 调用节点处理回调并返回结果
      return nodeCallback(item, children);
    };

    return await traverseItem(rootPath);
  }
}
