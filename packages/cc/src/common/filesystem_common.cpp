#include "filesystem_common.h"
#include <algorithm>
#include <chrono>
#include <regex>

#ifdef PLATFORM_WINDOWS
#include <Windows.h>
#elif defined(PLATFORM_LINUX) || defined(PLATFORM_MACOS)
#include <errno.h>
#include <string.h>
#endif

namespace brisk {
namespace filesystem {

std::string Utils::normalizePath(const std::string& path) {
    std::string normalized = path;
    
    // 替换反斜杠为正斜杠
    std::replace(normalized.begin(), normalized.end(), '\\', '/');
    
    // 移除重复的斜杠
    std::regex doubleSlash("/+");
    normalized = std::regex_replace(normalized, doubleSlash, "/");
    
    // 移除末尾斜杠（除非是根目录）
    if (normalized.length() > 1 && normalized.back() == '/') {
        normalized.pop_back();
    }
    
    return normalized;
}

bool Utils::matchesIgnorePattern(const std::string& path, 
                                const std::vector<std::string>& patterns) {
    for (const auto& pattern : patterns) {
        try {
            std::regex regex_pattern(pattern);
            if (std::regex_search(path, regex_pattern)) {
                return true;
            }
        } catch (const std::regex_error&) {
            // 如果正则表达式无效，进行简单的字符串匹配
            if (path.find(pattern) != std::string::npos) {
                return true;
            }
        }
    }
    return false;
}

std::string Utils::getFileExtension(const std::string& filename) {
    size_t dot_pos = filename.find_last_of('.');
    if (dot_pos == std::string::npos || dot_pos == 0 || 
        dot_pos == filename.length() - 1) {
        return "";
    }
    
    std::string ext = filename.substr(dot_pos);
    std::transform(ext.begin(), ext.end(), ext.begin(), ::tolower);
    return ext;
}

bool Utils::isHiddenFile(const std::string& filename) {
    if (filename.empty()) {
        return false;
    }
    
#ifdef PLATFORM_WINDOWS
    // Windows: 检查文件属性或以点开头
    return filename[0] == '.' || filename[0] == '$';
#else
    // Unix-like: 以点开头的文件为隐藏文件
    return filename[0] == '.';
#endif
}

ErrorType Utils::errorCodeToType(int error_code) {
#ifdef PLATFORM_WINDOWS
    switch (error_code) {
        case ERROR_ACCESS_DENIED:
        case ERROR_SHARING_VIOLATION:
            return ErrorType::ACCESS_DENIED;
        case ERROR_PATH_NOT_FOUND:
        case ERROR_FILE_NOT_FOUND:
            return ErrorType::PATH_NOT_FOUND;
        case ERROR_INVALID_NAME:
        case ERROR_BAD_PATHNAME:
            return ErrorType::INVALID_PATH;
        case ERROR_NOT_ENOUGH_MEMORY:
        case ERROR_OUTOFMEMORY:
            return ErrorType::MEMORY_ERROR;
        default:
            return ErrorType::IO_ERROR;
    }
#elif defined(PLATFORM_LINUX) || defined(PLATFORM_MACOS)
    switch (error_code) {
        case EACCES:
        case EPERM:
            return ErrorType::ACCESS_DENIED;
        case ENOENT:
        case ENOTDIR:
            return ErrorType::PATH_NOT_FOUND;
        case EINVAL:
        case ENAMETOOLONG:
            return ErrorType::INVALID_PATH;
        case ENOMEM:
            return ErrorType::MEMORY_ERROR;
        default:
            return ErrorType::IO_ERROR;
    }
#else
    return ErrorType::UNKNOWN_ERROR;
#endif
}

uint64_t Utils::getCurrentTimestamp() {
    auto now = std::chrono::system_clock::now();
    auto duration = now.time_since_epoch();
    auto millis = std::chrono::duration_cast<std::chrono::milliseconds>(duration);
    return static_cast<uint64_t>(millis.count());
}

} // namespace filesystem
} // namespace brisk 