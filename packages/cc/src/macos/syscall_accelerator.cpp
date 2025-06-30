#include "syscall_accelerator.h"

#ifdef PLATFORM_MACOS

#include <sys/mount.h>
#include <CoreFoundation/CoreFoundation.h>

namespace brisk {
namespace filesystem {

MacOSSyscallAccelerator::MacOSSyscallAccelerator() 
    : LinuxSyscallAccelerator() {
}

MacOSSyscallAccelerator::~MacOSSyscallAccelerator() {
}

CalculationResult MacOSSyscallAccelerator::calculateFolderSize(
    const std::string& path, 
    const CalculationOptions& options) {
    
    CalculationResult result;
    uint64_t start_time = Utils::getCurrentTimestamp();
    
    try {
        // 检查路径是否存在
        if (!pathExists(path)) {
            result.errors.push_back("Path not found: " + path);
            return result;
        }
        
        // 检查是否为系统路径，如果是则使用特殊处理
        if (isMacOSSystemPath(path)) {
            // 对于系统路径，使用更谨慎的方法
            CalculationOptions safe_options = options;
            safe_options.max_threads = 1;  // 减少线程数以避免系统负载
            return LinuxSyscallAccelerator::calculateFolderSize(path, safe_options);
        }
        
        // 清理已处理的 inode 集合
        {
            std::lock_guard<std::mutex> lock(inode_mutex_);
            processed_inodes_.clear();
        }
        
        // 使用 macOS 优化的计算方法
        calculateDirectorySizeMacOS(path, options, result, 0);
        
    } catch (const FilesystemException& e) {
        result.errors.push_back(std::string(e.what()));
    } catch (const std::exception& e) {
        result.errors.push_back("Unexpected error: " + std::string(e.what()));
    }
    
    result.duration_ms = Utils::getCurrentTimestamp() - start_time;
    return result;
}

void MacOSSyscallAccelerator::calculateDirectorySizeMacOS(
    const std::string& path,
    const CalculationOptions& options,
    CalculationResult& result,
    uint32_t current_depth) {
    
    // 对于大多数情况，使用父类的实现
    // macOS 和 Linux 在文件系统 API 上基本兼容
    calculateDirectorySizeRecursive(path, options, result, current_depth);
    
    // 这里可以添加 macOS 特定的优化，例如：
    // - 使用 FSEvents 监控文件系统变化
    // - 利用 HFS+/APFS 特定功能
    // - 处理 macOS 特有的扩展属性和资源分支
    
    // 示例：检查扩展属性（resource fork）
    std::string resource_fork = path + "/..namedfork/rsrc";
    struct stat st;
    if (lstat(resource_fork.c_str(), &st) == 0) {
        // 添加资源分支的大小
        result.total_size += st.st_size;
    }
}

bool MacOSSyscallAccelerator::isMacOSSystemPath(const std::string& path) {
    // macOS 系统路径列表
    static const std::vector<std::string> system_paths = {
        "/System",
        "/Library/System",
        "/usr/libexec",
        "/bin",
        "/sbin",
        "/usr/bin",
        "/usr/sbin",
        "/var/db",
        "/private/var",
        "/.vol"
    };
    
    for (const auto& sys_path : system_paths) {
        if (path.find(sys_path) == 0) {
            return true;
        }
    }
    
    // 检查是否为时间机器备份路径
    if (path.find("/.Trashes") != std::string::npos || 
        path.find("/Backups.backupdb") != std::string::npos) {
        return true;
    }
    
    return false;
}

} // namespace filesystem
} // namespace brisk

#endif // PLATFORM_MACOS 