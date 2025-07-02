const { createAccelerator, isNativeAccelerationSupported, getPlatform } = require('../index.js');
const path = require('path');
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
    
    // 测试计算文件夹大小
    console.log('\n📏 Testing folder size calculation...');
    try {
      const sta = Date.now()
      const tempDir = 'D:\\BeiQiProjects\\BJJL\\bj-jljc-admin\\node_modules';
      const result = accelerator.calculateFolderSize(tempDir, {inodeCheck: false});
      
      console.log('📈 Calculation result:', result);
      console.log((Date.now() - sta) / 1000);
    } catch (error) {
      console.log('⚠️  Folder size calculation failed:', error.message);
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