import { EnvVarUsage, AnalysisOptions } from '../types';
import { getFiles, readFile, getRelativePath } from '../utils/file-utils';

/**
 * Regex patterns for finding environment variable usage
 */
const ENV_USAGE_PATTERNS: RegExp[] = [
  /process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g,
  /process\.env\[['"]([A-Za-z_][A-Za-z0-9_]*)['"]\]/g,
  /import\.meta\.env\.([A-Za-z_][A-Za-z0-9_]*)/g,
  /\$([A-Z][A-Z0-9_]*)/g,
];

/**
 * Pattern for detecting hardcoded values assigned to env vars
 */
const HARDCODED_VALUE_PATTERN = /(?:process\.env|import\.meta\.env)\.([A-Za-z_][A-Za-z0-9_]*)\s*\|\|\s*['"]([^'"]+)['"]/g;

/**
 * Generic names that are often false positives
 */
const GENERIC_VAR_NAMES = ['NODE_ENV', 'ENV', 'PRODUCTION', 'DEVELOPMENT', 'TEST'];

/**
 * Patterns that indicate false positives in type definitions and declarations
 */
const FALSE_POSITIVE_PATTERNS: RegExp[] = [
  /:\s*(?:string|number|boolean|any)/,
  /export\s+(?:const|let|var|type|interface)/,
  /{\s*\w+\s*:/,
];

/**
 * Patterns for safe default values that are not secrets
 */
const SAFE_DEFAULT_PATTERNS: RegExp[] = [
  /^https?:\/\/localhost/,
  /^127\.0\.0\.1/,
  /^:\d+$/,
  /^\d+$/,
  /^true$/,
  /^false$/,
  /^development$/,
  /^test$/,
  /^production$/,
];

/**
 * Analyze source files for environment variable usage
 */
export async function analyzeEnvUsage(options: AnalysisOptions): Promise<EnvVarUsage[]> {
  const usages: EnvVarUsage[] = [];
  const seenKeys = new Set<string>();

  const files = await getFiles(
    options.includePatterns,
    options.rootDir,
    options.excludePatterns
  );

  for (const filePath of files) {
    const content = readFile(filePath);
    if (content === null) {
      continue;
    }

    const fileUsages = findEnvUsagesInFile(filePath, content, options.rootDir);

    for (const usage of fileUsages) {
      const key = `${usage.name}:${usage.file}:${usage.line}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        usages.push(usage);
      }
    }
  }

  return usages;
}

/**
 * Find all environment variable usages in a file
 */
function findEnvUsagesInFile(
  filePath: string,
  content: string,
  rootDir: string
): EnvVarUsage[] {
  const usages: EnvVarUsage[] = [];
  const lines = content.split('\n');
  const relativePath = getRelativePath(filePath, rootDir);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex] ?? '';
    const lineNum = lineIndex + 1;

    if (isCommentLine(line)) {
      continue;
    }

    const patternMatches = findAllPatternMatches(line, relativePath, lineNum);
    usages.push(...patternMatches);
  }

  return usages;
}

/**
 * Check if a line is a comment
 */
function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*');
}

/**
 * Find all pattern matches in a line
 */
function findAllPatternMatches(
  line: string,
  relativePath: string,
  lineNum: number
): EnvVarUsage[] {
  const usages: EnvVarUsage[] = [];

  for (const pattern of ENV_USAGE_PATTERNS) {
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(line)) !== null) {
      const varName = match[1];
      if (!varName) continue;

      if (isFalsePositive(varName, line)) {
        continue;
      }

      usages.push({
        name: varName,
        file: relativePath,
        line: lineNum,
        column: (match.index ?? 0) + 1,
        context: line.trim()
      });
    }
  }

  return usages;
}

/**
 * Check if a match is likely a false positive
 */
function isFalsePositive(varName: string, line: string): boolean {
  if (GENERIC_VAR_NAMES.includes(varName) && !line.includes('process.env')) {
    return true;
  }

  return FALSE_POSITIVE_PATTERNS.some(pattern => pattern.test(line));
}

/**
 * Find hardcoded values in env usage (potential secrets)
 */
export async function findHardcodedValues(options: AnalysisOptions): Promise<EnvVarUsage[]> {
  const usages: EnvVarUsage[] = [];
  const files = await getFiles(options.includePatterns, options.rootDir, options.excludePatterns);

  for (const filePath of files) {
    const content = readFile(filePath);
    if (content === null) continue;

    const fileUsages = findHardcodedInFile(filePath, content, options.rootDir);
    usages.push(...fileUsages);
  }

  return usages;
}

/**
 * Find hardcoded values in a file
 */
function findHardcodedInFile(
  filePath: string,
  content: string,
  rootDir: string
): EnvVarUsage[] {
  const usages: EnvVarUsage[] = [];
  const lines = content.split('\n');
  const relativePath = getRelativePath(filePath, rootDir);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const lineNum = i + 1;

    HARDCODED_VALUE_PATTERN.lastIndex = 0;

    let match;
    while ((match = HARDCODED_VALUE_PATTERN.exec(line)) !== null) {
      const varName = match[1];
      const hardcodedValue = match[2];

      if (!varName || !hardcodedValue) continue;

      if (isSafeDefaultValue(hardcodedValue)) {
        continue;
      }

      usages.push({
        name: varName,
        file: relativePath,
        line: lineNum,
        column: (match.index ?? 0) + 1,
        context: line.trim()
      });
    }
  }

  return usages;
}

/**
 * Check if a default value is safe (not a secret)
 */
function isSafeDefaultValue(value: string): boolean {
  return SAFE_DEFAULT_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Get unique variable names from usages
 */
export function getUniqueVarNames(usages: EnvVarUsage[]): string[] {
  return [...new Set(usages.map(usage => usage.name))].sort();
}

/**
 * Group usages by variable name
 */
export function groupUsagesByVar(usages: EnvVarUsage[]): Map<string, EnvVarUsage[]> {
  const groups = new Map<string, EnvVarUsage[]>();

  for (const usage of usages) {
    const existing = groups.get(usage.name) ?? [];
    existing.push(usage);
    groups.set(usage.name, existing);
  }

  return groups;
}
