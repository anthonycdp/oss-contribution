import {
  AnalysisResult,
  AnalysisOptions,
  EnvVarUsage,
  EnvVarDefinition
} from '../types';
import { analyzeEnvUsage, findHardcodedValues, getUniqueVarNames } from './env-usage-analyzer';
import { findNamingViolations, DEFAULT_NAMING_PATTERN } from './naming-convention';
import { parseEnvExampleFile } from '../utils/env-parser';
import { fileExists } from '../utils/file-utils';
import * as path from 'path';

/**
 * Default include patterns for source files
 */
const DEFAULT_INCLUDE_PATTERNS = [
  '**/*.{js,jsx,ts,tsx,mjs,cjs}',
  '**/*.{vue,svelte}',
];

/**
 * Default exclude patterns
 */
const DEFAULT_EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
  '**/*.min.js',
  '**/*.d.ts',
];

/**
 * Run full environment variable analysis
 */
export async function runAnalysis(options: Partial<AnalysisOptions>): Promise<AnalysisResult> {
  const fullOptions: AnalysisOptions = {
    rootDir: options.rootDir ?? process.cwd(),
    includePatterns: options.includePatterns ?? DEFAULT_INCLUDE_PATTERNS,
    excludePatterns: options.excludePatterns ?? DEFAULT_EXCLUDE_PATTERNS,
    envExamplePath: options.envExamplePath ?? path.join(options.rootDir ?? process.cwd(), '.env.example'),
    checkSecrets: options.checkSecrets ?? true,
    checkNaming: options.checkNaming ?? true,
    namingPattern: options.namingPattern,
    outputFormat: options.outputFormat ?? 'text',
    failOnIssues: options.failOnIssues ?? false,
    failLevel: options.failLevel ?? 'error',
  };

  // Analyze env usage in code
  const usedVars = await analyzeEnvUsage(fullOptions);

  // Parse .env.example if it exists
  let definedVars: EnvVarDefinition[] = [];
  if (fullOptions.envExamplePath && fileExists(fullOptions.envExamplePath)) {
    definedVars = parseEnvExampleFile(fullOptions.envExamplePath) ?? [];
  }

  // Find undocumented variables (used but not defined)
  const definedNames = new Set(definedVars.map(v => v.name));
  const undocumented = usedVars.filter(usage => !definedNames.has(usage.name));

  // Find unused variables (defined but not used)
  const usedNames = new Set(getUniqueVarNames(usedVars));
  const unused = definedVars.filter(def => !usedNames.has(def.name));

  // Find hardcoded values
  let hardcodedSecrets: EnvVarUsage[] = [];
  if (fullOptions.checkSecrets) {
    hardcodedSecrets = await findHardcodedValues(fullOptions);
  }

  // Find naming violations
  let namingViolations: EnvVarUsage[] = [];
  if (fullOptions.checkNaming) {
    const pattern = fullOptions.namingPattern
      ? new RegExp(fullOptions.namingPattern)
      : DEFAULT_NAMING_PATTERN;
    namingViolations = findNamingViolations(usedVars, pattern);
  }

  // Calculate unique files scanned
  const filesScanned = new Set(usedVars.map(u => u.file)).size;

  return {
    usedVars,
    definedVars,
    undocumented,
    unused,
    hardcodedSecrets,
    namingViolations,
    summary: {
      totalUsed: usedNames.size,
      totalDefined: definedVars.length,
      totalUndocumented: getUniqueVarNames(undocumented).length,
      totalUnused: unused.length,
      totalHardcodedSecrets: getUniqueVarNames(hardcodedSecrets).length,
      totalNamingViolations: getUniqueVarNames(namingViolations).length,
      filesScanned,
    },
  };
}

/**
 * Check if analysis result has any issues
 */
export function hasIssues(result: AnalysisResult): boolean {
  return (
    result.summary.totalUndocumented > 0 ||
    result.summary.totalUnused > 0 ||
    result.summary.totalHardcodedSecrets > 0 ||
    result.summary.totalNamingViolations > 0
  );
}

/**
 * Get severity level for a result
 */
export function getResultSeverity(result: AnalysisResult): 'error' | 'warning' | 'info' {
  if (result.summary.totalHardcodedSecrets > 0) {
    return 'error';
  }
  if (result.summary.totalUndocumented > 0) {
    return 'warning';
  }
  if (result.summary.totalUnused > 0 || result.summary.totalNamingViolations > 0) {
    return 'info';
  }
  return 'info';
}
