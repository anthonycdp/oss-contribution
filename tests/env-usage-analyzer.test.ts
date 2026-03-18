import { getUniqueVarNames, groupUsagesByVar } from '../src/analyzers/env-usage-analyzer';
import { EnvVarUsage } from '../src/types';

describe('env-usage-analyzer', () => {
  describe('getUniqueVarNames', () => {
    it('should return unique variable names sorted', () => {
      const usages: EnvVarUsage[] = [
        { name: 'DATABASE_URL', file: 'test.ts', line: 1, column: 1, context: '' },
        { name: 'API_KEY', file: 'test.ts', line: 2, column: 1, context: '' },
        { name: 'DATABASE_URL', file: 'test2.ts', line: 3, column: 1, context: '' },
      ];

      const names = getUniqueVarNames(usages);

      expect(names).toEqual(['API_KEY', 'DATABASE_URL']);
    });

    it('should return empty array for no usages', () => {
      expect(getUniqueVarNames([])).toEqual([]);
    });
  });

  describe('groupUsagesByVar', () => {
    it('should group usages by variable name', () => {
      const usages: EnvVarUsage[] = [
        { name: 'DATABASE_URL', file: 'test.ts', line: 1, column: 1, context: '' },
        { name: 'API_KEY', file: 'test.ts', line: 2, column: 1, context: '' },
        { name: 'DATABASE_URL', file: 'test2.ts', line: 3, column: 1, context: '' },
      ];

      const groups = groupUsagesByVar(usages);

      expect(groups.size).toBe(2);
      expect(groups.get('DATABASE_URL')).toHaveLength(2);
      expect(groups.get('API_KEY')).toHaveLength(1);
    });

    it('should return empty map for no usages', () => {
      const groups = groupUsagesByVar([]);
      expect(groups.size).toBe(0);
    });
  });
});
