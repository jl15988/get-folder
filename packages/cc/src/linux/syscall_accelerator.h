#pragma once

#include "../common/filesystem_common.h"

#ifdef PLATFORM_LINUX

#include <sys/types.h>
#include <sys/stat.h>
#include <dirent.h>
#include <unistd.h>
#include <fcntl.h>
#include <thread>
#include <mutex>
#include <vector>
#include <unordered_set>

namespace brisk {
namespace filesystem {

/**
 * Linux 文件系统信息结构
 */
struct LinuxFileInfo {
    std::string path;              // 文件路径
    std::string name;              // 文件名
    ino_t inode;                  // inode 号
    mode_t mode;                  // 文件模式
    off_t size;                   // 文件大小
    time_t atime;                 // 访问时间
    time_t mtime;                 // 修改时间
    time_t ctime;                 // 状态改变时间
    bool is_directory;            // 是否为目录
    bool is_symlink;              // 是否为符号链接
};

/**
 * Linux 系统调用加速器
 * 使用 Linux 特定的系统调用来优化文件系统操作
 */
class LinuxSyscallAccelerator : public FilesystemAccelerator {
private:
    std::unordered_set<ino_t> processed_inodes_;  // 已处理的 inode
    std::mutex inode_mutex_;                      // inode 集合的互斥锁
    uint32_t max_threads_;                        // 最大线程数

public:
    /**
     * 构造函数
     */
    LinuxSyscallAccelerator();
    
    /**
     * 析构函数
     */
    ~LinuxSyscallAccelerator();
    
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
     * 获取文件信息（使用 stat/lstat）
     * @param path 文件路径
     * @param follow_symlinks 是否跟随符号链接
     * @param info 输出文件信息
     * @return 是否成功
     */
    bool getFileInfo(const std::string& path, bool follow_symlinks, LinuxFileInfo& info);
    
    /**
     * 使用 getdents64 系统调用快速列出目录内容
     * @param dir_fd 目录文件描述符
     * @param entries 输出目录项列表
     * @return 是否成功
     */
    bool listDirectoryFast(int dir_fd, std::vector<std::string>& entries);
    
    /**
     * 递归计算目录大小
     * @param path 目录路径
     * @param options 配置选项
     * @param result 计算结果
     * @param current_depth 当前深度
     */
    void calculateDirectorySizeRecursive(
        const std::string& path,
        const CalculationOptions& options,
        CalculationResult& result,
        uint32_t current_depth = 0
    );
    
    /**
     * 递归构建目录树
     * @param path 目录路径
     * @param options 配置选项
     * @param current_depth 当前深度
     * @return 目录树节点
     */
    std::shared_ptr<TreeNode> buildDirectoryTreeRecursive(
        const std::string& path,
        const CalculationOptions& options,
        uint32_t current_depth = 0
    );
    
    /**
     * 转换 Linux 文件信息为文件系统项目
     * @param info Linux 文件信息
     * @return 文件系统项目
     */
    FileSystemItem linuxFileInfoToFileSystemItem(const LinuxFileInfo& info);
    
    /**
     * 检查是否应该忽略文件
     * @param info 文件信息
     * @param options 配置选项
     * @return 是否忽略
     */
    bool shouldIgnoreFile(const LinuxFileInfo& info, const CalculationOptions& options);
    
    /**
     * 并行处理目录列表
     * @param directories 目录列表
     * @param options 配置选项
     * @param result 计算结果
     * @param current_depth 当前深度
     */
    void processDirectoriesParallel(
        const std::vector<std::string>& directories,
        const CalculationOptions& options,
        CalculationResult& result,
        uint32_t current_depth
    );
    
    /**
     * 获取系统最优线程数
     * @return 线程数
     */
    uint32_t getOptimalThreadCount();
};

} // namespace filesystem
} // namespace brisk

#endif // PLATFORM_LINUX 