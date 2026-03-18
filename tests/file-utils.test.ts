import {
  fileExists,
  getExtension,
  isSourceFile
} from '../src/utils/file-utils';

describe('file-utils', () => {
  describe('fileExists', () => {
    it('should return true for existing files', () => {
      const result = fileExists(__filename);
      expect(result).toBe(true);
    });

    it('should return false for non-existing files', () => {
      const result = fileExists('/non/existing/file.txt');
      expect(result).toBe(false);
    });
  });

  describe('getExtension', () => {
    it('should return correct extension', () => {
      expect(getExtension('test.ts')).toBe('.ts');
      expect(getExtension('test.js')).toBe('.js');
      expect(getExtension('test.spec.ts')).toBe('.ts');
      expect(getExtension('README.md')).toBe('.md');
    });

    it('should return empty string for no extension', () => {
      expect(getExtension('README')).toBe('');
    });

    it('should handle path with directories', () => {
      expect(getExtension('/path/to/file.ts')).toBe('.ts');
      expect(getExtension('./relative/path.jsx')).toBe('.jsx');
    });
  });

  describe('isSourceFile', () => {
    it('should identify JavaScript source files', () => {
      expect(isSourceFile('app.js')).toBe(true);
      expect(isSourceFile('app.jsx')).toBe(true);
      expect(isSourceFile('app.mjs')).toBe(true);
      expect(isSourceFile('app.cjs')).toBe(true);
    });

    it('should identify TypeScript source files', () => {
      expect(isSourceFile('app.ts')).toBe(true);
      expect(isSourceFile('app.tsx')).toBe(true);
    });

    it('should identify other source files', () => {
      expect(isSourceFile('Component.vue')).toBe(true);
      expect(isSourceFile('App.svelte')).toBe(true);
      expect(isSourceFile('main.py')).toBe(true);
      expect(isSourceFile('main.go')).toBe(true);
    });

    it('should not identify non-source files', () => {
      expect(isSourceFile('README.md')).toBe(false);
      expect(isSourceFile('package.json')).toBe(false);
      expect(isSourceFile('.env')).toBe(false);
      expect(isSourceFile('image.png')).toBe(false);
    });
  });
});
