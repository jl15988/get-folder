const {FolderSize, FileSystemUtils, TreeFormatter} = require('get-folder')

async function testLazyTree() {
  console.log('=== 测试懒加载目录树 ===');
  
  const testPath = './'; // 测试当前目录
  const startTime = Date.now();
  
  try {
    // 第一步：创建懒加载树（只加载前2层，性能优化模式）
    const result = await FolderSize.getLazyTree(testPath, {
      initialDepth: 2,
      concurrency: 2,
      includeHidden: false,
      preCheckChildren: false // 性能优化：不预检查子节点
    });
    
    const initialTime = Date.now();
    
    console.log(`\n📊 初始加载统计:`);
    console.log(`- 已加载文件数量: ${result.loadedFileCount}`);
    console.log(`- 已加载目录数量: ${result.loadedDirectoryCount}`);
    console.log(`- 已加载链接数量: ${result.loadedLinkCount}`);
    console.log(`- 初始加载耗时: ${(initialTime - startTime) / 1000}s`);
    
    console.log(`\n🌲 懒加载树结构（初始状态）:`);
    console.log(TreeFormatter.formatTree(result.tree));
    
    // 第二步：查找一个未加载的目录并直接展开它
    const unloadedDir = findUnloadedDirectory(result.tree);
    if (unloadedDir) {
      console.log(`\n📂 展开目录: ${unloadedDir.name}`);
      const expandStart = Date.now();
      
      await FolderSize.expandNode(unloadedDir);
      
      const expandEnd = Date.now();
      console.log(`- 展开耗时: ${(expandEnd - expandStart) / 1000}s`);
      console.log(`- 子节点数量: ${unloadedDir.children?.length || 0} 个`);
      console.log(`- 目录状态: ${unloadedDir.children?.length ? '有内容' : '空目录'}`);
      
      console.log(`\n🌲 展开后的树结构:`);
      console.log(TreeFormatter.formatTree(result.tree));
    } else {
      console.log(`\n💡 没有找到可展开的目录节点`);
    }
    
  } catch (error) {
    console.error('❌ 懒加载目录树测试失败:', error.message);
  }
}

/**
 * 查找第一个未加载的目录节点
 * @param {*} node 根节点
 * @returns 未加载的目录节点或null
 */
function findUnloadedDirectory(node) {
  if (node.type === 'directory' && !node.loaded) {
    return node;
  }
  
  if (node.children) {
    for (const child of node.children) {
      const found = findUnloadedDirectory(child);
      if (found) return found;
    }
  }
  
  return null;
}

testLazyTree(); 