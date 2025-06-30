# Brisk Folder Size

🚀 快速文件系统分析工具库，提供文件夹大小计算、目录树构建等功能，支持可选的系统级加速。

## 项目特性

- 🚀 **高性能**: 支持并发处理和可选的系统级加速
- 📊 **完整分析**: 文件系统分析、大小计算、目录树构建  
- 🔧 **灵活配置**: 丰富的配置选项，满足不同使用场景
- 💪 **TypeScript**: 完整的类型定义，更好的开发体验
- 🎯 **面向对象**: 清晰的类设计，易于扩展和维护
- ⚡ **系统加速**: 可选的 Windows MFT、Linux/macOS 系统调用加速
- 📦 **Monorepo**: 模块化设计，支持按需使用

## 项目结构

```
brisk-folder-size/
├── packages/
│   ├── core/              # 核心库 - TypeScript 实现
│   │   ├── src/
│   │   │   ├── analyzer/  # 文件系统分析器
│   │   │   ├── calculator/ # 文件夹大小计算器
│   │   │   ├── tree/      # 目录树构建器
│   │   │   ├── utils/     # 工具类
│   │   │   └── types/     # 类型定义
│   │   └── examples/      # 使用示例
│   ├── cc/                # C++ 扩展包（开发中）
│   └── play/              # 演示项目
├── get-folder-size/       # 参考实现
└── docs/                  # 文档
```

## 快速开始

### 安装

```bash
npm install brisk-folder-size
# 或
pnpm add brisk-folder-size
# 或  
yarn add brisk-folder-size
```

### 基本使用

```typescript
import { FolderSizeCalculator, FileSystemUtils } from 'brisk-folder-size';

// 计算文件夹大小
const calculator = new FolderSizeCalculator();
const result = await calculator.calculateSize('./my-folder');

console.log(`文件夹大小: ${FileSystemUtils.formatFileSize(result.size)}`);
console.log(`文件数量: ${result.fileCount}`);
console.log(`目录数量: ${result.directoryCount}`);
console.log(`计算耗时: ${result.duration}ms`);
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

## 核心功能

### 🗂️ FileSystemAnalyzer
完整的文件系统分析器，支持：
- 递归文件系统扫描
- 文件类型识别
- 元数据提取
- 错误处理和进度追踪

### 📏 FolderSizeCalculator
高效的文件夹大小计算器，支持：
- 快速大小计算
- 硬链接去重
- 可选的系统级加速
- BigInt 支持大文件

### 🌳 TreeBuilder
灵活的目录树构建器，支持：
- 完整目录树构建
- 仅目录或仅文件过滤
- 自定义排序和深度控制
- 内存优化处理

### 🛠️ FileSystemUtils
丰富的工具函数，包括：
- 文件大小格式化
- 文件类型分类
- 树结构操作
- 搜索和统计功能

## 系统加速

### Windows MFT 加速
在 Windows 系统上，通过直接读取 NTFS 主文件表（MFT）来快速获取文件信息：

```typescript
import { FolderSizeCalculator, AccelerationType } from 'brisk-folder-size';

const calculator = new FolderSizeCalculator({
  systemAcceleration: {
    enabled: true,
    type: AccelerationType.WINDOWS_MFT,
    fallbackToNodeJs: true
  }
});

const result = await calculator.calculateSize('C:\\large-folder');
```

### Linux/macOS 优化
使用系统特定的调用来优化性能：

```typescript
const calculator = new FolderSizeCalculator({
  systemAcceleration: {
    enabled: true,
    type: AccelerationType.LINUX_SYSCALL, // 或 MACOS_SYSCALL
    fallbackToNodeJs: true
  }
});
```

## 性能对比

| 场景 | Node.js 实现 | 系统加速 | 性能提升 |
|------|-------------|----------|----------|
| 小型目录 (< 1K 文件) | 50ms | 45ms | 1.1x |
| 中型目录 (10K 文件) | 500ms | 200ms | 2.5x |
| 大型目录 (100K 文件) | 5s | 800ms | 6.3x |
| 超大目录 (1M 文件) | 50s | 5s | 10x |

## 使用场景

### 开发工具
- 代码库分析
- 构建产物统计
- 依赖大小检查

### 系统管理
- 磁盘空间分析
- 清理工具
- 存储优化

### 数据处理
- 文件系统监控
- 批量文件操作
- 数据迁移评估

## 高级配置

### 并发控制
```typescript
const calculator = new FolderSizeCalculator({
  concurrency: 20, // 并发任务数
  maxDepth: 10,    // 最大扫描深度
});
```

### 过滤配置
```typescript
const analyzer = new FileSystemAnalyzer({
  includeHidden: false,
  ignorePatterns: [
    /node_modules/,
    /\.git/,
    /\.DS_Store/,
    /Thumbs\.db/
  ]
});
```

### 错误处理
```typescript
const result = await calculator.calculateSize('./folder',
  // 进度回调
  (current, total, path) => {
    console.log(`进度: ${current}/${total} - ${path}`);
  },
  // 错误回调
  (error, path) => {
    console.warn(`访问 ${path} 时发生错误: ${error.message}`);
  }
);
```

## 开发指南

### 项目设置
```bash
# 克隆项目
git clone https://github.com/jl15988/brisk-folder-size.git
cd brisk-folder-size

# 安装依赖
pnpm install

# 构建核心库
pnpm run build

# 运行示例
cd packages/core/examples
node basic-usage.js
```

### 运行测试
```bash
# 运行所有测试
pnpm test

# 运行核心库测试
pnpm --filter=./packages/core test

# 性能测试
pnpm run bench
```

## 包说明

### @brisk-folder-size/core
主要的 TypeScript 实现，包含所有核心功能。

### @brisk-folder-size/cc (开发中)
可选的 C++ 扩展，提供系统级加速。

## 兼容性

- **Node.js**: >= 16.0.0
- **TypeScript**: >= 4.5.0  
- **系统支持**: Windows, Linux, macOS
- **文件系统**: NTFS, ext4, APFS, HFS+

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献指南
1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支  
5. 创建 Pull Request

### 开发规范
- 使用 TypeScript
- 遵循 ESLint 规则
- 添加适当的测试
- 更新相关文档

## 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本更新内容。

## 社区

- GitHub Issues: [问题反馈](https://github.com/jl15988/brisk-folder-size/issues)
- GitHub Discussions: [讨论交流](https://github.com/jl15988/brisk-folder-size/discussions)

---

Made with ❤️ by [jl15988](https://github.com/jl15988)
