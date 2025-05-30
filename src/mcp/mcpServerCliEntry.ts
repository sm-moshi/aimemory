#!/usr/bin/env node

/**
 * Clean CLI entry point for the MCP Server
 *
 * This replaces the original mcpServerCli.ts script with a proper
 * class-based implementation that supports dependency injection
 * and better testability.
 */

import { MCPServerCLI } from "./mcpServerCliClass.js";

/**
 * Main entry point for the CLI MCP server
 */
function main(): void {
	try {
		// Create server instance from command line arguments
		const server = MCPServerCLI.fromCommandLineArgs();

		// Connect to STDIO transport
		server.connect();

		console.error(
			"[MCPServerCLI] Server started successfully and connected to STDIO transport",
		);
	} catch (error) {
		console.error(
			`[MCPServerCLI] Failed to start server: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	}
}

// Only run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
