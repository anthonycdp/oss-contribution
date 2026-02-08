import { EnvVarDefinition } from '../types';
import { readFile } from './file-utils';

/**
 * Parse a .env.example file and extract variable definitions
 */
export function parseEnvExample(content: string): EnvVarDefinition[] {
  const lines = content.split('\n');
  const definitions: EnvVarDefinition[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Parse the variable definition
    const definition = parseEnvLine(trimmed);
    if (definition) {
      definitions.push(definition);
    }
  }

  return definitions;
}

/**
 * Parse a single .env line
 */
function parseEnvLine(line: string): EnvVarDefinition | null {
  // Match patterns like:
  // VAR_NAME=value
  // VAR_NAME=  (empty but defined)
  // VAR_NAME (no equals, just declared)
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)(?:=(.*))?$/);

  if (!match || !match[1]) {
    return null;
  }

  const name = match[1];
  let defaultValue = match[2] ?? undefined;

  // Clean up default value
  if (defaultValue !== undefined) {
    defaultValue = defaultValue.trim();
    // Remove quotes if present
    if ((defaultValue.startsWith('"') && defaultValue.endsWith('"')) ||
        (defaultValue.startsWith("'") && defaultValue.endsWith("'"))) {
      defaultValue = defaultValue.slice(1, -1);
    }
    // Empty string means no default
    if (defaultValue === '') {
      defaultValue = undefined;
    }
  }

  // Determine if required (no default value)
  const required = defaultValue === undefined;

  // Infer type from default value or name
  const type = inferType(name, defaultValue);

  // Check if it's likely a secret
  const secret = isLikelySecret(name);

  return {
    name,
    required,
    defaultValue,
    type,
    secret,
    description: undefined
  };
}

/**
 * Infer the type of an environment variable
 */
function inferType(name: string, defaultValue: string | undefined): EnvVarDefinition['type'] {
  if (defaultValue === undefined) {
    return 'unknown';
  }

  // Check for boolean
  if (['true', 'false', '1', '0'].includes(defaultValue.toLowerCase())) {
    return 'boolean';
  }

  // Check for number
  if (/^-?\d+(\.\d+)?$/.test(defaultValue)) {
    return 'number';
  }

  // Check for URL
  if (defaultValue.startsWith('http://') || defaultValue.startsWith('https://')) {
    return 'url';
  }

  // Check for JSON
  if (defaultValue.startsWith('{') || defaultValue.startsWith('[')) {
    try {
      JSON.parse(defaultValue);
      return 'json';
    } catch {
      // Not valid JSON
    }
  }

  // Check name patterns
  const lowerName = name.toLowerCase();
  if (lowerName.includes('url') || lowerName.includes('uri') || lowerName.includes('endpoint')) {
    return 'url';
  }
  if (lowerName.includes('port') || lowerName.includes('timeout') || lowerName.includes('count')) {
    return 'number';
  }
  if (lowerName.includes('enabled') || lowerName.includes('debug') || lowerName.includes('flag')) {
    return 'boolean';
  }

  return 'string';
}

/**
 * Check if a variable name suggests it's a secret
 */
export function isLikelySecret(name: string): boolean {
  const secretPatterns = [
    /secret/i,
    /password/i,
    /passwd/i,
    /pwd/i,
    /api[_-]?key/i,
    /apikey/i,
    /auth[_-]?token/i,
    /access[_-]?token/i,
    /private[_-]?key/i,
    /credentials/i,
    /credential/i
  ];

  return secretPatterns.some(pattern => pattern.test(name));
}

/**
 * Parse .env.example file from path
 */
export function parseEnvExampleFile(filePath: string): EnvVarDefinition[] | null {
  const content = readFile(filePath);
  if (content === null) {
    return null;
  }
  return parseEnvExample(content);
}

/**
 * Generate .env.example content from definitions
 */
export function generateEnvExample(definitions: EnvVarDefinition[]): string {
  const lines: string[] = [
    '# Environment Variables',
    '# Copy this file to .env and fill in the values',
    ''
  ];

  // Group by category (secret vs non-secret)
  const secrets = definitions.filter(d => d.secret);
  const nonSecrets = definitions.filter(d => !d.secret);

  if (nonSecrets.length > 0) {
    lines.push('# Application Configuration');
    for (const def of nonSecrets) {
      lines.push(formatEnvLine(def));
    }
    lines.push('');
  }

  if (secrets.length > 0) {
    lines.push('# Secrets (keep these secure!)');
    for (const def of secrets) {
      lines.push(formatEnvLine(def));
    }
  }

  return lines.join('\n');
}

/**
 * Format a single env line for .env.example
 */
function formatEnvLine(def: EnvVarDefinition): string {
  let line = def.name;

  if (def.defaultValue !== undefined) {
    // Quote values with spaces
    if (def.defaultValue.includes(' ')) {
      line += `="${def.defaultValue}"`;
    } else {
      line += `=${def.defaultValue}`;
    }
  } else {
    // Add placeholder for required vars
    line += '=';
  }

  // Add comment with description or required indicator
  if (def.description) {
    line += ` # ${def.description}`;
  } else if (def.required) {
    line += ' # Required';
  }

  return line;
}
