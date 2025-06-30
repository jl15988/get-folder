# @brisk-folder-size/cc

C++ 系统级加速扩展，用于快速文件系统操作。通过直接使用系统级 API 来大幅提升文件系统遍历和大小计算的性能。

## 🚀 功能特性

### Windows (NTFS MFT)
- 🔥 直接读取主文件表 (Master File Table)
- ⚡ 跳过传统文件系统 API 开销
- 📁 支持大文件和深度目录结构
- 🛡️ 硬链接去重处理

### Linux (系统调用优化)
- 🎯 使用 getdents64 系统调用
- 💾 直接内存操作减少系统开销
- 🔀 并行处理优化
- 🔗 inode 去重支持

### macOS (系统调用优化)
- 🍎 继承 Linux 优化特性
- 📁 支持 HFS+/APFS 文件系统
- 🔍 系统路径特殊处理
- 🎨 资源分支 (Resource Fork) 支持

## 📦 安装

```bash
npm install @brisk-folder-size/cc
```

## 🔨 构建

### 先决条件
- Node.js >= 16.0.0
- Python 3.x
- C++ 编译工具链:
  - Windows: Visual Studio Build Tools
  - Linux: GCC/Clang
  - macOS: Xcode Command Line Tools

### 构建命令
```bash
# 标准构建
npm run build

# 调试构建
npm run build:debug

# 清理构建
npm run clean
```

## 🧪 测试

```bash
npm test
```

## 📚 API 使用

### 基本用法

```javascript
const { createAccelerator, isNativeAccelerationSupported } = require('@brisk-folder-size/cc');

// 检查是否支持原生加速
if (isNativeAccelerationSupported()) {
  console.log('🚀 Native acceleration supported!');
  
  // 创建加速器实例
  const accelerator = createAccelerator();
  
  // 计算文件夹大小
  const result = accelerator.calculateFolderSize('/path/to/folder', {
    includeHidden: false,
    followSymlinks: false,
    maxDepth: 10,
    maxThreads: 4,
    ignorePatterns: ['node_modules', '.git']
  });
  
  console.log('Total size:', result.totalSize);
  console.log('File count:', result.fileCount);
  console.log('Duration:', result.durationMs, 'ms');
  
  // 构建目录树
  const tree = accelerator.buildDirectoryTree('/path/to/folder', {
    maxDepth: 3
  });
  
  console.log('Tree root:', tree.item.name);
  console.log('Children count:', tree.children.length);
  
  // 清理资源
  accelerator.cleanup();
}
```

### TypeScript 支持

```typescript
import { createAccelerator, CalculationOptions, CalculationResult } from '@brisk-folder-size/cc';

const options: CalculationOptions = {
  includeHidden: false,
  maxDepth: 5,
  maxThreads: 2
};

const accelerator = createAccelerator();
const result: CalculationResult = accelerator.calculateFolderSize('/path', options);
```

## 🎯 性能对比

典型性能提升（相对于纯 JavaScript 实现）：

| 场景 | Windows MFT | Linux syscall | macOS syscall |
|------|-------------|---------------|---------------|
| 小目录 (< 1000 文件) | 2-3x | 1.5-2x | 1.5-2x |
| 中目录 (1000-10000 文件) | 3-5x | 2-3x | 2-3x |
| 大目录 (> 10000 文件) | 5-10x | 3-5x | 3-5x |
| 深目录结构 | 4-8x | 2-4x | 2-4x |

## 🔧 配置选项

### CalculationOptions

```typescript
interface CalculationOptions {
  includeHidden?: boolean;      // 是否包含隐藏文件
  followSymlinks?: boolean;     // 是否跟随符号链接
  maxDepth?: number;           // 最大深度
  maxThreads?: number;         // 最大线程数（0为自动）
  ignorePatterns?: string[];   // 忽略模式列表
}
```

## 🚧 注意事项

1. **权限要求**: Windows MFT 访问需要管理员权限
2. **内存使用**: 大目录结构可能消耗较多内存
3. **线程安全**: 单个加速器实例不是线程安全的
4. **平台兼容**: 仅支持 Windows/Linux/macOS x64/arm64

## 🐛 故障排除

### 构建失败
```bash
# 检查编译工具链
node-gyp configure

# 重新安装依赖
npm ci

# 清理后重新构建
npm run clean && npm run build
```

### 运行时错误
- 确保有足够的文件系统权限
- 检查路径是否存在
- 验证平台支持情况

## �� 许可证

MIT License 