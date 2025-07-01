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
  static formatFileSize(bytes: number | bigint, decimals: number = 2): string {
    const size = typeof bytes === 'bigint' ? Number(bytes) : bytes;

    if (size === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(size) / Math.log(k));

    return parseFloat((size / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
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