# GetFolder

High-Performance Folder Size Calculator

## Installation

```bash
npm i get-folder
```

## Quick Start

### Basic Usage

```typescript
import { FolderSize } from 'get-folder';

// Calculate folder size
FolderSize.getSize('./my-folder').then(res => {
  // size is returned in [BigNumber](https://www.npmjs.com/package/bignumber.js) format
  console.log(`Folder size: ${res.size.toString()}`);
  console.log(`File count: ${res.fileCount}`);
  console.log(`Directory count: ${res.directoryCount}`);
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

## API Reference

### FolderSize.getSize(folderPath, options?)

Calculate the size of a folder.

#### Parameters

- `folderPath` (string): Path to the folder to analyze
- `options` (FolderSizeOptions, optional): Configuration options

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxDepth` | number | `Infinity` | Maximum depth to traverse |
| `ignores` | RegExp[] | `[]` | Array of regex patterns to ignore |
| `includeHidden` | boolean | `true` | Whether to include hidden files |
| `includeLink` | boolean | `true` | Whether to include symbolic links |
| `concurrency` | number | `2` | Number of concurrent operations |
| `ignoreErrors` | boolean | `false` | Whether to ignore errors and continue |
| `inodeCheck` | boolean | `true` | Whether to check inodes to avoid counting hard links multiple times |
| `onError` | function | `() => true` | Error handling callback |

#### Returns

Returns a Promise that resolves to `FolderSizeResult`:

```typescript
interface FolderSizeResult {
  size: BigNumber;      // Total size in bytes
  fileCount: number;    // Number of files
  directoryCount: number; // Number of directories
  linkCount: number;    // Number of symbolic links
}
```

## Performance Advantages

Compared with the mainstream library `get-folder-size`, our implementation shows significant advantages:

### 🚀 Benchmark Results

**Test Environment**: node_modules directory (46,750 files, 8,889 directories, total size 899MB)

| Metric | Performance Improvement |
|---------|------------------------|
| **Execution Time** | **🚀 Average 45% faster**, minimum 2.1s |
| **Memory Usage** | **💾 Average 80% less memory**, minimum 11MB |
| **Result Accuracy** | **📏 Consistent** |

*Performance results are based on local developer testing, actual performance may vary*

### 🎯 Core Advantages

- **⚡ Faster Execution**: Optimized concurrency control and algorithms to avoid file handle exhaustion, average 45% faster
- **💾 Ultra-low Memory Usage**: Efficient memory management, 80% reduction in memory usage
- **🔧 Flexible Error Handling**: User-customizable error handling strategy, won't interrupt the entire calculation due to individual file errors
- **📊 More Statistics**: Provides detailed statistics like file count, directory count, not just size

### 💡 Technical Features

- **BigNumber Support**: Uses [BigNumber.js](https://www.npmjs.com/package/bignumber.js) to ensure precision for large file calculations, Downward compatibility
- **Native TypeScript Support**: Complete type definitions for excellent development experience

## License

MIT