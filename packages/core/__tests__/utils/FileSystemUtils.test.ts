import { FileSystemUtils } from '../../src/utils/FileSystemUtils';
import { BigNumber } from 'bignumber.js';

describe('FileSystemUtils', () => {
  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(FileSystemUtils.formatFileSize('0')).toBe('0 Bytes');
      expect(FileSystemUtils.formatFileSize('512')).toBe('512.00 Bytes');
      expect(FileSystemUtils.formatFileSize('1000')).toBe('1000.00 Bytes');
    });

    it('should format KB correctly', () => {
      expect(FileSystemUtils.formatFileSize('1024')).toBe('1.00 KB');
      expect(FileSystemUtils.formatFileSize('2048')).toBe('2.00 KB');
      expect(FileSystemUtils.formatFileSize('1536')).toBe('1.50 KB');
    });

    it('should format MB correctly', () => {
      expect(FileSystemUtils.formatFileSize('1048576')).toBe('1.00 MB');
      expect(FileSystemUtils.formatFileSize('2097152')).toBe('2.00 MB');
      expect(FileSystemUtils.formatFileSize('1572864')).toBe('1.50 MB');
    });

    it('should format GB correctly', () => {
      expect(FileSystemUtils.formatFileSize('1073741824')).toBe('1.00 GB');
      expect(FileSystemUtils.formatFileSize('2147483648')).toBe('2.00 GB');
    });

    it('should format TB correctly', () => {
      expect(FileSystemUtils.formatFileSize('1099511627776')).toBe('1.00 TB');
    });

    it('should handle BigNumber input', () => {
      const size = new BigNumber('1024');
      expect(FileSystemUtils.formatFileSize(size)).toBe('1.00 KB');
    });

    it('should handle decimal precision', () => {
      expect(FileSystemUtils.formatFileSize('1536', 0)).toBe('2 KB');
      expect(FileSystemUtils.formatFileSize('1536', 1)).toBe('1.5 KB');
      expect(FileSystemUtils.formatFileSize('1536', 3)).toBe('1.500 KB');
    });

    it('should handle edge cases', () => {
      expect(FileSystemUtils.formatFileSize('')).toBe('0 Bytes');
      expect(FileSystemUtils.formatFileSize('   ')).toBe('0 Bytes');
      expect(FileSystemUtils.formatFileSize(undefined)).toBe('0 Bytes');
    });

    it('should handle very large numbers', () => {
      const largeNumber = '1208925819614629174706176'; // 1 YB
      expect(FileSystemUtils.formatFileSize(largeNumber)).toContain('YB');
    });
  });

  describe('getRelativePath', () => {
    it('should return relative path correctly', () => {
      expect(FileSystemUtils.getRelativePath('/home/user', '/home/user/documents/file.txt'))
        .toBe('documents/file.txt');
      
      expect(FileSystemUtils.getRelativePath('C:\\Users\\user', 'C:\\Users\\user\\Documents\\file.txt'))
        .toBe('Documents/file.txt');
    });

    it('should handle identical paths', () => {
      expect(FileSystemUtils.getRelativePath('/home/user', '/home/user'))
        .toBe('');
    });

    it('should handle paths with trailing slashes', () => {
      expect(FileSystemUtils.getRelativePath('/home/user/', '/home/user/documents/file.txt'))
        .toBe('documents/file.txt');
    });

    it('should handle mixed path separators', () => {
      expect(FileSystemUtils.getRelativePath('C:\\Users\\user', 'C:/Users/user/Documents/file.txt'))
        .toBe('Documents/file.txt');
    });

    it('should return target path when not under base path', () => {
      expect(FileSystemUtils.getRelativePath('/home/user', '/var/log/system.log'))
        .toBe('/var/log/system.log');
    });

    it('should handle empty paths', () => {
      expect(FileSystemUtils.getRelativePath('', '/path/to/file'))
        .toBe('/path/to/file');
      
      expect(FileSystemUtils.getRelativePath('/base', ''))
        .toBe('');
    });
  });

  describe('isPathSafe', () => {
    it('should return true for safe paths', () => {
      expect(FileSystemUtils.isPathSafe('documents/file.txt')).toBe(true);
      expect(FileSystemUtils.isPathSafe('folder/subfolder/file.txt')).toBe(true);
      expect(FileSystemUtils.isPathSafe('file.txt')).toBe(true);
      expect(FileSystemUtils.isPathSafe('./file.txt')).toBe(true);
    });

    it('should return false for path traversal attacks', () => {
      expect(FileSystemUtils.isPathSafe('../file.txt')).toBe(false);
      expect(FileSystemUtils.isPathSafe('../../etc/passwd')).toBe(false);
      expect(FileSystemUtils.isPathSafe('folder/../../../file.txt')).toBe(false);
    });

    it('should return false for Windows path traversal', () => {
      expect(FileSystemUtils.isPathSafe('..\\file.txt')).toBe(false);
      expect(FileSystemUtils.isPathSafe('folder\\..\\..\\file.txt')).toBe(false);
    });

    it('should return false for absolute paths', () => {
      expect(FileSystemUtils.isPathSafe('/etc/passwd')).toBe(false);
      expect(FileSystemUtils.isPathSafe('//server/share')).toBe(false);
    });

    it('should return false for Windows absolute paths', () => {
      expect(FileSystemUtils.isPathSafe('C:\\Windows\\System32')).toBe(false);
      expect(FileSystemUtils.isPathSafe('D:\\data\\file.txt')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(FileSystemUtils.isPathSafe('')).toBe(true);
      expect(FileSystemUtils.isPathSafe('.')).toBe(true);
      expect(FileSystemUtils.isPathSafe('file.')).toBe(true);
    });
  });
}); 