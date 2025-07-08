# GetFolder

🚀 高性能文件夹大小计算工具

一个现代化的 Node.js 文件系统分析库，专为高性能文件夹计算而设计。支持 JavaScript 和 TypeScript，提供简洁的 API 和强大的自定义选项。

## 📦 安装

```bash
npm install get-folder
```

## 🚀 快速开始

### 基本使用

```typescript
import { FolderSize } from 'get-folder';

// 计算文件夹大小
FolderSize.getSize('./my-folder').then(res => {
  // size 以 [BigNumber](https://www.npmjs.com/package/bignumber.js) 格式返回
  console.log(`文件夹大小: ${res.size.toString()}`);
  console.log(`文件数量: ${res.fileCount}`);
  console.log(`目录数量: ${res.directoryCount}`);
  console.log(`符号链接数量: ${res.linkCount}`);
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

## 🔧 API 参考

### FolderSize.getSize(folderPath, options?)

计算文件夹大小的核心方法。

#### 参数

- `folderPath` (string): 要分析的文件夹路径
- `options` (FolderSizeOptions, 可选): 配置选项

#### 配置选项

| 选项 | 类型 | 默认值 | 描述                                                     |
|------|------|--------|--------------------------------------------------------|
| `maxDepth` | number | `Infinity` | 最大遍历深度，用于限制目录层级                                        |
| `ignores` | RegExp[] | `[]` | 忽略的文件/目录模式数组                                           |
| `includeHidden` | boolean | `true` | 是否包含隐藏文件（简单的隐藏文件判断，以 . 开头的文件）                          |
| `includeLink` | boolean | `true` | 是否包含符号连接文件（快捷方式）                                       |
| `concurrency` | number | `2` | 并发操作数量，建议值为 2（适当调整能够提升效率，并非越大越好）                       |
| `ignoreErrors` | boolean | `false` | 是否忽略错误继续计算                                             |
| `inodeCheck` | boolean | `true` | 是否检查inode避免硬链接重复计数                                     |
| `onError` | function | `() => true` | 错误处理回调函数，返回 true 则忽略错误继续执行（受 ignoreErrors 配置影响），否则抛出异常 |

#### 返回值

返回一个 Promise，解析为 `FolderSizeResult`：

```typescript
interface FolderSizeResult {
  // 总大小（字节）
  size: BigNumber;
  // 文件数量
  fileCount: number;
  // 目录数量
  directoryCount: number;
  // 符号链接数量
  linkCount: number;
}
```

## 🚀 性能优势

**测试环境**：node_modules 目录（46,750 文件，8,889 目录，总大小 899MB）

**对比目标**：get-folder-size

**对比结果**：

| 指标 | 性能提升                      |
|------|---------------------------|
| **整体性能** | **🚀 提升 100%**            |
| **执行时间** | **🚀 平均快 45%**，最快仅需 2.1s  |
| **内存使用** | **💾 平均节省 40%**，最小占用 11MB |
| **结果准确性** | **📏 完全一致**               |

**🗂️ 大目录测试对比**

测试 20G 目录（包含 node_modules 目录，包含前端 vue 项目与后端 java 项目）
get-folder 用时 43.6 秒（关闭 inodeCheck 用时 29.2 秒），get-folder-size 用时 77.6 秒

*性能数据来源于开发者本地测试，实际表现可能因系统而异*

## 📄 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情。
