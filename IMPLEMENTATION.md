# AI Memory MCP Implementation Guide

This document outlines the implementation of the AI Memory extension using the Model Context Protocol (MCP) SDK.

## Architecture

The AI Memory extension consists of the following components:

1. **MemoryBankService**: Manages the memory bank files on disk
2. **MemoryBankMCPServer**: Implements the MCP server using the MCP SDK
3. **CommandHandler**: Processes direct `/memory` commands in Cursor
4. **Extension**: The main VSCode/Cursor extension entry point

## Implementation Steps

### 1. Install Dependencies

```bash
npm install @modelcontextprotocol/sdk zod express cors
npm install --save-dev @types/express @types/cors
```

### 2. Define Types

In `src/types.ts`:

```typescript
export enum MemoryBankFileType {
  ProjectBrief = 'projectbrief.md',
  ProductContext = 'productContext.md',
  ActiveContext = 'activeContext.md',
  SystemPatterns = 'systemPatterns.md',
  TechContext = 'techContext.md',
  Progress = 'progress.md',
}

export interface MemoryBankFile {
  type: MemoryBankFileType;
  content: string;
  lastUpdated?: Date;
}

export interface MemoryBank {
  files: Map<MemoryBankFileType, MemoryBankFile>;
  initialize(): Promise<void>;
  getFile(type: MemoryBankFileType): MemoryBankFile | undefined;
  updateFile(type: MemoryBankFileType, content: string): Promise<void>;
  getAllFiles(): MemoryBankFile[];
}
```

### 3. Implement MemoryBankService

In `src/memoryBank.ts`:

```typescript
// Implementation of the MemoryBank interface that manages files on disk
// See the existing implementation which is already adequate
```

### 4. Implement MemoryBankMCPServer

In `src/mcpServer.ts`:

```typescript
// The MCP server implementation that exposes memory bank functionality
// through the Model Context Protocol
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';

// Implementation includes:
// - Creating an MCP server
// - Exposing memory bank files as resources
// - Implementing tools to manipulate memory bank files
// - Creating prompts for common operations
// - Setting up an HTTP server with SSE for MCP communication
```

### 5. Implement CommandHandler

In `src/commandHandler.ts`:

```typescript
// A handler for direct /memory commands
// Provides information about the MCP server status and capabilities
```

### 6. Implement Extension Entry Point

In `src/extension.ts`:

```typescript
// The main VSCode/Cursor extension entry point
// - Activates the extension
// - Creates the MCP server
// - Registers commands
// - Handles cleanup on deactivation
```

### 7. Configure Build System

Update `esbuild.js` to include external dependencies:

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

1. User runs "AI Memory: Start MCP" command
2. Extension starts the MCP server on port 1337 (or 7331 if occupied)
3. Server sets up:
   - HTTP server
   - MCP server with resources, tools, and prompts
   - SSE endpoint for streaming communication
4. Cursor connects to the MCP server
5. User interacts with memory bank through the MCP interface

## Testing

To test the extension:

1. Start the extension in debug mode
2. Run "AI Memory: Start MCP" command
3. Connect to the MCP server from Cursor
4. Test resources, tools, and prompts
5. Use direct `/memory` commands for status checks

## Troubleshooting

- If port 1337 is unavailable, the server will try port 7331
- Check server logs for connection issues
- Verify that the MCP server is running with `/memory status`

## Future Enhancements

- Add more memory bank file types
- Implement version control integration
- Support remote memory banks
- Add visualization tools for memory bank relationships 