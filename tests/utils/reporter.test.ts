import { TextReporter, JsonReporter, MarkdownReporter } from '../../src/utils/reporter';
import { AnalysisResult, Issue } from '../../src/types';

describe('reporters', () => {
  const createMockResult = (): AnalysisResult => ({
    usedVars: [
      { name: 'DATABASE_URL', file: 'src/db.ts', line: 10, column: 5, context: 'const url = process.env.DATABASE_URL' },
    ],
    definedVars: [
      { name: 'DATABASE_URL', required: true, type: 'url' },
      { name: 'UNUSED_VAR', required: false, type: 'string' },
    ],
    undocumented: [
      { name: 'SECRET_KEY', file: 'src/auth.ts', line: 5, column: 3, context: 'const key = process.env.SECRET_KEY' },
    ],
    unused: [
      { name: 'UNUSED_VAR', required: false, type: 'string' },
    ],
    hardcodedSecrets: [
      { name: 'API_KEY', file: 'src/api.ts', line: 20, column: 10, context: 'process.env.API_KEY || "default-key"' },
    ],
    namingViolations: [
      { name: 'badName', file: 'src/config.ts', line: 15, column: 5, context: 'process.env.badName' },
    ],
    summary: {
      totalUsed: 2,
      totalDefined: 2,
      totalUndocumented: 1,
      totalUnused: 1,
      totalHardcodedSecrets: 1,
      totalNamingViolations: 1,
      filesScanned: 5,
    },
  });

  describe('TextReporter', () => {
    it('should generate text report', () => {
      const reporter = new TextReporter(false);
      const result = createMockResult();

      reporter.report(result);
      const output = reporter.getOutput();

      expect(output).toContain('Env Guard Analysis Report');
      expect(output).toContain('Files scanned');
      expect(output).toContain('5');
      expect(output).toContain('Undocumented Variables');
      expect(output).toContain('SECRET_KEY');
    });

    it('should include verbose output when enabled', () => {
      const reporter = new TextReporter(true);
      const result = createMockResult();

      reporter.report(result);
      const output = reporter.getOutput();

      expect(output).toContain('All Variables Used');
    });

    it('should report success when no issues', () => {
      const reporter = new TextReporter(false);
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

      reporter.report(result);
      const output = reporter.getOutput();

      expect(output).toContain('All environment variables are properly documented');
    });

    it('should report issues', () => {
      const reporter = new TextReporter(false);
      const issue: Issue = {
        severity: 'error',
        code: 'ENV001',
        message: 'Missing environment variable',
        file: 'src/config.ts',
        line: 10,
        column: 5,
        suggestion: 'Add to .env.example',
      };

      reporter.reportIssue(issue);
      const output = reporter.getOutput();

      expect(output).toContain('Missing environment variable');
      expect(output).toContain('src/config.ts:10:5');
    });
  });

  describe('JsonReporter', () => {
    it('should generate JSON report', () => {
      const reporter = new JsonReporter();
      const result = createMockResult();

      reporter.report(result);
      const output = reporter.getOutput();
      const parsed = JSON.parse(output);

      expect(parsed).toHaveProperty('result');
      expect(parsed).toHaveProperty('issues');
      expect(parsed.result.summary.filesScanned).toBe(5);
    });
  });

  describe('MarkdownReporter', () => {
    it('should generate Markdown report', () => {
      const reporter = new MarkdownReporter();
      const result = createMockResult();

      reporter.report(result);
      const output = reporter.getOutput();

      expect(output).toContain('# Env Guard Analysis Report');
      expect(output).toContain('## Summary');
      expect(output).toContain('| Files scanned | 5 |');
      expect(output).toContain('## Undocumented Variables');
      expect(output).toContain('SECRET_KEY');
    });

    it('should include security section for hardcoded secrets', () => {
      const reporter = new MarkdownReporter();
      const result = createMockResult();

      reporter.report(result);
      const output = reporter.getOutput();

      expect(output).toContain('Security Issues');
      expect(output).toContain('API_KEY');
    });

    it('should report issues', () => {
      const reporter = new MarkdownReporter();
      const issue: Issue = {
        severity: 'warning',
        code: 'ENV002',
        message: 'Undocumented variable',
        file: 'src/config.ts',
        line: 15,
        column: 8,
        suggestion: 'Add to .env.example',
      };

      reporter.reportIssue(issue);
      const output = reporter.getOutput();

      expect(output).toContain('WARNING: ENV002');
      expect(output).toContain('Undocumented variable');
    });
  });
});
