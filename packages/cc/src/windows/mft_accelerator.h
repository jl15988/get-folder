#pragma once

#include "../common/filesystem_common.h"

#ifdef PLATFORM_WINDOWS

#include <Windows.h>
#include <winioctl.h>  // 添加 winioctl.h 用于重解析点操作
#include <unordered_set>

// 手动定义重解析点相关结构体（确保兼容性）
#ifndef REPARSE_DATA_BUFFER_HEADER_SIZE
typedef struct _REPARSE_DATA_BUFFER {
    ULONG  ReparseTag;
    USHORT ReparseDataLength;
    USHORT Reserved;
    union {
        struct {
            USHORT SubstituteNameOffset;
            USHORT SubstituteNameLength;
            USHORT PrintNameOffset;
            USHORT PrintNameLength;
            ULONG  Flags;
            WCHAR  PathBuffer[1];
        } SymbolicLinkReparseBuffer;
        struct {
            USHORT SubstituteNameOffset;
            USHORT SubstituteNameLength;
            USHORT PrintNameOffset;
            USHORT PrintNameLength;
            WCHAR  PathBuffer[1];
        } MountPointReparseBuffer;
        struct {
            UCHAR DataBuffer[1];
        } GenericReparseBuffer;
    };
} REPARSE_DATA_BUFFER, *PREPARSE_DATA_BUFFER;

#define REPARSE_DATA_BUFFER_HEADER_SIZE 8  // sizeof(ULONG + USHORT + USHORT)
#endif

// 确保重解析点标签已定义
#ifndef IO_REPARSE_TAG_SYMLINK
#define IO_REPARSE_TAG_SYMLINK (0xA000000CL)
#endif

#ifndef IO_REPARSE_TAG_MOUNT_POINT
#define IO_REPARSE_TAG_MOUNT_POINT (0xA0000003L)
#endif

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
    
    /**
     * 使用 CreateFileW 获取符号链接大小
     * @param path 符号链接路径
     * @return 符号链接大小（字节），Unicode API 支持更好
     */
    uint64_t getSymlinkSize(const std::string& path);
  };

} // namespace filesystem
} // namespace brisk

#endif // PLATFORM_WINDOWS 