#pragma once

#include "../common/filesystem_common.h"

#ifdef PLATFORM_MACOS

#include "../linux/syscall_accelerator.h"

namespace brisk {
namespace filesystem {

/**
 * macOS 系统调用加速器
 * 继承自 Linux 加速器，因为 macOS 和 Linux 在文件系统 API 上有很多相似性
 * 但添加了 macOS 特定的优化
 */
class MacOSSyscallAccelerator : public LinuxSyscallAccelerator {
public:
    /**
     * 构造函数
     */
    MacOSSyscallAccelerator();
    
    /**
     * 析构函数
     */
    ~MacOSSyscallAccelerator();
    
    // 重写部分方法以支持 macOS 特定功能
    CalculationResult calculateFolderSize(
        const std::string& path, 
        const CalculationOptions& options = CalculationOptions()
    ) override;

private:
    /**
     * 使用 macOS 特定的目录遍历优化
     * @param path 目录路径
     * @param options 配置选项
     * @param result 计算结果
     * @param current_depth 当前深度
     */
    void calculateDirectorySizeMacOS(
        const std::string& path,
        const CalculationOptions& options,
        CalculationResult& result,
        uint32_t current_depth = 0
    );
    
    /**
     * 检查是否为 macOS 系统文件/目录
     * @param path 文件路径
     * @return 是否为系统文件
     */
    bool isMacOSSystemPath(const std::string& path);
};

} // namespace filesystem
} // namespace brisk

#endif // PLATFORM_MACOS 