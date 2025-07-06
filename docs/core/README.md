# GetFolder

🚀 High-Performance Folder Size Calculator

A modern Node.js file system analysis library designed for high-performance folder size calculation. Supports both JavaScript and TypeScript, providing a clean API and powerful customization options.

## ✨ Core Features

- **🚄 High Performance**: 45% faster than mainstream libraries on average, 40% less memory usage
- **🎯 Precise Calculation**: Uses BigNumber to ensure calculation accuracy for large files, supports TB-level file systems
- **🔧 Flexible Configuration**: Rich configuration options supporting depth limits, pattern ignoring, error handling, etc.
- **💪 Robustness**: Comprehensive error handling mechanism that won't interrupt calculations due to individual file errors
- **📊 Detailed Statistics**: Provides detailed information including file count, directory count, symbolic link count, etc.

## 📦 Installation

```bash
# Using npm
npm install get-folder

# Using yarn
yarn add get-folder
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

## 📚 Use Cases

### 1. Project Directory Analysis

```typescript
// Analyze project size, excluding build artifacts
const projectSize = await FolderSize.getSize('./my-project', {
  ignores: [
    /node_modules/,
    /\.git/,
    /dist/,
    /build/,
    /coverage/,
    /\.next/,
    /\.nuxt/
  ]
});

console.log(`Source code size: ${FileSystemUtils.formatFileSize(projectSize.size)}`);
```

### 2. System Cleanup Tool

```typescript
// Find large folders for cleanup
const directories = ['./Downloads', './Documents', './Desktop'];

for (const dir of directories) {
  try {
    const result = await FolderSize.getSize(dir, {
      ignoreErrors: true,
      maxDepth: 2 // Limit depth for better performance
    });
    
    if (result.size.isGreaterThan(1024 * 1024 * 1024)) { // > 1GB
      console.log(`🔍 Large folder found: ${dir} - ${FileSystemUtils.formatFileSize(result.size)}`);
    }
  } catch (error) {
    console.log(`❌ Cannot access: ${dir}`);
  }
}
```

### 3. Disk Usage Monitoring

```typescript
// Monitor growth of specific directories
async function monitorDiskUsage(path: string) {
  const result = await FolderSize.getSize(path, {
    ignoreErrors: true,
    concurrency: 2
  });
  
  return {
    path,
    size: result.size.toString(),
    formattedSize: FileSystemUtils.formatFileSize(result.size),
    fileCount: result.fileCount,
    timestamp: new Date().toISOString()
  };
}

// Usage example
const usage = await monitorDiskUsage('/var/log');
console.log('Disk usage:', usage);
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
| `maxDepth` | number | `Infinity` | Maximum traversal depth to limit recursion levels |
| `ignores` | RegExp[] | `[]` | Array of file/directory patterns to ignore |
| `includeHidden` | boolean | `true` | Whether to include hidden files (starting with .) |
| `includeLink` | boolean | `true` | Whether to include symbolic link files |
| `concurrency` | number | `2` | Number of concurrent operations, recommended value is 2 |
| `ignoreErrors` | boolean | `false` | Whether to ignore errors and continue calculation |
| `inodeCheck` | boolean | `true` | Whether to check inodes to avoid duplicate counting of hard links |
| `onError` | function | `() => true` | Error handling callback function |

#### Return Value

Returns a Promise that resolves to `FolderSizeResult`:

```typescript
interface FolderSizeResult {
  size: BigNumber;      // Total size in bytes
  fileCount: number;    // Number of files
  directoryCount: number; // Number of directories
  linkCount: number;    // Number of symbolic links
}
```

## 🚀 Performance Advantages

Through performance comparison testing with the mainstream library `get-folder-size`, our implementation shows significant advantages:

### 📊 Benchmark Comparison Results

**Test Environment**: node_modules directory (46,750 files, 8,889 directories, total size 899MB)

| Metric | Performance Improvement                |
|--------|---------------------------------------|
| **Overall Performance** | **🚀 100% improvement**             |
| **Execution Time** | **🚀 Average 45% faster**, fastest at only 2.1s |
| **Memory Usage** | **💾 Average 40% savings**, minimum 11MB usage |
| **Result Accuracy** | **📏 Completely consistent**         |

*Performance data is from developer local testing, actual performance may vary by system*

### 🎯 Core Advantages

- **⚡ Faster Execution Speed**: Optimized concurrency control and algorithms, avoiding file handle exhaustion, average 45% faster
- **💾 Ultra-low Memory Usage**: Efficient memory management, 80% reduction in memory usage
- **🔧 Flexible Error Handling**: User-customizable error handling strategy, won't interrupt entire calculation due to individual file errors
- **📊 More Statistical Information**: Provides detailed statistics like file count, directory count, not just size

### 💡 Technical Features

- **BigNumber Support**: Uses [BigNumber.js](https://www.npmjs.com/package/bignumber.js) to ensure calculation accuracy for large files, backward compatible
- **Native TypeScript Support**: Complete type definitions providing excellent development experience

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.
