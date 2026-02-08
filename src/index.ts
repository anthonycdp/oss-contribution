/**
 * env-guard
 *
 * A CLI tool that validates environment variable usage across your codebase.
 *
 * @packageDocumentation
 */

// Core analyzers
export { runAnalysis, hasIssues, getResultSeverity } from './analyzers';
export { analyzeEnvUsage, findHardcodedValues, getUniqueVarNames, groupUsagesByVar } from './analyzers/env-usage-analyzer';
export {
  checkNamingConvention,
  findNamingViolations,
  getViolationReason,
  suggestCorrectName,
  DEFAULT_NAMING_PATTERN
} from './analyzers/naming-convention';

// Utilities
export { parseEnvExample, parseEnvExampleFile, generateEnvExample, isLikelySecret } from './utils/env-parser';
export {
  fileExists,
  readFile,
  readFileStrict,
  writeFile,
  writeFileSafe,
  getFiles,
  getRelativePath,
  ensureDir,
  getExtension,
  isSourceFile,
  groupBy
} from './utils/file-utils';
export { TextReporter, JsonReporter, MarkdownReporter, createReporter } from './utils/reporter';

// Types
export type {
  EnvVarUsage,
  EnvVarDefinition,
  AnalysisResult,
  AnalysisOptions,
  Issue,
  Reporter,
  Logger,
  LogLevel
} from './types';
export {
  FileNotFoundError,
  FileReadError,
  AnalysisError,
  MAX_DISPLAYED_USAGES,
  MAX_DISPLAYED_LOCATIONS
} from './types';
