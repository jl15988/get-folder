import { FolderSize } from '../src/FolderSize';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as os from 'os';
import * as path from 'path';

describe('FolderSize', () => {
  let tempDir: string;

  beforeAll(async () => {
    // 创建临时测试目录
    tempDir = await fs.mkdtemp(join(os.tmpdir(), 'folder-size-test-'));
  });

  afterAll(async () => {
    // 清理临时目录
    try {
      await fs.rmdir(tempDir, { recursive: true });
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
      const options = { concurrency: 4, ignoreErrors: true };
      const folderSize = FolderSize.of(options);
      expect(folderSize).toBeInstanceOf(FolderSize);
    });

    it('should calculate size using static getSize method', async () => {
      // 创建简单的测试文件
      const testFile = join(tempDir, 'test.txt');
      await fs.writeFile(testFile, 'Hello World');

      const result = await FolderSize.getSize(tempDir);
      
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
    beforeEach(async () => {
      // 清理临时目录
      try {
        const files = await fs.readdir(tempDir);
        for (const file of files) {
          const filePath = join(tempDir, file);
          const stat = await fs.lstat(filePath);
          if (stat.isDirectory()) {
            await fs.rmdir(filePath, { recursive: true });
          } else {
            await fs.unlink(filePath);
          }
        }
      } catch (error) {
        // 忽略清理错误
      }
    });

    it('should calculate empty directory size', async () => {
      const result = await FolderSize.getSize(tempDir);
      
      expect(result.size.toNumber()).toBe(0);
      expect(result.fileCount).toBe(0);
      expect(result.directoryCount).toBe(0);
      expect(result.linkCount).toBe(0);
    });

    it('should calculate single file size', async () => {
      const content = 'Hello World!';
      const testFile = join(tempDir, 'test.txt');
      await fs.writeFile(testFile, content);

      const result = await FolderSize.getSize(tempDir);
      
      expect(result.size.toNumber()).toBeGreaterThanOrEqual(content.length);
      expect(result.fileCount).toBe(1);
      expect(result.directoryCount).toBe(0);
    });

    it('should calculate multiple files size', async () => {
      const files = ['file1.txt', 'file2.txt', 'file3.txt'];
      let totalContent = 0;

      for (const fileName of files) {
        const content = `Content of ${fileName}`;
        totalContent += content.length;
        await fs.writeFile(join(tempDir, fileName), content);
      }

      const result = await FolderSize.getSize(tempDir);
      
      expect(result.size.toNumber()).toBeGreaterThanOrEqual(totalContent);
      expect(result.fileCount).toBe(3);
      expect(result.directoryCount).toBe(0);
    });

    it('should calculate nested directory structure', async () => {
      // 创建嵌套目录结构
      const subDir1 = join(tempDir, 'subdir1');
      const subDir2 = join(tempDir, 'subdir2');
      const nestedDir = join(subDir1, 'nested');

      await fs.mkdir(subDir1);
      await fs.mkdir(subDir2);
      await fs.mkdir(nestedDir);

      // 在各个目录中创建文件
      await fs.writeFile(join(tempDir, 'root.txt'), 'root content');
      await fs.writeFile(join(subDir1, 'sub1.txt'), 'sub1 content');
      await fs.writeFile(join(subDir2, 'sub2.txt'), 'sub2 content');
      await fs.writeFile(join(nestedDir, 'nested.txt'), 'nested content');

      const result = await FolderSize.getSize(tempDir);
      
      expect(result.fileCount).toBe(4);
      expect(result.directoryCount).toBe(3); // subdir1, subdir2, nested
      expect(result.size.toNumber()).toBeGreaterThan(0);
    });

    it('should handle maxDepth option', async () => {
      // 创建深层嵌套结构
      const level1 = join(tempDir, 'level1');
      const level2 = join(level1, 'level2');
      const level3 = join(level2, 'level3');

      await fs.mkdir(level1);
      await fs.mkdir(level2);
      await fs.mkdir(level3);

      await fs.writeFile(join(level1, 'file1.txt'), 'content1');
      await fs.writeFile(join(level2, 'file2.txt'), 'content2');
      await fs.writeFile(join(level3, 'file3.txt'), 'content3');

      // 限制深度为 2
      const result = await FolderSize.getSize(tempDir, { maxDepth: 2 });
      
      // 应该只包含 level1 和 level2 的文件，不包含 level3
      expect(result.fileCount).toBe(2);
      expect(result.directoryCount).toBe(2);
    });

    it('should handle includeHidden option', async () => {
      // 创建隐藏文件和普通文件
      await fs.writeFile(join(tempDir, '.hidden'), 'hidden content');
      await fs.writeFile(join(tempDir, 'visible.txt'), 'visible content');

      // 包含隐藏文件
      const resultWithHidden = await FolderSize.getSize(tempDir, { includeHidden: true });
      expect(resultWithHidden.fileCount).toBe(2);

      // 排除隐藏文件
      const resultWithoutHidden = await FolderSize.getSize(tempDir, { includeHidden: false });
      expect(resultWithoutHidden.fileCount).toBe(1);
    });

    it('should handle ignores option', async () => {
      // 创建不同类型的文件
      await fs.writeFile(join(tempDir, 'keep.txt'), 'keep this');
      await fs.writeFile(join(tempDir, 'ignore.log'), 'ignore this');
      
      const nodeModulesDir = join(tempDir, 'node_modules');
      await fs.mkdir(nodeModulesDir);
      await fs.writeFile(join(nodeModulesDir, 'package.json'), '{}');

      // 不使用忽略规则
      const resultNoIgnore = await FolderSize.getSize(tempDir);
      expect(resultNoIgnore.fileCount).toBe(3);
      expect(resultNoIgnore.directoryCount).toBe(1);

      // 使用忽略规则
      const resultWithIgnore = await FolderSize.getSize(tempDir, {
        ignores: [/\.log$/, /node_modules/]
      });
      expect(resultWithIgnore.fileCount).toBe(1); // 只有 keep.txt
      expect(resultWithIgnore.directoryCount).toBe(0); // node_modules 被忽略
    });
  });

  describe('error handling', () => {
    it('should handle non-existent directory with ignoreErrors: false', async () => {
      const nonExistentPath = join(tempDir, 'non-existent');
      
      await expect(FolderSize.getSize(nonExistentPath, { ignoreErrors: false }))
        .rejects.toThrow();
    });

    it('should handle non-existent directory with ignoreErrors: true', async () => {
      const nonExistentPath = join(tempDir, 'non-existent');
      
      const result = await FolderSize.getSize(nonExistentPath, { ignoreErrors: true });
      
      expect(result.size.toNumber()).toBe(0);
      expect(result.fileCount).toBe(0);
      expect(result.directoryCount).toBe(0);
    });

    it('should call onError callback when provided', async () => {
      const nonExistentPath = join(tempDir, 'non-existent');
      const errors: any[] = [];
      
      const result = await FolderSize.getSize(nonExistentPath, {
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
      const nonExistentPath = join(tempDir, 'non-existent');
      
      await expect(FolderSize.getSize(nonExistentPath, {
        onError: () => false // 停止执行
      })).rejects.toThrow('计算被用户停止');
    });
  });

  describe('performance options', () => {
    it('should handle different concurrency levels', async () => {
      // 创建多个文件用于并发测试
      const files = Array.from({ length: 10 }, (_, i) => `file${i}.txt`);
      for (const fileName of files) {
        await fs.writeFile(join(tempDir, fileName), `Content ${fileName}`);
      }

      // 测试不同的并发级别
      const concurrencyLevels = [1, 2, 4];
      
      for (const concurrency of concurrencyLevels) {
        const result = await FolderSize.getSize(tempDir, { concurrency });
        expect(result.fileCount).toBe(10);
        expect(result.size.toNumber()).toBeGreaterThan(0);
      }
    });
  });
}); 