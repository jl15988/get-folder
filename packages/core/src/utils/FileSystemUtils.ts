import {BigNumber} from 'bignumber.js';

/**
 * 文件系统工具类
 * 提供常用的文件系统操作辅助功能
 */
export class FileSystemUtils {
  /**
   * 格式化文件大小为人类可读的字符串
   * @param bytes 字节大小
   * @param decimals 小数位数
   * @returns 格式化后的大小字符串
   */
  static formatFileSize(bytes?: string | BigNumber, decimals: number = 2): string {
    if (!bytes) {
      return '0 Bytes';
    }
    if (typeof bytes === 'string') {
      if (bytes.length === 0 || bytes.trim().length === 0) {
        return '0 Bytes';
      }
    }

    const size = new BigNumber(bytes);

    // 如果大小为0，直接返回
    if (size.isZero()) {
      return '0 Bytes';
    }

    const k = new BigNumber(1024);
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    // 计算单位级别
    let i = 0;
    let tempSize = size;
    while (tempSize.gte(k) && i < sizes.length - 1) {
      tempSize = tempSize.div(k);
      i++;
    }

    // 计算最终结果
    const result = size.div(k.pow(i));

    return result.toFixed(dm) + ' ' + sizes[i];
  }

  /**
   * 获取路径的相对路径
   * @param basePath 基础路径
   * @param targetPath 目标路径
   * @returns 相对路径
   */
  static getRelativePath(basePath: string, targetPath: string): string {
    const normalize = (path: string) => path.replace(/[\\\/]+/g, '/');
    const base = normalize(basePath);
    const target = normalize(targetPath);

    if (target.startsWith(base)) {
      const relative = target.substring(base.length);
      return relative.startsWith('/') ? relative.substring(1) : relative;
    }

    return target;
  }

  /**
   * 验证路径是否安全（防止路径遍历攻击）
   * @param path 要验证的路径
   * @returns 是否安全
   */
  static isPathSafe(path: string): boolean {
    // 检查路径遍历攻击模式
    const dangerousPatterns = [
      /\.\.\//,  // ../
      /\.\.\\/,  // ..\
      /^\/+/,    // 绝对路径
      /^[a-zA-Z]:\\/  // Windows 绝对路径
    ];

    return !dangerousPatterns.some(pattern => pattern.test(path));
  }
}
