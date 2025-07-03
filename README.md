# GetFolder

🚀 High-Performance Folder Size Calculator

**Languages**: [English](README.md) | [中文](README_CN.md)

> Redefining file system performance boundaries with complete solutions from JavaScript to system-level optimization

## 🎯 Project Vision

In modern software development, file system operations often become performance bottlenecks. Traditional folder size calculation tools are either functionally simple or performance-poor, unable to meet modern applications' dual requirements for speed and accuracy.

**GetFolder** is committed to creating a **complete file system analysis solution** that provides optimal computing performance for different scenarios through multi-layered performance optimization strategies, while maintaining code maintainability and cross-platform compatibility.

### Architecture Principles

- **🎯 Performance First**: Every layer pursues ultimate performance under its technology stack
- **🌐 Platform Adaptation**: Specialized optimization for Windows/Linux/macOS
- **🔒 Stable & Reliable**: Comprehensive error handling and edge case management

## 🏛️ Technical Architecture

### Monorepo Organization Structure

```
get-folder/
├── packages/
│   ├── core/           # 🎯 Pure JavaScript high-performance implementation
│   ├── cc/             # ⚡ C++ system-level acceleration extension
│   └── play/           # 🧪 Benchmarking and demonstrations
├── docs/               # 📚 Technical documentation and performance analysis
└── Project configuration files
```

## 🛠️ Development Environment

### Technology Stack Selection

**Core Development**:
- **TypeScript** - Type safety and development experience
- **Rollup** - Efficient module bundling
- **pnpm workspace** - monorepo dependency management

**System-level Development**:
- **Node-API (N-API)** - Stable C++ binding interface

**Quality Assurance**:
- **Benchmark.js** - Performance testing benchmarks

### Build System

```bash
# Environment initialization
pnpm install                    # Install all dependencies

# Development build
pnpm run build                  # Build JavaScript core layer
pnpm run build:cc               # Build C++ acceleration layer (requires compilation environment)
```

## 🤝 Open Source Ecosystem

### Contribution Value

We welcome community participation to advance file system performance boundaries together:

- **🔬 Algorithm Research**: Explore new optimization algorithms and data structures
- **📊 Benchmark Testing**: Expand test cases and validate real-world scenario performance
- **📚 Documentation Enhancement**: Technical documentation, best practices, and usage guides

## 📄 License

[MIT License](LICENSE) - Open source sharing to drive technological progress

---

## 🔗 Quick Navigation

| Package | Description | Documentation Link |
|---------|-------------|-------------------|
| `get-folder` | JavaScript core implementation | [📖 Usage Documentation](./packages/core/README.md) |

---

**⭐ Star Project** | **🍴 Fork & Contribute** | **💬 Technical Discussion** | **🐛 Issue Reports**