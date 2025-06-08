# AI Memory Extension - Detailed Refactoring Plan

**Date:** 2025-06-08
**Current:** 55 TypeScript files → **Target:** 22 files (~60% reduction)

## 📋 Current State Audit

### Current File Count by Category

- **Total TypeScript files**: 55 (excluding tests/webview)
- **Core files**: 5 (`src/core/`)
- **MCP files**: 6 (`src/mcp/` + `src/mcp/shared/`)
- **Type files**: 11 (`src/types/`)
- **Utility files**: 5 (`src/utils/` + subdirs)
- **Extension files**: 2 (`src/app/extension/`)
- **Cursor files**: 7 (`src/cursor/`)
- **Template files**: 5 (`src/shared/templates/`)
- **Metadata files**: 5 (`src/metadata/`)
- **Performance files**: 2 (`src/performance/`)
- **Shared files**: 2 (`src/shared/validation/`)
- **CLI files**: 1 (`src/app/cli/`)
- **Entry point**: 1 (`src/extension.ts`)

### Current Import Patterns

- ✅ **Relative imports**: Most files use `./` and `../`
- ⚠️ **Path aliases**: Only one `@/` usage found in `src/types/mcpTypes.ts`
- ✅ **Clean structure**: No complex nested dependencies

---

## 🎯 Refactoring Strategy

### Phase-Based Approach

1. **Phase 1**: Create new consolidated file structure
2. **Phase 2**: Move content and update imports systematically
3. **Phase 3**: Update build configuration
4. **Phase 4**: Validate and cleanup

### Key Principles

- ✅ **No breaking changes** during transition
- ✅ **Incremental migration** with validation at each step
- ✅ **Preserve existing functionality**
- ✅ **Maintain test compatibility**

---

## 📁 **PHASE 1: Create Target Structure**

### Step 1.1: Create New Folder Structure

```bash
# Create new consolidated folders
mkdir -p src/vscode
mkdir -p src/mcp
mkdir -p src/core
mkdir -p src/lib/types
mkdir -p src/templates
```

### Step 1.2: Create Target Files (Empty)

Create empty files with proper exports to avoid import errors:

```bash
# VS Code integration files
touch src/vscode/webview-provider.ts
touch src/vscode/commands.ts
touch src/vscode/workspace.ts

# MCP server files
touch src/mcp/server.ts
touch src/mcp/tools.ts
touch src/mcp/transport.ts

# Core business logic files
touch src/core/memory-bank.ts
touch src/core/file-operations.ts
touch src/core/metadata.ts
touch src/core/cache.ts

# Shared utilities
touch src/lib/types/core.ts
touch src/lib/types/operations.ts
touch src/lib/types/system.ts
touch src/lib/validation.ts
touch src/lib/utils.ts

# Cursor integration
touch src/cursor-integration.ts

# Templates
touch src/templates/core.ts
touch src/templates/tech.ts
touch src/templates/system.ts
touch src/templates/progress.ts
# Note: memory-bank-rules.md will be moved, not recreated
```

---

## 📂 **PHASE 2: Content Migration (File by File)**

### Step 2.1: Migrate Types (Safest First)

#### **Target: `src/lib/types/core.ts`**

**Combine:**

- `src/types/core.ts` (165 lines) → Core types
- `src/types/errorHandling.ts` (138 lines) → Error patterns
- `src/types/logging.ts` (85 lines) → Logging interfaces

**Migration Steps:**

```bash
# 1. Copy content to new file
cat src/types/core.ts > src/lib/types/core.ts
echo "\n// === Error Handling Types ===" >> src/lib/types/core.ts
tail -n +10 src/types/errorHandling.ts >> src/lib/types/core.ts
echo "\n// === Logging Types ===" >> src/lib/types/core.ts
tail -n +10 src/types/logging.ts >> src/lib/types/core.ts

# 2. Add consolidated export
echo "export * from './lib/types/core';" >> src/lib/types/core.ts
```

#### **Target: `src/lib/types/operations.ts`**

**Combine:**

- `src/types/fileOperations.ts` (247 lines) → File operation types
- `src/types/mcpTypes.ts` (135 lines) → MCP interfaces
- `src/types/memoryBankSchemas.ts` (80 lines) → Zod schemas

#### **Target: `src/lib/types/system.ts`**

**Combine:**

- `src/types/system.ts` (275 lines) → Cache & resource types
- `src/types/config.ts` (446 lines) → Configuration types
- `src/types/metadata.ts` (242 lines) → Metadata system types

### Step 2.2: Migrate Utilities

#### **Target: `src/lib/validation.ts`**

**Combine:**

- `src/shared/validation/file-validation.ts` → File validation logic
- `src/shared/validation/index.ts` → Validation exports
- All Zod schemas from `src/types/config.ts` → Schema definitions
- `src/utils/security.ts` → Security validation

#### **Target: `src/lib/utils.ts`**

**Combine:**

- `src/utils/helpers.ts` → Helper functions
- `src/utils/logging.ts` → Logging utilities
- `src/utils/system/process-helpers.ts` → Process utilities
- `src/utils/vscode/ui-helpers.ts` → VS Code UI helpers

### Step 2.3: Migrate Templates

#### **Target: `src/templates/`**

**Move files:**

```bash
# Move template files
mv src/shared/templates/core-templates.ts src/templates/core.ts
mv src/shared/templates/tech-templates.ts src/templates/tech.ts
mv src/shared/templates/system-templates.ts src/templates/system.ts
mv src/shared/templates/progress-templates.ts src/templates/progress.ts

# Move and rename memory bank rules
mv src/cursor/memory-bank-rules.md src/templates/memory-bank-rules.md

# Create index file
cat > src/templates/index.ts << 'EOF'
export * from './core';
export * from './tech';
export * from './system';
export * from './progress';
EOF
```

### Step 2.4: Migrate Core Business Logic

#### **Target: `src/core/memory-bank.ts`**

**Source:**

- `src/core/memoryBankServiceCore.ts` (main service) → Core memory bank logic

#### **Target: `src/core/cache.ts`**

**Source:**

- `src/core/Cache.ts` → Caching functionality

#### **Target: `src/core/file-operations.ts`**

**Source:**

- `src/core/FileOperationManager.ts` → File operation management

#### **Target: `src/core/streaming.ts`**

**Combine:**

- `src/performance/FileStreamer.ts` → File streaming
- `src/performance/StreamingManager.ts` → Streaming coordination

#### **Target: `src/core/metadata.ts`**

**Combine:**

- `src/metadata/MetadataIndexManager.ts` → Index management
- `src/metadata/MetadataSearchEngine.ts` → Search functionality
- `src/metadata/indexUtils.ts` → Index utilities
- `src/metadata/metadataQueryUtils.ts` → Query utilities
- `src/metadata/index.ts` → Metadata exports

### Step 2.5: Migrate MCP Server Logic

#### **Target: `src/mcp/server.ts`**

**Combine:**

- `src/mcp/mcpServerCliClass.ts` → CLI server implementation
- `src/mcp/shared/baseMcpServer.ts` → Base server functionality
- `src/mcp/mcpAdapter.ts` → MCP adapter logic
- Server registration and lifecycle

#### **Target: `src/mcp/tools.ts`**

**Combine:**

- `src/mcp/coreMemoryBankMCP.ts` → Core MCP tools
- `src/mcp/metadataMemoryBankMCP.ts` → Metadata MCP tools
- `src/mcp/shared/mcpToolHelpers.ts` → Tool helper functions
- `src/mcp/shared/metadataToolRegistrar.ts` → Tool registration

#### **Target: `src/mcp/transport.ts`**

**Combine:**

- `src/mcp/mcpServerCliEntry.ts` → CLI entry point
- Transport layer logic
- Communication protocols

### Step 2.6: Migrate VS Code Integration

#### **Target: `src/vscode/webview-provider.ts`**

**Combine:**

- `src/app/extension/webviewManager.ts` → Webview management
- Webview creation and messaging
- React app integration

#### **Target: `src/vscode/commands.ts`**

**Combine:**

- `src/app/extension/commandHandler.ts` → Command handling
- All VS Code command implementations
- Command registration logic

#### **Target: `src/vscode/workspace.ts`**

**Combine:**

- Workspace detection logic from `src/extension.ts`
- Configuration management
- Extension lifecycle management

### Step 2.7: Migrate Cursor Integration

#### **Target: `src/cursor-integration.ts`**

**Combine:**

- `src/cursor/config.ts` → Cursor configuration
- `src/cursor/config-helpers.ts` → Configuration helpers
- `src/cursor/rules-service.ts` → Rules service
- `src/cursor/rules.ts` → Rules logic
- `src/cursor/mcp-prompts-registry.ts` → Prompts registry
- `src/cursor/mcp-prompts.ts` → Prompts logic

---

## 🔧 **PHASE 3: Update Build Configuration**

### Step 3.1: Update TypeScript Paths

**File: `tsconfig.json`**

```json
{
  "compilerOptions": {
    "paths": {
      "@/lib/*": ["./src/lib/*"],
      "@/core/*": ["./src/core/*"],
      "@/mcp/*": ["./src/mcp/*"],
      "@/vscode/*": ["./src/vscode/*"],
      "@/templates/*": ["./src/templates/*"]
    }
  }
}
```

### Step 3.2: Update Rollup Configuration

**File: `rollup.config.js`**

```javascript
alias({
  entries: [
    { find: /^@\/lib\/(.+)/, replacement: path.resolve(process.cwd(), "src/lib/$1") },
    { find: /^@\/core\/(.+)/, replacement: path.resolve(process.cwd(), "src/core/$1") },
    { find: /^@\/mcp\/(.+)/, replacement: path.resolve(process.cwd(), "src/mcp/$1") },
    { find: /^@\/vscode\/(.+)/, replacement: path.resolve(process.cwd(), "src/vscode/$1") },
    { find: /^@\/templates\/(.+)/, replacement: path.resolve(process.cwd(), "src/templates/$1") },
  ],
}),
```

### Step 3.3: Update Package Copy Rules

```javascript
copyPlugin({
  targets: [
    { src: "src/assets/*", dest: "dist/assets" },
    { src: "src/templates/memory-bank-rules.md", dest: "dist/rules/" }, // Updated path
  ],
}),
```

---

## 🧪 **PHASE 4: Validation & Cleanup**

### Step 4.1: Update Imports Throughout Codebase

#### **Systematic Import Updates**

```bash
# Update extension.ts imports
sed -i 's|from "./app/extension/commandHandler"|from "./vscode/commands"|g' src/extension.ts
sed -i 's|from "./app/extension/webviewManager"|from "./vscode/webview-provider"|g' src/extension.ts
sed -i 's|from "./core"|from "./core/memory-bank"|g' src/extension.ts

# Update all remaining relative imports to use new structure
find src/ -name "*.ts" -exec sed -i 's|../types/|../lib/types/|g' {} \;
find src/ -name "*.ts" -exec sed -i 's|./types/|./lib/types/|g' {} \;
```

#### **Update Test Files**

```bash
# Update test imports to new structure
find src/test/ -name "*.ts" -exec sed -i 's|../../types/|../../lib/types/|g' {} \;
find src/test/ -name "*.ts" -exec sed -i 's|../types/|../lib/types/|g' {} \;
```

### Step 4.2: Validation Commands

```bash
# Type checking
pnpm type-check

# Build validation
pnpm build

# Test validation
pnpm test

# Linting
pnpm lint
```

### Step 4.3: Remove Old Files

**Only after validation passes:**

```bash
# Remove old folders (be very careful!)
rm -rf src/app/
rm -rf src/shared/
rm -rf src/utils/
rm -rf src/metadata/
rm -rf src/performance/
rm -rf src/cursor/
rm -rf src/types/

# Remove old empty directories
find src/ -type d -empty -delete
```

---

## 🔧 **Build System & Software Stack Changes**

### **Configuration Updates Required**

The consolidation requires systematic updates across all build configuration files to align with the new 22-file structure.

#### **Path Alias Simplification**

**Current Configuration (6 aliases):**

```javascript
// rollup.config.js & tsconfig.json & vitest.config.ts
"@/*": ["src/*"],
"@utils/*": ["src/utils/*"],     // → Consolidated into @/lib/*
"@types/*": ["src/types/*"],     // → Consolidated into @/lib/types/*
"@core/*": ["src/core/*"],       // → Remains as @/core/*
"@mcp/*": ["src/mcp/*"],         // → Remains as @/mcp/*
"@test-utils/*": ["src/test/test-utils/*"] // → Remains for testing
```

**New Configuration (5 aliases):**

```javascript
// Simplified and cleaner
"@/lib/*": ["src/lib/*"],        // All utilities and types
"@/core/*": ["src/core/*"],      // Business logic
"@/mcp/*": ["src/mcp/*"],        // MCP server logic
"@/vscode/*": ["src/vscode/*"],  // VS Code integration
"@/templates/*": ["src/templates/*"] // Templates
```

#### **TypeScript Configuration Updates**

**File: `tsconfig.json`**

```json
{
  "compilerOptions": {
    "paths": {
      "vscode": ["src/test/__mocks__/vscode.ts"],
      "@/lib/*": ["src/lib/*"],
      "@/core/*": ["src/core/*"],
      "@/mcp/*": ["src/mcp/*"],
      "@/vscode/*": ["src/vscode/*"],
      "@/templates/*": ["src/templates/*"],
      "@test-utils/*": ["src/test/test-utils/*"]
    }
  }
}
```

#### **Rollup Configuration Updates**

**File: `rollup.config.js`**

```javascript
alias({
  entries: [
    { find: /^@\/lib\/(.+)/, replacement: path.resolve(process.cwd(), "src/lib/$1") },
    { find: /^@\/core\/(.+)/, replacement: path.resolve(process.cwd(), "src/core/$1") },
    { find: /^@\/mcp\/(.+)/, replacement: path.resolve(process.cwd(), "src/mcp/$1") },
    { find: /^@\/vscode\/(.+)/, replacement: path.resolve(process.cwd(), "src/vscode/$1") },
    { find: /^@\/templates\/(.+)/, replacement: path.resolve(process.cwd(), "src/templates/$1") },
    // Keep test-specific aliases
    { find: /^@test-utils\/(.+)/, replacement: path.resolve(process.cwd(), "src/test/test-utils/$1") },
  ],
}),
```

#### **Copy Plugin Updates**

```javascript
copyPlugin({
  targets: [
    { src: "src/assets/*", dest: "dist/assets" },
    { src: "src/templates/memory-bank-rules.md", dest: "dist/rules/" }, // Updated path
  ],
  verbose: isDevelopment,
  hook: "buildStart",
  copyOnce: true,
}),
```

#### **Entry Point Changes**

```javascript
// Update MCP server entry point
{
  input: "src/mcp/transport.ts", // ← Changed from mcpServerCliEntry.ts
  output: {
    file: path.join(outDir, "index.cjs"),
    format: "cjs",
    sourcemap: !isProduction,
    exports: "auto",
  },
  // ... rest of configuration
}
```

#### **Vitest Configuration Updates**

**File: `vitest.config.ts`**

```javascript
resolve: {
  alias: {
    "@/lib": resolve(__dirname, "./src/lib"),
    "@/core": resolve(__dirname, "./src/core"),
    "@/mcp": resolve(__dirname, "./src/mcp"),
    "@/vscode": resolve(__dirname, "./src/vscode"),
    "@/templates": resolve(__dirname, "./src/templates"),
    // Keep test-specific aliases
    "@test-utils": resolve(__dirname, "./src/test/test-utils"),
    vscode: resolve(__dirname, "./src/test/__mocks__/vscode.ts"),
  },
}
```

### **Import Strategy Evolution**

#### **New Import Patterns**

**Within Consolidated Modules (Use Relative):**

```typescript
// Inside src/lib/utils.ts
import { CoreType } from './types/core';     // ✅ Relative within lib/
import { validateInput } from './validation'; // ✅ Close proximity
```

**Between Major Modules (Use Aliases):**

```typescript
// From src/vscode/commands.ts to core
import { MemoryBank } from '@/core/memory-bank'; // ✅ Clear module boundary
import type { McpTool } from '@/mcp/tools';      // ✅ Cross-module reference
```

**Example Migration:**

```typescript
// OLD: Fragmented imports
import { someUtil } from '@utils/helpers';
import { SomeType } from '@types/core';
import { validate } from '@/shared/validation/file-validation';

// NEW: Consolidated imports
import { someUtil } from '@/lib/utils';
import type { SomeType } from '@/lib/types/core';
import { validate } from '@/lib/validation';
```

### **Performance Benefits**

#### **Build Performance Improvements**

- **🚀 58% fewer files**: 55 → 22 TypeScript files to compile
- **⚡ Faster imports**: Fewer path resolution lookups
- **🔥 Improved HMR**: Less complex dependency graph for hot reloads
- **📦 Simpler bundling**: Rollup processes fewer entry points
- **🎯 Faster type checking**: Reduced TypeScript compilation surface

#### **Development Experience Enhancements**

- **🧭 Easier navigation**: 6 main folders vs 15+ scattered folders
- **🔍 Reduced cognitive load**: 40% fewer aliases to remember
- **📝 Cleaner imports**: More predictable import paths
- **🎯 Better IDE support**: Less complex path resolution
- **📊 Simplified bundle analysis**: Logical module groupings

#### **Expected Performance Metrics**

- **Build time reduction**: 20-30% faster due to fewer files
- **Development server**: Faster startup and rebuild cycles
- **Memory usage**: Reduced due to simpler dependency graphs
- **IDE performance**: Better indexing and autocomplete response

### **Testing Configuration Impact**

#### **Coverage Reporting Changes**

- **📊 Broader modules**: Coverage reports show larger files (expected behavior)
- **🎯 Function-level tracking**: More important to track individual function coverage
- **📈 Same total coverage**: Overall coverage percentage should remain similar
- **🔍 Granular reporting**: Focus on method/function coverage within larger modules

#### **Test File Organization**

- **Fewer test files**: Each test file covers more functionality within consolidated modules
- **Logical test grouping**: Tests organized by feature rather than file structure
- **Shared test utilities**: More reusable test helpers across consolidated modules

### **Software Stack Philosophy Shift**

#### **From Micro-Modules to Logical-Modules**

**Previous Approach:**

- Many small, specific files (55 files)
- Deep folder nesting (15+ folders)
- Fragmented functionality across multiple files

**New Approach:**

- Fewer, logically grouped modules (22 files)
- Shallow, function-based organization (6 main folders)
- Cohesive functionality within each module

#### **Alignment with Modern Practices**

- **Industry trend**: Moving toward fewer, more cohesive modules
- **Build tool optimization**: Better suited for modern bundlers
- **Developer experience**: Reduced context switching between files
- **Maintenance efficiency**: Easier to understand and modify related code

---

## ⚠️ **Safety Guidelines**

### Before Each Step

1. **Commit current changes** to git
2. **Run tests** to ensure current state is working
3. **Create backup** of files being modified

### During Migration

1. **One file at a time** - don't bulk change
2. **Validate imports** after each file migration
3. **Test build** after each major section
4. **Keep old files** until validation complete

### Rollback Plan

```bash
# If issues arise, rollback to previous commit
git reset --hard HEAD~1

# Or restore specific files
git checkout HEAD~1 -- src/path/to/problematic-file.ts
```

---

## 📊 **Progress Tracking**

### Phase 1: Structure Creation ✅

- [x] Create folder structure
- [x] Create empty target files
- [x] Add temporary exports

### Phase 2: Content Migration ⏳

- [x] Migrate types (3 files)
- [x] Migrate utilities (2 files)
- [x] Migrate templates (5 files)
- [x] Migrate core logic (4 files)
- [ ] Migrate MCP server (3 files)
- [ ] Migrate VS Code integration (3 files)
- [ ] Migrate Cursor integration (1 file)

### Phase 3: Build Configuration ⏳

- [ ] Update TypeScript paths
- [ ] Update Rollup configuration
- [ ] Update copy rules

### Phase 4: Validation & Cleanup ⏳

- [ ] Update all imports
- [ ] Validate build system
- [ ] Run full test suite
- [ ] Remove old files
- [ ] Final validation

---

## 🎯 **Expected Outcomes**

### File Reduction

- **Before**: 55 TypeScript files
- **After**: 22 TypeScript files
- **Reduction**: ~60% fewer files

### Improved Organization

- ✅ **Logical grouping** by function
- ✅ **Reduced import complexity**
- ✅ **Better maintainability**
- ✅ **Cleaner project structure**

### No Functional Changes

- ✅ **Same functionality** preserved
- ✅ **Same performance** characteristics
- ✅ **Same API** surface
- ✅ **Same test coverage**

---

**Last Updated:** 2025-06-08
**Status:** Ready for Implementation
**Estimated Duration:** 4-6 hours (with careful validation)
