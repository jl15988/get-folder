import * as path from "node:path";

/**
 * 路径工具
 */
export class PathUtil {
  /**
   * 判断文件路径是否为隐藏文件（简化实现，仅判断是否以'.'开头）
   * @param filePath 文件路径
   */
  static isHiddenFile(filePath: string): boolean {
    const name = path.basename(filePath);

    // 空文件名或当前目录/上级目录
    if (!name || name === '.' || name === '..') {
      return false;
    }

    // 跨平台检查：以 . 开头的文件
    return name.startsWith('.');
  }
}