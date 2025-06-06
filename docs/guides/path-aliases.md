# Path Aliases Implementation Guide

## Overview

The AI Memory Extension uses path aliases to improve import consistency and maintainability throughout the codebase. This eliminates long relative import paths and makes refactoring easier.

## Configured Aliases

### Current Alias Configuration

```typescript
// TypeScript (tsconfig.json)
"paths": {
  "@/*": ["src/*"],
  "@utils/*": ["src/utils/*"],
  "@test-utils/*": ["src/test/test-utils/*"],
  "@types/*": ["src/types/*"],
  "@core/*": ["src/core/*"],
  "@mcp/*": ["src/mcp/*"]
}
```

### Alias Usage Examples

| Alias          | Purpose             | Example Usage                                                            |
| -------------- | ------------------- | ------------------------------------------------------------------------ |
| `@/`           | General src/ access | `import { SomeModule } from "@/shared/templates/core.js"`                |
| `@types/`      | Type definitions    | `import type { MemoryBankFile } from "@types/core.js"`                   |
| `@core/`       | Core services       | `import { MemoryBankServiceCore } from "@core/memoryBankServiceCore.js"` |
| `@utils/`      | Utility functions   | `import { validatePath } from "@utils/security-helpers.js"`              |
| `@mcp/`        | MCP server code     | `import { BaseMCPServer } from "@mcp/baseMCPServer.js"`                  |
| `@test-utils/` | Test utilities      | `import { mockLogger } from "@test-utils/index.js"`                      |

## Configuration Files

### 1. TypeScript Configuration (`tsconfig.json`)

The primary alias definitions are in the TypeScript configuration:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@utils/*": ["src/utils/*"],
      "@test-utils/*": ["src/test/test-utils/*"],
      "@types/*": ["src/types/*"],
      "@core/*": ["src/core/*"],
      "@mcp/*": ["src/mcp/*"]
    }
  }
}
```

### 2. Rollup Configuration (`rollup.config.js`)

For build-time module resolution:

```javascript
alias({
  entries: [
    { find: /^@\/(.+)/, replacement: path.resolve(process.cwd(), "src/$1") },
    { find: /^@utils\/(.+)/, replacement: path.resolve(process.cwd(), "src/utils/$1") },
    { find: /^@test-utils\/(.+)/, replacement: path.resolve(process.cwd(), "src/test/test-utils/$1") },
    { find: /^@types\/(.+)/, replacement: path.resolve(process.cwd(), "src/types/$1") },
    { find: /^@core\/(.+)/, replacement: path.resolve(process.cwd(), "src/core/$1") },
    { find: /^@mcp\/(.+)/, replacement: path.resolve(process.cwd(), "src/mcp/$1") },
  ],
})
```

### 3. Vitest Configuration (`vitest.config.ts`)

For test module resolution:

```typescript
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()], // Automatically picks up tsconfig paths
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@utils": resolve(__dirname, "./src/utils"),
      "@test-utils": resolve(__dirname, "./src/test/test-utils"),
      "@types": resolve(__dirname, "./src/types"),
      "@core": resolve(__dirname, "./src/core"),
      "@mcp": resolve(__dirname, "./src/mcp"),
    },
  },
});
```

## Migration Examples

### Before (Relative Imports)

```typescript
// ❌ Hard to read and fragile
import type { MemoryBankFile } from "../../types/core.js";
import { MemoryBankServiceCore } from "../../core/memoryBankServiceCore.js";
import { validatePath } from "../../utils/security-helpers.js";
import { BaseMCPServer } from "../../mcp/baseMCPServer.js";
```

### After (Path Aliases)

```typescript
// ✅ Clean and maintainable
import type { MemoryBankFile } from "@types/core.js";
import { MemoryBankServiceCore } from "@core/memoryBankServiceCore.js";
import { validatePath } from "@utils/security-helpers.js";
import { BaseMCPServer } from "@mcp/baseMCPServer.js";
```

## Conversion Tools

### Automated Conversion Script

Use the provided script to convert existing relative imports:

```bash
# Convert all TypeScript files
tsx scripts/convert-to-aliases.ts

# Convert specific pattern
tsx scripts/convert-to-aliases.ts "src/core/**/*.ts"

# Convert test files only
tsx scripts/convert-to-aliases.ts "src/test/**/*.ts"
```

### Manual Conversion Guidelines

1. **Type Imports**: Always use `@types/` for type-only imports
2. **Core Services**: Use `@core/` for business logic and services
3. **Utilities**: Use `@utils/` for helper functions and common utilities
4. **MCP Code**: Use `@mcp/` for MCP server implementations
5. **Test Utilities**: Use `@test-utils/` for shared test helpers

## Best Practices

### Do's ✅

- **Use aliases consistently** across the entire codebase
- **Prefer specific aliases** (`@types/`, `@core/`) over general `@/`
- **Update all configurations** when adding new aliases
- **Test both build and type-checking** after alias changes

### Don'ts ❌

- **Don't mix alias styles** in the same file
- **Don't use relative imports** for cross-directory access
- **Don't forget to update** Rollup, TypeScript, and Vitest configs
- **Don't use aliases for same-directory** imports (use relative `./`)

## Directory Structure

```md
src/
├── core/           # @core/* - Core business logic
├── types/          # @types/* - Type definitions
├── utils/          # @utils/* - Utility functions
├── mcp/            # @mcp/* - MCP server code
├── test/
│   └── test-utils/ # @test-utils/* - Test utilities
├── shared/         # @/* - Shared components
├── metadata/       # @/* - Metadata system
└── webview/        # Separate config (not aliased)
```

## Troubleshooting

### Common Issues

1. **Module not found errors**
   - Ensure all three configs (TypeScript, Rollup, Vitest) have matching aliases
   - Check that the file extension (`.js`) is included

2. **IDE not recognizing aliases**
   - Restart TypeScript service: `Cmd/Ctrl + Shift + P` → "TypeScript: Restart TS Server"
   - Verify `tsconfig.json` is correctly configured

3. **Build failures**
   - Check Rollup alias regex patterns match TypeScript paths
   - Ensure all imports use the correct alias format

### Verification Commands

```bash
# Check TypeScript compilation
pnpm check-types

# Test build process
pnpm build:extension

# Run tests with aliases
pnpm test

# Verify specific patterns work
rg "@types/" src/ --type ts
rg "@core/" src/ --type ts
```

## Future Enhancements

### Potential Additional Aliases

- `@app/*` - For application-specific code
- `@shared/*` - For shared utilities and components
- `@metadata/*` - For metadata system components

### Webview Integration

The webview has its own TypeScript configuration and may benefit from similar aliases in the future.

---

> **Last Updated**: 2025-06-06
> **Related**: [Build System Guide](../build-system.md), [Project Structure](../project-structure.md)
