import { RegExpUtil } from '../../src/utils/RegExpUtil';

describe('RegExpUtil', () => {
  describe('tests', () => {
    it('should return true when at least one regex matches', () => {
      const regexes = [/\.js$/, /\.ts$/];
      const value = 'test.ts';
      
      expect(RegExpUtil.tests(regexes, value)).toBe(true);
    });

    it('should return false when no regex matches', () => {
      const regexes = [/\.js$/, /\.ts$/];
      const value = 'test.txt';
      
      expect(RegExpUtil.tests(regexes, value)).toBe(false);
    });

    it('should return false for empty regex array', () => {
      const regexes: RegExp[] = [];
      const value = 'test.ts';
      
      expect(RegExpUtil.tests(regexes, value)).toBe(false);
    });

    it('should handle complex regex patterns', () => {
      const regexes = [/node_modules/, /\.git/, /dist/];
      
      expect(RegExpUtil.tests(regexes, 'src/node_modules/package')).toBe(true);
      expect(RegExpUtil.tests(regexes, 'project/.git/config')).toBe(true);
      expect(RegExpUtil.tests(regexes, 'build/dist/output')).toBe(true);
      expect(RegExpUtil.tests(regexes, 'src/components/Button.tsx')).toBe(false);
    });

    it('should handle case-sensitive patterns', () => {
      const regexes = [/\.JS$/];
      
      expect(RegExpUtil.tests(regexes, 'test.js')).toBe(false);
      expect(RegExpUtil.tests(regexes, 'test.JS')).toBe(true);
    });

    it('should handle case-insensitive patterns', () => {
      const regexes = [/\.js$/i];
      
      expect(RegExpUtil.tests(regexes, 'test.js')).toBe(true);
      expect(RegExpUtil.tests(regexes, 'test.JS')).toBe(true);
      expect(RegExpUtil.tests(regexes, 'test.Js')).toBe(true);
    });
  });
}); 