# AI Memory MCP Implementation Guide (v0.1.0 Target)

*For a high-level overview, see [ROADMAP.md](./ROADMAP.md). For setup, see [QUICKSTART.md](./QUICKSTART.md). For actionable tasks, see [TODO.md](./TODO.md). For troubleshooting, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md). For experimental features, see [EXPERIMENTAL-MCP-PLAN.md](./EXPERIMENTAL-MCP-PLAN.md).*

This document outlines the implementation of the AI Memory extension, targeting v0.1.0 features, using the Model Context Protocol (MCP) SDK.

---

## Architecture Overview

The AI Memory extension consists of the following core components:

1. **MemoryBankService (`src/memoryBank.ts`)**: Manages the *modular* memory bank files (`core/`, `systemPatterns/`, `techContext/`, `progress/` subfolders) on disk. All file operations are async and robust, with explicit readiness checks and error handling. Includes logic for migrating older flat structures to the new modular format with user consent.
2. **MemoryBankMCPServer (`src/mcpServer.ts`)**: Implements the MCP server using the MCP SDK. Exposes the modular memory bank via resources and tools. All endpoints/tools check memory-bank readiness and fail gracefully if not initialised. Automatic port failover and robust error handling are included.
3. **CommandHandler (`src/commandHandler.ts`)**: Processes direct `/memory` commands in Cursor, primarily providing status and delegating actions to MCP tools.
4. **WebviewManager (`src/webviewManager.ts`)**: Manages the dashboard webview. Features "Initialise Memory Bank" and "Update Memory Bank" buttons for direct user interaction, with clear feedback and error handling. CSP and asset loading issues have been addressed.
5. **Extension (`src/extension.ts`)**: The main VSCode/Cursor extension entry point. Handles activation, initiates memory bank migration checks, starts the MCP server, registers commands, and manages the webview.

*For more on the tech stack, see: [Vite Guide](https://vitejs.dev/guide/), [React Docs](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Model Context Protocol](https://modelcontextprotocol.org)*

---

## Webview UI Controls (as of 2024-05-09)

- **Initialise Memory Bank**: Button in the webview to initialise the memory bank, creating all required files and structure. Calls the `initialize-memory-bank` MCP tool and displays feedback.
- **Update Memory Bank**: Button in the webview to update any memory bank file. Prompts for file type and content, then calls the `update-memory-bank-file` MCP tool. Feedback is shown in the UI.
- **Feedback & Error Handling**: All actions provide clear feedback and robust error messages, so users always know the state of their memory bank.

---

## Implementation Steps

### 1. Install Dependencies

```bash
npm install @modelcontextprotocol/sdk zod express cors
npm install --save-dev @types/express @types/cors
```

### 2. Define Types (`src/types.ts`)
- Define core types like `MemoryBankFileType` (for core files, may need updates for modular access), `MemoryBankFile`, and the `MemoryBank` interface.

### 3. Implement MemoryBankService (`src/memoryBank.ts`)
- Manages files within the modular structure (`memory-bank/core/`, `memory-bank/systemPatterns/`, etc.).
- All file operations are async and robust, with readiness checks and error handling.
- Includes `migrateToModularStructureIfNeeded()` called during extension activation.
- Provides methods like `getFile`, `updateFile` (potentially needs path arguments for modular access), `getAllFiles`, `loadFiles`.
- Ensures user consent before migration or overwriting files.

### 4. Implement MemoryBankMCPServer (`src/mcpServer.ts`)
- Creates an MCP server instance.
- Registers resources mapping to the modular memory bank structure (e.g., `memory-bank://core/projectbrief.md`).
- Registers MCP tools (`initialize-memory-bank`, `list-memory-bank-files`, `get-memory-bank-file`, `update-memory-bank-file`) adapted for the modular structure.
- All endpoints/tools check memory-bank readiness and fail gracefully if not initialised.
- Sets up HTTP server with SSE for MCP communication.
- Automatic port failover and robust error handling.

### 5. Implement CommandHandler (`src/commandHandler.ts`)
- Handles `/memory` commands, primarily providing help/status or deferring to MCP tools.
- Needs review for robustness and clear feedback when MCP tools fail.

### 6. Implement Extension Entry Point (`src/extension.ts`)
- Activates the extension.
- Instantiates `MemoryBankService` and calls `migrateToModularStructureIfNeeded()`.
- Creates and manages the `MemoryBankMCPServer` and `WebviewManager` instances.
- Registers all commands (`aimemory.startMCP`, `aimemory.openWebview`, etc.).
- Handles cleanup on deactivation.

### 7. Implement WebviewManager (`src/webviewManager.ts`)
- Creates and manages the webview panel.
- Handles communication between the extension and the webview UI.
- Features "Initialise Memory Bank" and "Update Memory Bank" buttons for direct user interaction.
- CSP and asset loading issues have been addressed.

### 8. Configure Build System (`esbuild.js`)
- Ensures correct bundling, external dependencies, and asset copying.

```javascript
external: [
  'vscode',
  'express',
  'cors',
  'zod',
  '@modelcontextprotocol/sdk'
],
```

---

## Connection Flow

1. User activates the extension (e.g., runs "AI Memory: Start MCP" or on VS Code startup).
2. `extension.ts` instantiates `MemoryBankService` and checks for/handles migration.
3. `extension.ts` starts the `MemoryBankMCPServer` (default port 7331, fallback 7332).
4. Server sets up HTTP routes, MCP resources/tools for the modular bank, and SSE endpoint.
5. Cursor connects to the MCP server.
6. User interacts via Cursor AI (using MCP) or the Webview Dashboard (if functional).
7. User can now initialise or update the memory bank directly from the webview.

---

## Testing

1. Start the extension in debug mode.
2. Test migration prompt with flat memory bank structure.
3. Verify modular structure creation in a clean workspace.
4. Run "AI Memory: Start MCP" command.
5. Connect to the MCP server from Cursor.
6. Test MCP resources and tools targeting the modular structure.
7. Open and interact with the Webview Dashboard, using the new buttons for memory bank actions.
8. Use `/memory` commands for status checks.

---

## Troubleshooting

- For troubleshooting steps and advanced debugging, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

---

## Further Reading & Planning

- For setup and user-facing best practices, see [QUICKSTART.md](./QUICKSTART.md).
- For the project vision and milestones, see [ROADMAP.md](./ROADMAP.md).
- For actionable tasks, see [TODO.md](./TODO.md).
- For advanced/experimental features, see [EXPERIMENTAL-MCP-PLAN.md](./EXPERIMENTAL-MCP-PLAN.md).

---

## Future Enhancements (Post-Recovery)

- Further refine modular memory bank tools (e.g., accessing specific module files).
- Implement version control integration for the memory bank.
- Support remote memory banks.
- Add visualisation tools for memory bank relationships (potentially via the webview).
- Improve robustness and error handling for all components.

---

## Optional: Advanced MCP Implementation Ideas (Experimental)

> The following implementation ideas are based on advanced internal planning for MCP features. These features are **optional** and should be implemented with caution, as previous attempts caused instability. Use for reference and future planning only.

### Chunked File Access
- Add `chunkIndex` parameter to `get-memory-bank-file` tool:
  ```ts
  chunkIndex: z.number().optional()
  // Handler logic:
  const file = memoryBank.getFile(input.filename);
  const content = input.chunkIndex !== undefined
    ? file.getChunk(input.chunkIndex)
    : file.getContent();
  ```

### File Size Status
- Return status based on file size:
  ```ts
  let status: "ok" | "large" | "too_large" = "ok";
  if (file.size > 15000) status = "large";
  if (file.size > 30000) status = "too_large";
  return { content, status };
  ```

### Metadata Tool
- Implement `get-memory-bank-metadata` tool:
  ```ts
  registerTool({
    name: "get-memory-bank-metadata",
    inputSchema: z.object({}),
    outputSchema: z.array(z.object({
      name: z.string(),
      size: z.number(),
      chunkCount: z.number(),
      modifiedAt: z.string(),
    })),
    handler: () => memoryBank.getAllFiles().map(file => ({
      name: file.name,
      size: file.size,
      chunkCount: file.chunkCount,
      modifiedAt: file.modified.toISOString()
    }))
  });
  ```

### Planner Tools
- `/plan` command tool and `getPlanSummary()`:
  ```ts
  // In CommandHandler
  if (args.includes("plan")) {
    const plan = memoryBank.getPlanSummary();
    return `📋 Current Plan:\n\n${plan}`;
  }
  // In MemoryBankService
  getPlanSummary(): string {
    const ctx = this.getFile("core/activeContext.md");
    const roadmap = this.getFile("progress/current.md");
    return extractBulletPoints(ctx.content + "\n" + roadmap.content);
  }
  ```

### Update Plan Tool
- `update-current-plan` tool:
  ```ts
  registerTool({
    name: "update-current-plan",
    inputSchema: z.object({ newPlan: z.string() }),
    outputSchema: z.object({ status: z.string() }),
    handler: async ({ newPlan }) => {
      memoryBank.updateFile("progress/current.md", newPlan, { mode: "replace" });
      return { status: "ok" };
    }
  });
  ```

> See also: [EXPERIMENTAL-MCP-PLAN.md](./EXPERIMENTAL-MCP-PLAN.md) for a step-by-step guide to safely prototyping these features.

---

_Last updated: 2025-05-10_
