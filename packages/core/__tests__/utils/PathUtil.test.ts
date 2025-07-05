import { PathUtil } from '../../src/utils/PathUtil';

describe('PathUtil', () => {
  describe('isHiddenFile', () => {
    it('should return true for files starting with dot', () => {
      expect(PathUtil.isHiddenFile('.hidden')).toBe(true);
      expect(PathUtil.isHiddenFile('.gitignore')).toBe(true);
      expect(PathUtil.isHiddenFile('.DS_Store')).toBe(true);
      expect(PathUtil.isHiddenFile('/path/to/.hidden')).toBe(true);
      expect(PathUtil.isHiddenFile('dir/.config')).toBe(true);
    });

    it('should return false for regular files', () => {
      expect(PathUtil.isHiddenFile('file.txt')).toBe(false);
      expect(PathUtil.isHiddenFile('package.json')).toBe(false);
      expect(PathUtil.isHiddenFile('index.ts')).toBe(false);
      expect(PathUtil.isHiddenFile('/path/to/file.txt')).toBe(false);
    });

    it('should return false for current and parent directory', () => {
      expect(PathUtil.isHiddenFile('.')).toBe(false);
      expect(PathUtil.isHiddenFile('..')).toBe(false);
      expect(PathUtil.isHiddenFile('/path/to/.')).toBe(false);
      expect(PathUtil.isHiddenFile('/path/to/..')).toBe(false);
    });

    it('should return false for empty filename', () => {
      expect(PathUtil.isHiddenFile('')).toBe(false);
      expect(PathUtil.isHiddenFile('/')).toBe(false);
    });

    it('should handle complex paths correctly', () => {
      expect(PathUtil.isHiddenFile('/home/user/.bashrc')).toBe(true);
      expect(PathUtil.isHiddenFile('C:\\Users\\user\\.vscode')).toBe(true);
      expect(PathUtil.isHiddenFile('/project/src/components/Button.tsx')).toBe(false);
      expect(PathUtil.isHiddenFile('folder/subfolder/.env')).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(PathUtil.isHiddenFile('.')).toBe(false);
      expect(PathUtil.isHiddenFile('..')).toBe(false);
      expect(PathUtil.isHiddenFile('...')).toBe(true);
      expect(PathUtil.isHiddenFile('.file.')).toBe(true);
    });
  });
}); 