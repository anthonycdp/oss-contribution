import { EnvVarUsage } from '../types';

/**
 * Default naming convention pattern: SCREAMING_SNAKE_CASE
 * Does not allow consecutive underscores, lowercase, or starting with numbers
 */
export const DEFAULT_NAMING_PATTERN = /^(?!.*__)[A-Z][A-Z0-9_]*$/;

/**
 * Check if a variable name follows naming conventions
 */
export function checkNamingConvention(
  name: string,
  pattern: RegExp = DEFAULT_NAMING_PATTERN
): boolean {
  return pattern.test(name);
}

/**
 * Find naming convention violations
 */
export function findNamingViolations(
  usages: EnvVarUsage[],
  pattern: RegExp = DEFAULT_NAMING_PATTERN
): EnvVarUsage[] {
  return usages.filter(usage => !checkNamingConvention(usage.name, pattern));
}

/**
 * Get a description of why a name violates conventions
 */
export function getViolationReason(name: string): string | null {
  const reasons: string[] = [];

  if (/[a-z]/.test(name)) {
    reasons.push('contains lowercase letters (use SCREAMING_SNAKE_CASE)');
  }

  if (/__/.test(name)) {
    reasons.push('contains consecutive underscores');
  }

  if (/^[0-9]/.test(name)) {
    reasons.push('starts with a number');
  }

  if (/^_|_$/.test(name)) {
    reasons.push('starts or ends with underscore');
  }

  return reasons.length > 0 ? reasons.join(', ') : null;
}

/**
 * Suggest a corrected variable name
 */
export function suggestCorrectName(name: string): string {
  let corrected = name;

  // Convert camelCase to snake_case first
  // Insert underscore before uppercase letters (except at start)
  corrected = corrected.replace(/([a-z])([A-Z])/g, '$1_$2');

  // Convert to uppercase
  corrected = corrected.toUpperCase();

  // Replace spaces and hyphens with underscores
  corrected = corrected.replace(/[\s-]/g, '_');

  // Remove consecutive underscores
  corrected = corrected.replace(/_+/g, '_');

  // Remove leading/trailing underscores
  corrected = corrected.replace(/^_|_$/g, '');

  // Ensure it starts with a letter
  if (/^[0-9]/.test(corrected)) {
    corrected = 'VAR_' + corrected;
  }

  return corrected;
}
