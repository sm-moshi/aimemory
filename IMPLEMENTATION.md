# AI Memory MCP Implementation Guide (v0.1.0 Target)

This document outlines the implementation of the AI Memory extension, targeting v0.1.0 features, using the Model Context Protocol (MCP) SDK.

## Architecture

The AI Memory extension consists of the following core components:

1. **MemoryBankService (`src/memoryBank.ts`)**: Manages the *modular* memory bank files (`core/`, `systemPatterns/`, `techContext/`, `progress/` subfolders) on disk. All file operations are now async and robust, with explicit readiness checks and error handling. Includes logic for migrating older flat structures to the new modular format with user consent.
2. **MemoryBankMCPServer (`src/mcpServer.ts`)**: Implements the MCP server using the MCP SDK. Exposes the modular memory bank via resources and tools. All endpoints/tools check memory-bank readiness and fail gracefully if not initialised. Automatic port failover and robust error handling are included.
3. **CommandHandler (`src/commandHandler.ts`)**: Processes direct `/memory` commands in Cursor, primarily providing status and delegating actions to MCP tools.
4. **WebviewManager (`src/webviewManager.ts`)**: Manages the dashboard webview. Now features "Initialize Memory Bank" and "Update Memory Bank" buttons for direct user interaction, with clear feedback and error handling. CSP and asset loading issues have been addressed.
5. **Extension (`src/extension.ts`)**: The main VSCode/Cursor extension entry point. Handles activation, initiates memory bank migration checks, starts the MCP server, registers commands, and manages the webview.

## New Webview UI Controls (2024-05-09)

- **Initialize Memory Bank**: Button in the webview to initialise the memory bank, creating all required files and structure. Calls the `initialize-memory-bank` MCP tool and displays feedback.
- **Update Memory Bank**: Button in the webview to update any memory bank file. Prompts for file type and content, then calls the `update-memory-bank-file` MCP tool. Feedback is shown in the UI.
- **Feedback & Error Handling**: All actions provide clear feedback and robust error messages, so users always know the state of their memory bank.

## Implementation Steps

### 1. Install Dependencies

```bash
npm install @modelcontextprotocol/sdk zod express cors
npm install --save-dev @types/express @types/cors
```

### 2. Define Types (`src/types.ts`)

Defines core types like `MemoryBankFileType` (for core files, may need updates for modular access), `MemoryBankFile`, and the `MemoryBank` interface.

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
- Features "Initialize Memory Bank" and "Update Memory Bank" buttons for direct user interaction.
- CSP and asset loading issues have been addressed.

### 8. Configure Build System (`esbuild.js`)

Ensures correct bundling, external dependencies, and asset copying.

```javascript
external: [
  'vscode',
  'express',
  'cors',
  'zod',
  '@modelcontextprotocol/sdk'
],
```

## Connection Flow

1. User activates the extension (e.g., runs "AI Memory: Start MCP" or on VS Code startup).
2. `extension.ts` instantiates `MemoryBankService` and checks for/handles migration.
3. `extension.ts` starts the `MemoryBankMCPServer` (default port 7331, fallback 7332).
4. Server sets up HTTP routes, MCP resources/tools for the modular bank, and SSE endpoint.
5. Cursor connects to the MCP server.
6. User interacts via Cursor AI (using MCP) or the Webview Dashboard (if functional).
7. User can now initialise or update the memory bank directly from the webview.

## Testing

To test the extension:

1. Start the extension in debug mode.
2. Test migration prompt with flat memory bank structure.
3. Verify modular structure creation in a clean workspace.
4. Run "AI Memory: Start MCP" command.
5. Connect to the MCP server from Cursor.
6. Test MCP resources and tools targeting the modular structure.
7. Open and interact with the Webview Dashboard, using the new buttons for memory bank actions.
8. Use `/memory` commands for status checks.

## Troubleshooting

- **MCP Connection/Timeout Issues:** The server (`src/mcpServer.ts`) may experience timeouts or connection resets. Check server logs and the recovery plan for planned fixes (e.g., keep-alive, error handling).
- **Blank Webview Dashboard:** Caused by Content Security Policy (CSP) issues or asset loading problems (`src/webviewManager.ts`). CSP headers, nonce, and local paths have been addressed.
- **Port Conflicts:** If default port 7331 is unavailable, the server will attempt fallback port 7332.
- **Memory Bank Issues:** Ensure the `memory-bank/` folder (with modular structure) exists in the workspace root. Check logs for file access errors.
- Verify MCP status with `/memory status` (though tool execution might still be unstable).

## Future Enhancements (Post-Recovery)

- Further refine modular memory bank tools (e.g., accessing specific module files).
- Implement version control integration for the memory bank.
- Support remote memory banks.
- Add visualization tools for memory bank relationships (potentially via the webview).
- Improve robustness and error handling for all components.

---

_Last updated: 2024-05-09_
