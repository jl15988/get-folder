# GetFolder

高性能文件夹大小计算工具

## 安装

```bash
npm i get-folder
```

## 快速开始

### 基本使用

```typescript
import { FolderSize } from 'get-folder';

// 计算文件夹大小
FolderSize.getSize('./my-folder').then(res => {
  // size 以 [BigNumber](https://www.npmjs.com/package/bignumber.js) 格式返回
  console.log(`文件夹大小: ${res.size.toString()}`);
  console.log(`文件数量: ${res.fileCount}`);
  console.log(`目录数量: ${res.directoryCount}`);
});
```

### 高级配置

```typescript
import { FolderSize } from 'get-folder';

// 自定义选项
const result = await FolderSize.getSize('./my-folder', {
  // 最大深度限制
  maxDepth: 5,
  // 忽略的文件/目录模式
  ignores: [/node_modules/, /\.git/],
  // 是否包含隐藏文件
  includeHidden: false,
  // 是否包含符号连接文件
  includeLink: true,
  // 并发数控制
  concurrency: 2,
  // 忽略错误继续计算
  ignoreErrors: true,
  // 是否硬链接检测
  inodeCheck: true,
  // 错误处理回调
  onError: (error) => {
    console.log(`错误: ${error.message} 在 ${error.path}`);
    // true=继续，false=停止
    return true;
  }
});
```

## API 参考

### FolderSize.getSize(folderPath, options?)

计算文件夹大小。

#### 参数

- `folderPath` (string): 要分析的文件夹路径
- `options` (FolderSizeOptions, 可选): 配置选项

#### 配置选项

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `maxDepth` | number | `Infinity` | 最大遍历深度 |
| `ignores` | RegExp[] | `[]` | 忽略的文件/目录模式数组 |
| `includeHidden` | boolean | `true` | 是否包含隐藏文件 |
| `includeLink` | boolean | `true` | 是否包含符号连接文件 |
| `concurrency` | number | `2` | 并发操作数量 |
| `ignoreErrors` | boolean | `false` | 是否忽略错误继续计算 |
| `inodeCheck` | boolean | `true` | 是否检查inode避免硬链接重复计数 |
| `onError` | function | `() => true` | 错误处理回调函数 |

#### 返回值

返回一个 Promise，解析为 `FolderSizeResult`：

```typescript
interface FolderSizeResult {
  size: BigNumber;      // 总大小（字节）
  fileCount: number;    // 文件数量
  directoryCount: number; // 目录数量
  linkCount: number;    // 符号链接数量
}
```

## 性能优势

经过与主流库 `get-folder-size` 的性能对比测试，我们的实现具有显著优势：

### 🚀 测试结果对比

**测试环境**：node_modules 目录（46,750 文件，8,889 目录，总大小 899MB）

| 指标 | 性能提升                        |
|------|-----------------------------|
| **执行时间** | **🚀 平均快 45% 左右**，最快仅需2.1s  |
| **内存使用** | **💾 平均节省 80% 左右**，最小占用11MB |
| **结果准确性** | **📏 一致**                   |

以上性能来源于开发者本地测试，具体以实际使用为准

### 🎯 核心优势

- **⚡ 更快的执行速度**：优化的并发控制和算法，避免文件句柄耗尽，平均快 45%
- **💾 极低的内存占用**：高效的内存管理，内存使用减少 80%
- **🔧 灵活的错误处理**：用户可自定义错误处理策略，不会因个别文件错误中断整个计算
- **📊 更多统计信息**：提供文件数、目录数等详细统计，而不仅仅是大小

### 💡 技术特点

- **BigNumber 支持**：使用 [BigNumber.js](https://www.npmjs.com/package/bignumber.js) 确保大文件计算精度，向下兼容
- **TypeScript 原生支持**：完整的类型定义，提供优秀的开发体验

## 许可证

MIT
