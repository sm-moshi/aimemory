# Phase 1: MCP Transport (STDIO-first)

## Goal

Switch all communication between MCP and Cursor to use standard input/output streams (`stdio`) instead of HTTP/SSE.

## Steps

1. **✅ Remove Express/HTTP logic**
   - ✅ **COMPLETED**: Removed `express` dependencies from package.json
   - ✅ **COMPLETED**: Added deprecation notice to `src/mcp/mcpServer.ts` (kept for reference)
   - ✅ **COMPLETED**: Extension now uses STDIO transport exclusively

2. **✅ Add `StdioServerTransport`**
   - ✅ **COMPLETED**: Already implemented in `src/mcp/mcpServerCli.ts`
   - ✅ **Correct import**: Using official MCP SDK:

     ```ts
     import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
     ```

   - ✅ **Transport creation**:

     ```ts
     const transport = new StdioServerTransport();
     server.connect(transport);
     ```

3. **✅ Update `.cursor/mcp.json`**
   - ✅ **COMPLETED**: Configuration updated for STDIO transport:

     ```json
     {
       "mcpServers": {
         "ai-memory": {
           "command": "node",
           "args": ["dist/index.js"]
         }
       }
     }
     ```

4. **✅ Test with Cursor 0.50+**
   - ✅ **COMPLETED**: STDIO transport verified working
   - ✅ **COMPLETED**: Extension builds and runs without Express dependencies

5. **✅ Remove fallback HTTP support**
   - ✅ **COMPLETED**: Express server deprecated and marked for reference only
   - ✅ **COMPLETED**: Extension uses STDIO transport exclusively, no HTTP fallback

## Notes

- Cursor 0.50+ uses `stdio` by default.
- This unlocks faster startup and improved diagnostics routing.

## ✅ Phase 1 Status: **100% Complete**

> **Overall Progress: 5/5 steps completed**

✅ **Express removal**: Dependencies removed, server deprecated, extension uses STDIO only
✅ **STDIO transport**: Properly implemented with official MCP TypeScript SDK
✅ **Configuration**: Updated for STDIO transport compatibility
✅ **Testing**: Build system verified, extension runs without Express dependencies
✅ **Documentation**: All references updated to reflect STDIO-only design

**Completed work:**

- ✅ Removed Express server dependencies from `package.json`
- ✅ Updated extension to use STDIO transport exclusively via `MemoryBankMCPAdapter`
- ✅ Deprecated Express server with reference notice in `src/mcp/mcpServer.ts`
- ✅ Removed transport selection logic and HTTP health checking
- ✅ Verified build system compatibility and clean TypeScript compilation

**Result**: Phase 1 MCP Transport migration is complete! Extension now uses STDIO transport exclusively with a cleaner, simpler architecture.
