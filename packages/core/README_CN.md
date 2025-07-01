# GetFolder

文件夹获取工具

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

## 许可证

MIT
