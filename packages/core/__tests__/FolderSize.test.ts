import {FolderSize} from '../src';
import {promises as fs} from 'fs';
import {join} from 'path';
import {TempUtil} from "./TempUtil";

describe('FolderSize', () => {
  beforeAll(async () => {
    // await TempUtil.init();
  });

  afterAll(async () => {
    // 清理临时目录
    try {
      await TempUtil.clearTempDir();
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('static methods', () => {
    it('should create instance using of() method', () => {
      const folderSize = FolderSize.of();
      expect(folderSize).toBeInstanceOf(FolderSize);
    });

    it('should create instance using of() with options', () => {
      const options = {concurrency: 4, ignoreErrors: true};
      const folderSize = FolderSize.of(options);
      expect(folderSize).toBeInstanceOf(FolderSize);
    });

    it('should calculate size using static getSize method', async () => {
      const temp = await TempUtil.of('staticGetSize');
      console.log(temp.dirPath);
      await temp.write('test.txt', 'Hello World');

      const result = await FolderSize.getSize(temp.dirPath);

      expect(result.size.toNumber()).toBeGreaterThan(0);
      expect(result.fileCount).toBe(1);
      expect(result.directoryCount).toBe(0);
    });
  });

  describe('constructor and options', () => {
    it('should use default options when none provided', () => {
      const folderSize = new FolderSize();
      expect(folderSize).toBeInstanceOf(FolderSize);
    });

    it('should accept custom options', () => {
      const options = {
        maxDepth: 5,
        concurrency: 4,
        ignoreErrors: true,
        includeHidden: false
      };
      const folderSize = new FolderSize(options);
      expect(folderSize).toBeInstanceOf(FolderSize);
    });
  });

  describe('size calculation', () => {
    // beforeEach(async () => {
    //   // 清理临时目录
    //   try {
    //     const files = await fs.readdir(tempDir);
    //     for (const file of files) {
    //       const filePath = join(tempDir, file);
    //       const stat = await fs.lstat(filePath);
    //       if (stat.isDirectory()) {
    //         await fs.rmdir(filePath, { recursive: true });
    //       } else {
    //         await fs.unlink(filePath);
    //       }
    //     }
    //   } catch (error) {
    //     // 忽略清理错误
    //   }
    // });

    it('should calculate empty directory size', async () => {
      const tempUtil = await TempUtil.of('emptyDirectory');
      const result = await FolderSize.getSize(tempUtil.dirPath);

      expect(result.size.toNumber()).toBe(0);
      expect(result.fileCount).toBe(0);
      expect(result.directoryCount).toBe(0);
      expect(result.linkCount).toBe(0);
    });

    it('should calculate single file size', async () => {
      const tempUtil = await TempUtil.of('singleDirectory');
      const content = 'Hello World!';
      await tempUtil.write('test.txt', content);

      const result = await FolderSize.getSize(tempUtil.dirPath);

      expect(result.size.toNumber()).toBeGreaterThanOrEqual(content.length);
      expect(result.fileCount).toBe(1);
      expect(result.directoryCount).toBe(0);
    });

    it('should calculate multiple files size', async () => {
      const tempUtil = await TempUtil.of('multipleDirectory');
      const files = ['file1.txt', 'file2.txt', 'file3.txt'];
      let totalContent = 0;

      for (const fileName of files) {
        const content = `Content of ${fileName}`;
        totalContent += content.length;
        await tempUtil.write(fileName, content);
      }

      const result = await FolderSize.getSize(tempUtil.dirPath);

      expect(result.size.toNumber()).toBeGreaterThanOrEqual(totalContent);
      expect(result.fileCount).toBe(3);
      expect(result.directoryCount).toBe(0);
    });

    it('should calculate nested directory structure', async () => {
      const tempUtil = await TempUtil.of('nestedDirectory');
      // 创建嵌套目录结构
      const subDir1 = await tempUtil.join('subdir1');
      const subDir2 = await tempUtil.join('subdir2');
      const nestedDir = await subDir1.join('nested');

      // 在各个目录中创建文件
      await tempUtil.write('root.txt', 'root content');
      await subDir1.write('sub1.txt', 'sub1 content');
      await subDir2.write('sub2.txt', 'sub2 content');
      await nestedDir.write('nested.txt', 'nested content');

      const result = await FolderSize.getSize(tempUtil.dirPath);

      expect(result.fileCount).toBe(4);
      expect(result.directoryCount).toBe(3); // subdir1, subdir2, nested
      expect(result.size.toNumber()).toBeGreaterThan(0);
    });

    it('should handle maxDepth option', async () => {
      const tempUtil = await TempUtil.of('maxDepth');
      // 创建深层嵌套结构
      const level1 = await tempUtil.join('level1');
      const level2 = await level1.join('level2');
      const level3 = await level2.join('level3');

      await level1.write('file1.txt', 'content1');
      await level2.write('file2.txt', 'content2');
      await level3.write('file3.txt', 'content3');

      // 限制深度为 2
      const result = await FolderSize.getSize(tempUtil.dirPath, {maxDepth: 2});

      // 应该只包含 level1 和 level2 的文件，不包含 level3
      expect(result.fileCount).toBe(2);
      expect(result.directoryCount).toBe(2);
    });

    it('should handle includeHidden option', async () => {
      const tempUtil = await TempUtil.of('includeHidden');
      // 创建隐藏文件和普通文件
      await tempUtil.write('.hidden', 'hidden content');
      await tempUtil.write('visible.txt', 'visible content');

      // 包含隐藏文件
      const resultWithHidden = await FolderSize.getSize(tempUtil.dirPath, {includeHidden: true});
      expect(resultWithHidden.fileCount).toBe(2);

      // 排除隐藏文件
      const resultWithoutHidden = await FolderSize.getSize(tempUtil.dirPath, {includeHidden: false});
      expect(resultWithoutHidden.fileCount).toBe(1);
    });

    it('should handle ignores option', async () => {
      const tempUtil = await TempUtil.of('ignoreDirectory');
      // 创建不同类型的文件
      await tempUtil.write('keep.txt', 'keep this');
      await tempUtil.write('ignore.log', 'ignore this');

      const nodeModulesDir = await tempUtil.join('node_modules');
      await nodeModulesDir.write('package.json', '{}');

      // 不使用忽略规则
      const resultNoIgnore = await FolderSize.getSize(tempUtil.dirPath);
      expect(resultNoIgnore.fileCount).toBe(3);
      expect(resultNoIgnore.directoryCount).toBe(1);

      // 使用忽略规则
      const resultWithIgnore = await FolderSize.getSize(tempUtil.dirPath, {
        ignores: [/\.log$/, /.*\\node_modules/]
      });
      expect(resultWithIgnore.fileCount).toBe(1); // 只有 keep.txt
      expect(resultWithIgnore.directoryCount).toBe(0); // node_modules 被忽略
    });
  });

  describe('error handling', () => {
    it('should handle non-existent directory with ignoreErrors: false', async () => {
      const tempUtil = await TempUtil.of();
      const nonExistentPath = join(tempUtil.dirPath, 'non-existent');

      await expect(FolderSize.getSize(nonExistentPath, {ignoreErrors: false}))
        .rejects.toThrow();
    });

    it('should handle non-existent directory with ignoreErrors: true', async () => {
      const tempUtil = await TempUtil.of();
      const nonExistentPath = join(tempUtil.dirPath, 'non-existent');

      const result = await FolderSize.getSize(nonExistentPath, {ignoreErrors: true});

      expect(result.size.toNumber()).toBe(0);
      expect(result.fileCount).toBe(0);
      expect(result.directoryCount).toBe(0);
    });

    it('should call onError callback when provided', async () => {
      const tempUtil = await TempUtil.of();
      const nonExistentPath = join(tempUtil.dirPath, 'non-existent');
      const errors: any[] = [];

      const result = await FolderSize.getSize(nonExistentPath, {
        ignoreErrors: true,
        onError: (error) => {
          errors.push(error);
          return true; // 继续执行
        }
      });

      expect(errors).toHaveLength(1);
      expect(errors[0]).toHaveProperty('error');
      expect(errors[0]).toHaveProperty('message');
      expect(errors[0]).toHaveProperty('path');
    });

    it('should stop execution when onError returns false', async () => {
      const tempUtil = await TempUtil.of();
      const nonExistentPath = join(tempUtil.dirPath, 'non-existent');

      await expect(FolderSize.getSize(nonExistentPath, {
        onError: () => false // 停止执行
      })).rejects.toThrow('计算被用户停止');
    });
  });

  describe('performance options', () => {
    it('should handle different concurrency levels', async () => {
      const tempUtil = await TempUtil.of('differentConcurrences');
      // 创建多个文件用于并发测试
      const files = Array.from({length: 10}, (_, i) => `file${i}.txt`);
      for (const fileName of files) {
        await tempUtil.write(fileName, `Content ${fileName}`);
      }

      // 测试不同的并发级别
      const concurrencyLevels = [1, 2, 4];

      for (const concurrency of concurrencyLevels) {
        const result = await FolderSize.getSize(tempUtil.dirPath, {concurrency});
        expect(result.fileCount).toBe(10);
        expect(result.size.toNumber()).toBeGreaterThan(0);
      }
    });
  });
});
