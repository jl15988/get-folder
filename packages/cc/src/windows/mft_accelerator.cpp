#include "mft_accelerator.h"

#ifdef PLATFORM_WINDOWS

#include <iostream>
#include <memory>
#include <cstdio>

namespace brisk {
namespace filesystem {

WindowsAccelerator::WindowsAccelerator() {
}

WindowsAccelerator::~WindowsAccelerator() {
}

CalculationResult WindowsAccelerator::calculateFolderSize(
    const std::string& path, 
    const CalculationOptions& options) {
    
    CalculationResult result;
    
    try {
        // 清理已处理的 inode 集合
        if (options.inode_check) {
            processed_inodes_.clear();
        }
        
        // 递归计算目录大小
        calculateDirectorySizeRecursive(path, options, result, 0);
        
    } catch (const std::exception&) {
        // 忽略错误，保持与 core 包行为一致
    }
    
    return result;
}

std::shared_ptr<TreeNode> WindowsAccelerator::buildDirectoryTree(
    const std::string& path,
    const CalculationOptions& options) {
    
    auto root_node = std::make_shared<TreeNode>();
    
    // 获取根目录信息
    WIN32_FIND_DATAA find_data;
    HANDLE find_handle = FindFirstFileA(path.c_str(), &find_data);
    
    if (find_handle == INVALID_HANDLE_VALUE) {
        throw FilesystemException("Path not found: " + path, ErrorType::PATH_NOT_FOUND);
    }
    
    FindClose(find_handle);
    
    // 填充根节点信息
    root_node->item.path = path;
    root_node->item.name = find_data.cFileName;
    root_node->item.type = (find_data.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) ? 
                          ItemType::DIRECTORY : ItemType::FILE;
    root_node->item.size = (static_cast<uint64_t>(find_data.nFileSizeHigh) << 32) | 
                          find_data.nFileSizeLow;
    root_node->depth = 0;
    
    return root_node;
}

bool WindowsAccelerator::pathExists(const std::string& path) {
    DWORD attributes = GetFileAttributesA(path.c_str());
    return attributes != INVALID_FILE_ATTRIBUTES;
}

FileSystemItem WindowsAccelerator::getItemInfo(const std::string& path, bool follow_symlinks) {
    WIN32_FIND_DATAA find_data;
    HANDLE find_handle = FindFirstFileA(path.c_str(), &find_data);
    
    if (find_handle == INVALID_HANDLE_VALUE) {
        throw FilesystemException("Path not found: " + path, ErrorType::PATH_NOT_FOUND);
    }
    
    FindClose(find_handle);
    
    // 检查是否为符号链接
    bool is_symlink = (find_data.dwFileAttributes & FILE_ATTRIBUTE_REPARSE_POINT) != 0;
    
    FileSystemItem item;
    item.path = path;
    item.name = find_data.cFileName;
    item.size = (static_cast<uint64_t>(find_data.nFileSizeHigh) << 32) | find_data.nFileSizeLow;
    
    // 处理符号链接类型
    if (is_symlink) {
        item.type = ItemType::SYMBOLIC_LINK;
    } else {
        // 普通文件或目录
        item.type = (find_data.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) ? 
                   ItemType::DIRECTORY : ItemType::FILE;
    }
    
    return item;
}

void WindowsAccelerator::calculateDirectorySizeRecursive(
    const std::string& path,
    const CalculationOptions& options,
    CalculationResult& result,
    uint32_t current_depth) {
    
    // 检查深度限制
    if (current_depth >= options.max_depth) {
        return;
    }
    
    // 使用 Windows API 列出目录内容
    std::string search_path = path + "\\*";
    WIN32_FIND_DATAA find_data;
    HANDLE find_handle = FindFirstFileA(search_path.c_str(), &find_data);
    
    if (find_handle == INVALID_HANDLE_VALUE) {
        return; // 忽略错误，保持与 core 包行为一致
    }
    
    do {
        // 跳过 . 和 .. 目录项
        if (strcmp(find_data.cFileName, ".") == 0 || strcmp(find_data.cFileName, "..") == 0) {
            continue;
        }
        
        std::string item_name = find_data.cFileName;
        std::string item_path = path + "\\" + item_name;
        
        // 检查是否应该忽略隐藏文件
        if (!options.include_hidden && (find_data.dwFileAttributes & FILE_ATTRIBUTE_HIDDEN)) {
            continue;
        }
        
                // 检查是否匹配忽略模式
        if (shouldIgnoreFile(item_name, options)) {
            continue;
        }
        
        // 首先检查文件类型
        bool is_symlink = (find_data.dwFileAttributes & FILE_ATTRIBUTE_REPARSE_POINT) != 0;
        bool is_directory = (find_data.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) != 0;
        
        // 硬链接检测（如果启用）- 但不包括符号链接
        // 符号链接有自己的 inode，应该被单独统计
        if (options.inode_check && !is_symlink) {
            std::string inode_id = getFileInodeId(item_path);
            if (!inode_id.empty() && processed_inodes_.count(inode_id)) {
                continue;  // 跳过已处理的硬链接，完全不处理
            }
            if (!inode_id.empty()) {
                processed_inodes_.insert(inode_id);
            }
        }
        
        // 获取文件大小
        uint64_t file_size = (static_cast<uint64_t>(find_data.nFileSizeHigh) << 32) | 
                           find_data.nFileSizeLow;
        result.total_size += file_size;
        
        if (is_symlink) {
            // 符号链接：只统计链接本身的大小，不跟随内容
            result.link_count++;
        } else if (is_directory) {
            // 处理目录：统计所有子目录
            result.directory_count++;
            
            // 递归处理子目录
            calculateDirectorySizeRecursive(item_path, options, result, current_depth + 1);
            
        } else {
            // 处理普通文件
            result.file_count++;
        }
        
    } while (FindNextFileA(find_handle, &find_data));
    
    FindClose(find_handle);
}

bool WindowsAccelerator::shouldIgnoreFile(const std::string& filename, const CalculationOptions& options) {
    // 检查忽略模式
    if (Utils::matchesIgnorePattern(filename, options.ignore_patterns)) {
        return true;
    }
    
    return false;
}

std::string WindowsAccelerator::getFileInodeId(const std::string& path) {
    // 使用 Windows API 获取文件的真正唯一标识符
    // 这与 Node.js 中的 stats.dev 和 stats.ino 等价
    
    HANDLE file_handle = CreateFileA(
        path.c_str(),
        0,  // 不需要读写权限，只获取信息
        FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
        nullptr,
        OPEN_EXISTING,
        FILE_FLAG_BACKUP_SEMANTICS,  // 支持目录
        nullptr
    );
    
    if (file_handle == INVALID_HANDLE_VALUE) {
        // 如果无法打开文件，使用路径作为回退
        // 这样虽然不能检测硬链接，但不会影响基本统计
        return "path:" + path;
    }
    
    BY_HANDLE_FILE_INFORMATION file_info;
    if (!GetFileInformationByHandle(file_handle, &file_info)) {
        CloseHandle(file_handle);
        return "path:" + path;  // 回退到路径模式
    }
    
    CloseHandle(file_handle);
    
    // 构造类似 Node.js 的 dev-ino 格式
    // dev = dwVolumeSerialNumber, ino = (nFileIndexHigh << 32) | nFileIndexLow
    uint64_t file_index = (static_cast<uint64_t>(file_info.nFileIndexHigh) << 32) | 
                         file_info.nFileIndexLow;
    
    char inode_id[64];
    sprintf_s(inode_id, sizeof(inode_id), "%08X-%016llX", 
              file_info.dwVolumeSerialNumber, file_index);
    
    return std::string(inode_id);
}

} // namespace filesystem
} // namespace brisk

#endif // PLATFORM_WINDOWS 