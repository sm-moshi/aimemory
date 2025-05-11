#!/usr/bin/env node

import { CoreMemoryBankMCP } from "./coreMemoryBankMCP.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

async function main() {
  try {
    // Use current working directory as memory bank root for now
    const memoryBankPath = process.cwd();
    const mcp = new CoreMemoryBankMCP({ memoryBankPath, logger: console });
    const server = mcp.getServer();
    const stdioTransport = new StdioServerTransport();
    await server.connect(stdioTransport);
    // Keep the process alive so Cursor can communicate
    await new Promise(() => {}); // Never resolves
  } catch (err) {
    console.error("[aimemory-mcp] MCP server failed to start:", err);
    process.exit(1);
  }
}

main();

// TODO: Add CLI args/env for config, graceful shutdown, etc.
