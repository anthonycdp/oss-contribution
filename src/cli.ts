#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { runAnalysis, hasIssues, getResultSeverity } from './analyzers';
import { createReporter, OutputFormat } from './utils/reporter';
import { generateEnvExample, isLikelySecret } from './utils/env-parser';
import { fileExists, writeFile } from './utils/file-utils';
import { AnalysisOptions, MAX_DISPLAYED_USAGES, EnvVarDefinition } from './types';
import * as path from 'path';

const packageJson = require('../package.json');

const program = new Command();

program
  .name('env-guard')
  .description('Validate environment variable usage across your codebase')
  .version(packageJson.version);

/**
 * Severity levels for exit codes
 */
const SEVERITY_ORDER: Record<string, number> = {
  info: 0,
  warning: 1,
  error: 2,
};

/**
 * Build analysis options from CLI arguments
 */
function buildAnalysisOptions(
  rootDir: string,
  cliOptions: Record<string, unknown>
): Partial<AnalysisOptions> {
  return {
    rootDir,
    includePatterns: cliOptions.include as string[] | undefined,
    excludePatterns: cliOptions.exclude as string[] | undefined,
    envExamplePath: cliOptions.envExample as string | undefined,
    checkSecrets: cliOptions.secrets as boolean,
    checkNaming: cliOptions.naming as boolean,
    namingPattern: cliOptions.namingPattern as string | undefined,
    outputFormat: (cliOptions.format as OutputFormat) ?? 'text',
    failOnIssues: cliOptions.fail as boolean,
    failLevel: (cliOptions.failLevel as 'error' | 'warning' | 'info') ?? 'error',
  };
}

/**
 * Handle analyze command
 */
async function handleAnalyze(targetPath: string | undefined, options: Record<string, unknown>): Promise<void> {
  const spinner = ora('Analyzing environment variables...').start();
  const rootDir = targetPath ? path.resolve(targetPath) : process.cwd();
  const analysisOptions = buildAnalysisOptions(rootDir, options);

  try {
    const result = await runAnalysis(analysisOptions);
    spinner.stop();

    const reporter = createReporter(options.format as OutputFormat, options.verbose as boolean);
    reporter.report(result);
    console.log(reporter.getOutput());

    if (options.fail && hasIssues(result)) {
      const severity = getResultSeverity(result);
      const failLevel = options.failLevel as string;
      const severityValue = SEVERITY_ORDER[severity] ?? 0;
      const failLevelValue = SEVERITY_ORDER[failLevel] ?? 0;

      if (severityValue >= failLevelValue) {
        process.exit(1);
      }
    }
  } catch (error) {
    spinner.fail('Analysis failed');
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

/**
 * Handle generate command
 */
async function handleGenerate(targetPath: string | undefined, options: Record<string, unknown>): Promise<void> {
  const rootDir = targetPath ? path.resolve(targetPath) : process.cwd();
  const outputPath = path.resolve(rootDir, options.output as string);

  if (!options.force && fileExists(outputPath)) {
    console.error(chalk.red(`File ${options.output as string} already exists. Use --force to overwrite.`));
    process.exit(1);
  }

  const spinner = ora('Scanning for environment variables...').start();

  try {
    const result = await runAnalysis({
      rootDir,
      checkSecrets: false,
      checkNaming: false,
    });

    spinner.stop();

    const usedNames = new Set(result.usedVars.map(usage => usage.name));
    const definitions = [...result.definedVars];

    if (options.includeUsed) {
      addUndocumentedDefinitions(definitions, usedNames);
    }

    const content = generateEnvExample(definitions);
    writeFile(outputPath, content);

    console.log(chalk.green(`Generated ${options.output as string}`));
    console.log(chalk.gray(`  Found ${usedNames.size} environment variables`));
    console.log(chalk.gray(`  Added ${result.summary.totalUndocumented} undocumented variables`));
  } catch (error) {
    spinner.fail('Generation failed');
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

/**
 * Add undocumented variables to definitions
 */
function addUndocumentedDefinitions(
  definitions: EnvVarDefinition[],
  usedNames: Set<string>
): void {
  const definedNames = new Set(definitions.map(def => def.name));

  for (const name of usedNames) {
    if (!definedNames.has(name)) {
      definitions.push({
        name,
        required: true,
        type: 'unknown',
        secret: isLikelySecret(name),
      });
    }
  }
}

/**
 * Handle check command
 */
async function handleCheck(variable: string, options: Record<string, unknown>): Promise<void> {
  const rootDir = process.cwd();
  const envExamplePath = (options.envExample as string) ?? path.join(rootDir, '.env.example');

  try {
    const result = await runAnalysis({
      rootDir,
      envExamplePath,
      checkSecrets: false,
      checkNaming: false,
    });

    const usages = result.usedVars.filter(usage => usage.name === variable);
    const definition = result.definedVars.find(def => def.name === variable);
    const isUsed = usages.length > 0;
    const isDefined = definition !== undefined;

    console.log(chalk.bold(`\nVariable: ${variable}\n`));
    reportVariableUsage(usages, isUsed);
    reportVariableDefinition(definition, isDefined);
    console.log('');
  } catch (error) {
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

/**
 * Report variable usage details
 */
function reportVariableUsage(usages: { file: string; line: number }[], isUsed: boolean): void {
  if (isUsed) {
    console.log(chalk.green('Used in code'));
    console.log(chalk.gray(`  Found in ${usages.length} location(s)`));

    const displayUsages = usages.slice(0, MAX_DISPLAYED_USAGES);
    for (const usage of displayUsages) {
      console.log(chalk.gray(`    - ${usage.file}:${usage.line}`));
    }
    if (usages.length > MAX_DISPLAYED_USAGES) {
      console.log(chalk.gray(`    ... and ${usages.length - MAX_DISPLAYED_USAGES} more`));
    }
  } else {
    console.log(chalk.yellow('Not used in code'));
  }
}

/**
 * Report variable definition details
 */
function reportVariableDefinition(
  definition: { required: boolean; type: string; defaultValue?: string; secret?: boolean } | undefined,
  isDefined: boolean
): void {
  if (isDefined && definition) {
    console.log(chalk.green('Documented in .env.example'));
    console.log(chalk.gray(`  Required: ${definition.required ? 'Yes' : 'No'}`));
    console.log(chalk.gray(`  Type: ${definition.type}`));
    if (definition.defaultValue) {
      console.log(chalk.gray(`  Default: ${definition.defaultValue}`));
    }
    if (definition.secret) {
      console.log(chalk.yellow('  Secret: Yes'));
    }
  } else {
    console.log(chalk.red('Not documented in .env.example'));
  }
}

/**
 * Handle list command
 */
async function handleList(options: Record<string, unknown>): Promise<void> {
  const rootDir = process.cwd();

  try {
    const result = await runAnalysis({
      rootDir,
      checkSecrets: false,
      checkNaming: false,
    });

    if (options.format === 'json') {
      outputJsonList(result);
      return;
    }

    outputTextList(result, options);
  } catch (error) {
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

/**
 * Output variable list as JSON
 */
function outputJsonList(result: { usedVars: { name: string }[]; definedVars: { name: string }[] }): void {
  const output = {
    used: [...new Set(result.usedVars.map(usage => usage.name))].sort(),
    defined: result.definedVars.map(def => def.name).sort(),
  };
  console.log(JSON.stringify(output, null, 2));
}

/**
 * Output variable list as text
 */
function outputTextList(
  result: { usedVars: { name: string }[]; definedVars: { name: string; required: boolean }[] },
  options: Record<string, unknown>
): void {
  const usedNames = [...new Set(result.usedVars.map(usage => usage.name))].sort();

  if (options.used) {
    for (const name of usedNames) {
      console.log(name);
    }
    return;
  }

  if (options.defined) {
    for (const definition of result.definedVars) {
      console.log(definition.name);
    }
    return;
  }

  outputFullList(result, usedNames);
}

/**
 * Output full variable list with indicators
 */
function outputFullList(
  result: { usedVars: { name: string }[]; definedVars: { name: string; required: boolean }[] },
  usedNames: string[]
): void {
  console.log(chalk.bold('\nEnvironment Variables\n'));

  console.log(chalk.blue('Used in code:'));
  for (const name of usedNames) {
    const isDefined = result.definedVars.some(def => def.name === name);
    const icon = isDefined ? chalk.green('+') : chalk.yellow('!');
    console.log(`  ${icon} ${name}`);
  }

  console.log('');
  console.log(chalk.blue('Documented:'));
  for (const definition of result.definedVars) {
    const isUsed = usedNames.includes(definition.name);
    const icon = isUsed ? chalk.green('+') : chalk.gray('o');
    const required = definition.required ? chalk.red('*') : '';
    console.log(`  ${icon} ${definition.name}${required}`);
  }
  console.log('');
}

// Register commands
program
  .command('analyze [path]')
  .description('Analyze environment variable usage in the codebase')
  .option('-i, --include <patterns...>', 'Glob patterns to include', ['**/*.{js,jsx,ts,tsx}'])
  .option('-e, --exclude <patterns...>', 'Glob patterns to exclude', [])
  .option('--env-example <path>', 'Path to .env.example file')
  .option('--no-secrets', 'Skip hardcoded secrets check')
  .option('--no-naming', 'Skip naming convention check')
  .option('--naming-pattern <regex>', 'Custom naming pattern (regex)')
  .option('-f, --format <format>', 'Output format (text, json, markdown)', 'text')
  .option('-v, --verbose', 'Show verbose output')
  .option('--fail', 'Exit with error code if issues found')
  .option('--fail-level <level>', 'Minimum severity to fail on (error, warning, info)', 'error')
  .action(handleAnalyze);

program
  .command('generate [path]')
  .description('Generate .env.example file from detected usage')
  .option('-o, --output <path>', 'Output file path', '.env.example')
  .option('--include-used', 'Include variables that are used but not documented', true)
  .option('-f, --force', 'Overwrite existing file')
  .action(handleGenerate);

program
  .command('check <variable>')
  .description('Check if a variable is properly documented')
  .option('--env-example <path>', 'Path to .env.example file')
  .action(handleCheck);

program
  .command('list')
  .description('List all environment variables')
  .option('--used', 'Show only used variables')
  .option('--defined', 'Show only defined variables')
  .option('--format <format>', 'Output format (text, json)', 'text')
  .action(handleList);

// Parse arguments
program.parse();
