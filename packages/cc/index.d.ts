/**
 * 配置选项接口
 */
export interface CalculationOptions {
  /** 是否包含隐藏文件 */
  includeHidden?: boolean;
  /** 最大深度 */
  maxDepth?: number;
  /** 忽略模式列表 */
  ignorePatterns?: string[];
  /** 是否启用硬链接检测 */
  inodeCheck?: boolean;
  /** 是否包含符号链接大小 */
  includeLink?: boolean;
}

/**
 * 计算结果接口
 */
export interface CalculationResult {
  /** 总大小（字符串形式的数字） */
  totalSize: string;
  /** 文件数量 */
  fileCount: number;
  /** 目录数量 */
  directoryCount: number;
  /** 链接数量 */
  linkCount: number;
}

/**
 * 文件系统项目类型
 */
export type ItemType = 'file' | 'directory' | 'symlink' | 'unknown';

/**
 * 文件系统项目接口
 */
export interface FileSystemItem {
  /** 文件路径 */
  path: string;
  /** 文件名 */
  name: string;
  /** 文件大小（字符串形式的数字） */
  size: string;
  /** 创建时间（字符串形式的时间戳） */
  createdTime: string;
  /** 修改时间（字符串形式的时间戳） */
  modifiedTime: string;
  /** 访问时间（字符串形式的时间戳） */
  accessedTime: string;
  /** inode 号（字符串形式的数字） */
  inode: string;
  /** 项目类型 */
  type: ItemType;
}

/**
 * 目录树节点接口
 */
export interface TreeNode {
  /** 文件系统项目信息 */
  item: FileSystemItem;
  /** 总大小（包含子项目，字符串形式的数字） */
  totalSize: string;
  /** 深度 */
  depth: number;
  /** 子节点 */
  children: TreeNode[];
}

/**
 * 平台类型
 */
export type Platform = 'windows' | 'linux' | 'macos' | 'unknown';

/**
 * C++ 扩展加速器类
 */
export declare class NativeAccelerator {
  /** 是否已初始化 */
  private initialized: boolean;

  /**
   * 构造函数
   */
  constructor();

  /**
   * 初始化加速器
   * @returns 是否成功初始化
   */
  initialize(): boolean;

  /**
   * 计算文件夹大小
   * @param path 文件夹路径
   * @param options 配置选项
   * @returns 计算结果
   */
  calculateFolderSize(path: string, options?: CalculationOptions): CalculationResult;

  /**
   * 构建目录树
   * @param path 目录路径
   * @param options 配置选项
   * @returns 目录树
   */
  buildDirectoryTree(path: string, options?: CalculationOptions): TreeNode | null;

  /**
   * 检查路径是否存在
   * @param path 文件路径
   * @returns 是否存在
   */
  pathExists(path: string): boolean;

  /**
   * 获取文件信息
   * @param path 文件路径
   * @param followSymlinks 是否跟随符号链接
   * @returns 文件信息
   */
  getItemInfo(path: string, followSymlinks?: boolean): FileSystemItem;

  /**
   * 清理加速器资源
   */
  cleanup(): void;
}

/**
 * 获取平台信息
 * @returns 平台名称
 */
export declare function getPlatform(): Platform;

/**
 * 检查是否支持原生加速
 * @returns 是否支持
 */
export declare function isNativeAccelerationSupported(): boolean;

/**
 * 创建并初始化加速器实例
 * @returns 加速器实例
 */
export declare function createAccelerator(): NativeAccelerator;

/**
 * 原生绑定对象（用于高级用例）
 */
export declare const nativeBinding: {
  initializeAccelerator(): boolean;
  calculateFolderSize(path: string, options: CalculationOptions): any;
  buildDirectoryTree(path: string, options: CalculationOptions): any;
  pathExists(path: string): boolean;
  getItemInfo(path: string, followSymlinks: boolean): any;
  cleanupAccelerator(): boolean;
} | null; 