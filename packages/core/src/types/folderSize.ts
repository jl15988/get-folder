import {BigNumber} from "bignumber.js";

/**
 * 错误信息接口
 */
export interface FolderSizeError {
  /**
   * 错误对象
   */
  error: Error;
  /** 错误消息 */
  message: string;
  /** 发生错误的路径 */
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
  /** 最大深度限制 */
  maxDepth?: number;
  /** 忽略的文件/目录模式 */
  ignores?: RegExp[];
  /** 是否包含隐藏文件 */
  includeHidden?: boolean;
  /** 并发限制 */
  concurrency?: number;
  /** 是否忽略错误继续计算 */
  ignoreErrors?: boolean;
  /** 错误处理回调 */
  onError?: ErrorCallback;
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
  /** 连接数量 */
  linkCount: number;
}
