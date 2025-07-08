# GetFolder

🚀 High-Performance Folder Size Calculator

A modern Node.js file system analysis library designed for high-performance folder size calculation. Supports both JavaScript and TypeScript, providing a clean API and powerful customization options.

## 📦 Installation

```bash
npm install get-folder
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { FolderSize } from 'get-folder';

// Calculate folder size
FolderSize.getSize('./my-folder').then(res => {
  // size is returned in [BigNumber](https://www.npmjs.com/package/bignumber.js) format
  console.log(`Folder size: ${res.size.toString()}`);
  console.log(`File count: ${res.fileCount}`);
  console.log(`Directory count: ${res.directoryCount}`);
  console.log(`Symbolic link count: ${res.linkCount}`);
});
```

### Advanced Configuration

```typescript
import { FolderSize } from 'get-folder';

// Custom options
const result = await FolderSize.getSize('./my-folder', {
  // Maximum depth limit
  maxDepth: 5,
  // Ignore file/directory patterns
  ignores: [/node_modules/, /\.git/],
  // Whether to include hidden files
  includeHidden: false,
  // Whether to include symbolic links
  includeLink: true,
  // Concurrency control
  concurrency: 2,
  // Ignore errors and continue calculation
  ignoreErrors: true,
  // Whether to check inodes to avoid counting hard links multiple times
  inodeCheck: true,
  // Error handling callback
  onError: (error) => {
    console.log(`Error: ${error.message} at ${error.path}`);
    // true=continue, false=stop
    return true;
  }
});
```

## 🔧 API Reference

### FolderSize.getSize(folderPath, options?)

Core method for calculating folder size.

#### Parameters

- `folderPath` (string): Path to the folder to analyze
- `options` (FolderSizeOptions, optional): Configuration options

#### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxDepth` | number | `Infinity` | Maximum traversal depth to limit directory levels |
| `ignores` | RegExp[] | `[]` | Array of file/directory patterns to ignore |
| `includeHidden` | boolean | `true` | Whether to include hidden files (simple hidden file detection, files starting with .) |
| `includeLink` | boolean | `true` | Whether to include symbolic link files (shortcuts) |
| `concurrency` | number | `2` | Number of concurrent operations, recommended value is 2 (appropriate adjustment can improve efficiency, not necessarily bigger is better) |
| `ignoreErrors` | boolean | `false` | Whether to ignore errors and continue calculation |
| `inodeCheck` | boolean | `true` | Whether to check inodes to avoid duplicate counting of hard links |
| `onError` | function | `() => true` | Error handling callback function, returns true to ignore errors and continue execution (affected by ignoreErrors configuration), otherwise throws exception |

#### Return Value

Returns a Promise that resolves to `FolderSizeResult`:

```typescript
interface FolderSizeResult {
  // Total size in bytes
  size: BigNumber;
  // Number of files
  fileCount: number;
  // Number of directories
  directoryCount: number;
  // Number of symbolic links
  linkCount: number;
}
```

## 🚀 Performance Advantages

**Test Environment**: node_modules directory (46,750 files, 8,889 directories, total size 899MB)

**Comparison Target**: get-folder-size

**Comparison Results**:

| Metric | Performance Improvement |
|--------|------------------------|
| **Overall Performance** | **🚀 100% improvement** |
| **Execution Time** | **🚀 Average 45% faster**, fastest at only 2.1s |
| **Memory Usage** | **💾 Average 40% savings**, minimum 11MB usage |
| **Result Accuracy** | **📏 Completely consistent** |

**🗂️ Comparison of testing for large directories**

Test 20G directory (including node_comodules directory, including frontend Vue project and backend Java project)
Get-folder takes 43.6 seconds (closing inodeCheck takes 29.2 seconds), get-folder size takes 77.6 seconds

*Performance data is from developer local testing, actual performance may vary by system*

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
