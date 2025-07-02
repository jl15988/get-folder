const bindings = require('bindings');

/**
 * 加载原生模块
 */
const nativeBinding = bindings('brisk_folder_size_native');

/**
 * C++ 扩展加速器类
 */
class NativeAccelerator {
  constructor() {
    this.initialized = false;
  }

  /**
   * 初始化加速器
   * @returns {boolean} 是否成功初始化
   */
  initialize() {
    try {
      this.initialized = nativeBinding.initializeAccelerator();
      return this.initialized;
    } catch (error) {
      throw new Error(`Failed to initialize native accelerator: ${error.message}`);
    }
  }

  /**
   * 计算文件夹大小
   * @param {string} path 文件夹路径
   * @param {Object} [options] 配置选项
   * @param {boolean} [options.includeHidden=true] 是否包含隐藏文件
   * @param {number} [options.maxDepth=Infinity] 最大深度
   * @param {string[]} [options.ignorePatterns=[]] 忽略模式
   * @param {boolean} [options.inodeCheck=false] 是否启用硬链接检测，关闭将大幅度提升效率
   * @param {boolean} [options.includeLink=true] 是否包含符号链接大小
   * @returns {Object} 计算结果
   */
  calculateFolderSize(path, options = {}) {
    if (!this.initialized) {
      throw new Error('Accelerator not initialized');
    }

    // 设置默认选项
    const defaultOptions = {
      includeHidden: true,
      maxDepth: 4294967295, // UINT32_MAX
      ignorePatterns: [],
      inodeCheck: false,
      includeLink: true
    };

    const mergedOptions = { ...defaultOptions, ...options };

    try {
      const result = nativeBinding.calculateFolderSize(path, mergedOptions);
      
      // 转换 BigInt 为字符串以便 JSON 序列化
      return {
        ...result,
        totalSize: result.totalSize.toString()
      };
    } catch (error) {
      throw new Error(`Failed to calculate folder size: ${error.message}`);
    }
  }

  /**
   * 构建目录树
   * @param {string} path 目录路径
   * @param {Object} [options] 配置选项
   * @returns {Object} 目录树
   */
  buildDirectoryTree(path, options = {}) {
    if (!this.initialized) {
      throw new Error('Accelerator not initialized');
    }

    try {
      const tree = nativeBinding.buildDirectoryTree(path, options);
      return this._convertTreeNodeBigInts(tree);
    } catch (error) {
      throw new Error(`Failed to build directory tree: ${error.message}`);
    }
  }

  /**
   * 检查路径是否存在
   * @param {string} path 文件路径
   * @returns {boolean} 是否存在
   */
  pathExists(path) {
    if (!this.initialized) {
      throw new Error('Accelerator not initialized');
    }

    try {
      return nativeBinding.pathExists(path);
    } catch (error) {
      throw new Error(`Failed to check path existence: ${error.message}`);
    }
  }

  /**
   * 获取文件信息
   * @param {string} path 文件路径
   * @param {boolean} [followSymlinks=false] 是否跟随符号链接
   * @returns {Object} 文件信息
   */
  getItemInfo(path, followSymlinks = false) {
    if (!this.initialized) {
      throw new Error('Accelerator not initialized');
    }

    try {
      const info = nativeBinding.getItemInfo(path, followSymlinks);
      return this._convertFileSystemItemBigInts(info);
    } catch (error) {
      throw new Error(`Failed to get item info: ${error.message}`);
    }
  }

  /**
   * 清理加速器资源
   */
  cleanup() {
    if (this.initialized) {
      try {
        nativeBinding.cleanupAccelerator();
        this.initialized = false;
      } catch (error) {
        console.warn('Failed to cleanup accelerator:', error.message);
      }
    }
  }

  /**
   * 转换树节点中的 BigInt 为字符串
   * @private
   */
  _convertTreeNodeBigInts(node) {
    if (!node) return null;

    const converted = {
      ...node,
      totalSize: node.totalSize.toString(),
      item: this._convertFileSystemItemBigInts(node.item),
      children: node.children.map(child => this._convertTreeNodeBigInts(child))
    };

    return converted;
  }

  /**
   * 转换文件系统项目中的 BigInt 为字符串
   * @private
   */
  _convertFileSystemItemBigInts(item) {
    return {
      ...item,
      size: item.size.toString(),
      createdTime: item.createdTime.toString(),
      modifiedTime: item.modifiedTime.toString(),
      accessedTime: item.accessedTime.toString(),
      inode: item.inode.toString()
    };
  }
}

/**
 * 获取平台信息
 * @returns {string} 平台名称
 */
function getPlatform() {
  const platform = process.platform;
  switch (platform) {
    case 'win32': return 'windows';
    case 'linux': return 'linux';
    case 'darwin': return 'macos';
    default: return 'unknown';
  }
}

/**
 * 检查是否支持原生加速
 * @returns {boolean} 是否支持
 */
function isNativeAccelerationSupported() {
  return getPlatform() !== 'unknown' && nativeBinding !== null;
}

/**
 * 创建并初始化加速器实例
 * @returns {NativeAccelerator} 加速器实例
 */
function createAccelerator() {
  const accelerator = new NativeAccelerator();
  
  try {
    if (accelerator.initialize()) {
      return accelerator;
    } else {
      const platform = getPlatform();
      throw new Error(`Failed to initialize ${platform} accelerator. Please check system permissions.`);
    }
  } catch (error) {
    // Re-throw with platform-specific guidance
    if (error.message.includes('Failed to initialize native accelerator')) {
      const platform = getPlatform();
      throw new Error(`Failed to initialize ${platform} accelerator: ${error.message}`);
    }
    throw error;
  }
}

module.exports = {
  NativeAccelerator,
  createAccelerator,
  getPlatform,
  isNativeAccelerationSupported,
  
  // 直接导出原生绑定（用于高级用例）
  nativeBinding
}; 