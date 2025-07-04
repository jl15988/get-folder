import { TreeNode, LazyTreeNode } from '../types';
import { BigNumber } from 'bignumber.js';
import { FileSystemUtils } from './FileSystemUtils';

/**
 * 节点格式化回调函数类型
 */
export type NodeFormatter<T = TreeNode | LazyTreeNode> = (node: T) => string;

/**
 * 树形结构格式化选项
 */
export interface TreeFormatterOptions {
  /**
   * 自定义连接符
   */
  connectors?: {
    branch?: string;    // ├──
    lastBranch?: string; // └──
    vertical?: string;   // │
    space?: string;      // 空格
  };
  /**
   * 最大显示深度，默认无限制
   */
  maxDisplayDepth?: number;
  /**
   * 节点内容格式化器 - 可以是单个函数或函数数组
   */
  nodeFormatter?: NodeFormatter | NodeFormatter[];
}

/**
 * 树形结构格式化工具类
 */
export class TreeFormatter {
  private static readonly DEFAULT_CONNECTORS = {
    branch: '├── ',
    lastBranch: '└── ',
    vertical: '│   ',
    space: '    '
  };

  /**
   * 格式化树为字符串
   * @param tree 树节点
   * @param options 格式化选项
   * @returns 格式化后的字符串
   */
  static formatTree<T extends TreeNode | LazyTreeNode>(
    tree: T,
    options: TreeFormatterOptions = {}
  ): string {
    const lines: string[] = [];
    const connectors = { ...TreeFormatter.DEFAULT_CONNECTORS, ...options.connectors };
    const maxDepth = options.maxDisplayDepth ?? Number.MAX_SAFE_INTEGER;
    const combinedFormatter = TreeFormatter.combineFormatters(options.nodeFormatter);
    
    TreeFormatter.formatTreeNode(tree, '', true, lines, connectors, maxDepth, combinedFormatter);
    
    return lines.join('\n');
  }

  /**
   * 组合多个格式化器
   * @param formatter 单个格式化器或格式化器数组
   * @returns 组合后的格式化器
   */
  private static combineFormatters<T extends TreeNode | LazyTreeNode>(
    formatter?: NodeFormatter<T> | NodeFormatter<T>[]
  ): NodeFormatter<T> {
    if (!formatter) {
      return TreeFormatter.defaultNodeFormatter;
    }

    if (typeof formatter === 'function') {
      return formatter;
    }

    if (Array.isArray(formatter) && formatter.length > 0) {
      return (node: T): string => {
        // 依次应用每个格式化器，每次都使用前一个的结果作为基础
        return formatter.reduce((result, fmt, index) => {
          if (index === 0) {
            // 第一个格式化器直接处理原始节点
            return fmt(node);
          } else {
            // 后续格式化器需要在前一个结果基础上继续处理
            // 创建一个临时节点，将name设置为前一个格式化器的结果
            const tempNode = { ...node, name: result };
            return fmt(tempNode);
          }
        }, '');
      };
    }

    return TreeFormatter.defaultNodeFormatter;
  }

  /**
   * 格式化树节点（内部递归方法）
   */
  private static formatTreeNode<T extends TreeNode | LazyTreeNode>(
    node: T,
    prefix: string,
    isLast: boolean,
    lines: string[],
    connectors: Required<TreeFormatterOptions>['connectors'] & {},
    maxDepth: number,
    nodeFormatter: NodeFormatter<T>
  ): void {
    // 检查深度限制
    if (node.depth >= maxDepth) {
      return;
    }

    const connector = isLast ? connectors.lastBranch : connectors.branch;
    const nodeContent = nodeFormatter(node);
    
    lines.push(`${prefix}${connector}${nodeContent}`);

    // 处理子节点
    if (node.children && node.children.length > 0) {
      const childPrefix = prefix + (isLast ? connectors.space : connectors.vertical);
      
      node.children.forEach((child, index) => {
        const isChildLast = index === node.children!.length - 1;
        TreeFormatter.formatTreeNode(
          child as T, 
          childPrefix, 
          isChildLast, 
          lines, 
          connectors, 
          maxDepth, 
          nodeFormatter
        );
      });
    }
  }

  /**
   * 默认节点格式化器（纯文本，只显示名称）
   */
  static defaultNodeFormatter = (node: TreeNode | LazyTreeNode): string => {
    return node.name;
  };

  /**
   * 统计树节点信息
   */
  static getTreeStats(tree: TreeNode): { 
    fileCount: number; 
    directoryCount: number; 
    linkCount: number; 
    totalSize: BigNumber;
  } {
    let fileCount = 0;
    let directoryCount = 0;
    let linkCount = 0;
    let totalSize = new BigNumber(0);

    const traverse = (node: TreeNode): void => {
      switch (node.type) {
        case 'file':
          fileCount++;
          break;
        case 'directory':
          directoryCount++;
          break;
        case 'link':
          linkCount++;
          break;
      }

      if (node.size) {
        totalSize = totalSize.plus(node.size);
      }

      if (node.children) {
        node.children.forEach(traverse);
      }
    };

    traverse(tree);
    return { fileCount, directoryCount, linkCount, totalSize };
  }

  /**
   * 统计懒加载树节点信息
   */
  static getLazyTreeStats(tree: LazyTreeNode): { 
    loadedFileCount: number; 
    loadedDirectoryCount: number; 
    loadedLinkCount: number;
    unloadedDirectoryCount: number;
    totalLoadedSize: BigNumber;
  } {
    let loadedFileCount = 0;
    let loadedDirectoryCount = 0;
    let loadedLinkCount = 0;
    let unloadedDirectoryCount = 0;
    let totalLoadedSize = new BigNumber(0);

    const traverse = (node: LazyTreeNode): void => {
      if (node.type === 'directory') {
        if (node.loaded) {
          loadedDirectoryCount++;
        } else {
          unloadedDirectoryCount++;
        }
      } else if (node.type === 'file') {
        loadedFileCount++;
      } else if (node.type === 'link') {
        loadedLinkCount++;
      }

      if (node.size) {
        totalLoadedSize = totalLoadedSize.plus(node.size);
      }

      if (node.children) {
        node.children.forEach(traverse);
      }
    };

    traverse(tree);
    return { 
      loadedFileCount, 
      loadedDirectoryCount, 
      loadedLinkCount,
      unloadedDirectoryCount,
      totalLoadedSize
    };
  }
}

// ======================== 预设的节点格式化器 ========================

/**
 * 预设节点格式化器集合
 */
export class NodeFormatters {
  /**
   * 带图标的格式化器
   */
  static withIcons = (icons?: {
    directory?: string;
    file?: string;
    link?: string;
  }) => {
    const defaultIcons = {
      directory: '📁',
      file: '📄',
      link: '🔗'
    };
    const finalIcons = { ...defaultIcons, ...icons };

    return (node: TreeNode | LazyTreeNode): string => {
      const icon = finalIcons[node.type] || finalIcons.file;
      return `${icon} ${node.name}`;
    };
  };

  /**
   * 带文件大小的格式化器
   */
  static withSize = () => {
    return (node: TreeNode | LazyTreeNode): string => {
      const sizeStr = node.size ? ` (${FileSystemUtils.formatFileSize(node.size)})` : '';
      return `${node.name}${sizeStr}`;
    }
  };

  /**
   * 懒加载状态格式化器
   */
  static withLazyStatus = (statusIcons?: {
    loaded?: string;
    unloaded?: string;
    empty?: string;
  }) => {
    const defaultStatusIcons = {
      loaded: '✅',
      unloaded: '🔀',
      empty: '📭'
    };
    const finalStatusIcons = { ...defaultStatusIcons, ...statusIcons };

    return (node: TreeNode | LazyTreeNode): string => {
      let content = node.name;

      // 添加懒加载状态（仅对懒加载节点且为目录）
      if ('loaded' in node && node.type === 'directory') {
        const lazyNode = node as LazyTreeNode;
        let statusIcon = '';

        if (!lazyNode.loaded) {
          statusIcon = lazyNode.hasChildren ? `${finalStatusIcons.unloaded} 未加载` : `${finalStatusIcons.empty} 空目录`;
        } else {
          statusIcon = lazyNode.hasChildren ? `${finalStatusIcons.loaded} 已加载` : `${finalStatusIcons.empty} 空目录`;
        }

        if (statusIcon) {
          content += ` [${statusIcon}]`;
        }
      }

      return content;
    };
  };

  /**
   * 组合格式化器 - 图标 + 大小 + 懒加载状态
   */
  static fullFormatter = (options?: {
    icons?: {
      directory?: string;
      file?: string;
      link?: string;
    };
    statusIcons?: {
      loaded?: string;
      unloaded?: string;
      empty?: string;
    };
  }) => {
    const iconFormatter = NodeFormatters.withIcons(options?.icons);
    const statusFormatter = NodeFormatters.withLazyStatus(options?.statusIcons);

    return (node: TreeNode | LazyTreeNode): string => {
      const iconPart = iconFormatter(node);
      const sizeStr = node.size ? ` (${FileSystemUtils.formatFileSize(node.size)})` : '';
      const statusPart = statusFormatter(node);

      // 如果statusPart包含状态信息，使用它；否则使用iconPart
      const basePart = statusPart.includes('[') ? statusPart : iconPart;

      return `${basePart}${sizeStr}`;
    };
  };

}