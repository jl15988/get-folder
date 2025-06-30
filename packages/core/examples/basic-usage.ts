import {
  FileSystemAnalyzer,
  FolderSizeCalculator,
  TreeBuilder,
  FileSystemUtils,
  ItemType,
  AccelerationType
} from '../src';

/**
 * 基本使用示例
 */
async function basicUsageExample() {
  const targetPath = './test-folder'; // 替换为实际路径
  
  console.log('=== 文件系统工具库使用示例 ===\n');

  try {
    // 1. 分析文件系统
    console.log('1. 分析文件系统...');
    const analyzer = new FileSystemAnalyzer({
      includeHidden: false,
      maxDepth: 5,
      concurrency: 10
    });

    const analysisResult = await analyzer.analyze(
      targetPath,
      (current, total, path) => {
        if (current % 100 === 0) {
          console.log(`分析进度: ${current}/${total} - ${path}`);
        }
      },
      (error, path) => {
        console.warn(`分析错误: ${path} - ${error.message}`);
      }
    );

    console.log('分析完成!');
    console.log(`类型: ${analysisResult.type}`);
    console.log(`大小: ${FileSystemUtils.formatFileSize(analysisResult.size)}`);
    console.log(`错误数量: ${analyzer.getErrors().length}\n`);

    // 2. 计算文件夹大小
    console.log('2. 计算文件夹大小...');
    const sizeCalculator = new FolderSizeCalculator({
      useBigInt: true,
      includeErrors: true,
      strict: false,
      concurrency: 20
    });

    const sizeResult = await sizeCalculator.calculateSize(
      targetPath,
      (current, total, path) => {
        if (current % 50 === 0) {
          console.log(`大小计算进度: ${current} 项目 - ${path}`);
        }
      }
    );

    console.log('大小计算完成!');
    console.log(`总大小: ${FileSystemUtils.formatFileSize(sizeResult.size)}`);
    console.log(`文件数量: ${sizeResult.fileCount}`);
    console.log(`目录数量: ${sizeResult.directoryCount}`);
    console.log(`计算耗时: ${sizeResult.duration}ms`);
    console.log(`使用的加速类型: ${sizeResult.accelerationType}`);
    if (sizeResult.errors && sizeResult.errors.length > 0) {
      console.log(`错误数量: ${sizeResult.errors.length}\n`);
    }

    // 3. 构建目录树
    console.log('3. 构建目录树...');
    const treeBuilder = new TreeBuilder({
      maxDepth: 3,
      includeSizes: true,
      sortBy: 'size',
      sortOrder: 'desc'
    });

    const tree = await treeBuilder.buildTree(targetPath);
    
    console.log('目录树构建完成!');
    console.log('树结构:');
    console.log(FileSystemUtils.generateTreeText(tree, {
      showSizes: true,
      maxDepth: 3
    }));

    // 4. 统计信息
    console.log('\n4. 统计信息...');
    const stats = FileSystemUtils.calculateTreeStatistics(tree);
    
    console.log(`总大小: ${FileSystemUtils.formatFileSize(stats.totalSize)}`);
    console.log(`文件数量: ${stats.fileCount}`);
    console.log(`目录数量: ${stats.directoryCount}`);
    
    if (stats.largestFile) {
      console.log(`最大文件: ${stats.largestFile.name} (${FileSystemUtils.formatFileSize(stats.largestFile.size)})`);
    }
    
    if (stats.deepestPath) {
      console.log(`最深路径: ${stats.deepestPath.path} (深度: ${stats.deepestPath.depth})`);
    }

    // 5. 文件类型统计
    console.log('\n5. 文件扩展名统计:');
    const sortedExtensions = Object.entries(stats.extensionStats)
      .sort(([,a], [,b]) => Number(b.size - a.size))
      .slice(0, 10);

    for (const [ext, stat] of sortedExtensions) {
      console.log(`${ext}: ${stat.count} 个文件, ${FileSystemUtils.formatFileSize(stat.size)}`);
    }

    // 6. 搜索功能
    console.log('\n6. 搜索功能演示...');
    
    // 查找所有 TypeScript 文件
    const tsFiles = FileSystemUtils.findNodesInTree(tree, node => 
      node.type === ItemType.FILE && 
      (node as any).extension === '.ts'
    );
    console.log(`找到 ${tsFiles.length} 个 TypeScript 文件`);

    // 查找大于 1MB 的文件
    const largeFiles = FileSystemUtils.findNodesInTree(tree, node => 
      node.type === ItemType.FILE && 
      node.size > 1024n * 1024n
    );
    console.log(`找到 ${largeFiles.length} 个大于 1MB 的文件`);

    // 7. 文件分类
    console.log('\n7. 文件分类...');
    const flatNodes = TreeBuilder.flattenTree(tree);
    const groupedNodes = FileSystemUtils.groupNodesByType(flatNodes);
    
    for (const [category, nodes] of Object.entries(groupedNodes)) {
      if (nodes.length > 0) {
        const totalSize = nodes.reduce((sum, node) => sum + node.size, 0n);
        console.log(`${category}: ${nodes.length} 个项目, ${FileSystemUtils.formatFileSize(totalSize)}`);
      }
    }

  } catch (error) {
    console.error('执行过程中发生错误:', error);
  }
}

/**
 * 系统加速示例（需要 C++ 扩展支持）
 */
async function systemAccelerationExample() {
  console.log('\n=== 系统加速示例 ===\n');
  
  const targetPath = './test-folder';
  
  try {
    // Windows MFT 加速示例
    const calculator = new FolderSizeCalculator({
      systemAcceleration: {
        enabled: true,
        type: AccelerationType.WINDOWS_MFT,
        fallbackToNodeJs: true
      }
    });

    console.log('尝试使用 Windows MFT 加速...');
    const result = await calculator.calculateSize(targetPath);
    
    console.log(`大小: ${FileSystemUtils.formatFileSize(result.size)}`);
    console.log(`使用的方法: ${result.accelerationType}`);
    console.log(`耗时: ${result.duration}ms`);

  } catch (error) {
    console.log('系统加速失败，已回退到 Node.js 实现');
    console.error('错误:', error);
  }
}

/**
 * 性能对比示例
 */
async function performanceComparisonExample() {
  console.log('\n=== 性能对比示例 ===\n');
  
  const targetPath = './test-folder';
  
  try {
    // Node.js 实现
    console.log('测试 Node.js 实现...');
    const nodeJsCalculator = new FolderSizeCalculator({
      systemAcceleration: { enabled: false, type: AccelerationType.NODEJS, fallbackToNodeJs: true }
    });
    
    const nodeJsStart = Date.now();
    const nodeJsResult = await nodeJsCalculator.calculateSize(targetPath);
    const nodeJsDuration = Date.now() - nodeJsStart;
    
    console.log(`Node.js - 大小: ${FileSystemUtils.formatFileSize(nodeJsResult.size)}, 耗时: ${nodeJsDuration}ms`);

    // 系统加速实现（如果可用）
    console.log('测试系统加速实现...');
    const acceleratedCalculator = new FolderSizeCalculator({
      systemAcceleration: {
        enabled: true,
        type: AccelerationType.WINDOWS_MFT,
        fallbackToNodeJs: true
      }
    });
    
    const acceleratedStart = Date.now();
    const acceleratedResult = await acceleratedCalculator.calculateSize(targetPath);
    const acceleratedDuration = Date.now() - acceleratedStart;
    
    console.log(`系统加速 - 大小: ${FileSystemUtils.formatFileSize(acceleratedResult.size)}, 耗时: ${acceleratedDuration}ms`);
    
    if (nodeJsDuration > 0 && acceleratedDuration > 0) {
      const speedup = nodeJsDuration / acceleratedDuration;
      console.log(`性能提升: ${speedup.toFixed(2)}x`);
    }

  } catch (error) {
    console.error('性能对比测试失败:', error);
  }
}

// 运行示例
if (require.main === module) {
  (async () => {
    await basicUsageExample();
    await systemAccelerationExample();
    await performanceComparisonExample();
  })();
} 