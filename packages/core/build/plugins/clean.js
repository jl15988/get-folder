/**
 * 构建前清理文件/目录插件
 */
const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * 递归删除文件或目录
 * @param {string} targetPath 目标路径
 */
function removeFileOrDir(targetPath) {
    if (!fs.existsSync(targetPath)) return;
    
    const stats = fs.statSync(targetPath);
    
    if (stats.isDirectory()) {
        // 删除目录中的所有内容
        const files = fs.readdirSync(targetPath);
        for (const file of files) {
            removeFileOrDir(path.join(targetPath, file));
        }
        // 删除空目录
        fs.rmdirSync(targetPath);
    } else {
        // 删除文件
        fs.unlinkSync(targetPath);
    }
}

/**
 * 创建清理插件
 * @returns {Object} Rollup插件
 */
function createCleanPlugin() {
    if (!config.CLEAN_PATHS || config.CLEAN_PATHS.length === 0) return null;
    
    return {
        name: 'clean-plugin',
        buildStart() {
            // 在构建开始前执行清理
            for (const cleanPath of config.CLEAN_PATHS) {
                try {
                    const absolutePath = path.resolve(process.cwd(), cleanPath);
                    console.log(`正在清理: ${absolutePath}`);
                    removeFileOrDir(absolutePath);
                } catch (err) {
                    console.error(`清理 ${cleanPath} 失败:`, err);
                }
            }
        }
    };
}

module.exports = createCleanPlugin; 