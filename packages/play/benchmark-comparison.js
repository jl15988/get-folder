const Benchmark = require('benchmark');
const { FolderSize } = require('get-folder');
const { getFolderSize } = require('./get-folder-size');

/**
 * 📊 Benchmark.js 结果说明
 * 
 * 例如: "1.23 ops/sec ±2.45% (7 runs)"
 * - 1.23 ops/sec: 每秒操作数，数值越高越好
 * - ±2.45%: 性能波动范围，越小越稳定  
 * - (7 runs): 测试次数，越多越可靠
 */

/**
 * 测试目录配置
 */
const TEST_CONFIGS = [
  {
    name: '小型目录',
    path: process.cwd(), // 当前项目根目录
    description: '项目根目录 (适中规模)'
  },
  {
    name: '大型目录', 
    path: 'D:\\BeiQiProjects\\BJJL\\bj-jljc-admin\\node_modules', // 可根据实际情况调整
    description: 'node_modules (大规模目录)'
  }
];

/**
 * 获取可用的测试目录
 */
function getAvailableTestPaths() {
  const fs = require('fs');
  return TEST_CONFIGS.filter(config => {
    try {
      return fs.existsSync(config.path);
    } catch {
      return false;
    }
  });
}

/**
 * 创建性能测试套件
 */
function createBenchmarkSuite(testPath, testName) {
  console.log(`\n🏁 开始测试: ${testName}`);
  console.log(`📁 测试路径: ${testPath}`);
  console.log('=' .repeat(60));

  const suite = new Benchmark.Suite();

  // 添加我们的实现测试
  suite.add('GetFolder (our)', {
    defer: true,
    fn: function(deferred) {
      FolderSize.getSize(testPath).then(result => {
        deferred.resolve();
      }).catch(err => {
        console.error('GetFolder 错误:', err.message);
        deferred.resolve();
      });
    }
  });

  // 添加对比库测试
  suite.add('get-folder-size', {
    defer: true,
    fn: function(deferred) {
      getFolderSize(testPath).then(result => {
        deferred.resolve();
      }).catch(err => {
        console.error('get-folder-size 错误:', err.message);
        deferred.resolve();
      });
    }
  });

  // 事件处理
  suite.on('start', function() {
    console.log('⏱️  开始基准测试...\n');
  });

  suite.on('cycle', function(event) {
    const bench = event.target;
    const name = bench.name.padEnd(20);
    const hz = Benchmark.formatNumber(bench.hz.toFixed(2)).padStart(12);
    const rme = ('±' + bench.stats.rme.toFixed(2) + '%').padStart(8);
    const runs = ('(' + bench.stats.sample.length + ' runs)').padStart(12);
    
    console.log(`📊 ${name} ${hz} ops/sec ${rme} ${runs}`);
  });

  suite.on('complete', function() {
    console.log('\n🏆 基准测试完成!');
    const fastest = this.filter('fastest');
    const slowest = this.filter('slowest');
    
    if (fastest.length > 0 && slowest.length > 0) {
      const fastestHz = fastest[0].hz;
      const slowestHz = slowest[0].hz;
      const improvement = ((fastestHz / slowestHz - 1) * 100).toFixed(1);
      
      console.log(`🚀 最快: ${fastest.map('name')}`);
      console.log(`📈 性能提升: ${improvement}%`);
      
      // 如果我们的实现更快，给出特别提示
      if (fastest[0].name.includes('GetFolder')) {
        console.log('✨ GetFolder 表现优异! 🎉');
      }
    }
    console.log('-'.repeat(60));
  });

  suite.on('error', function(error) {
    console.error('❌ 基准测试错误:', error);
  });

  return suite;
}

/**
 * 运行所有基准测试
 */
async function runAllBenchmarks() {
  console.log('🚀 GetFolder 性能基准测试');
  console.log('使用 Benchmark.js 进行科学性能测量');
  console.log('=' .repeat(60));

  const availablePaths = getAvailableTestPaths();
  
  if (availablePaths.length === 0) {
    console.log('❌ 没有找到可用的测试目录');
    console.log('请检查 TEST_CONFIGS 中的路径是否存在');
    return;
  }

  console.log(`📋 找到 ${availablePaths.length} 个可用测试目录:`);
  availablePaths.forEach((config, index) => {
    console.log(`   ${index + 1}. ${config.name}: ${config.description}`);
  });

  // 顺序执行每个测试（避免并发干扰）
  for (const config of availablePaths) {
    const suite = createBenchmarkSuite(config.path, config.name);
    
    await new Promise((resolve) => {
      suite.on('complete', resolve);
      suite.run({ async: true });
    });
    
    // 在测试之间添加延迟，让系统稳定
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n🎉 所有基准测试完成!');
  console.log('💡 提示: 运行多次测试以获得更稳定的结果');
}

/**
 * 单个目录快速测试
 */
function runQuickTest(testPath) {
  console.log('⚡ 快速性能测试模式');
  const suite = createBenchmarkSuite(testPath, '快速测试');
  suite.run({ async: true });
}

// 主函数
if (require.main === module) {
  // 检查命令行参数
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // 如果提供了路径参数，进行快速测试
    const testPath = args[0];
    console.log(`🎯 对指定路径进行快速测试: ${testPath}`);
    runQuickTest(testPath);
  } else {
    // 否则运行完整的基准测试套件
    runAllBenchmarks().catch(console.error);
  }
}

module.exports = {
  createBenchmarkSuite,
  runAllBenchmarks,
  runQuickTest
}; 