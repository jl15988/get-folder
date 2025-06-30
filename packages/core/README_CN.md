# Brisk Folder Size - 核心库

快速文件系统分析工具库，提供文件夹大小计算、目录树构建等功能，支持系统级加速。

## 特性

- 🚀 **高性能**: 支持并发处理和可选的系统级加速
- 📊 **完整分析**: 文件系统分析、大小计算、目录树构建
- 🔧 **灵活配置**: 丰富的配置选项，满足不同使用场景  
- 💪 **TypeScript**: 完整的类型定义，更好的开发体验
- 🎯 **面向对象**: 清晰的类设计，易于扩展和维护
- ⚡ **系统加速**: 可选的 Windows MFT、Linux/macOS 系统调用加速

## 安装

```bash
npm install brisk-folder-size
# 或
pnpm add brisk-folder-size
# 或  
yarn add brisk-folder-size
```

## 快速开始

### 基本使用

```typescript
import { FolderSizeCalculator, FileSystemUtils } from 'brisk-folder-size';

// 计算文件夹大小
const calculator = new FolderSizeCalculator();
const result = await calculator.calculateSize('./my-folder');

console.log(`文件夹大小: ${FileSystemUtils.formatFileSize(result.size)}`);
console.log(`文件数量: ${result.fileCount}`);
console.log(`目录数量: ${result.directoryCount}`);
```

### 构建目录树

```typescript
import { TreeBuilder, FileSystemUtils } from 'brisk-folder-size';

const treeBuilder = new TreeBuilder({
  maxDepth: 3,
  includeSizes: true,
  sortBy: 'size',
  sortOrder: 'desc'
});

const tree = await treeBuilder.buildTree('./my-folder');
console.log(FileSystemUtils.generateTreeText(tree));
```

### 文件系统分析

```typescript
import { FileSystemAnalyzer } from 'brisk-folder-size';

const analyzer = new FileSystemAnalyzer({
  includeHidden: false,
  maxDepth: 10,
  concurrency: 20
});

const result = await analyzer.analyze('./my-folder');
console.log('分析结果:', result);
```

## 核心类

### FolderSizeCalculator

文件夹大小计算器，提供高效的大小计算功能。

```typescript
import { FolderSizeCalculator, AccelerationType } from 'brisk-folder-size';

const calculator = new FolderSizeCalculator({
  // 基础选项
  useBigInt: true,              // 是否使用 BigInt
  includeErrors: true,          // 是否包含错误信息
  strict: false,               // 是否严格模式
  concurrency: 20,             // 并发数量
  
  // 过滤选项
  includeHidden: false,        // 是否包含隐藏文件
  maxDepth: Number.MAX_SAFE_INTEGER, // 最大深度
  ignorePatterns: [/node_modules/, /\.git/], // 忽略模式
  
  // 系统加速选项
  systemAcceleration: {
    enabled: true,             // 启用系统加速
    type: AccelerationType.WINDOWS_MFT, // 加速类型
    fallbackToNodeJs: true     // 失败时回退到 Node.js
  }
});

const result = await calculator.calculateSize(
  './target-folder',
  // 进度回调
  (current, total, path) => {
    console.log(`进度: ${current}/${total} - ${path}`);
  },
  // 错误回调
  (error, path) => {
    console.warn(`错误: ${path} - ${error.message}`);
  }
);
```

### TreeBuilder

目录树构建器，用于构建文件系统树结构。

```typescript
import { TreeBuilder } from 'brisk-folder-size';

const treeBuilder = new TreeBuilder({
  // 过滤选项
  directoriesOnly: false,      // 仅目录
  filesOnly: false,           // 仅文件
  includeHidden: false,       // 包含隐藏文件
  maxDepth: 10,               // 最大深度
  
  // 大小和排序
  includeSizes: true,         // 包含大小信息
  sortBy: 'name',            // 排序方式: 'name' | 'size' | 'date'
  sortOrder: 'asc',          // 排序方向: 'asc' | 'desc'
  
  // 性能选项
  concurrency: 10,           // 并发数量
  followSymlinks: false      // 跟随符号链接
});

// 构建完整树
const tree = await treeBuilder.buildTree('./folder');

// 仅构建目录树
const dirTree = await treeBuilder.buildDirectoryTree('./folder');

// 仅构建文件树  
const fileTree = await treeBuilder.buildFileTree('./folder');
```

### FileSystemAnalyzer

文件系统分析器，提供完整的文件系统分析功能。

```typescript
import { FileSystemAnalyzer } from 'brisk-folder-size';

const analyzer = new FileSystemAnalyzer({
  followSymlinks: false,       // 跟随符号链接
  maxDepth: 20,               // 最大深度
  ignorePatterns: [           // 忽略模式
    /node_modules/,
    /\.git/,
    /\.DS_Store/
  ],
  includeHidden: false,       // 包含隐藏文件
  concurrency: 15             // 并发数量
});

const result = await analyzer.analyze('./folder');

// 获取错误信息
const errors = analyzer.getErrors();
console.log(`分析过程中遇到 ${errors.length} 个错误`);
```

## 工具类

### FileSystemUtils

提供常用的文件系统工具函数。

```typescript
import { FileSystemUtils, TreeBuilder } from 'brisk-folder-size';

// 格式化文件大小
const sizeText = FileSystemUtils.formatFileSize(1024 * 1024); // "1 MB"

// 获取文件类型分类
const category = FileSystemUtils.getFileCategory('.js'); // "代码"

// 生成树的文本表示
const tree = await new TreeBuilder().buildTree('./folder');
const treeText = FileSystemUtils.generateTreeText(tree, {
  showSizes: true,
  maxDepth: 3
});

// 计算树统计信息
const stats = FileSystemUtils.calculateTreeStatistics(tree);
console.log(`总大小: ${FileSystemUtils.formatFileSize(stats.totalSize)}`);
console.log(`最大文件: ${stats.largestFile?.name}`);

// 在树中搜索
const tsFiles = FileSystemUtils.findNodesInTree(tree, node => 
  node.type === ItemType.FILE && 
  (node as any).extension === '.ts'
);

// 按类型分组
const flatNodes = TreeBuilder.flattenTree(tree);
const grouped = FileSystemUtils.groupNodesByType(flatNodes);
```

## 系统加速

本库支持可选的系统级加速，以提高在大型文件系统上的性能。

### Windows MFT 加速

在 Windows 系统上，可以通过直接读取 NTFS 主文件表（MFT）来快速获取文件信息。

```typescript
import { FolderSizeCalculator, AccelerationType } from 'brisk-folder-size';

const calculator = new FolderSizeCalculator({
  systemAcceleration: {
    enabled: true,
    type: AccelerationType.WINDOWS_MFT,
    fallbackToNodeJs: true  // 失败时自动回退到 Node.js 实现
  }
});
```

### Linux/macOS 系统调用加速

在 Linux 和 macOS 系统上，可以使用特定的系统调用来优化性能。

```typescript
const calculator = new FolderSizeCalculator({
  systemAcceleration: {
    enabled: true,
    type: AccelerationType.LINUX_SYSCALL, // 或 AccelerationType.MACOS_SYSCALL
    fallbackToNodeJs: true
  }
});
```

> **注意**: 系统加速功能需要额外的 C++ 扩展支持（packages/cc），目前处于开发阶段。

## 类型定义

```typescript
// 文件系统项目类型
enum ItemType {
  FILE = 'file',
  DIRECTORY = 'directory', 
  SYMBOLIC_LINK = 'symbolic_link',
  UNKNOWN = 'unknown'
}

// 加速类型
enum AccelerationType {
  NODEJS = 'nodejs',
  WINDOWS_MFT = 'windows_mft',
  LINUX_SYSCALL = 'linux_syscall',
  MACOS_SYSCALL = 'macos_syscall'
}

// 文件夹大小结果
interface FolderSizeResult {
  size: bigint | number;       // 总大小
  fileCount: number;           // 文件数量
  directoryCount: number;      // 目录数量
  duration: number;            // 耗时（毫秒）
  errors?: Error[];           // 错误列表
  accelerationType: AccelerationType; // 使用的加速类型
}

// 树节点
interface TreeNode {
  name: string;               // 节点名称
  path: string;              // 节点路径  
  type: ItemType;            // 节点类型
  size: bigint;              // 节点大小
  depth: number;             // 节点深度
  parentPath?: string;       // 父节点路径
}

// 目录树节点
interface DirectoryTreeNode extends TreeNode {
  type: ItemType.DIRECTORY;
  children: TreeNode[];      // 子节点
  totalSize: bigint;         // 总大小（包含子节点）
  expanded: boolean;         // 是否展开
}
```

## 性能优化建议

1. **并发控制**: 根据系统性能调整 `concurrency` 参数
2. **深度限制**: 使用 `maxDepth` 限制扫描深度，避免过深的目录结构
3. **忽略模式**: 使用 `ignorePatterns` 跳过不需要的文件/目录（如 node_modules）
4. **系统加速**: 在支持的系统上启用系统级加速
5. **BigInt 使用**: 对于大文件夹，启用 `useBigInt` 选项

## 错误处理

```typescript
import { FolderSizeCalculator } from 'brisk-folder-size';

const calculator = new FolderSizeCalculator({
  strict: false,              // 非严格模式，遇到错误继续执行
  includeErrors: true         // 在结果中包含错误信息
});

try {
  const result = await calculator.calculateSize('./folder', 
    undefined, // 进度回调
    (error, path) => {
      // 错误处理回调
      console.warn(`访问 ${path} 时发生错误: ${error.message}`);
    }
  );
  
  if (result.errors && result.errors.length > 0) {
    console.log(`计算完成，但遇到了 ${result.errors.length} 个错误`);
  }
} catch (error) {
  console.error('计算失败:', error);
}
```

## 注意事项

1. **权限**: 某些系统目录可能需要管理员权限才能访问
2. **大文件夹**: 对于包含大量文件的文件夹，计算可能需要较长时间
3. **内存使用**: 构建完整树结构会消耗较多内存，请根据需要调整选项
4. **符号链接**: 默认不跟随符号链接，可通过 `followSymlinks` 选项启用
5. **路径安全**: 工具类提供了路径安全验证功能，建议在处理用户输入时使用

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
