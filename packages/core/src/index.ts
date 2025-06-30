export { FileSystemAnalyzer } from './analyzer/FileSystemAnalyzer';
export { FolderSizeCalculator } from './calculator/FolderSizeCalculator';
export { TreeBuilder } from './tree/TreeBuilder';
export { FileSystemUtils } from './utils/FileSystemUtils';

// 导出类型定义
export type {
  FileSystemItem,
  DirectoryItem,
  FileItem,
  TreeNode,
  DirectoryTreeNode,
  FileTreeNode,
  AnalyzerOptions,
  SizeCalculationOptions,
  TreeBuildOptions,
  FolderSizeResult,
  SystemAcceleration,
  ProgressCallback,
  ErrorCallback
} from './types';

// 导出枚举
export { ItemType, AccelerationType } from './types';
