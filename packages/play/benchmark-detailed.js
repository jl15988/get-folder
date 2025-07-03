const Benchmark = require('benchmark');
const { FolderSize } = require('get-folder');

/**
 * 详细的 GetFolder 性能分析测试
 * 测试不同配置选项对性能的影响
 */

// 测试配置
const TEST_PATH = process.cwd(); // 使用当前项目目录作为测试目标

/**
 * 并发数对性能的影响测试
 */
function createConcurrencyBenchmark() {
  console.log('\n🔀 并发数性能影响分析');
  console.log('=' .repeat(50));
  
  const suite = new Benchmark.Suite();
  const concurrencyLevels = [1, 2, 4, 8, 16];
  
  concurrencyLevels.forEach(concurrency => {
    suite.add(`concurrency=${concurrency}`, {
      defer: true,
      fn: function(deferred) {
        FolderSize.getSize(TEST_PATH, {
          concurrency: concurrency,
          ignoreErrors: true
        }).then(() => {
          deferred.resolve();
        }).catch(() => {
          deferred.resolve();
        });
      }
    });
  });
  
  return setupSuiteEvents(suite, '并发数测试');
}

/**
 * 错误处理策略对性能的影响
 */
function createErrorHandlingBenchmark() {
  console.log('\n⚠️  错误处理策略性能影响分析');
  console.log('=' .repeat(50));
  
  const suite = new Benchmark.Suite();
  
  // 忽略错误 vs 抛出错误
  suite.add('ignoreErrors=true', {
    defer: true,
    fn: function(deferred) {
      FolderSize.getSize(TEST_PATH, {
        concurrency: 2,
        ignoreErrors: true
      }).then(() => {
        deferred.resolve();
      }).catch(() => {
        deferred.resolve();
      });
    }
  });
  
  suite.add('ignoreErrors=false', {
    defer: true,
    fn: function(deferred) {
      FolderSize.getSize(TEST_PATH, {
        concurrency: 2,
        ignoreErrors: false
      }).then(() => {
        deferred.resolve();
      }).catch(() => {
        deferred.resolve();
      });
    }
  });
  
  return setupSuiteEvents(suite, '错误处理测试');
}

/**
 * 深度限制对性能的影响
 */
function createDepthLimitBenchmark() {
  console.log('\n📏 深度限制性能影响分析');
  console.log('=' .repeat(50));
  
  const suite = new Benchmark.Suite();
  const depthLimits = [3, 5, 10, Infinity];
  
  depthLimits.forEach(maxDepth => {
    const label = maxDepth === Infinity ? 'unlimited' : maxDepth;
    suite.add(`maxDepth=${label}`, {
      defer: true,
      fn: function(deferred) {
        FolderSize.getSize(TEST_PATH, {
          concurrency: 2,
          maxDepth: maxDepth,
          ignoreErrors: true
        }).then(() => {
          deferred.resolve();
        }).catch(() => {
          deferred.resolve();
        });
      }
    });
  });
  
  return setupSuiteEvents(suite, '深度限制测试');
}

/**
 * 过滤选项对性能的影响
 */
function createFilteringBenchmark() {
  console.log('\n🔍 过滤选项性能影响分析');
  console.log('=' .repeat(50));
  
  const suite = new Benchmark.Suite();
  
  // 无过滤
  suite.add('no-filtering', {
    defer: true,
    fn: function(deferred) {
      FolderSize.getSize(TEST_PATH, {
        concurrency: 2,
        ignoreErrors: true
      }).then(() => {
        deferred.resolve();
      }).catch(() => {
        deferred.resolve();
      });
    }
  });
  
  // 基础过滤
  suite.add('basic-ignores', {
    defer: true,
    fn: function(deferred) {
      FolderSize.getSize(TEST_PATH, {
        concurrency: 2,
        ignoreErrors: true,
        ignores: [/node_modules/, /\.git/]
      }).then(() => {
        deferred.resolve();
      }).catch(() => {
        deferred.resolve();
      });
    }
  });
  
  // 复杂过滤
  suite.add('complex-ignores', {
    defer: true,
    fn: function(deferred) {
      FolderSize.getSize(TEST_PATH, {
        concurrency: 2,
        ignoreErrors: true,
        ignores: [
          /node_modules/,
          /\.git/,
          /\.DS_Store/,
          /Thumbs\.db/,
          /\.cache/,
          /dist/,
          /build/,
          /coverage/
        ]
      }).then(() => {
        deferred.resolve();
      }).catch(() => {
        deferred.resolve();
      });
    }
  });
  
  return setupSuiteEvents(suite, '过滤选项测试');
}

/**
 * 链接处理选项对性能的影响
 */
function createLinkHandlingBenchmark() {
  console.log('\n🔗 链接处理性能影响分析');
  console.log('=' .repeat(50));
  
  const suite = new Benchmark.Suite();
  
  // 包含链接
  suite.add('includeLink=true', {
    defer: true,
    fn: function(deferred) {
      FolderSize.getSize(TEST_PATH, {
        concurrency: 2,
        ignoreErrors: true,
        includeLink: true
      }).then(() => {
        deferred.resolve();
      }).catch(() => {
        deferred.resolve();
      });
    }
  });
  
  // 排除链接
  suite.add('includeLink=false', {
    defer: true,
    fn: function(deferred) {
      FolderSize.getSize(TEST_PATH, {
        concurrency: 2,
        ignoreErrors: true,
        includeLink: false
      }).then(() => {
        deferred.resolve();
      }).catch(() => {
        deferred.resolve();
      });
    }
  });
  
  return setupSuiteEvents(suite, '链接处理测试');
}

/**
 * 设置测试套件事件处理
 */
function setupSuiteEvents(suite, testName) {
  suite.on('start', function() {
    console.log('⏱️  开始测试...\n');
  });

  suite.on('cycle', function(event) {
    const bench = event.target;
    const name = bench.name.padEnd(25);
    const hz = Benchmark.formatNumber(bench.hz.toFixed(3)).padStart(15);
    const rme = ('±' + bench.stats.rme.toFixed(2) + '%').padStart(8);
    const runs = ('(' + bench.stats.sample.length + ' runs)').padStart(12);
    
    console.log(`📊 ${name} ${hz} ops/sec ${rme} ${runs}`);
  });

  suite.on('complete', function() {
    console.log(`\n🏆 ${testName}完成!`);
    
    // 分析结果
    const results = this.slice().sort((a, b) => b.hz - a.hz);
    
    if (results.length > 1) {
      const fastest = results[0];
      const slowest = results[results.length - 1];
      const improvement = ((fastest.hz / slowest.hz - 1) * 100).toFixed(1);
      
      console.log(`🥇 最快配置: ${fastest.name}`);
      console.log(`🐌 最慢配置: ${slowest.name}`);
      console.log(`📈 性能差异: ${improvement}%`);
      
      // 给出优化建议
      const fastestName = fastest.name;
      if (fastestName.includes('concurrency=2')) {
        console.log('💡 建议: 使用 concurrency=2 以获得最佳性能');
      } else if (fastestName.includes('ignoreErrors=true')) {
        console.log('💡 建议: 启用 ignoreErrors 可以显著提升性能');
      } else if (fastestName.includes('includeLink=false')) {
        console.log('💡 建议: 如果不需要链接信息，禁用 includeLink 可以提升性能');
      }
    }
    
    console.log('-'.repeat(50));
  });

  suite.on('error', function(error) {
    console.error(`❌ ${testName}错误:`, error);
  });
  
  return suite;
}

/**
 * 内存使用分析
 */
async function runMemoryAnalysis() {
  console.log('\n💾 内存使用分析');
  console.log('=' .repeat(50));
  
  const configurations = [
    { name: '默认配置', options: {} },
    { name: '低并发', options: { concurrency: 1 } },
    { name: '高并发', options: { concurrency: 8 } },
    { name: '有过滤', options: { ignores: [/node_modules/] } },
    { name: '深度限制', options: { maxDepth: 3 } }
  ];
  
  for (const config of configurations) {
    // 强制垃圾回收
    if (global.gc) {
      global.gc();
    }
    
    const startMem = process.memoryUsage();
    const startTime = Date.now();
    
    try {
      await FolderSize.getSize(TEST_PATH, {
        ignoreErrors: true,
        ...config.options
      });
      
      const endTime = Date.now();
      const endMem = process.memoryUsage();
      
      const memUsed = (endMem.heapUsed - startMem.heapUsed) / 1024 / 1024;
      const duration = endTime - startTime;
      
      console.log(`📋 ${config.name.padEnd(15)} 内存: ${memUsed.toFixed(2)}MB  用时: ${duration}ms`);
    } catch (error) {
      console.log(`❌ ${config.name} 测试失败: ${error.message}`);
    }
    
    // 测试间暂停
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

/**
 * 运行所有详细测试
 */
async function runDetailedBenchmarks() {
  console.log('🔬 GetFolder 详细性能分析');
  console.log('深度测试各配置选项对性能的影响');
  console.log('=' .repeat(60));
  console.log(`📁 测试目录: ${TEST_PATH}\n`);

  const testSuites = [
    createConcurrencyBenchmark,
    createErrorHandlingBenchmark,
    createDepthLimitBenchmark,
    createFilteringBenchmark,
    createLinkHandlingBenchmark
  ];

  // 顺序执行每个测试套件
  for (const createSuite of testSuites) {
    const suite = createSuite();
    
    await new Promise((resolve) => {
      suite.on('complete', resolve);
      suite.run({ async: true });
    });
    
    // 测试间等待
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // 运行内存分析
  await runMemoryAnalysis();

  console.log('\n🎉 详细性能分析完成!');
  console.log('📊 建议基于以上结果优化您的配置选项');
}

/**
 * 快速配置建议测试
 */
async function runConfigRecommendationTest() {
  console.log('\n⚙️  最优配置推荐测试');
  console.log('=' .repeat(50));
  
  const configs = [
    {
      name: '默认配置',
      options: {}
    },
    {
      name: '推荐配置',
      options: {
        concurrency: 2,
        ignoreErrors: true,
        ignores: [/node_modules/, /\.git/],
        includeLink: false
      }
    },
    {
      name: '快速配置',
      options: {
        concurrency: 2,
        ignoreErrors: true,
        maxDepth: 5,
        ignores: [/node_modules/, /\.git/, /\.cache/]
      }
    }
  ];
  
  for (const config of configs) {
    const startTime = Date.now();
    const startMem = process.memoryUsage().heapUsed;
    
    try {
      const result = await FolderSize.getSize(TEST_PATH, config.options);
      const endTime = Date.now();
      const endMem = process.memoryUsage().heapUsed;
      
      const duration = endTime - startTime;
      const memUsed = (endMem - startMem) / 1024 / 1024;
      
      console.log(`\n📋 ${config.name}:`);
      console.log(`   ⏱️  用时: ${duration}ms`);
      console.log(`   💾 内存: ${memUsed.toFixed(2)}MB`);
      console.log(`   📁 文件: ${result.fileCount}`);
      console.log(`   📂 目录: ${result.directoryCount}`);
    } catch (error) {
      console.log(`❌ ${config.name} 失败: ${error.message}`);
    }
  }
}

// 主函数
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--quick')) {
    runConfigRecommendationTest().catch(console.error);
  } else if (args.includes('--memory')) {
    runMemoryAnalysis().catch(console.error);
  } else {
    runDetailedBenchmarks().catch(console.error);
  }
}

module.exports = {
  runDetailedBenchmarks,
  runMemoryAnalysis,
  runConfigRecommendationTest
}; 