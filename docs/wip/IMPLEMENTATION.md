# AI Memory MCP Implementation Guide (v0.3.1 Target)

> _Last updated: 2025-05-18_

_For a high-level overview, see [ROADMAP.md](./ROADMAP.md). For setup, see [QUICKSTART.md](../guides/QUICKSTART.md). For actionable tasks, see [TODO.md](./TODO.md). For troubleshooting, see [TROUBLESHOOTING.md](../guides/TROUBLESHOOTING.md). For experimental features, see [EXPERIMENTAL-MCP-PLAN.md](../experimental/EXPERIMENTAL-MCP-PLAN.md)._

---

## Architecture Overview

The AI Memory extension is now fully modular and Cursor-first, with VS Code compatibility as a bonus. It consists of the following core components:

1. **MemoryBankService (`src/core/memoryBank.ts`)**: Manages the _modular_ memory bank files (`core/`, `systemPatterns/`, `techContext/`, `progress/` subfolders) on disk. All file operations are async and robust, with explicit readiness checks, error handling, and self-healing (auto-creation of missing files/folders). Migration from legacy flat structures is complete.
2. **MemoryBankMCPServer (`src/mcp/mcpServer.ts`)**: Implements the MCP server using the MCP SDK. Exposes the modular memory bank via resources and tools. All endpoints/tools check memory-bank readiness and fail gracefully if not initialised. Automatic port failover and robust error handling are included. (Express removal is in progress; MCP SDK/Node APIs are the target.)
3. **CommandHandler (`src/commandHandler.ts`)**: Processes direct `/memory` commands in Cursor, primarily providing status and delegating actions to MCP tools.
4. **WebviewManager (`src/webview/webviewManager.ts`)**: Manages the dashboard webview. Features "Initialise Memory Bank" and "Update Memory Bank" buttons for direct user interaction, with clear feedback and error handling. CSP and asset loading issues have been addressed.
5. **Extension (`src/extension.ts`)**: The main VSCode/Cursor extension entry point. Handles activation, initiates memory bank checks, starts the MCP server, registers commands, and manages the webview.
6. **MCP CLI/stdio Entrypoint (`src/cli.ts`, `src/mcp/coreMemoryBankMCP.ts`, `src/mcp/mcpServerCli.ts`)**: Provides a Cursor-first, dependency-light CLI for MCP server operation, supporting both HTTP/SSE and stdio transports.

_For more on the tech stack, see: [Vite Guide](https://vitejs.dev/guide/), [React Docs](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Model Context Protocol](https://modelcontextprotocol.org)_

---

## Build & Configuration (as of v0.3.1)

- Build and workspace simplification is now complete:
  - Unified TypeScript configs (single root config, only separate for webview if needed)
  - Streamlined build scripts (esbuild for Node/extension/server, vite for webview)
  - Rationalised ignore files (.npmignore/.vscodeignore minimal, only allow built assets)
- Express removal is still in progress; MCP SDK/Node APIs are the target for all server logic.

---

## Build Tool Alternatives & SWC Integration Plan

### Current Analysis (2025-05-24)

After comprehensive research and documentation analysis, we've evaluated modern JavaScript/TypeScript build tools as alternatives to ESBuild:

#### **Tool Comparison Matrix**

| Tool | Language | Primary Strength | Speed | Ecosystem | Recommended Use |
|------|----------|------------------|--------|-----------|-----------------|
| **ESBuild** | Go | Bundling Speed | ⚡⚡⚡ | Mature | Current (stable) |
| **SWC** | Rust | Compilation Speed | ⚡⚡⚡⚡ | Growing | **Recommended** |
| **Bun Build** | Zig | All-in-One | ⚡⚡⚡⚡ | Emerging | Future consideration |
| **Turbo** | Rust | Monorepo Orchestration | ⚡⚡⚡ | Vercel-backed | Complementary tool |

#### **SWC + Biome: Perfect Compatibility ✅**

**Why this combination works exceptionally well:**

1. **Non-overlapping responsibilities:**
   - **Biome**: Code quality (linting, formatting, static analysis)
   - **SWC**: Build performance (compilation, bundling, transpilation)

2. **Shared philosophy:**
   - Both Rust-based for maximum performance
   - Both aim to replace slower JavaScript-based tools
   - Both support modern TypeScript/JavaScript features

3. **Complementary strengths:**
   - Biome excels at development-time developer experience
   - SWC excels at production build performance

#### **Architecture Flow**

```text
Current:  Source Code → Biome (lint/format) → ESBuild (compile/bundle) → Output
Proposed: Source Code → Biome (lint/format) → SWC (compile/bundle) → Output
```

#### **Performance Benefits**

- **SWC**: 20x faster than Babel, 2-3x faster than ESBuild for TypeScript compilation
- **Biome**: 10x faster than ESLint + Prettier combination
- **Combined**: Significant improvement in both development and production build times

### Migration Plan to SWC

#### **Phase 1: Preparation**

1. Install SWC dependencies:

   ```bash
   pnpm add -D @swc/core @swc/cli
   pnpm remove esbuild esbuild-plugin-copy
   ```

2. Create SWC configuration (`swc.config.js`):

   ```javascript
   module.exports = {
     jsc: {
       parser: {
         syntax: "typescript",
         tsx: true,
         decorators: true,
       },
       target: "es2022",
       loose: false,
       externalHelpers: false,
     },
     module: {
       type: "commonjs",
     },
     minify: true,
   };
   ```

#### **Phase 2: Build Script Migration**

1. Replace `esbuild.js` with `swc.config.js`
2. Update package.json scripts:

   ```json
   {
     "scripts": {
       "build": "pnpm run lint && cd src/webview && pnpm run lint && cd ../.. && pnpm run check-types && swc src --out-dir dist && cd src/webview && pnpm run build",
       "watch:swc": "swc src --out-dir dist --watch"
     }
   }
   ```

#### **Phase 3: Integration Testing**

1. Verify extension builds correctly with SWC
2. Test webview compilation (keep Vite for React)
3. Validate MCP server functionality
4. Performance benchmarking vs current ESBuild setup

#### **Phase 4: Optimization**

1. Fine-tune SWC configuration for VSCode extension requirements
2. Optimize build pipeline for development workflow
3. Update CI/CD pipeline accordingly

### Alternative Considerations

#### **Bun Build (Future Option)**

- **Pros**: Fastest overall, all-in-one solution, growing ecosystem
- **Cons**: Still emerging, potential stability concerns for production
- **Recommendation**: Monitor for future adoption when ecosystem matures

#### **Turbo Integration (Complementary)**

- **Use case**: If project grows into monorepo structure
- **Integration**: Can orchestrate multiple SWC builds across packages
- **Timeline**: Consider for v0.4.0+ if repository structure evolves

### Implementation Priority

**Immediate (v0.3.1)**:

- ✅ Keep current ESBuild + Biome setup (stable, working)
- ✅ Document SWC migration path

**Next Phase (v0.3.2)**:

- 🎯 Implement SWC migration following the plan above
- 🎯 Performance benchmarking and optimization

**Future (v0.4.0+)**:

- 🔮 Evaluate Bun build integration
- 🔮 Consider Turbo for monorepo orchestration if needed

---

## Webview UI Controls (as of 2025-05-13)

- **Initialise Memory Bank**: Button in the webview to initialise the memory bank, creating all required files and structure. Calls the `initialize-memory-bank` MCP tool and displays feedback.
- **Update Memory Bank**: Button in the webview to update any memory bank file. Prompts for file type and content, then calls the `update-memory-bank-file` MCP tool. Feedback is shown in the UI.
- **Repair/Reset Rules**: Buttons for self-healing and rules management, with robust feedback and error handling.
- **Feedback & Error Handling**: All actions provide clear feedback and robust error messages, so users always know the state of their memory bank.

---

## Implementation Steps

### 1. Install Dependencies

```bash
pnpm install @modelcontextprotocol/sdk zod express cors
pnpm add -D @types/express @types/cors
```

### 2. Define Types (`src/types/types.ts`)

- Define core types like `MemoryBankFileType` (for modular files), `MemoryBankFile`, and the `MemoryBank` interface.

### 3. Implement MemoryBankService (`src/core/memoryBank.ts`)

- Manages files within the modular structure (`memory-bank/core/`, `memory-bank/systemPatterns/`, etc.).
- All file operations are async and robust, with readiness checks, error handling, and self-healing.
- Provides methods like `getFile`, `updateFile`, `getAllFiles`, `loadFiles`.

### 4. Implement MemoryBankMCPServer (`src/mcp/mcpServer.ts`)

- Creates an MCP server instance.
- Registers resources mapping to the modular memory bank structure (e.g., `memory-bank://core/projectbrief.md`).
- Registers MCP tools (`initialize-memory-bank`, `list-memory-bank-files`, `get-memory-bank-file`, `update-memory-bank-file`) for the modular structure.
- All endpoints/tools check memory-bank readiness and fail gracefully if not initialised.
- Sets up HTTP server with SSE for MCP communication (Express removal in progress).
- Automatic port failover and robust error handling.

### 5. Implement CommandHandler (`src/commandHandler.ts`)

- Handles `/memory` commands, primarily providing help/status or deferring to MCP tools.
- Provides robust feedback when MCP tools fail.

### 6. Implement Extension Entry Point (`src/extension.ts`)

- Activates the extension.
- Instantiates `MemoryBankMCPServer` and `WebviewManager`.
- Registers all commands (`aimemory.startMCP`, `aimemory.openWebview`, etc.).
- Handles cleanup on deactivation.

### 7. Implement WebviewManager (`src/webview/webviewManager.ts`)

- Creates and manages the webview panel.
- Handles communication between the extension and the webview UI.
- Features "Initialise Memory Bank", "Update Memory Bank", and "Reset Rules" buttons for direct user interaction.
- CSP and asset loading issues have been addressed.

### 8. Configure Build System (`esbuild.js`)

- Ensures correct bundling, external dependencies, and asset copying.

```javascript
external: [
  'vscode',
  'express', // (to be removed after refactor)
  'cors',    // (to be removed after refactor)
  'zod',
  '@modelcontextprotocol/sdk'
],
```

---

## Connection Flow

1. User activates the extension (e.g., runs "AI Memory: Start MCP" or on VS Code startup).
2. `extension.ts` instantiates `MemoryBankMCPServer` and `WebviewManager`.
3. `extension.ts` starts the MCP server (default port 7331, fallback 7332).
4. Server sets up HTTP routes, MCP resources/tools for the modular bank, and SSE endpoint (Express removal in progress).
5. Cursor connects to the MCP server.
6. User interacts via Cursor AI (using MCP) or the Webview Dashboard.
7. User can now initialise, update, or repair the memory bank directly from the webview.

---

## Testing

1. Start the extension in debug mode.
2. Verify modular structure creation in a clean workspace.
3. Run "AI Memory: Start MCP" command.
4. Connect to the MCP server from Cursor.
5. Test MCP resources and tools targeting the modular structure.
6. Open and interact with the Webview Dashboard, using the new buttons for memory bank actions.
7. Use `/memory` commands for status checks.

---

## Troubleshooting

- For troubleshooting steps and advanced debugging, see [TROUBLESHOOTING.md](../guides/TROUBLESHOOTING.md).

---

## Further Reading & Planning

- For setup and user-facing best practices, see [QUICKSTART.md](../guides/QUICKSTART.md).
- For the project vision and milestones, see [ROADMAP.md](./ROADMAP.md).
- For actionable tasks, see [TODO.md](./TODO.md).
- For advanced/experimental features, see [EXPERIMENTAL-MCP-PLAN.md](../experimental/EXPERIMENTAL-MCP-PLAN.md).

---

## Future Enhancements

- Further refine modular memory bank tools (e.g., accessing specific module files).
- Implement version control integration for the memory bank.
- Support remote memory banks.
- Add visualisation tools for memory bank relationships (potentially via the webview).
- Improve robustness and error handling for all components.
- Complete Express removal and migrate to pure MCP SDK/Node APIs for all server logic.

---

## Optional: Advanced MCP Implementation Ideas (Experimental)

> The following implementation ideas are based on advanced internal planning for MCP features. These features are **optional** and should be implemented with caution, as previous attempts caused instability. Use for reference and future planning only.

(See [EXPERIMENTAL-MCP-PLAN.md](../experimental/EXPERIMENTAL-MCP-PLAN.md) for details.)
