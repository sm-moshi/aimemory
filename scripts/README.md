# Scripts Directory

This directory contains utility scripts for the AI Memory extension project.

## Available Scripts

### `build-check.ts`

Validates the build environment and ensures all required build outputs are present before packaging.

**Usage:**

```bash
pnpm run build-check
```

**Features:**

- Checks for essential build outputs:
  - `dist/extension.cjs` (Extension backend)
  - `dist/index.js` (MCP stdio server)
  - `dist/webview/index.html` (Webview build output)
- Validates webview JavaScript assets are present
- Runs TypeScript compilation checks for both main and webview configs
- Provides clear success/failure feedback

**Example Output:**

```text
🔍 Checking build environment...
✅ Found: Extension backend
✅ Found: MCP stdio server
✅ Found: Webview build output
✅ Found: Webview JS assets
🔧 Validating TypeScript configs...
🎉 Build check passed. You're ready to package.
```

This script is particularly useful before running `pnpm run package` to ensure the build is complete and valid.

### `refactor-imports.ts`

Analyzes TypeScript files for wildcard imports (`import * as moduleName from 'module'`) and suggests specific, named imports. This helps improve code clarity and can reduce bundle sizes by only importing what's necessary.

**Usage:**

```bash
tsx scripts/refactor-imports.ts
```

**Features:**

- Processes a predefined list of files.
- Identifies wildcard imports for `fs`, `path`, and `vscode` modules.
- Lists the specific functions/methods used from these modules.
- Suggests the correct named import syntax.
- Provides a summary of how many files contain wildcard imports.

**Example Output:**

```text
🔍 Analyzing wildcard import usage...

📁 src/core/memoryBankServiceCore.ts
   fs: readFile, writeFile, stat, mkdir
   suggested: import { readFile, writeFile, stat, mkdir } from "node:fs/promises";
   path: resolve, join, dirname
   suggested: import { resolve, join, dirname } from "node:path";

...

✅ Analysis complete! Use the suggested imports to refactor manually.

📊 Summary: X/Y files have wildcard imports
```

This script helps maintain clean import statements and encourages a more explicit style of dependency management within the TypeScript codebase.

### `update-docs-date.ts`

Automatically updates "Last updated" timestamps in markdown documentation files throughout the project.

**Usage:**

```bash
pnpm run update-docs-date
```

**Features:**

- Recursively scans all markdown files in the project
- Updates various date patterns:
  - `_Last updated: YYYY-MM-DD_`
  - `_Last updated: YYYY-MM-DD 🐹_`
  - `Last updated: YYYY-MM-DD`
- Excludes sensitive directories:
  - `memory-bank/` (user-managed content)
  - `src/lib/rules/` (user-managed rules)
  - `node_modules/`, `.git/`, `dist/`, etc.
- Provides detailed feedback on which files were updated
- Uses current system date in YYYY-MM-DD format

**Example Output:**

```text
🔄 Updating documentation dates...
📅 Current date: 2025-05-25
📄 Found 1626 markdown files

✅ Updated: README.md
✅ Updated: docs/guides/QUICKSTART.md
...

🎉 Complete! Updated 21 files out of 1626 total.
```

**Safety Features:**

- Only updates files that actually contain date patterns
- Preserves all other content unchanged
- Skips excluded directories to protect user content
- Provides clear feedback on what was changed

This script is particularly useful before releases or when updating documentation to ensure all timestamps are current and consistent.
