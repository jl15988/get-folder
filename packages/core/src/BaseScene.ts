import {BigIntStats, Stats} from "node:fs";
import {PathUtil} from "./utils/PathUtil";
import {RegExpUtil} from "./utils/RegExpUtil";

export class BaseScene {
  /**
   * 已处理的硬链接
   */
  protected readonly processedInodes = new Set<string>();

  /**
   * 检查是否应该忽略指定路径
   * @param ignores 忽略列表
   * @param itemPath 项目路径
   * @param includeHidden 是否包含隐藏文件
   * @returns 是否应该忽略
   */
  protected shouldIgnorePath(ignores: RegExp[], itemPath: string, includeHidden: boolean = true): boolean {
    // 检查隐藏文件
    if (!includeHidden && PathUtil.isHiddenFile(itemPath)) {
      return true;
    }

    if (ignores && ignores.length > 0) {
      // 检查忽略模式
      return RegExpUtil.tests(ignores, itemPath);
    }

    return false;
  }

  /**
   * 获取inode关键值，如果stats为字符串让直接返回
   * @param stats fs统计信息
   */
  protected getInodeKey(stats: string | BigIntStats | Stats): string {
    if (typeof stats === "string") {
      return stats;
    }
    return `${stats.dev}-${stats.ino}`;
  }

  /**
   * 判断是否已有 inode
   * @param inode inode
   */
  protected hasInode(inode: string | BigIntStats | Stats): boolean {
    return this.processedInodes.has(this.getInodeKey(inode));
  }

  /**
   * 添加 inode
   * @param inode inode
   */
  protected addInode(inode: string | BigIntStats | Stats): void {
    this.processedInodes.add(this.getInodeKey(inode));
  }

  /**
   * 检查 inode，用于防止硬链接重复
   *
   * 如果已有inode将返回true，否则记录inode并返回false
   * @param stats fs统计信息
   */
  protected checkInode(stats: BigIntStats | Stats): boolean {
    const inodeKey = this.getInodeKey(stats);
    if (this.hasInode(inodeKey)) {
      return true;
    }
    this.addInode(inodeKey);
    return false;
  }

  /**
   * 清除 inode
   */
  protected clearInode() {
    this.processedInodes.clear();
  }
}