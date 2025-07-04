import {BigNumber} from "bignumber.js";

/**
 * 错误信息接口
 */
export interface FolderSizeError {
  /**
   * 错误对象
   */
  error: Error;
  /**
   * 错误消息
   */
  message: string;
  /**
   *  发生错误的路径
   */
  path: string;
}

/**
 * 错误处理回调函数类型
 * @param error 错误信息
 * @returns 是否继续计算，true=继续，false=停止
 */
export type ErrorCallback = (error: FolderSizeError) => boolean;

/**
 * 大小计算选项接口
 */
export interface FolderSizeOptions {
  /**
   * 最大深度限制，默：Number.MAX_SAFE_INTEGER
   */
  maxDepth?: number;
  /**
   * 忽略的文件/目录模式，默认：[]
   */
  ignores?: RegExp[];
  /**
   * 是否包含隐藏文件，默认：true
   *
   * 简单的隐藏文件判断逻辑（文件名开头为'.'）
   */
  includeHidden?: boolean;
  /**
   * 是否包含符号连接文件，默认：true
   *
   * 如果开启，统计结果一般比系统统计稍微大一点
   */
  includeLink?: boolean;
  /**
   * 并发限制，默认：2
   *
   * 适当调整能够提升统计效率，注意：并非越大越好
   */
  concurrency?: number;
  /**
   * 是否忽略错误继续计算，默认：false
   */
  ignoreErrors?: boolean;
  /**
   * 是否硬链接检测，默认：true
   *
   * 如果开启，统计结果一般比系统统计略小
   */
  inodeCheck?: boolean;
  /**
   * 错误处理回调，默认：() => true
   */
  onError?: ErrorCallback;
}

/**
 * 文件夹大小计算结果接口
 */
export interface FolderSizeResult {
  /**
   * 总大小
   */
  size: BigNumber;
  /**
   * 文件数量
   */
  fileCount: number;
  /**
   * 目录数量
   */
  directoryCount: number;
  /**
   * 连接数量
   */
  linkCount: number;
}

/**
 * 目录树节点接口
 */
export interface TreeNode {
  /**
   * 节点名称
   */
  name: string;
  /**
   * 节点完整路径
   */
  path: string;
  /**
   * 节点类型
   */
  type: 'file' | 'directory' | 'link';
  /**
   * 文件大小（仅文件有效）
   */
  size?: BigNumber;
  /**
   * 子节点（仅目录有效）
   */
  children?: TreeNode[];
  /**
   * 深度
   */
  depth: number;
}

/**
 * 目录树构建结果接口
 */
export interface FolderTreeResult {
  /**
   * 根节点
   */
  tree: TreeNode;
  /**
   * 总文件数量
   */
  fileCount: number;
  /**
   * 总目录数量
   */
  directoryCount: number;
  /**
   * 总连接数量
   */
  linkCount: number;
}

/**
 * 文件系统项目信息接口
 */
export interface FileSystemItem {
  /**
   * 项目路径
   */
  path: string;
  /**
   * 文件统计信息
   */
  stats: any; // fs.Stats with bigint
  /**
   * 是否为文件
   */
  isFile: boolean;
  /**
   * 是否为目录
   */
  isDirectory: boolean;
  /**
   * 是否为符号链接
   */
  isSymbolicLink: boolean;
  /**
   * 文件大小
   */
  size: bigint;
  /**
   * 当前深度
   */
  depth: number;
  /**
   * 项目名称
   */
  name: string;
}

/**
 * 遍历节点处理回调函数类型
 * @param item 文件系统项目信息
 * @param children 子项目（仅目录有效）
 * @returns 处理结果，可以是任意类型或null
 */
export type TraverseNodeCallback<T> = (item: FileSystemItem, children?: T[]) => T | null;

/**
 * 懒加载树节点接口
 */
export interface LazyTreeNode {
  /**
   * 节点名称
   */
  name: string;
  /**
   * 节点完整路径
   */
  path: string;
  /**
   * 节点类型
   */
  type: 'file' | 'directory' | 'link';
  /**
   * 文件大小（仅文件有效）
   */
  size?: BigNumber;
  /**
   * 子节点（仅目录有效）
   */
  children?: LazyTreeNode[];
  /**
   * 深度
   */
  depth: number;
  /**
   * 是否已加载子节点
   */
  loaded: boolean;
  /**
   * 是否有子节点（用于目录展开标识）
   */
  hasChildren?: boolean;
}

/**
 * 懒加载树构建选项
 */
export interface LazyTreeOptions extends FolderSizeOptions {
  /**
   * 初始加载深度，默认为1（只加载第一层）
   */
  initialDepth?: number;
  /**
   * 是否预先检查目录是否有子节点，默认：false
   */
  preCheckChildren?: boolean;
}

/**
 * 懒加载树构建结果
 */
export interface LazyTreeResult {
  /**
   * 根节点
   */
  tree: LazyTreeNode;
  /**
   * 已加载的文件数量
   */
  loadedFileCount: number;
  /**
   * 已加载的目录数量
   */
  loadedDirectoryCount: number;
  /**
   * 已加载的连接数量
   */
  loadedLinkCount: number;
}
