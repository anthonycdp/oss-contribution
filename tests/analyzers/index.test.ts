import { hasIssues, getResultSeverity } from '../../src/analyzers';
import { AnalysisResult } from '../../src/types';

describe('analyzers', () => {
  describe('hasIssues', () => {
    it('should return true when there are undocumented variables', () => {
      const result: AnalysisResult = {
        usedVars: [],
        definedVars: [],
        undocumented: [{ name: 'TEST', file: 'test.ts', line: 1, column: 1, context: '' }],
        unused: [],
        hardcodedSecrets: [],
        namingViolations: [],
        summary: {
          totalUsed: 1,
          totalDefined: 0,
          totalUndocumented: 1,
          totalUnused: 0,
          totalHardcodedSecrets: 0,
          totalNamingViolations: 0,
          filesScanned: 1,
        },
      };

      expect(hasIssues(result)).toBe(true);
    });

    it('should return true when there are unused variables', () => {
      const result: AnalysisResult = {
        usedVars: [],
        definedVars: [{ name: 'UNUSED', required: false, type: 'string' }],
        undocumented: [],
        unused: [{ name: 'UNUSED', required: false, type: 'string' }],
        hardcodedSecrets: [],
        namingViolations: [],
        summary: {
          totalUsed: 0,
          totalDefined: 1,
          totalUndocumented: 0,
          totalUnused: 1,
          totalHardcodedSecrets: 0,
          totalNamingViolations: 0,
          filesScanned: 1,
        },
      };

      expect(hasIssues(result)).toBe(true);
    });

    it('should return true when there are hardcoded secrets', () => {
      const result: AnalysisResult = {
        usedVars: [],
        definedVars: [],
        undocumented: [],
        unused: [],
        hardcodedSecrets: [{ name: 'SECRET', file: 'test.ts', line: 1, column: 1, context: '' }],
        namingViolations: [],
        summary: {
          totalUsed: 0,
          totalDefined: 0,
          totalUndocumented: 0,
          totalUnused: 0,
          totalHardcodedSecrets: 1,
          totalNamingViolations: 0,
          filesScanned: 1,
        },
      };

      expect(hasIssues(result)).toBe(true);
    });

    it('should return true when there are naming violations', () => {
      const result: AnalysisResult = {
        usedVars: [],
        definedVars: [],
        undocumented: [],
        unused: [],
        hardcodedSecrets: [],
        namingViolations: [{ name: 'bad_name', file: 'test.ts', line: 1, column: 1, context: '' }],
        summary: {
          totalUsed: 0,
          totalDefined: 0,
          totalUndocumented: 0,
          totalUnused: 0,
          totalHardcodedSecrets: 0,
          totalNamingViolations: 1,
          filesScanned: 1,
        },
      };

      expect(hasIssues(result)).toBe(true);
    });

    it('should return false when there are no issues', () => {
      const result: AnalysisResult = {
        usedVars: [],
        definedVars: [],
        undocumented: [],
        unused: [],
        hardcodedSecrets: [],
        namingViolations: [],
        summary: {
          totalUsed: 0,
          totalDefined: 0,
          totalUndocumented: 0,
          totalUnused: 0,
          totalHardcodedSecrets: 0,
          totalNamingViolations: 0,
          filesScanned: 1,
        },
      };

      expect(hasIssues(result)).toBe(false);
    });
  });

  describe('getResultSeverity', () => {
    it('should return error when there are hardcoded secrets', () => {
      const result: AnalysisResult = {
        usedVars: [],
        definedVars: [],
        undocumented: [],
        unused: [],
        hardcodedSecrets: [{ name: 'SECRET', file: 'test.ts', line: 1, column: 1, context: '' }],
        namingViolations: [],
        summary: {
          totalUsed: 0,
          totalDefined: 0,
          totalUndocumented: 0,
          totalUnused: 0,
          totalHardcodedSecrets: 1,
          totalNamingViolations: 0,
          filesScanned: 1,
        },
      };

      expect(getResultSeverity(result)).toBe('error');
    });

    it('should return warning when there are undocumented variables', () => {
      const result: AnalysisResult = {
        usedVars: [],
        definedVars: [],
        undocumented: [{ name: 'TEST', file: 'test.ts', line: 1, column: 1, context: '' }],
        unused: [],
        hardcodedSecrets: [],
        namingViolations: [],
        summary: {
          totalUsed: 0,
          totalDefined: 0,
          totalUndocumented: 1,
          totalUnused: 0,
          totalHardcodedSecrets: 0,
          totalNamingViolations: 0,
          filesScanned: 1,
        },
      };

      expect(getResultSeverity(result)).toBe('warning');
    });

    it('should return info when there are only naming violations', () => {
      const result: AnalysisResult = {
        usedVars: [],
        definedVars: [],
        undocumented: [],
        unused: [],
        hardcodedSecrets: [],
        namingViolations: [{ name: 'bad_name', file: 'test.ts', line: 1, column: 1, context: '' }],
        summary: {
          totalUsed: 0,
          totalDefined: 0,
          totalUndocumented: 0,
          totalUnused: 0,
          totalHardcodedSecrets: 0,
          totalNamingViolations: 1,
          filesScanned: 1,
        },
      };

      expect(getResultSeverity(result)).toBe('info');
    });

    it('should return info when there are no issues', () => {
      const result: AnalysisResult = {
        usedVars: [],
        definedVars: [],
        undocumented: [],
        unused: [],
        hardcodedSecrets: [],
        namingViolations: [],
        summary: {
          totalUsed: 0,
          totalDefined: 0,
          totalUndocumented: 0,
          totalUnused: 0,
          totalHardcodedSecrets: 0,
          totalNamingViolations: 0,
          filesScanned: 1,
        },
      };

      expect(getResultSeverity(result)).toBe('info');
    });
  });
});
