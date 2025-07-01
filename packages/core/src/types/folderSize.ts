import {BigNumber} from "bignumber.js";

/**
 * 大小计算选项接口
 */
export interface FolderSizeOptions {
  /** 是否跟随符号链接 */
  followSymlinks?: boolean;
  /** 最大深度限制 */
  maxDepth?: number;
  /** 忽略的文件/目录模式 */
  ignorePatterns?: RegExp[];
  /** 是否包含隐藏文件 */
  includeHidden?: boolean;
  /** 是否使用快速模式，快速模式使用系统级的脚本，比如直接获取NTFS的MFT信息 */
  fast?: boolean;
  /** 并发限制 */
  concurrency?: number;
}

/**
 * 文件夹大小计算结果接口
 */
export interface FolderSizeResult {
  /** 总大小 */
  size: BigNumber;
  /** 文件数量 */
  fileCount: number;
  /** 目录数量 */
  directoryCount: number;
}