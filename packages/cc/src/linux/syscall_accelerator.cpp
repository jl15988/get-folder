#include "syscall_accelerator.h"

#ifdef PLATFORM_LINUX

#include <sys/syscall.h>
#include <algorithm>
#include <future>
#include <atomic>

namespace brisk {
namespace filesystem {

LinuxSyscallAccelerator::LinuxSyscallAccelerator() 
    : max_threads_(getOptimalThreadCount()) {
}

LinuxSyscallAccelerator::~LinuxSyscallAccelerator() {
}

CalculationResult LinuxSyscallAccelerator::calculateFolderSize(
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
        
        // 清理已处理的 inode 集合
        {
            std::lock_guard<std::mutex> lock(inode_mutex_);
            processed_inodes_.clear();
        }
        
        // 递归计算目录大小
        calculateDirectorySizeRecursive(path, options, result, 0);
        
    } catch (const FilesystemException& e) {
        result.errors.push_back(std::string(e.what()));
    } catch (const std::exception& e) {
        result.errors.push_back("Unexpected error: " + std::string(e.what()));
    }
    
    result.duration_ms = Utils::getCurrentTimestamp() - start_time;
    return result;
}

std::shared_ptr<TreeNode> LinuxSyscallAccelerator::buildDirectoryTree(
    const std::string& path,
    const CalculationOptions& options) {
    
    if (!pathExists(path)) {
        throw FilesystemException("Path not found: " + path, ErrorType::PATH_NOT_FOUND);
    }
    
    // 清理已处理的 inode 集合
    {
        std::lock_guard<std::mutex> lock(inode_mutex_);
        processed_inodes_.clear();
    }
    
    return buildDirectoryTreeRecursive(path, options, 0);
}

bool LinuxSyscallAccelerator::pathExists(const std::string& path) {
    struct stat st;
    return stat(path.c_str(), &st) == 0;
}

FileSystemItem LinuxSyscallAccelerator::getItemInfo(const std::string& path, bool follow_symlinks) {
    LinuxFileInfo info;
    
    if (!getFileInfo(path, follow_symlinks, info)) {
        throw FilesystemException("Cannot get file info: " + path, ErrorType::IO_ERROR);
    }
    
    return linuxFileInfoToFileSystemItem(info);
}

bool LinuxSyscallAccelerator::getFileInfo(const std::string& path, bool follow_symlinks, 
                                         LinuxFileInfo& info) {
    struct stat st;
    int result;
    
    if (follow_symlinks) {
        result = stat(path.c_str(), &st);
    } else {
        result = lstat(path.c_str(), &st);
    }
    
    if (result != 0) {
        return false;
    }
    
    info.path = path;
    info.name = path.substr(path.find_last_of('/') + 1);
    info.inode = st.st_ino;
    info.mode = st.st_mode;
    info.size = st.st_size;
    info.atime = st.st_atime;
    info.mtime = st.st_mtime;
    info.ctime = st.st_ctime;
    info.is_directory = S_ISDIR(st.st_mode);
    info.is_symlink = S_ISLNK(st.st_mode);
    
    return true;
}

bool LinuxSyscallAccelerator::listDirectoryFast(int dir_fd, std::vector<std::string>& entries) {
    const size_t BUFFER_SIZE = 4096;
    char buffer[BUFFER_SIZE];
    
    while (true) {
        ssize_t bytes_read = syscall(SYS_getdents64, dir_fd, buffer, BUFFER_SIZE);
        
        if (bytes_read == -1) {
            return false;
        }
        
        if (bytes_read == 0) {
            break;  // 目录结束
        }
        
        // 解析目录项
        size_t offset = 0;
        while (offset < static_cast<size_t>(bytes_read)) {
            struct linux_dirent64 {
                ino_t d_ino;
                off_t d_off;
                unsigned short d_reclen;
                unsigned char d_type;
                char d_name[];
            };
            
            auto* entry = reinterpret_cast<linux_dirent64*>(buffer + offset);
            
            // 跳过 . 和 ..
            if (strcmp(entry->d_name, ".") != 0 && strcmp(entry->d_name, "..") != 0) {
                entries.emplace_back(entry->d_name);
            }
            
            offset += entry->d_reclen;
        }
    }
    
    return true;
}

void LinuxSyscallAccelerator::calculateDirectorySizeRecursive(
    const std::string& path,
    const CalculationOptions& options,
    CalculationResult& result,
    uint32_t current_depth) {
    
    if (current_depth >= options.max_depth) {
        return;
    }
    
    LinuxFileInfo info;
    if (!getFileInfo(path, options.follow_symlinks, info)) {
        result.errors.push_back("Cannot access: " + path);
        return;
    }
    
    // 检查是否应该忽略
    if (shouldIgnoreFile(info, options)) {
        return;
    }
    
    // 检查 inode 是否已处理（避免硬链接重复计算）
    {
        std::lock_guard<std::mutex> lock(inode_mutex_);
        if (processed_inodes_.count(info.inode)) {
            return;
        }
        processed_inodes_.insert(info.inode);
    }
    
    if (info.is_directory) {
        result.directory_count++;
        
        // 打开目录
        int dir_fd = open(path.c_str(), O_RDONLY);
        if (dir_fd == -1) {
            result.errors.push_back("Cannot open directory: " + path);
            return;
        }
        
        std::vector<std::string> entries;
        if (listDirectoryFast(dir_fd, entries)) {
            // 并行处理子目录
            if (options.max_threads > 1 && entries.size() > 10) {
                std::vector<std::string> sub_dirs;
                std::vector<std::string> files;
                
                // 分离目录和文件
                for (const auto& entry : entries) {
                    std::string full_path = path + "/" + entry;
                    LinuxFileInfo entry_info;
                    
                    if (getFileInfo(full_path, options.follow_symlinks, entry_info)) {
                        if (entry_info.is_directory) {
                            sub_dirs.push_back(full_path);
                        } else {
                            files.push_back(full_path);
                        }
                    }
                }
                
                // 处理文件
                for (const auto& file_path : files) {
                    LinuxFileInfo file_info;
                    if (getFileInfo(file_path, options.follow_symlinks, file_info)) {
                        if (!shouldIgnoreFile(file_info, options)) {
                            std::lock_guard<std::mutex> lock(inode_mutex_);
                            if (!processed_inodes_.count(file_info.inode)) {
                                processed_inodes_.insert(file_info.inode);
                                result.file_count++;
                                result.total_size += file_info.size;
                            }
                        }
                    }
                }
                
                // 并行处理子目录
                processDirectoriesParallel(sub_dirs, options, result, current_depth + 1);
                
            } else {
                // 串行处理
                for (const auto& entry : entries) {
                    std::string full_path = path + "/" + entry;
                    LinuxFileInfo entry_info;
                    
                    if (getFileInfo(full_path, options.follow_symlinks, entry_info)) {
                        if (entry_info.is_directory) {
                            calculateDirectorySizeRecursive(full_path, options, result, current_depth + 1);
                        } else if (!shouldIgnoreFile(entry_info, options)) {
                            std::lock_guard<std::mutex> lock(inode_mutex_);
                            if (!processed_inodes_.count(entry_info.inode)) {
                                processed_inodes_.insert(entry_info.inode);
                                result.file_count++;
                                result.total_size += entry_info.size;
                            }
                        }
                    }
                }
            }
        } else {
            result.errors.push_back("Cannot list directory: " + path);
        }
        
        close(dir_fd);
        
    } else {
        // 文件
        result.file_count++;
        result.total_size += info.size;
    }
}

std::shared_ptr<TreeNode> LinuxSyscallAccelerator::buildDirectoryTreeRecursive(
    const std::string& path,
    const CalculationOptions& options,
    uint32_t current_depth) {
    
    if (current_depth >= options.max_depth) {
        return nullptr;
    }
    
    LinuxFileInfo info;
    if (!getFileInfo(path, options.follow_symlinks, info)) {
        return nullptr;
    }
    
    if (shouldIgnoreFile(info, options)) {
        return nullptr;
    }
    
    auto node = std::make_shared<TreeNode>();
    node->item = linuxFileInfoToFileSystemItem(info);
    node->depth = current_depth;
    node->total_size = info.size;
    
    if (info.is_directory) {
        int dir_fd = open(path.c_str(), O_RDONLY);
        if (dir_fd != -1) {
            std::vector<std::string> entries;
            if (listDirectoryFast(dir_fd, entries)) {
                for (const auto& entry : entries) {
                    std::string full_path = path + "/" + entry;
                    auto child_node = buildDirectoryTreeRecursive(full_path, options, current_depth + 1);
                    if (child_node) {
                        node->children.push_back(child_node);
                        node->total_size += child_node->total_size;
                    }
                }
            }
            close(dir_fd);
        }
    }
    
    return node;
}

FileSystemItem LinuxSyscallAccelerator::linuxFileInfoToFileSystemItem(const LinuxFileInfo& info) {
    FileSystemItem item;
    item.path = info.path;
    item.name = info.name;
    item.size = static_cast<uint64_t>(info.size);
    item.created_time = static_cast<uint64_t>(info.ctime) * 1000;  // 转换为毫秒
    item.modified_time = static_cast<uint64_t>(info.mtime) * 1000;
    item.accessed_time = static_cast<uint64_t>(info.atime) * 1000;
    item.inode = static_cast<uint64_t>(info.inode);
    
    if (info.is_directory) {
        item.type = ItemType::DIRECTORY;
    } else if (info.is_symlink) {
        item.type = ItemType::SYMBOLIC_LINK;
    } else {
        item.type = ItemType::FILE;
    }
    
    return item;
}

bool LinuxSyscallAccelerator::shouldIgnoreFile(const LinuxFileInfo& info, const CalculationOptions& options) {
    // 检查隐藏文件
    if (!options.include_hidden && Utils::isHiddenFile(info.name)) {
        return true;
    }
    
    // 检查忽略模式
    if (Utils::matchesIgnorePattern(info.path, options.ignore_patterns)) {
        return true;
    }
    
    return false;
}

void LinuxSyscallAccelerator::processDirectoriesParallel(
    const std::vector<std::string>& directories,
    const CalculationOptions& options,
    CalculationResult& result,
    uint32_t current_depth) {
    
    if (directories.empty()) {
        return;
    }
    
    // 计算线程数
    uint32_t thread_count = std::min(max_threads_, static_cast<uint32_t>(directories.size()));
    
    // 分割目录列表
    std::vector<std::vector<std::string>> thread_dirs(thread_count);
    for (size_t i = 0; i < directories.size(); ++i) {
        thread_dirs[i % thread_count].push_back(directories[i]);
    }
    
    // 创建线程结果
    std::vector<std::future<CalculationResult>> futures;
    
    for (const auto& dirs : thread_dirs) {
        if (!dirs.empty()) {
            futures.push_back(std::async(std::launch::async, [this, dirs, options, current_depth]() {
                CalculationResult thread_result;
                for (const auto& dir : dirs) {
                    calculateDirectorySizeRecursive(dir, options, thread_result, current_depth);
                }
                return thread_result;
            }));
        }
    }
    
    // 收集结果
    for (auto& future : futures) {
        try {
            CalculationResult thread_result = future.get();
            result.total_size += thread_result.total_size;
            result.file_count += thread_result.file_count;
            result.directory_count += thread_result.directory_count;
            
            // 合并错误
            result.errors.insert(result.errors.end(), 
                               thread_result.errors.begin(), 
                               thread_result.errors.end());
        } catch (const std::exception& e) {
            result.errors.push_back("Thread error: " + std::string(e.what()));
        }
    }
}

uint32_t LinuxSyscallAccelerator::getOptimalThreadCount() {
    uint32_t hardware_threads = std::thread::hardware_concurrency();
    if (hardware_threads == 0) {
        return 4;  // 默认线程数
    }
    
    // 对于 I/O 密集型任务，可以使用更多线程
    return std::min(hardware_threads * 2, 16u);
}

} // namespace filesystem
} // namespace brisk

#endif // PLATFORM_LINUX 