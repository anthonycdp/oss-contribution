/**
 * Core types for env-guard
 */

export interface EnvVarUsage {
  /** Name of the environment variable */
  name: string;
  /** File where the variable is used */
  file: string;
  /** Line number in the file */
  line: number;
  /** Column number in the file */
  column: number;
  /** Context around the usage (snippet of code) */
  context: string;
}

export interface EnvVarDefinition {
  /** Name of the environment variable */
  name: string;
  /** Description of what the variable is for */
  description?: string;
  /** Whether the variable is required */
  required: boolean;
  /** Default value if any */
  defaultValue?: string;
  /** Expected type of the value */
  type: 'string' | 'number' | 'boolean' | 'url' | 'json' | 'unknown';
  /** Whether the value should be kept secret */
  secret?: boolean;
  /** Example value */
  example?: string;
}

export interface AnalysisResult {
  /** All environment variables found in code */
  usedVars: EnvVarUsage[];
  /** All environment variables defined in .env.example */
  definedVars: EnvVarDefinition[];
  /** Variables used in code but not documented */
  undocumented: EnvVarUsage[];
  /** Variables documented but not used anywhere */
  unused: EnvVarDefinition[];
  /** Variables that appear to have hardcoded values */
  hardcodedSecrets: EnvVarUsage[];
  /** Variables with naming convention violations */
  namingViolations: EnvVarUsage[];
  /** Summary statistics */
  summary: {
    totalUsed: number;
    totalDefined: number;
    totalUndocumented: number;
    totalUnused: number;
    totalHardcodedSecrets: number;
    totalNamingViolations: number;
    filesScanned: number;
  };
}

export interface AnalysisOptions {
  /** Root directory to analyze */
  rootDir: string;
  /** Glob patterns for files to include */
  includePatterns: string[];
  /** Glob patterns for files to exclude */
  excludePatterns: string[];
  /** Path to .env.example file */
  envExamplePath?: string;
  /** Path to .env file (for validation) */
  envPath?: string;
  /** Whether to check for hardcoded secrets */
  checkSecrets: boolean;
  /** Whether to check naming conventions */
  checkNaming: boolean;
  /** Naming convention pattern (regex) */
  namingPattern?: string;
  /** Output format */
  outputFormat: 'text' | 'json' | 'markdown';
  /** Whether to fail on issues */
  failOnIssues: boolean;
  /** Severity level to fail on */
  failLevel: 'error' | 'warning' | 'info';
}

export interface Issue {
  /** Issue severity */
  severity: 'error' | 'warning' | 'info';
  /** Issue code for identification */
  code: string;
  /** Human-readable message */
  message: string;
  /** File where the issue was found */
  file: string;
  /** Line number */
  line: number;
  /** Column number */
  column: number;
  /** Suggested fix if available */
  suggestion?: string;
  /** Related documentation URL */
  docsUrl?: string;
}

export interface Reporter {
  /** Report analysis results */
  report(result: AnalysisResult): void;
  /** Report a single issue */
  reportIssue(issue: Issue): void;
  /** Get output as string */
  getOutput(): string;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface Logger {
  error(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

/**
 * Custom error classes for better error handling
 */
export class FileNotFoundError extends Error {
  constructor(public readonly filePath: string) {
    super(`File not found: ${filePath}`);
    this.name = 'FileNotFoundError';
  }
}

export class FileReadError extends Error {
  public readonly cause?: Error;

  constructor(public readonly filePath: string, cause?: Error) {
    super(`Failed to read file: ${filePath}`);
    this.name = 'FileReadError';
    this.cause = cause;
  }
}

export class AnalysisError extends Error {
  public readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'AnalysisError';
    this.cause = cause;
  }
}

/**
 * Named constants for magic numbers
 */
export const MAX_DISPLAYED_USAGES = 5;
export const MAX_DISPLAYED_LOCATIONS = 3;
