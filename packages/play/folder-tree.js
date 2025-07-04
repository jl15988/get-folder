const {FolderSize, FileSystemUtils, TreeFormatter} = require('get-folder')

async function testFolderTree() {
  console.log('=== 测试构建目录树 ===');
  
  const testPath = './'; // 测试当前目录
  const startTime = Date.now();
  
  try {
    const result = await FolderSize.getTree(testPath, {
      maxDepth: 3, // 限制深度避免过深
      concurrency: 2,
      includeHidden: false // 不包含隐藏文件
    });
    
    const endTime = Date.now();
    
    console.log(`\n📊 统计信息:`);
    console.log(`- 文件数量: ${result.fileCount}`);
    console.log(`- 目录数量: ${result.directoryCount}`);
    console.log(`- 链接数量: ${result.linkCount}`);
    console.log(`- 耗时: ${(endTime - startTime) / 1000}s`);
    
    console.log(`\n🌲 目录树结构:`);
    console.log(TreeFormatter.formatTree(result.tree));
    
  } catch (error) {
    console.error('❌ 构建目录树失败:', error.message);
  }
}

testFolderTree(); 