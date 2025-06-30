import { TreeNode, DirectoryTreeNode, ItemType } from '../types';

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
   * 获取文件扩展名的类型分类
   * @param extension 文件扩展名
   * @returns 文件类型分类
   */
  static getFileCategory(extension: string): string {
    const ext = extension.toLowerCase();
    
    const categories: Record<string, string[]> = {
      '图像': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico'],
      '视频': ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', '.m4v'],
      '音频': ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'],
      '文档': ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf'],
      '代码': ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs'],
      '网页': ['.html', '.htm', '.css', '.scss', '.sass', '.less'],
      '配置': ['.json', '.xml', '.yaml', '.yml', '.toml', '.ini', '.conf'],
      '压缩': ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'],
      '可执行': ['.exe', '.msi', '.deb', '.rpm', '.dmg', '.app']
    };

    for (const [category, extensions] of Object.entries(categories)) {
      if (extensions.includes(ext)) {
        return category;
      }
    }

    return '其他';
  }

  /**
   * 按文件类型分组树节点
   * @param nodes 树节点数组
   * @returns 按类型分组的节点
   */
  static groupNodesByType(nodes: TreeNode[]): Record<string, TreeNode[]> {
    const groups: Record<string, TreeNode[]> = {
      '目录': [],
      '图像': [],
      '视频': [],
      '音频': [],
      '文档': [],
      '代码': [],
      '网页': [],
      '配置': [],
      '压缩': [],
      '可执行': [],
      '其他': []
    };

    for (const node of nodes) {
      if (node.type === ItemType.DIRECTORY) {
        groups['目录'].push(node);
      } else if (node.type === ItemType.FILE) {
        const fileNode = node as any;
        const category = this.getFileCategory(fileNode.extension || '');
        groups[category].push(node);
      } else {
        groups['其他'].push(node);
      }
    }

    return groups;
  }

  /**
   * 计算目录树的统计信息
   * @param rootNode 根节点
   * @returns 统计信息
   */
  static calculateTreeStatistics(rootNode: TreeNode): {
    totalSize: bigint;
    fileCount: number;
    directoryCount: number;
    largestFile: TreeNode | null;
    deepestPath: TreeNode | null;
    extensionStats: Record<string, { count: number; size: bigint }>;
  } {
    let totalSize = 0n;
    let fileCount = 0;
    let directoryCount = 0;
    let largestFile: TreeNode | null = null;
    let deepestPath: TreeNode | null = null;
    let maxDepth = 0;
    const extensionStats: Record<string, { count: number; size: bigint }> = {};

    const traverse = (node: TreeNode) => {
      if (node.depth > maxDepth) {
        maxDepth = node.depth;
        deepestPath = node;
      }

      if (node.type === ItemType.FILE) {
        fileCount++;
        totalSize += node.size;

        if (!largestFile || node.size > largestFile.size) {
          largestFile = node;
        }

        const fileNode = node as any;
        const extension = fileNode.extension || '无扩展名';
        if (!extensionStats[extension]) {
          extensionStats[extension] = { count: 0, size: 0n };
        }
        extensionStats[extension].count++;
        extensionStats[extension].size += node.size;

      } else if (node.type === ItemType.DIRECTORY) {
        directoryCount++;
        const dirNode = node as DirectoryTreeNode;
        for (const child of dirNode.children) {
          traverse(child);
        }
      }
    };

    traverse(rootNode);

    return {
      totalSize,
      fileCount,
      directoryCount,
      largestFile,
      deepestPath,
      extensionStats
    };
  }

  /**
   * 在树中查找节点
   * @param rootNode 根节点
   * @param predicate 查找条件
   * @returns 找到的节点数组
   */
  static findNodesInTree(
    rootNode: TreeNode,
    predicate: (node: TreeNode) => boolean
  ): TreeNode[] {
    const results: TreeNode[] = [];

    const search = (node: TreeNode) => {
      if (predicate(node)) {
        results.push(node);
      }

      if (node.type === ItemType.DIRECTORY) {
        const dirNode = node as DirectoryTreeNode;
        for (const child of dirNode.children) {
          search(child);
        }
      }
    };

    search(rootNode);
    return results;
  }

  /**
   * 根据路径查找树节点
   * @param rootNode 根节点
   * @param targetPath 目标路径
   * @returns 找到的节点或 null
   */
  static findNodeByPath(rootNode: TreeNode, targetPath: string): TreeNode | null {
    const normalize = (path: string) => path.replace(/[\\\/]+/g, '/').toLowerCase();
    const normalizedTarget = normalize(targetPath);

    const search = (node: TreeNode): TreeNode | null => {
      if (normalize(node.path) === normalizedTarget) {
        return node;
      }

      if (node.type === ItemType.DIRECTORY) {
        const dirNode = node as DirectoryTreeNode;
        for (const child of dirNode.children) {
          const found = search(child);
          if (found) return found;
        }
      }

      return null;
    };

    return search(rootNode);
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

  /**
   * 生成树的文本表示
   * @param rootNode 根节点
   * @param options 选项
   * @returns 树的文本表示
   */
  static generateTreeText(
    rootNode: TreeNode,
    options: {
      showSizes?: boolean;
      maxDepth?: number;
      indent?: string;
    } = {}
  ): string {
    const {
      showSizes = true,
      maxDepth = Number.MAX_SAFE_INTEGER,
      indent = '  '
    } = options;

    const lines: string[] = [];

    const traverse = (node: TreeNode, depth: number, isLast: boolean, prefix: string = '') => {
      if (depth > maxDepth) return;

      const connector = isLast ? '└── ' : '├── ';
      const sizeText = showSizes ? ` (${this.formatFileSize(node.size)})` : '';
      const line = prefix + connector + node.name + sizeText;
      lines.push(line);

      if (node.type === ItemType.DIRECTORY) {
        const dirNode = node as DirectoryTreeNode;
        const children = dirNode.children;
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');

        children.forEach((child, index) => {
          const isChildLast = index === children.length - 1;
          traverse(child, depth + 1, isChildLast, nextPrefix);
        });
      }
    };

    traverse(rootNode, 0, true);
    return lines.join('\n');
  }
} 