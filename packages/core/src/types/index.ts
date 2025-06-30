import { Stats } from 'fs';

/**
 * 文件系统项目类型枚举
 */
export enum ItemType {
  /** 文件 */
  FILE = 'file',
  /** 目录 */
  DIRECTORY = 'directory',
  /** 符号链接 */
  SYMBOLIC_LINK = 'symbolic_link',
  /** 未知类型 */
  UNKNOWN = 'unknown'
}

/**
 * 系统加速类型枚举
 */
export enum AccelerationType {
  /** 纯 Node.js 实现 */
  NODEJS = 'nodejs',
  /** Windows NTFS MFT 加速 */
  WINDOWS_MFT = 'windows_mft',
  /** Linux 系统调用加速 */
  LINUX_SYSCALL = 'linux_syscall',
  /** macOS 系统调用加速 */
  MACOS_SYSCALL = 'macos_syscall'
}

/**
 * 基础文件系统项目接口
 */
export interface FileSystemItem {
  /** 文件/目录名称 */
  name: string;
  /** 完整路径 */
  path: string;
  /** 项目类型 */
  type: ItemType;
  /** 文件大小（字节），目录为 0 */
  size: bigint;
  /** 创建时间 */
  createdAt: Date;
  /** 修改时间 */
  modifiedAt: Date;
  /** 访问时间 */
  accessedAt: Date;
  /** 文件系统统计信息 */
  stats: Stats;
}

/**
 * 目录项目接口
 */
export interface DirectoryItem extends FileSystemItem {
  type: ItemType.DIRECTORY;
  /** 子项目列表 */
  children: FileSystemItem[];
  /** 目录总大小（包含所有子项目） */
  totalSize: bigint;
  /** 子目录数量 */
  directoryCount: number;
  /** 文件数量 */
  fileCount: number;
}

/**
 * 文件项目接口
 */
export interface FileItem extends FileSystemItem {
  type: ItemType.FILE;
  /** 文件扩展名 */
  extension: string;
  /** MIME 类型（可选） */
  mimeType?: string;
}

/**
 * 树节点基础接口
 */
export interface TreeNode {
  /** 节点名称 */
  name: string;
  /** 节点路径 */
  path: string;
  /** 节点类型 */
  type: ItemType;
  /** 节点大小 */
  size: bigint;
  /** 节点深度 */
  depth: number;
  /** 父节点路径 */
  parentPath?: string;
}

/**
 * 目录树节点接口
 */
export interface DirectoryTreeNode extends TreeNode {
  type: ItemType.DIRECTORY;
  /** 子节点 */
  children: TreeNode[];
  /** 总大小（包含子节点） */
  totalSize: bigint;
  /** 是否展开 */
  expanded: boolean;
}

/**
 * 文件树节点接口
 */
export interface FileTreeNode extends TreeNode {
  type: ItemType.FILE;
  /** 文件扩展名 */
  extension: string;
}

/**
 * 系统加速配置接口
 */
export interface SystemAcceleration {
  /** 是否启用系统加速 */
  enabled: boolean;
  /** 加速类型 */
  type: AccelerationType;
  /** 是否回退到 Node.js 实现 */
  fallbackToNodeJs: boolean;
}

/**
 * 分析器选项接口
 */
export interface AnalyzerOptions {
  /** 是否跟随符号链接 */
  followSymlinks?: boolean;
  /** 最大深度限制 */
  maxDepth?: number;
  /** 忽略的文件/目录模式 */
  ignorePatterns?: RegExp[];
  /** 是否包含隐藏文件 */
  includeHidden?: boolean;
  /** 系统加速配置 */
  systemAcceleration?: SystemAcceleration;
  /** 并发限制 */
  concurrency?: number;
}

/**
 * 大小计算选项接口
 */
export interface SizeCalculationOptions extends AnalyzerOptions {
  /** 是否返回 BigInt 类型（默认 true） */
  useBigInt?: boolean;
  /** 是否包含详细错误信息 */
  includeErrors?: boolean;
  /** 是否严格模式（遇到错误时抛出异常） */
  strict?: boolean;
}

/**
 * 树构建选项接口
 */
export interface TreeBuildOptions extends AnalyzerOptions {
  /** 是否只构建目录树 */
  directoriesOnly?: boolean;
  /** 是否只构建文件树 */
  filesOnly?: boolean;
  /** 是否包含大小信息 */
  includeSizes?: boolean;
  /** 排序方式 */
  sortBy?: 'name' | 'size' | 'date';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 文件夹大小计算结果接口
 */
export interface FolderSizeResult {
  /** 总大小 */
  size: bigint | number;
  /** 文件数量 */
  fileCount: number;
  /** 目录数量 */
  directoryCount: number;
  /** 计算耗时（毫秒） */
  duration: number;
  /** 错误列表（如果有） */
  errors?: Error[];
  /** 使用的加速类型 */
  accelerationType: AccelerationType;
}

/**
 * 进度回调函数类型
 */
export type ProgressCallback = (current: number, total: number, currentPath: string) => void;

/**
 * 错误处理回调函数类型
 */
export type ErrorCallback = (error: Error, path: string) => void; 