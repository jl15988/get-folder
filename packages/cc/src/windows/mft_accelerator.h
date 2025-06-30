#pragma once

#include "../common/filesystem_common.h"

#ifdef PLATFORM_WINDOWS

#include <Windows.h>
#include <winioctl.h>
#include <set>
#include <unordered_map>
#include <thread>
#include <mutex>
#include <functional>

namespace brisk {
namespace filesystem {

/**
 * NTFS MFT 记录结构
 */
struct MftRecord {
    uint64_t file_reference;        // 文件引用号
    uint64_t parent_reference;      // 父目录引用号
    uint64_t file_size;            // 文件大小
    uint64_t allocated_size;       // 分配大小
    uint32_t attributes;           // 文件属性
    uint64_t creation_time;        // 创建时间
    uint64_t modification_time;    // 修改时间
    uint64_t access_time;          // 访问时间
    std::string filename;          // 文件名
    bool is_directory;             // 是否为目录
    bool is_deleted;               // 是否已删除
};

/**
 * MFT 枚举回调函数类型
 */
typedef std::function<bool(const MftRecord& record)> MftEnumCallback;

/**
 * Windows NTFS MFT 加速器
 * 通过直接读取主文件表（MFT）来快速遍历文件系统
 */
class WindowsMftAccelerator : public FilesystemAccelerator {
private:
    HANDLE volume_handle_;              // 卷句柄
    std::string volume_path_;           // 卷路径
    uint64_t mft_start_lcn_;           // MFT 起始逻辑簇号
    uint32_t bytes_per_cluster_;       // 每簇字节数
    uint32_t bytes_per_record_;        // 每记录字节数
    bool mft_initialized_;             // MFT 是否已初始化
    
    // 缓存和线程安全
    std::unordered_map<uint64_t, MftRecord> record_cache_;
    std::mutex cache_mutex_;
    std::set<uint64_t> processed_inodes_;
    std::mutex inode_mutex_;

public:
    /**
     * 构造函数
     */
    WindowsMftAccelerator();
    
    /**
     * 析构函数
     */
    ~WindowsMftAccelerator();
    
    /**
     * 初始化 MFT 访问
     * @param volume_path 卷路径（如 "C:"）
     * @return 是否成功
     */
    bool initialize(const std::string& volume_path);
    
    /**
     * 清理资源
     */
    void cleanup();
    
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
     * 初始化卷信息
     * @return 是否成功
     */
    bool initializeVolumeInfo();
    
    /**
     * 获取 MFT 起始位置
     * @return 是否成功
     */
    bool getMftLocation();
    
    /**
     * 枚举 MFT 记录
     * @param start_record 起始记录号
     * @param record_count 记录数量
     * @param callback 回调函数
     * @return 是否成功
     */
    bool enumerateMftRecords(uint64_t start_record, uint64_t record_count, 
                           MftEnumCallback callback);
    
    /**
     * 解析 MFT 记录
     * @param buffer 记录缓冲区
     * @param record 输出记录结构
     * @return 是否成功
     */
    bool parseMftRecord(const uint8_t* buffer, MftRecord& record);
    
    /**
     * 解析文件名属性
     * @param attr_data 属性数据
     * @param attr_size 属性大小
     * @param filename 输出文件名
     * @return 是否成功
     */
    bool parseFilenameAttribute(const uint8_t* attr_data, uint32_t attr_size, 
                              std::string& filename);
    
    /**
     * 解析标准信息属性
     * @param attr_data 属性数据
     * @param attr_size 属性大小
     * @param record 输出记录结构
     * @return 是否成功
     */
    bool parseStandardInfoAttribute(const uint8_t* attr_data, uint32_t attr_size, 
                                  MftRecord& record);
    
    /**
     * 将文件引用号转换为路径
     * @param file_reference 文件引用号
     * @return 文件路径
     */
    std::string fileReferenceToPath(uint64_t file_reference);
    
    /**
     * 查找文件记录
     * @param path 文件路径
     * @param record 输出记录结构
     * @return 是否找到
     */
    bool findFileRecord(const std::string& path, MftRecord& record);
    
    /**
     * 递归计算目录大小
     * @param parent_ref 父目录引用号
     * @param options 配置选项
     * @param result 计算结果
     * @param current_depth 当前深度
     */
    void calculateDirectorySize(uint64_t parent_ref, 
                              const CalculationOptions& options,
                              CalculationResult& result,
                              uint32_t current_depth = 0);
    
    /**
     * 递归构建目录树
     * @param parent_ref 父目录引用号
     * @param options 配置选项
     * @param current_depth 当前深度
     * @return 目录树节点
     */
    std::shared_ptr<TreeNode> buildDirectoryTreeRecursive(
        uint64_t parent_ref,
        const CalculationOptions& options,
        uint32_t current_depth = 0);
    
    /**
     * 转换 MFT 记录为文件系统项目
     * @param record MFT 记录
     * @return 文件系统项目
     */
    FileSystemItem mftRecordToFileSystemItem(const MftRecord& record);
    
    /**
     * FILETIME 转换为 Unix 时间戳
     * @param filetime Windows FILETIME
     * @return Unix 时间戳（毫秒）
     */
    uint64_t filetimeToUnixTimestamp(uint64_t filetime);
    
    /**
     * 检查是否应该忽略记录
     * @param record MFT 记录
     * @param options 配置选项
     * @return 是否忽略
     */
    bool shouldIgnoreRecord(const MftRecord& record, const CalculationOptions& options);
};

} // namespace filesystem
} // namespace brisk

#endif // PLATFORM_WINDOWS 