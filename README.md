# env-guard

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D16-green.svg)](https://nodejs.org/)

**A CLI tool that validates environment variable usage across your codebase**

[Installation](#installation) • [Quick Start](#quick-start) • [Commands](#commands) • [API](#api) • [Contributing](#contributing)

</div>

---

## The Problem

Environment variables are the backbone of modern application configuration, yet they're often a source of silent failures and security vulnerabilities:

- **Undocumented Variables**: New developers clone your repo, set up `.env`, but the app crashes because `SECRET_API_KEY` was never documented in `.env.example`
- **Dead Configuration**: Your `.env.example` contains 50 variables, but half haven't been used in years
- **Hardcoded Secrets**: Developers add `|| "my-secret-key"` fallbacks that accidentally get committed
- **Inconsistent Naming**: `api_key`, `API-KEY`, `apiKey`, and `API_KEY` all exist in the same codebase

These issues cause:
- Frustrating onboarding experiences
- Silent production failures
- Security vulnerabilities
- Configuration bloat

## The Solution

**env-guard** analyzes your codebase to ensure environment variables are:

1. **Properly Documented** - Every `process.env.VAR` has a corresponding entry in `.env.example`
2. **Actually Used** - No stale configuration cluttering your `.env.example`
3. **Secure** - No hardcoded default values for secrets
4. **Consistently Named** - Follows SCREAMING_SNAKE_CASE convention

## Installation

```bash
# npm
npm install --save-dev env-guard

# yarn
yarn add --dev env-guard

# pnpm
pnpm add -D env-guard

# Or use directly with npx
npx env-guard analyze
```

## Quick Start

### 1. Analyze Your Codebase

```bash
npx env-guard analyze
```

This will scan your source files and produce a report like:

```
╔════════════════════════════════════════════════════════════╗
║              Env Guard Analysis Report                    ║
╚════════════════════════════════════════════════════════════╝

Summary
──────────────────────────────────────────────────
  Files scanned:         45
  Variables used:        12
  Variables documented:  15

Issues Found
──────────────────────────────────────────────────
  Undocumented:    3
  Unused:          6
  Hardcoded:       1
  Naming issues:   2

Undocumented Variables
──────────────────────────────────────────────────
  JWT_SECRET
    Used in 2 location(s)
  REDIS_URL
    Used in 1 location(s)
```

### 2. Generate Missing Documentation

```bash
npx env-guard generate
```

This creates/updates `.env.example` with all detected environment variables.

### 3. Check a Specific Variable

```bash
npx env-guard check DATABASE_URL
```

```
Variable: DATABASE_URL

Used in code
  Found in 3 location(s)
    - src/db/connection.ts:12
    - src/db/pool.ts:8
    - tests/setup.ts:5
Documented in .env.example
  Required: Yes
  Type: url
```

## Commands

### `analyze [path]`

Analyze environment variable usage in your codebase.

```bash
env-guard analyze                    # Analyze current directory
env-guard analyze ./src              # Analyze specific directory
env-guard analyze -f json            # Output as JSON
env-guard analyze --fail             # Exit with error if issues found
env-guard analyze -v                 # Verbose output
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-i, --include <patterns...>` | Glob patterns to include | `**/*.{js,jsx,ts,tsx}` |
| `-e, --exclude <patterns...>` | Glob patterns to exclude | `node_modules`, `dist`, etc. |
| `--env-example <path>` | Path to .env.example | `.env.example` |
| `--no-secrets` | Skip hardcoded secrets check | `true` |
| `--no-naming` | Skip naming convention check | `true` |
| `--naming-pattern <regex>` | Custom naming pattern | `^[A-Z][A-Z0-9_]*$` |
| `-f, --format <format>` | Output format (text/json/markdown) | `text` |
| `-v, --verbose` | Show verbose output | `false` |
| `--fail` | Exit with error if issues found | `false` |
| `--fail-level <level>` | Severity to fail on | `error` |

### `generate [path]`

Generate `.env.example` from detected usage.

```bash
env-guard generate                  # Generate to .env.example
env-guard generate -o .env.example.new  # Custom output path
env-guard generate --force          # Overwrite existing file
```

### `check <variable>`

Check if a specific variable is properly documented.

```bash
env-guard check API_KEY
env-guard check --env-example ./config/.env.example DATABASE_URL
```

### `list`

List all environment variables.

```bash
env-guard list                      # Show all variables
env-guard list --used               # Show only used variables
env-guard list --defined            # Show only documented variables
env-guard list --format json        # Output as JSON
```

## API Usage

You can also use env-guard programmatically:

```typescript
import { runAnalysis, TextReporter } from 'env-guard';

async function main() {
  const result = await runAnalysis({
    rootDir: process.cwd(),
    checkSecrets: true,
    checkNaming: true,
  });

  const reporter = new TextReporter(true);
  reporter.report(result);
  console.log(reporter.getOutput());

  if (result.summary.totalUndocumented > 0) {
    console.log('Missing variables:', result.undocumented);
  }
}

main();
```

### Available Exports

```typescript
// Core analysis
import { runAnalysis, hasIssues, getResultSeverity } from 'env-guard';

// Individual analyzers
import { analyzeEnvUsage, findHardcodedValues } from 'env-guard';
import { findNamingViolations, checkNamingConvention } from 'env-guard';

// Utilities
import { parseEnvExample, generateEnvExample } from 'env-guard';
import { fileExists, getFiles } from 'env-guard';

// Reporters
import { TextReporter, JsonReporter, MarkdownReporter } from 'env-guard';

// Types
import type {
  AnalysisResult,
  AnalysisOptions,
  EnvVarUsage,
  EnvVarDefinition
} from 'env-guard';
```

## CI Integration

Add to your CI pipeline to catch issues early:

### GitHub Actions

```yaml
name: CI
on: [push, pull_request]

jobs:
  env-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx env-guard analyze --fail --fail-level warning
```

### package.json scripts

```json
{
  "scripts": {
    "lint:env": "env-guard analyze --fail",
    "ci": "npm run lint && npm run lint:env && npm test"
  }
}
```

## Configuration

env-guard works out of the box, but you can customize behavior:

### Custom Include/Exclude Patterns

```bash
env-guard analyze \
  --include "src/**/*.{ts,tsx}" \
  --include "server/**/*.js" \
  --exclude "**/*.test.ts" \
  --exclude "**/__mocks__/**"
```

### Custom Naming Convention

```bash
# Allow lowercase (e.g., for legacy codebases)
env-guard analyze --naming-pattern "^[A-Za-z_][A-Za-z0-9_]*$"
```

## Why env-guard?

| Feature | env-guard | dotenv-linter | dotenvx |
|---------|-----------|---------------|---------|
| Detects undocumented vars | Yes | No | No |
| Detects unused vars | Yes | No | No |
| Detects hardcoded secrets | Yes | No | No |
| Naming convention checks | Yes | Yes | No |
| Programmatic API | Yes | No | No |
| Framework agnostic | Yes | Yes | Yes |
| Zero config needed | Yes | Yes | Yes |

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone <repository-url>
cd env-guard
npm install
npm run build
npm test
```

### Scripts

- `npm run build` - Compile TypeScript
- `npm run test` - Run tests
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix linting issues

## License

MIT

---

<div align="center">

**[Back to top](#env-guard)**

Built for developers who hate debugging missing env vars at 2 AM

</div>
