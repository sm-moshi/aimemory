#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CoreMemoryBankMCP } from "./mcp/coreMemoryBankMCP.js";

async function main(testMode = false) {
	try {
		// Use current working directory as memory bank root for now
		const memoryBankPath = process.cwd();
		const mcp = new CoreMemoryBankMCP({ memoryBankPath, logger: console });
		const server = mcp.getServer();
		const stdioTransport = new StdioServerTransport();
		await server.connect(stdioTransport);
		if (!testMode) {
			await new Promise(() => {}); // Never resolves in normal mode
		}
	} catch (err) {
		console.error("[aimemory-mcp] MCP server failed to start:", err);
		process.exit(1);
	}
}

main();

export { main };

// TODO: Add CLI args/env for config, graceful shutdown, etc.
