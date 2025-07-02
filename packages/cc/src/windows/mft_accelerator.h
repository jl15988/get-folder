#pragma once

#include "../common/filesystem_common.h"

#ifdef PLATFORM_WINDOWS

#include <Windows.h>
#include <unordered_set>

namespace brisk {
namespace filesystem {

/**
 * Windows 文件系统加速器
 * 使用 Windows API 来遍历文件系统
 */
class WindowsAccelerator : public FilesystemAccelerator {
private:
    std::unordered_set<std::string> processed_inodes_;  // 已处理的 inode（硬链接检测）

public:
    /**
     * 构造函数
     */
    WindowsAccelerator();
    
    /**
     * 析构函数
     */
    ~WindowsAccelerator();
    
    // 实现基类接口
    CalculationResult calculateFolderSize(
        const std::string& path, 
        const CalculationOptions& options = CalculationOptions()
    ) override;
    
    std::shared_ptr<TreeNode> buildDirectoryTree(
        const std::string& path,
        const CalculationOptions& options = CalculationOptions()
    ) override;
    
    bool pathExists(const std::string& path) override;
    
    FileSystemItem getItemInfo(const std::string& path, bool follow_symlinks = false) override;

private:
    /**
     * 递归计算目录大小（使用 Windows API）
     * @param path 目录路径
     * @param options 配置选项
     * @param result 计算结果
     * @param current_depth 当前深度
     */
    void calculateDirectorySizeRecursive(
        const std::string& path,
        const CalculationOptions& options,
        CalculationResult& result,
        uint32_t current_depth = 0);
    
    /**
     * 检查是否应该忽略文件
     * @param filename 文件名
     * @param options 配置选项
     * @return 是否忽略
     */
    bool shouldIgnoreFile(const std::string& filename, const CalculationOptions& options);
    
    /**
     * 获取文件的唯一标识符（用于硬链接检测）
     * @param path 文件路径
     * @return 文件唯一ID，失败时返回空字符串
     */
    std::string getFileInodeId(const std::string& path);
};

} // namespace filesystem
} // namespace brisk

#endif // PLATFORM_WINDOWS 