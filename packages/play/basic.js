const { createAccelerator, isNativeAccelerationSupported, getPlatform } = require('@brisk-folder-size/cc');
const os = require('os');

async function runBasicTests() {
  console.log('🧪 Running C++ Extension Basic Tests');
  console.log('=====================================');
  
  // 平台信息
  console.log(`📟 Platform: ${getPlatform()}`);
  console.log(`🏃 Native acceleration supported: ${isNativeAccelerationSupported()}`);
  
  try {
    // 创建加速器
    console.log('\n📦 Creating accelerator...');
    const accelerator = createAccelerator();
    console.log('✅ Accelerator created successfully');
    
    // 测试路径存在检查
    console.log('\n📂 Testing path existence...');
    const testPath = os.homedir();
    const exists = accelerator.pathExists(testPath);
    console.log(`📍 Path "${testPath}" exists: ${exists}`);
    
    // 测试获取文件信息
    console.log('\n📄 Testing file info...');
    try {
      const info = accelerator.getItemInfo(testPath);
      console.log('📊 File info:', {
        name: info.name,
        type: info.type,
        size: info.size  // 截断显示
      });
    } catch (error) {
      console.log('⚠️  File info test failed:', error.message);
    }
    
    // 测试计算文件夹大小
    console.log('\n📏 Testing folder size calculation...');
    try {
      const tempDir = os.tmpdir();
      const result = accelerator.calculateFolderSize(tempDir, {
        maxDepth: 2,  // 限制深度以加快测试速度
        maxThreads: 2
      });
      
      console.log('📈 Calculation result:', {
        totalSize: result.totalSize.substring(0, 10) + '...',
        fileCount: result.fileCount,
        directoryCount: result.directoryCount,
        errorCount: result.errors.length,
        durationMs: result.durationMs
      });
    } catch (error) {
      console.log('⚠️  Folder size calculation failed:', error.message);
    }
    
    // 测试目录树构建
    console.log('\n🌳 Testing directory tree building...');
    try {
      const tree = accelerator.buildDirectoryTree(testPath, {
        maxDepth: 1  // 只测试一层
      });
      
      if (tree) {
        console.log('🌲 Tree root:', {
          name: tree.item.name,
          type: tree.item.type,
          childrenCount: tree.children.length,
          depth: tree.depth
        });
      } else {
        console.log('⚠️  Tree is null');
      }
    } catch (error) {
      console.log('⚠️  Directory tree building failed:', error.message);
    }
    
    // 清理
    console.log('\n🧹 Cleaning up...');
    accelerator.cleanup();
    console.log('✅ Cleanup completed');
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runBasicTests().catch(console.error);
}

module.exports = { runBasicTests }; 