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
   * 文件夹最大深度限制，默：Number.MAX_SAFE_INTEGER
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
