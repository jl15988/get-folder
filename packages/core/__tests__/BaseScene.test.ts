import { BaseScene } from '../src/BaseScene';
import { Stats } from 'node:fs';

// 创建测试用的 BaseScene 子类，暴露 protected 方法用于测试
class TestableBaseScene extends BaseScene {
  public shouldIgnorePath(ignores: RegExp[], itemPath: string, includeHidden: boolean = true): boolean {
    return super.shouldIgnorePath(ignores, itemPath, includeHidden);
  }

  public getInodeKey(stats: string | Stats): string {
    return super.getInodeKey(stats);
  }

  public hasInode(inode: string | Stats): boolean {
    return super.hasInode(inode);
  }

  public addInode(inode: string | Stats): void {
    super.addInode(inode);
  }

  public checkInode(stats: Stats): boolean {
    return super.checkInode(stats);
  }

  public clearInode(): void {
    super.clearInode();
  }
}

// 创建模拟的 Stats 对象
function createMockStats(dev: number, ino: number): Stats {
  return {
    dev,
    ino,
    mode: 0,
    nlink: 0,
    uid: 0,
    gid: 0,
    rdev: 0,
    size: 0,
    blksize: 0,
    blocks: 0,
    atimeMs: 0,
    mtimeMs: 0,
    ctimeMs: 0,
    birthtimeMs: 0,
    atime: new Date(),
    mtime: new Date(),
    ctime: new Date(),
    birthtime: new Date(),
    isFile: () => false,
    isDirectory: () => false,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false
  };
}

describe('BaseScene', () => {
  let baseScene: TestableBaseScene;

  beforeEach(() => {
    baseScene = new TestableBaseScene();
  });

  describe('shouldIgnorePath', () => {
    it('should not ignore paths when no ignores and includeHidden is true', () => {
      expect(baseScene.shouldIgnorePath([], 'regular.txt', true)).toBe(false);
      expect(baseScene.shouldIgnorePath([], '.hidden', true)).toBe(false);
    });

    it('should ignore hidden files when includeHidden is false', () => {
      expect(baseScene.shouldIgnorePath([], '.hidden', false)).toBe(true);
      expect(baseScene.shouldIgnorePath([], '.gitignore', false)).toBe(true);
      expect(baseScene.shouldIgnorePath([], '/path/.DS_Store', false)).toBe(true);
    });

    it('should not ignore regular files when includeHidden is false', () => {
      expect(baseScene.shouldIgnorePath([], 'regular.txt', false)).toBe(false);
      expect(baseScene.shouldIgnorePath([], 'package.json', false)).toBe(false);
    });

    it('should ignore paths matching ignore patterns', () => {
      const ignores = [/node_modules/, /\.git/, /dist/];
      
      expect(baseScene.shouldIgnorePath(ignores, 'src/node_modules/package', true)).toBe(true);
      expect(baseScene.shouldIgnorePath(ignores, 'project/.git/config', true)).toBe(true);
      expect(baseScene.shouldIgnorePath(ignores, 'build/dist/output', true)).toBe(true);
    });

    it('should not ignore paths not matching ignore patterns', () => {
      const ignores = [/node_modules/, /\.git/];
      
      expect(baseScene.shouldIgnorePath(ignores, 'src/components/Button.tsx', true)).toBe(false);
      expect(baseScene.shouldIgnorePath(ignores, 'package.json', true)).toBe(false);
    });

    it('should combine hidden file check and ignore patterns', () => {
      const ignores = [/node_modules/];
      
      // 隐藏文件且匹配忽略模式
      expect(baseScene.shouldIgnorePath(ignores, '.hidden/node_modules/pkg', false)).toBe(true);
      
      // 隐藏文件但不匹配忽略模式
      expect(baseScene.shouldIgnorePath(ignores, '.hidden', false)).toBe(true);
      
      // 非隐藏文件但匹配忽略模式
      expect(baseScene.shouldIgnorePath(ignores, 'src/node_modules/pkg', false)).toBe(true);
    });
  });

  describe('inode management', () => {
    it('should generate consistent inode keys', () => {
      const stats1 = createMockStats(1, 100);
      const stats2 = createMockStats(1, 100);
      const stats3 = createMockStats(2, 100);
      
      expect(baseScene.getInodeKey(stats1)).toBe(baseScene.getInodeKey(stats2));
      expect(baseScene.getInodeKey(stats1)).not.toBe(baseScene.getInodeKey(stats3));
      expect(baseScene.getInodeKey(stats1)).toBe('1-100');
    });

    it('should handle string inode keys', () => {
      expect(baseScene.getInodeKey('custom-key')).toBe('custom-key');
    });

    it('should track inodes correctly', () => {
      const stats = createMockStats(1, 100);
      
      // 初始状态没有 inode
      expect(baseScene.hasInode(stats)).toBe(false);
      
      // 添加 inode
      baseScene.addInode(stats);
      expect(baseScene.hasInode(stats)).toBe(true);
      
      // 相同的 inode 应该被识别
      const stats2 = createMockStats(1, 100);
      expect(baseScene.hasInode(stats2)).toBe(true);
    });

    it('should checkInode correctly for duplicate detection', () => {
      const stats = createMockStats(1, 100);
      
      // 第一次检查应该返回 false（未重复），并自动添加
      expect(baseScene.checkInode(stats)).toBe(false);
      
      // 第二次检查应该返回 true（重复）
      expect(baseScene.checkInode(stats)).toBe(true);
      
      // 使用相同 dev 和 ino 的不同对象
      const stats2 = createMockStats(1, 100);
      expect(baseScene.checkInode(stats2)).toBe(true);
    });

    it('should handle different inodes', () => {
      const stats1 = createMockStats(1, 100);
      const stats2 = createMockStats(1, 200);
      const stats3 = createMockStats(2, 100);
      
      expect(baseScene.checkInode(stats1)).toBe(false);
      expect(baseScene.checkInode(stats2)).toBe(false);
      expect(baseScene.checkInode(stats3)).toBe(false);
      
      // 所有都应该被记录为已处理
      expect(baseScene.checkInode(stats1)).toBe(true);
      expect(baseScene.checkInode(stats2)).toBe(true);
      expect(baseScene.checkInode(stats3)).toBe(true);
    });

    it('should clear inodes correctly', () => {
      const stats = createMockStats(1, 100);
      
      baseScene.addInode(stats);
      expect(baseScene.hasInode(stats)).toBe(true);
      
      baseScene.clearInode();
      expect(baseScene.hasInode(stats)).toBe(false);
    });
  });
}); 