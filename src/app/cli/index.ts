#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { program } from "commander";
import { createConsoleLogger } from "../../lib/utils";
import { CoreMemoryBankMCP } from "../../mcp/coreMemoryBankMCP";

program
	.version("0.8.0-dev.5")
	.option("--port <port>", "Port to run the server on", "7331")
	.option("--stdio", "Use STDIO for transport", false)
	.option("--workspace <path>", "Workspace path", process.cwd())
	.option("--debug", "Enable debug mode", false)
	.parse(process.argv);

async function main() {
	try {
		const logger = createConsoleLogger();
		const mcp = new CoreMemoryBankMCP({ memoryBankPath: process.cwd(), logger });
		const server = mcp.getServer();
		const stdioTransport = new StdioServerTransport();
		await server.connect(stdioTransport);

		if (process.env.VITEST === undefined) {
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
