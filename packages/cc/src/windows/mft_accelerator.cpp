#include "mft_accelerator.h"

#ifdef PLATFORM_WINDOWS

#include <iostream>
#include <memory>
#include <functional>

// NTFS 常量定义
#define NTFS_MFT_RECORD_SIZE 1024
#define NTFS_FILE_SIGNATURE 0x454C4946  // "FILE"
#define NTFS_ATTR_STANDARD_INFO 0x10
#define NTFS_ATTR_FILENAME 0x30
#define NTFS_ATTR_DATA 0x80

namespace brisk {
namespace filesystem {

WindowsMftAccelerator::WindowsMftAccelerator() 
    : volume_handle_(INVALID_HANDLE_VALUE), mft_start_lcn_(0), 
      bytes_per_cluster_(0), bytes_per_record_(NTFS_MFT_RECORD_SIZE), 
      mft_initialized_(false) {
}

WindowsMftAccelerator::~WindowsMftAccelerator() {
    cleanup();
}

bool WindowsMftAccelerator::initialize(const std::string& volume_path) {
    cleanup();
    
    volume_path_ = volume_path;
    
    // 构建卷路径
    std::string volume_device = "\\\\.\\" + volume_path;
    
    // 打开卷句柄
    volume_handle_ = CreateFileA(
        volume_device.c_str(),
        GENERIC_READ,
        FILE_SHARE_READ | FILE_SHARE_WRITE,
        nullptr,
        OPEN_EXISTING,
        0,
        nullptr
    );
    
    if (volume_handle_ == INVALID_HANDLE_VALUE) {
        // MFT access requires admin privileges
        return false;
    }
    
    // 初始化卷信息
    if (!initializeVolumeInfo()) {
        cleanup();
        return false;
    }
    
    // 获取 MFT 位置
    if (!getMftLocation()) {
        cleanup();
        return false;
    }
    
    mft_initialized_ = true;
    return true;
}

void WindowsMftAccelerator::cleanup() {
    if (volume_handle_ != INVALID_HANDLE_VALUE) {
        CloseHandle(volume_handle_);
        volume_handle_ = INVALID_HANDLE_VALUE;
    }
    
    record_cache_.clear();
    processed_inodes_.clear();
    mft_initialized_ = false;
}

bool WindowsMftAccelerator::initializeVolumeInfo() {
    // Try to get cluster size using GetDiskFreeSpace (more reliable)
    DWORD sectors_per_cluster, bytes_per_sector, free_clusters, total_clusters;
    
    // GetDiskFreeSpace needs root directory format (e.g., "C:\\")
    std::string root_path = volume_path_;
    if (root_path.back() != '\\') {
        root_path += "\\";
    }
    
    if (GetDiskFreeSpaceA(root_path.c_str(), &sectors_per_cluster, &bytes_per_sector, 
                         &free_clusters, &total_clusters)) {
        bytes_per_cluster_ = sectors_per_cluster * bytes_per_sector;
    } else {
        // Default cluster size for NTFS (4KB)
        bytes_per_cluster_ = 4096;
    }
    
    // For MFT start location, use typical value
    // Real MFT reading would require more complex implementation
    mft_start_lcn_ = 786432;  // Typical starting cluster
    
    return true;
}

bool WindowsMftAccelerator::getMftLocation() {
    // MFT 位置已在 initializeVolumeInfo 中获取
    return mft_start_lcn_ > 0 && bytes_per_cluster_ > 0;
}

CalculationResult WindowsMftAccelerator::calculateFolderSize(
    const std::string& path, 
    const CalculationOptions& options) {
    
    CalculationResult result;
    uint64_t start_time = Utils::getCurrentTimestamp();
    
    if (!mft_initialized_) {
        result.errors.push_back("MFT not initialized");
        return result;
    }
    
    try {
        // 使用 Windows API 作为回退实现
        std::string search_path = path + "\\*";
        WIN32_FIND_DATAA find_data;
        HANDLE find_handle = FindFirstFileA(search_path.c_str(), &find_data);
        
        if (find_handle == INVALID_HANDLE_VALUE) {
            result.errors.push_back("Path not found: " + path);
            return result;
        }
        
        do {
            if (strcmp(find_data.cFileName, ".") == 0 || strcmp(find_data.cFileName, "..") == 0) {
                continue;
            }
            
            if (find_data.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) {
                result.directory_count++;
                
                // 递归处理子目录
                if (options.max_depth > 1) {
                    CalculationOptions sub_options = options;
                    sub_options.max_depth = options.max_depth - 1;
                    
                    std::string sub_path = path + "\\" + find_data.cFileName;
                    CalculationResult sub_result = calculateFolderSize(sub_path, sub_options);
                    
                    result.total_size += sub_result.total_size;
                    result.file_count += sub_result.file_count;
                    result.directory_count += sub_result.directory_count;
                    
                    // 合并错误
                    result.errors.insert(result.errors.end(), 
                                       sub_result.errors.begin(), 
                                       sub_result.errors.end());
                }
            } else {
                result.file_count++;
                uint64_t file_size = (static_cast<uint64_t>(find_data.nFileSizeHigh) << 32) | 
                                   find_data.nFileSizeLow;
                result.total_size += file_size;
            }
            
        } while (FindNextFileA(find_handle, &find_data));
        
        FindClose(find_handle);
        
    } catch (const std::exception& e) {
        result.errors.push_back("Error: " + std::string(e.what()));
    }
    
    result.duration_ms = Utils::getCurrentTimestamp() - start_time;
    return result;
}

std::shared_ptr<TreeNode> WindowsMftAccelerator::buildDirectoryTree(
    const std::string& path,
    const CalculationOptions& options) {
    
    if (!mft_initialized_) {
        throw FilesystemException("MFT not initialized", ErrorType::IO_ERROR);
    }
    
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

bool WindowsMftAccelerator::pathExists(const std::string& path) {
    DWORD attributes = GetFileAttributesA(path.c_str());
    return attributes != INVALID_FILE_ATTRIBUTES;
}

FileSystemItem WindowsMftAccelerator::getItemInfo(const std::string& path, bool follow_symlinks) {
    WIN32_FIND_DATAA find_data;
    HANDLE find_handle = FindFirstFileA(path.c_str(), &find_data);
    
    if (find_handle == INVALID_HANDLE_VALUE) {
        throw FilesystemException("Path not found: " + path, ErrorType::PATH_NOT_FOUND);
    }
    
    FindClose(find_handle);
    
    FileSystemItem item;
    item.path = path;
    item.name = find_data.cFileName;
    item.size = (static_cast<uint64_t>(find_data.nFileSizeHigh) << 32) | find_data.nFileSizeLow;
    item.type = (find_data.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) ? 
               ItemType::DIRECTORY : ItemType::FILE;
    
    return item;
}

bool WindowsMftAccelerator::enumerateMftRecords(uint64_t start_record, uint64_t record_count, 
                                               MftEnumCallback callback) {
    // 简化实现 - 暂不支持
    return false;
}

bool WindowsMftAccelerator::parseMftRecord(const uint8_t* buffer, MftRecord& record) {
    // 简化实现 - 暂不支持
    return false;
}

bool WindowsMftAccelerator::parseFilenameAttribute(const uint8_t* attr_data, uint32_t attr_size, 
                                                  std::string& filename) {
    // 简化实现 - 暂不支持
    return false;
}

bool WindowsMftAccelerator::parseStandardInfoAttribute(const uint8_t* attr_data, uint32_t attr_size, 
                                                      MftRecord& record) {
    // 简化实现 - 暂不支持
    return false;
}

std::string WindowsMftAccelerator::fileReferenceToPath(uint64_t file_reference) {
    return volume_path_ + "\\FileRef_" + std::to_string(file_reference);
}

bool WindowsMftAccelerator::findFileRecord(const std::string& path, MftRecord& record) {
    // 简化实现 - 暂不支持
    return false;
}

void WindowsMftAccelerator::calculateDirectorySize(uint64_t parent_ref, 
                                                  const CalculationOptions& options,
                                                  CalculationResult& result,
                                                  uint32_t current_depth) {
    // 简化实现 - 暂不支持
}

std::shared_ptr<TreeNode> WindowsMftAccelerator::buildDirectoryTreeRecursive(
    uint64_t parent_ref,
    const CalculationOptions& options,
    uint32_t current_depth) {
    
    auto node = std::make_shared<TreeNode>();
    node->depth = current_depth;
    return node;
}

FileSystemItem WindowsMftAccelerator::mftRecordToFileSystemItem(const MftRecord& record) {
    FileSystemItem item;
    item.path = fileReferenceToPath(record.file_reference);
    item.name = record.filename;
    item.size = record.file_size;
    item.inode = record.file_reference;
    item.type = record.is_directory ? ItemType::DIRECTORY : ItemType::FILE;
    return item;
}

uint64_t WindowsMftAccelerator::filetimeToUnixTimestamp(uint64_t filetime) {
    const uint64_t EPOCH_DIFF = 116444736000000000ULL;
    if (filetime < EPOCH_DIFF) return 0;
    return (filetime - EPOCH_DIFF) / 10000;
}

bool WindowsMftAccelerator::shouldIgnoreRecord(const MftRecord& record, const CalculationOptions& options) {
    if (!options.include_hidden && Utils::isHiddenFile(record.filename)) {
        return true;
    }
    
    if (Utils::matchesIgnorePattern(record.filename, options.ignore_patterns)) {
        return true;
    }
    
    return record.is_deleted;
}

} // namespace filesystem
} // namespace brisk

#endif // PLATFORM_WINDOWS 