#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function log(message) {
  console.log(`[CC Build] ${message}`);
}

function checkPrerequisites() {
  log('检查构建先决条件...');
  
  try {
    // 检查 node-gyp
    execSync('node-gyp --version', { stdio: 'ignore' });
    log('✅ node-gyp 已安装');
  } catch (error) {
    log('❌ node-gyp 未安装，请运行: npm install -g node-gyp');
    process.exit(1);
  }
  
  // 检查必要文件
  const requiredFiles = [
    'binding.gyp',
    'src/main.cpp',
    'src/common/filesystem_common.h'
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(__dirname, '..', file))) {
      log(`❌ 缺少必要文件: ${file}`);
      process.exit(1);
    }
  }
  
  log('✅ 所有先决条件已满足');
}

function build() {
  log('开始构建 C++ 扩展...');
  
  try {
    // 清理之前的构建
    log('🧹 清理之前的构建...');
    try {
      execSync('node-gyp clean', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    } catch (error) {
      // 忽略清理错误
    }
    
    // 配置构建
    log('⚙️  配置构建...');
    execSync('node-gyp configure', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    
    // 执行构建
    log('🔨 编译 C++ 代码...');
    const buildCommand = process.argv.includes('--debug') 
      ? 'node-gyp build --debug' 
      : 'node-gyp build';
    
    execSync(buildCommand, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    
    log('✅ 构建成功完成！');
    
  } catch (error) {
    log('❌ 构建失败:');
    log(error.message);
    
    // 提供调试建议
    log('\n🔍 调试建议:');
    log('1. 确保已安装 C++ 编译工具链');
    log('2. 检查 Node.js 版本是否兼容');
    log('3. 尝试运行: npm run build:debug');
    log('4. 查看详细错误信息');
    
    process.exit(1);
  }
}

function main() {
  log('C++ 扩展构建脚本');
  log('==================');
  
  checkPrerequisites();
  build();
  
  log('\n🎉 构建流程完成！');
  log('现在可以运行测试: npm test');
}

if (require.main === module) {
  main();
}

module.exports = { checkPrerequisites, build }; 