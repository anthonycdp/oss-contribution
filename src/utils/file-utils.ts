import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { FileNotFoundError, FileReadError } from '../types';

/**
 * Check if a file exists
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Read a file and return its contents
 * @throws {FileNotFoundError} if file doesn't exist
 * @throws {FileReadError} if file can't be read
 */
export function readFile(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    if (error instanceof FileNotFoundError) {
      throw error;
    }
    return null;
  }
}

/**
 * Read a file with strict error handling
 * @throws {FileNotFoundError} if file doesn't exist
 * @throws {FileReadError} if file can't be read
 */
export function readFileStrict(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new FileNotFoundError(filePath);
  }

  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new FileReadError(filePath, error instanceof Error ? error : undefined);
  }
}

/**
 * Write content to a file
 * @throws {Error} if write fails
 */
export function writeFile(filePath: string, content: string): void {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write file: ${filePath}. ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Write content to a file (legacy version that returns boolean)
 * @deprecated Use writeFile instead
 */
export function writeFileSafe(filePath: string, content: string): boolean {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all files matching a glob pattern
 */
export async function getFiles(
  patterns: string[],
  cwd: string,
  excludePatterns: string[] = []
): Promise<string[]> {
  const files = await glob(patterns, {
    cwd,
    ignore: excludePatterns,
    absolute: true,
    nodir: true
  });

  return files;
}

/**
 * Get relative path from cwd
 */
export function getRelativePath(absolutePath: string, cwd: string): string {
  return path.relative(cwd, absolutePath);
}

/**
 * Ensure directory exists
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Get file extension
 */
export function getExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

/**
 * Check if file is a source code file
 */
export function isSourceFile(filePath: string): boolean {
  const sourceExtensions = [
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
    '.vue', '.svelte', '.py', '.rb', '.go', '.rs',
    '.java', '.kt', '.swift', '.c', '.cpp', '.h'
  ];
  return sourceExtensions.includes(getExtension(filePath));
}

/**
 * Group items by a key derived from each item
 */
export function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K
): Map<K, T[]> {
  const groups = new Map<K, T[]>();

  for (const item of items) {
    const key = keyFn(item);
    const existing = groups.get(key) ?? [];
    existing.push(item);
    groups.set(key, existing);
  }

  return groups;
}
