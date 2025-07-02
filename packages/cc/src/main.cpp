#include <napi.h>
#include <memory>
#include <string>

#include "common/filesystem_common.h"

#ifdef PLATFORM_WINDOWS
#include "windows/mft_accelerator.h"
#elif defined(PLATFORM_LINUX)
#include "linux/syscall_accelerator.h"
#elif defined(PLATFORM_MACOS)
#include "macos/syscall_accelerator.h"
#endif

using namespace brisk::filesystem;

/**
 * 全局加速器实例
 */
static std::unique_ptr<FilesystemAccelerator> g_accelerator;



/**
 * 将 Napi 数组转换为 C++ 字符串向量
 */
std::vector<std::string> napiArrayToStringVector(const Napi::Array& array) {
    std::vector<std::string> vec;
    for (uint32_t i = 0; i < array.Length(); ++i) {
        if (array[i].IsString()) {
            vec.push_back(array[i].As<Napi::String>().Utf8Value());
        }
    }
    return vec;
}

/**
 * 将 CalculationOptions 从 Napi 对象转换为 C++ 结构
 */
CalculationOptions parseCalculationOptions(const Napi::Object& obj) {
    CalculationOptions options;
    
    if (obj.Has("includeHidden") && obj.Get("includeHidden").IsBoolean()) {
        options.include_hidden = obj.Get("includeHidden").As<Napi::Boolean>().Value();
    }
    
    if (obj.Has("maxDepth") && obj.Get("maxDepth").IsNumber()) {
        options.max_depth = obj.Get("maxDepth").As<Napi::Number>().Uint32Value();
    }
    
    if (obj.Has("ignorePatterns") && obj.Get("ignorePatterns").IsArray()) {
        options.ignore_patterns = napiArrayToStringVector(obj.Get("ignorePatterns").As<Napi::Array>());
    }
    
    if (obj.Has("inodeCheck") && obj.Get("inodeCheck").IsBoolean()) {
        options.inode_check = obj.Get("inodeCheck").As<Napi::Boolean>().Value();
    }
    
    return options;
}

/**
 * 将 CalculationResult 转换为 Napi 对象
 */
Napi::Object calculationResultToNapiObject(const Napi::Env& env, const CalculationResult& result) {
    Napi::Object obj = Napi::Object::New(env);
    
    obj.Set("totalSize", Napi::BigInt::New(env, result.total_size));
    obj.Set("fileCount", Napi::Number::New(env, result.file_count));
    obj.Set("directoryCount", Napi::Number::New(env, result.directory_count));
    obj.Set("linkCount", Napi::Number::New(env, result.link_count));
    
    return obj;
}

/**
 * 将 FileSystemItem 转换为 Napi 对象
 */
Napi::Object fileSystemItemToNapiObject(const Napi::Env& env, const FileSystemItem& item) {
    Napi::Object obj = Napi::Object::New(env);
    
    obj.Set("path", Napi::String::New(env, item.path));
    obj.Set("name", Napi::String::New(env, item.name));
    obj.Set("size", Napi::BigInt::New(env, item.size));
    obj.Set("createdTime", Napi::BigInt::New(env, item.created_time));
    obj.Set("modifiedTime", Napi::BigInt::New(env, item.modified_time));
    obj.Set("accessedTime", Napi::BigInt::New(env, item.accessed_time));
    obj.Set("inode", Napi::BigInt::New(env, item.inode));
    
    // 设置类型
    std::string type;
    switch (item.type) {
        case ItemType::FILE: type = "file"; break;
        case ItemType::DIRECTORY: type = "directory"; break;
        case ItemType::SYMBOLIC_LINK: type = "symlink"; break;
        default: type = "unknown"; break;
    }
    obj.Set("type", Napi::String::New(env, type));
    
    return obj;
}

/**
 * 递归将 TreeNode 转换为 Napi 对象
 */
Napi::Object treeNodeToNapiObject(const Napi::Env& env, const std::shared_ptr<TreeNode>& node) {
    if (!node) {
        return env.Null().As<Napi::Object>();
    }
    
    Napi::Object obj = Napi::Object::New(env);
    
    obj.Set("item", fileSystemItemToNapiObject(env, node->item));
    obj.Set("totalSize", Napi::BigInt::New(env, node->total_size));
    obj.Set("depth", Napi::Number::New(env, node->depth));
    
    // 转换子节点
    Napi::Array children = Napi::Array::New(env, node->children.size());
    for (size_t i = 0; i < node->children.size(); ++i) {
        children[i] = treeNodeToNapiObject(env, node->children[i]);
    }
    obj.Set("children", children);
    
    return obj;
}

/**
 * 初始化加速器
 */
Napi::Value InitializeAccelerator(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
#ifdef PLATFORM_WINDOWS
        g_accelerator = std::make_unique<WindowsAccelerator>();
        return Napi::Boolean::New(env, true);
#elif defined(PLATFORM_LINUX)
        g_accelerator = std::make_unique<LinuxSyscallAccelerator>();
        return Napi::Boolean::New(env, true);
#elif defined(PLATFORM_MACOS)
        g_accelerator = std::make_unique<MacOSSyscallAccelerator>();
        return Napi::Boolean::New(env, true);
#else
        Napi::TypeError::New(env, "Unsupported platform").ThrowAsJavaScriptException();
        return env.Null();
#endif
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

/**
 * 计算文件夹大小
 */
Napi::Value CalculateFolderSize(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (!g_accelerator) {
        Napi::Error::New(env, "Accelerator not initialized").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected string path").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    std::string path = info[0].As<Napi::String>().Utf8Value();
    CalculationOptions options;
    
    if (info.Length() > 1 && info[1].IsObject()) {
        options = parseCalculationOptions(info[1].As<Napi::Object>());
    }
    
    try {
        CalculationResult result = g_accelerator->calculateFolderSize(path, options);
        return calculationResultToNapiObject(env, result);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

/**
 * 构建目录树
 */
Napi::Value BuildDirectoryTree(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (!g_accelerator) {
        Napi::Error::New(env, "Accelerator not initialized").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected string path").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    std::string path = info[0].As<Napi::String>().Utf8Value();
    CalculationOptions options;
    
    if (info.Length() > 1 && info[1].IsObject()) {
        options = parseCalculationOptions(info[1].As<Napi::Object>());
    }
    
    try {
        auto tree = g_accelerator->buildDirectoryTree(path, options);
        return treeNodeToNapiObject(env, tree);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

/**
 * 检查路径是否存在
 */
Napi::Value PathExists(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (!g_accelerator) {
        Napi::Error::New(env, "Accelerator not initialized").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected string path").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    std::string path = info[0].As<Napi::String>().Utf8Value();
    
    try {
        bool exists = g_accelerator->pathExists(path);
        return Napi::Boolean::New(env, exists);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

/**
 * 获取文件信息
 */
Napi::Value GetItemInfo(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (!g_accelerator) {
        Napi::Error::New(env, "Accelerator not initialized").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Expected string path").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    std::string path = info[0].As<Napi::String>().Utf8Value();
    bool follow_symlinks = false;
    
    if (info.Length() > 1 && info[1].IsBoolean()) {
        follow_symlinks = info[1].As<Napi::Boolean>().Value();
    }
    
    try {
        FileSystemItem item = g_accelerator->getItemInfo(path, follow_symlinks);
        return fileSystemItemToNapiObject(env, item);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

/**
 * 清理加速器
 */
Napi::Value CleanupAccelerator(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    g_accelerator.reset();
    return Napi::Boolean::New(env, true);
}

/**
 * 模块初始化
 */
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("initializeAccelerator", Napi::Function::New(env, InitializeAccelerator));
    exports.Set("calculateFolderSize", Napi::Function::New(env, CalculateFolderSize));
    exports.Set("buildDirectoryTree", Napi::Function::New(env, BuildDirectoryTree));
    exports.Set("pathExists", Napi::Function::New(env, PathExists));
    exports.Set("getItemInfo", Napi::Function::New(env, GetItemInfo));
    exports.Set("cleanupAccelerator", Napi::Function::New(env, CleanupAccelerator));
    
    return exports;
}

NODE_API_MODULE(brisk_folder_size_native, Init) 