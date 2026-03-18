import {
  checkNamingConvention,
  findNamingViolations,
  getViolationReason,
  suggestCorrectName
} from '../src/analyzers/naming-convention';
import { EnvVarUsage } from '../src/types';

describe('naming-convention', () => {
  describe('checkNamingConvention', () => {
    it('should pass valid SCREAMING_SNAKE_CASE names', () => {
      expect(checkNamingConvention('DATABASE_URL')).toBe(true);
      expect(checkNamingConvention('API_KEY')).toBe(true);
      expect(checkNamingConvention('MY_SECRET_TOKEN')).toBe(true);
      expect(checkNamingConvention('PORT')).toBe(true);
      expect(checkNamingConvention('DEBUG_MODE_1')).toBe(true);
    });

    it('should fail invalid names', () => {
      expect(checkNamingConvention('databaseUrl')).toBe(false); // camelCase
      expect(checkNamingConvention('api-key')).toBe(false); // kebab-case
      expect(checkNamingConvention('MY__SECRET')).toBe(false); // double underscore
      expect(checkNamingConvention('1API_KEY')).toBe(false); // starts with number
    });
  });

  describe('findNamingViolations', () => {
    it('should identify all violations', () => {
      const usages: EnvVarUsage[] = [
        { name: 'DATABASE_URL', file: 'test.ts', line: 1, column: 1, context: '' },
        { name: 'apiKey', file: 'test.ts', line: 2, column: 1, context: '' },
        { name: 'API__KEY', file: 'test.ts', line: 3, column: 1, context: '' },
      ];

      const violations = findNamingViolations(usages);

      expect(violations).toHaveLength(2);
      expect(violations.map(v => v.name)).toContain('apiKey');
      expect(violations.map(v => v.name)).toContain('API__KEY');
    });

    it('should return empty array for valid names', () => {
      const usages: EnvVarUsage[] = [
        { name: 'DATABASE_URL', file: 'test.ts', line: 1, column: 1, context: '' },
        { name: 'API_KEY', file: 'test.ts', line: 2, column: 1, context: '' },
      ];

      const violations = findNamingViolations(usages);

      expect(violations).toHaveLength(0);
    });

    it('should support custom naming pattern', () => {
      const usages: EnvVarUsage[] = [
        { name: 'DATABASE_URL', file: 'test.ts', line: 1, column: 1, context: '' },
        { name: 'databaseUrl', file: 'test.ts', line: 2, column: 1, context: '' },
      ];

      // Allow camelCase
      const violations = findNamingViolations(usages, /^[a-z][a-zA-Z0-9]*$/);

      expect(violations).toHaveLength(1);
      expect(violations[0]?.name).toBe('DATABASE_URL');
    });
  });

  describe('getViolationReason', () => {
    it('should explain lowercase violation', () => {
      const reason = getViolationReason('apiKey');
      expect(reason).toContain('lowercase');
    });

    it('should explain consecutive underscore violation', () => {
      const reason = getViolationReason('API__KEY');
      expect(reason).toContain('consecutive underscore');
    });

    it('should explain number prefix violation', () => {
      const reason = getViolationReason('1API_KEY');
      expect(reason).toContain('starts with a number');
    });

    it('should return null for valid names', () => {
      const reason = getViolationReason('VALID_NAME');
      expect(reason).toBeNull();
    });
  });

  describe('suggestCorrectName', () => {
    it('should convert camelCase to SCREAMING_SNAKE_CASE', () => {
      expect(suggestCorrectName('apiKey')).toBe('API_KEY');
      expect(suggestCorrectName('databaseUrl')).toBe('DATABASE_URL');
      expect(suggestCorrectName('mySecretToken')).toBe('MY_SECRET_TOKEN');
    });

    it('should handle kebab-case', () => {
      expect(suggestCorrectName('api-key')).toBe('API_KEY');
      expect(suggestCorrectName('my-secret-token')).toBe('MY_SECRET_TOKEN');
    });

    it('should fix consecutive underscores', () => {
      expect(suggestCorrectName('API__KEY')).toBe('API_KEY');
    });

    it('should handle numbers at start', () => {
      expect(suggestCorrectName('1API_KEY')).toBe('VAR_1API_KEY');
    });

    it('should remove leading/trailing underscores', () => {
      expect(suggestCorrectName('_API_KEY')).toBe('API_KEY');
      expect(suggestCorrectName('API_KEY_')).toBe('API_KEY');
    });
  });
});
