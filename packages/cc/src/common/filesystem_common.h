#pragma once

#include <string>
#include <vector>
#include <memory>
#include <cstdint>

namespace brisk {
namespace filesystem {

/**
 * 文件系统项目类型枚举
 */
enum class ItemType {
    FILE,
    DIRECTORY,
    SYMBOLIC_LINK,
    UNKNOWN
};

/**
 * 错误类型枚举
 */
enum class ErrorType {
    ACCESS_DENIED,
    PATH_NOT_FOUND,
    INVALID_PATH,
    IO_ERROR,
    MEMORY_ERROR,
    UNKNOWN_ERROR
};

/**
 * 文件系统项目信息结构
 */
struct FileSystemItem {
    std::string path;               // 文件路径
    std::string name;               // 文件名
    ItemType type;                  // 项目类型
    uint64_t size;                  // 文件大小
    uint64_t created_time;          // 创建时间（时间戳）
    uint64_t modified_time;         // 修改时间（时间戳）
    uint64_t accessed_time;         // 访问时间（时间戳）
    uint64_t inode;                 // inode 号（Unix系统）或文件索引
    
    FileSystemItem() : type(ItemType::UNKNOWN), size(0), 
                      created_time(0), modified_time(0), 
                      accessed_time(0), inode(0) {}
};

/**
 * 目录树节点结构
 */
struct TreeNode {
    FileSystemItem item;                    // 文件系统项目信息
    std::vector<std::shared_ptr<TreeNode>> children;  // 子节点
    uint64_t total_size;                    // 总大小（包含子项目）
    int depth;                              // 深度
    
    TreeNode() : total_size(0), depth(0) {}
};

/**
 * 计算结果结构
 */
struct CalculationResult {
    uint64_t total_size;                    // 总大小
    uint32_t file_count;                    // 文件数量
    uint32_t directory_count;               // 目录数量
    uint32_t link_count;                    // 链接数量
    
    CalculationResult() : total_size(0), file_count(0), 
                         directory_count(0), link_count(0) {}
};

/**
 * 配置选项结构
 */
struct CalculationOptions {
    bool include_hidden;                    // 是否包含隐藏文件
    uint32_t max_depth;                     // 最大深度
    std::vector<std::string> ignore_patterns; // 忽略模式
    bool inode_check;                       // 是否启用硬链接检测
    bool include_link;                      // 是否包含符号链接大小
    
    CalculationOptions() : include_hidden(true), max_depth(UINT32_MAX), inode_check(true), include_link(true) {}
};

/**
 * 抽象基类：文件系统加速器
 */
class FilesystemAccelerator {
public:
    virtual ~FilesystemAccelerator() = default;
    
    /**
     * 计算文件夹大小
     * @param path 文件夹路径
     * @param options 配置选项
     * @return 计算结果
     */
    virtual CalculationResult calculateFolderSize(
        const std::string& path, 
        const CalculationOptions& options = CalculationOptions()
    ) = 0;
    
    /**
     * 构建目录树
     * @param path 文件夹路径
     * @param options 配置选项
     * @return 目录树根节点
     */
    virtual std::shared_ptr<TreeNode> buildDirectoryTree(
        const std::string& path,
        const CalculationOptions& options = CalculationOptions()
    ) = 0;
    
    /**
     * 检查路径是否存在
     * @param path 文件路径
     * @return 是否存在
     */
    virtual bool pathExists(const std::string& path) = 0;
    
    /**
     * 获取文件系统项目信息
     * @param path 文件路径
     * @param follow_symlinks 是否跟随符号链接
     * @return 文件系统项目信息
     */
    virtual FileSystemItem getItemInfo(const std::string& path, bool follow_symlinks = false) = 0;
};

/**
 * 工具函数
 */
class Utils {
public:
    /**
     * 规范化路径
     * @param path 原始路径
     * @return 规范化后的路径
     */
    static std::string normalizePath(const std::string& path);
    
    /**
     * 检查路径是否匹配忽略模式
     * @param path 文件路径
     * @param patterns 忽略模式列表
     * @return 是否匹配
     */
    static bool matchesIgnorePattern(const std::string& path, 
                                   const std::vector<std::string>& patterns);
    
    /**
     * 获取文件扩展名
     * @param filename 文件名
     * @return 扩展名
     */
    static std::string getFileExtension(const std::string& filename);
    
    /**
     * 检查是否为隐藏文件
     * @param filename 文件名
     * @return 是否为隐藏文件
     */
    static bool isHiddenFile(const std::string& filename);
    
    /**
     * 转换错误码为错误类型
     * @param error_code 系统错误码
     * @return 错误类型
     */
    static ErrorType errorCodeToType(int error_code);
    
    /**
     * 获取当前时间戳（毫秒）
     * @return 时间戳
     */
    static uint64_t getCurrentTimestamp();
};

/**
 * 异常类
 */
class FilesystemException : public std::exception {
private:
    std::string message_;
    ErrorType error_type_;
    
public:
    FilesystemException(const std::string& message, ErrorType type)
        : message_(message), error_type_(type) {}
    
    const char* what() const noexcept override {
        return message_.c_str();
    }
    
    ErrorType getErrorType() const {
        return error_type_;
    }
};

} // namespace filesystem
} // namespace brisk 