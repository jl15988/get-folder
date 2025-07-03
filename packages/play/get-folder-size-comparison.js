const { FolderSize } = require('get-folder');
const {getFolderSize} = require('./get-folder-size');

/**
 * 测试目标目录
 */
const TEST_PATH = 'D:\\BeiQiProjects\\BJJL\\bj-jljc-admin\\node_modules';

/**
 * 简单的性能测试
 */
async function runSimpleComparison() {
  let ourData = {}
  let theirData = {}

  console.log('🏁 FolderSize 性能对比测试');
  console.log('=====================================');
  console.log(`📁 测试目录: ${TEST_PATH}\n`);

  // 测试我们的实现
  console.log('🔧 测试我们的 FolderSize 实现...');
  const ourStartTime = Date.now();
  const ourStartMem = process.memoryUsage().heapUsed;

  try {
    const ourResult = await FolderSize.getSize(TEST_PATH)
    const ourEndTime = Date.now();
    const ourEndMem = process.memoryUsage().heapUsed;

    console.log('✅ 我们的实现完成:');
    console.log(`   用时: ${ourEndTime - ourStartTime}ms`);
    console.log(`   内存: ${((ourEndMem - ourStartMem) / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   大小: ${ourResult.size.toString()} bytes`);
    console.log(`   文件: ${ourResult.fileCount} 个`);
    console.log(`   目录: ${ourResult.directoryCount} 个\n`);

    ourData = {
      duration: ourEndTime - ourStartTime,
      memory: ourEndMem - ourStartMem,
      size: ourResult.size.toString()
    };
  } catch (error) {
    console.log(`❌ 我们的实现失败: ${error.message}\n`);
  }

  // 强制垃圾回收
  if (global.gc) {
    global.gc();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 测试 get-folder-size
  console.log('📦 测试 get-folder-size...');
  const theirStartTime = Date.now();
  const theirStartMem = process.memoryUsage().heapUsed;

  try {
    const result = await new Promise(async (resolve, reject) => {
      const res = await getFolderSize(TEST_PATH, {
        bigint: true
      });
      resolve(res.size)
    });

    const theirEndTime = Date.now();
    const theirEndMem = process.memoryUsage().heapUsed;

    console.log('✅ get-folder-size 完成:');
    console.log(`   用时: ${theirEndTime - theirStartTime}ms`);
    console.log(`   内存: ${((theirEndMem - theirStartMem) / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   大小: ${result.toString()} bytes\n`);

    theirData = {
      duration: theirEndTime - theirStartTime,
      memory: theirEndMem - theirStartMem,
      size: result.toString()
    };
  } catch (error) {
    console.log(`❌ get-folder-size 失败: ${error.message}\n`);
  }

  // 对比结果
  console.log('📊 性能对比结果');
  console.log('=====================================');
  
  if (ourData && theirData) {
    // 时间对比
    const timeDiff = ourData.duration - theirData.duration;
    const timePercent = (timeDiff / theirData.duration * 100).toFixed(1);
    
    if (timeDiff < 0) {
      console.log(`⚡ 速度: 我们快 ${Math.abs(timePercent)}% (${Math.abs(timeDiff)}ms)`);
    } else {
      console.log(`⚡ 速度: 我们慢 ${timePercent}% (+${timeDiff}ms)`);
    }
    
    // 内存对比
    const memDiff = ourData.memory - theirData.memory;
    const memPercent = (memDiff / theirData.memory * 100).toFixed(1);
    
    if (memDiff < 0) {
      console.log(`💾 内存: 我们省 ${Math.abs(memPercent)}% (${(Math.abs(memDiff) / 1024 / 1024).toFixed(2)}MB)`);
    } else {
      console.log(`💾 内存: 我们多用 ${memPercent}% (+${(memDiff / 1024 / 1024).toFixed(2)}MB)`);
    }
    
    // 大小对比
    if (ourData.size === theirData.size) {
      console.log(`📏 大小: 一致 ✅`);
    } else {
      console.log(`📏 大小: 不一致 ⚠️`);
      console.log(`   我们: ${ourData.size}`);
      console.log(`   他们: ${theirData.size}`);
    }
  } else {
    console.log('❌ 无法对比，有测试失败');
  }
  
  console.log('\n🎉 测试完成！');
}

// 运行测试
runSimpleComparison().catch(console.error);
