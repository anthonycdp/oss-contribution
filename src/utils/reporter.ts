import chalk from 'chalk';
import { AnalysisResult, Issue, Reporter as IReporter, EnvVarUsage, EnvVarDefinition, MAX_DISPLAYED_LOCATIONS } from '../types';
import { getViolationReason, suggestCorrectName } from '../analyzers/naming-convention';
import { groupUsagesByVar } from '../analyzers/env-usage-analyzer';
import { hasIssues } from '../analyzers';

/**
 * Output format types
 */
export type OutputFormat = 'text' | 'json' | 'markdown';

/**
 * Separator line width for reports
 */
const SEPARATOR_WIDTH = 50;

/**
 * Factory function to create the appropriate reporter
 */
export function createReporter(format: OutputFormat, verbose: boolean = false): IReporter {
  switch (format) {
    case 'json':
      return new JsonReporter();
    case 'markdown':
      return new MarkdownReporter();
    case 'text':
    default:
      return new TextReporter(verbose);
  }
}

/**
 * Text reporter for console output
 */
export class TextReporter implements IReporter {
  private output: string[] = [];

  private static readonly SEVERITY_STYLES = {
    error: { color: chalk.red, icon: 'X' },
    warning: { color: chalk.yellow, icon: '!' },
    info: { color: chalk.blue, icon: 'i' },
  };

  constructor(private verbose: boolean = false) {}

  report(result: AnalysisResult): void {
    this.output = [];

    this.printHeader();
    this.reportSummary(result);
    this.reportIssues(result);

    if (!hasIssues(result)) {
      this.printSuccessMessage();
    }

    if (this.verbose) {
      this.reportVerbose(result);
    }
  }

  private printHeader(): void {
    this.output.push('');
    this.output.push(chalk.bold.blue('╔════════════════════════════════════════════════════════════╗'));
    this.output.push(chalk.bold.blue('║') + chalk.bold.white('              Env Guard Analysis Report                    ') + chalk.bold.blue('║'));
    this.output.push(chalk.bold.blue('╚════════════════════════════════════════════════════════════╝'));
    this.output.push('');
  }

  private printSuccessMessage(): void {
    this.output.push('');
    this.output.push(chalk.green('All environment variables are properly documented!'));
    this.output.push('');
  }

  private reportSummary(result: AnalysisResult): void {
    this.output.push(chalk.bold('Summary'));
    this.output.push(chalk.gray('─'.repeat(SEPARATOR_WIDTH)));
    this.output.push(`  Files scanned:         ${result.summary.filesScanned}`);
    this.output.push(`  Variables used:        ${result.summary.totalUsed}`);
    this.output.push(`  Variables documented:  ${result.summary.totalDefined}`);
    this.output.push('');

    const issueColors = {
      undocumented: result.summary.totalUndocumented > 0 ? chalk.yellow : chalk.gray,
      unused: result.summary.totalUnused > 0 ? chalk.blue : chalk.gray,
      hardcoded: result.summary.totalHardcodedSecrets > 0 ? chalk.red : chalk.gray,
      naming: result.summary.totalNamingViolations > 0 ? chalk.magenta : chalk.gray,
    };

    this.output.push(chalk.bold('Issues Found'));
    this.output.push(chalk.gray('─'.repeat(SEPARATOR_WIDTH)));
    this.output.push(`  ${issueColors.undocumented(`Undocumented:    ${result.summary.totalUndocumented}`)}`);
    this.output.push(`  ${issueColors.unused(`Unused:          ${result.summary.totalUnused}`)}`);
    this.output.push(`  ${issueColors.hardcoded(`Hardcoded:       ${result.summary.totalHardcodedSecrets}`)}`);
    this.output.push(`  ${issueColors.naming(`Naming issues:   ${result.summary.totalNamingViolations}`)}`);
    this.output.push('');
  }

  private reportIssues(result: AnalysisResult): void {
    if (result.summary.totalUndocumented > 0) {
      this.reportUndocumented(result.undocumented);
    }

    if (result.summary.totalUnused > 0) {
      this.reportUnused(result.unused);
    }

    if (result.summary.totalHardcodedSecrets > 0) {
      this.reportHardcodedSecrets(result.hardcodedSecrets);
    }

    if (result.summary.totalNamingViolations > 0) {
      this.reportNamingViolations(result.namingViolations);
    }
  }

  private reportUndocumented(usages: EnvVarUsage[]): void {
    this.output.push('');
    this.output.push(chalk.yellow.bold('Undocumented Variables'));
    this.output.push(chalk.gray('─'.repeat(SEPARATOR_WIDTH)));

    const grouped = groupUsagesByVar(usages);
    for (const [name, items] of grouped) {
      this.output.push(`  ${chalk.yellow(name)}`);
      if (this.verbose) {
        this.displayLocations(items);
      } else {
        this.output.push(`    ${chalk.gray(`Used in ${items.length} location(s)`)}`);
      }
    }
    this.output.push('');
    this.output.push(chalk.gray('  Add these variables to your .env.example file'));
    this.output.push('');
  }

  private displayLocations(items: EnvVarUsage[]): void {
    const displayItems = items.slice(0, MAX_DISPLAYED_LOCATIONS);
    for (const item of displayItems) {
      this.output.push(`    ${chalk.gray(`${item.file}:${item.line}`)}`);
    }
    if (items.length > MAX_DISPLAYED_LOCATIONS) {
      const remaining = items.length - MAX_DISPLAYED_LOCATIONS;
      this.output.push(`    ${chalk.gray(`... and ${remaining} more locations`)}`);
    }
  }

  private reportUnused(definitions: EnvVarDefinition[]): void {
    this.output.push('');
    this.output.push(chalk.blue.bold('Unused Variables'));
    this.output.push(chalk.gray('─'.repeat(SEPARATOR_WIDTH)));

    for (const definition of definitions) {
      const required = definition.required ? chalk.red('*') : '';
      this.output.push(`  ${chalk.blue(definition.name)}${required}`);
      if (definition.description) {
        this.output.push(`    ${chalk.gray(definition.description)}`);
      }
    }
    this.output.push('');
    this.output.push(chalk.gray('  These variables are documented but not used in your code'));
    this.output.push('');
  }

  private reportHardcodedSecrets(usages: EnvVarUsage[]): void {
    this.output.push('');
    this.output.push(chalk.red.bold('Hardcoded Values (Potential Security Issue)'));
    this.output.push(chalk.gray('─'.repeat(SEPARATOR_WIDTH)));

    for (const usage of usages) {
      this.output.push(`  ${chalk.red(usage.name)}`);
      this.output.push(`    ${chalk.gray(`${usage.file}:${usage.line}`)}`);
      this.output.push(`    ${chalk.gray(usage.context)}`);
    }
    this.output.push('');
    this.output.push(chalk.gray('  Avoid hardcoding default values for secrets'));
    this.output.push('');
  }

  private reportNamingViolations(usages: EnvVarUsage[]): void {
    this.output.push('');
    this.output.push(chalk.magenta.bold('Naming Convention Violations'));
    this.output.push(chalk.gray('─'.repeat(SEPARATOR_WIDTH)));

    const grouped = groupUsagesByVar(usages);
    for (const [name] of grouped) {
      const reason = getViolationReason(name);
      const suggested = suggestCorrectName(name);

      this.output.push(`  ${chalk.magenta(name)}`);
      if (reason) {
        this.output.push(`    ${chalk.gray(reason)}`);
      }
      if (suggested !== name) {
        this.output.push(`    ${chalk.green(`Suggestion: ${suggested}`)}`);
      }
    }
    this.output.push('');
    this.output.push(chalk.gray('  Use SCREAMING_SNAKE_CASE for environment variables'));
    this.output.push('');
  }

  private reportVerbose(result: AnalysisResult): void {
    this.output.push('');
    this.output.push(chalk.bold('All Variables Used'));
    this.output.push(chalk.gray('─'.repeat(SEPARATOR_WIDTH)));

    const allNames = [...new Set(result.usedVars.map(usage => usage.name))].sort();
    for (const name of allNames) {
      const definition = result.definedVars.find(def => def.name === name);
      const isSecret = definition?.secret ?? false;
      const color = isSecret ? chalk.yellow : chalk.green;
      this.output.push(`  ${color(name)}${isSecret ? ' (secret)' : ''}`);
    }
    this.output.push('');
  }

  reportIssue(issue: Issue): void {
    const style = TextReporter.SEVERITY_STYLES[issue.severity];
    this.output.push(`${style.color(style.icon)} ${issue.message}`);
    this.output.push(`  ${chalk.gray(`${issue.file}:${issue.line}:${issue.column}`)}`);
    if (issue.suggestion) {
      this.output.push(`  ${chalk.green(`Suggestion: ${issue.suggestion}`)}`);
    }
    this.output.push('');
  }

  getOutput(): string {
    return this.output.join('\n');
  }
}

/**
 * JSON reporter for programmatic use
 */
export class JsonReporter implements IReporter {
  private result: AnalysisResult | null = null;
  private issues: Issue[] = [];

  report(result: AnalysisResult): void {
    this.result = result;
  }

  reportIssue(issue: Issue): void {
    this.issues.push(issue);
  }

  getOutput(): string {
    return JSON.stringify(
      {
        result: this.result,
        issues: this.issues,
      },
      null,
      2
    );
  }
}

/**
 * Markdown reporter for documentation
 */
export class MarkdownReporter implements IReporter {
  private output: string[] = [];

  report(result: AnalysisResult): void {
    this.output = [];

    this.output.push('# Env Guard Analysis Report');
    this.output.push('');

    this.reportSummaryTable(result);
    this.reportIssues(result);
  }

  private reportSummaryTable(result: AnalysisResult): void {
    this.output.push('## Summary');
    this.output.push('');
    this.output.push('| Metric | Count |');
    this.output.push('|--------|-------|');
    this.output.push(`| Files scanned | ${result.summary.filesScanned} |`);
    this.output.push(`| Variables used | ${result.summary.totalUsed} |`);
    this.output.push(`| Variables documented | ${result.summary.totalDefined} |`);
    this.output.push(`| Undocumented | ${result.summary.totalUndocumented} |`);
    this.output.push(`| Unused | ${result.summary.totalUnused} |`);
    this.output.push(`| Hardcoded | ${result.summary.totalHardcodedSecrets} |`);
    this.output.push(`| Naming issues | ${result.summary.totalNamingViolations} |`);
    this.output.push('');
  }

  private reportIssues(result: AnalysisResult): void {
    if (result.summary.totalUndocumented > 0) {
      this.output.push('## Undocumented Variables');
      this.output.push('');
      this.output.push('These environment variables are used in the code but not documented:');
      this.output.push('');
      const names = [...new Set(result.undocumented.map(usage => usage.name))];
      for (const name of names.sort()) {
        this.output.push(`- \`${name}\``);
      }
      this.output.push('');
    }

    if (result.summary.totalUnused > 0) {
      this.output.push('## Unused Variables');
      this.output.push('');
      this.output.push('These environment variables are documented but not used:');
      this.output.push('');
      for (const definition of result.unused) {
        this.output.push(`- \`${definition.name}\`${definition.required ? ' (required)' : ''}`);
      }
      this.output.push('');
    }

    if (result.summary.totalHardcodedSecrets > 0) {
      this.output.push('## Security Issues');
      this.output.push('');
      this.output.push('These variables have hardcoded default values:');
      this.output.push('');
      const names = [...new Set(result.hardcodedSecrets.map(usage => usage.name))];
      for (const name of names.sort()) {
        this.output.push(`- \`${name}\``);
      }
      this.output.push('');
    }
  }

  reportIssue(issue: Issue): void {
    this.output.push(`### ${issue.severity.toUpperCase()}: ${issue.code}`);
    this.output.push('');
    this.output.push(`${issue.message}`);
    this.output.push('');
    this.output.push(`Location: \`${issue.file}:${issue.line}:${issue.column}\``);
    if (issue.suggestion) {
      this.output.push(`Suggestion: ${issue.suggestion}`);
    }
    this.output.push('');
  }

  getOutput(): string {
    return this.output.join('\n');
  }
}
