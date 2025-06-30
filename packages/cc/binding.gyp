{
  "targets": [
    {
      "target_name": "brisk_folder_size_native",
      "sources": [
        "src/main.cpp",
        "src/common/filesystem_common.cpp",
        "src/windows/mft_accelerator.cpp",
        "src/linux/syscall_accelerator.cpp",
        "src/macos/syscall_accelerator.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "src",
        "src/common",
        "src/windows",
        "src/linux",
        "src/macos"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "xcode_settings": {
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "CLANG_CXX_LIBRARY": "libc++",
        "MACOSX_DEPLOYMENT_TARGET": "10.7"
      },
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1,
          "AdditionalOptions": ["/utf-8"]
        }
      },
      "conditions": [
        [
          "OS=='win'",
          {
            "defines": ["PLATFORM_WINDOWS"],
            "libraries": ["-lkernel32", "-luser32", "-ladvapi32"]
          }
        ],
        [
          "OS=='linux'",
          {
            "defines": ["PLATFORM_LINUX"],
            "cflags": ["-std=c++17"],
            "cflags_cc": ["-std=c++17"]
          }
        ],
        [
          "OS=='mac'",
          {
            "defines": ["PLATFORM_MACOS"],
            "cflags": ["-std=c++17"],
            "cflags_cc": ["-std=c++17"],
            "xcode_settings": {
              "CLANG_CXX_LANGUAGE_STANDARD": "c++17"
            }
          }
        ]
      ]
    }
  ]
} 