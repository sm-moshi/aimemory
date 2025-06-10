#!/usr/bin/env node

/**
 * MCP Transport - Consolidated MCP Transport Implementation
 *
 * This module consolidates all MCP transport functionality including:
 * - CLI entry point for STDIO transport
 * - Transport layer logic and protocols
 * - Communication management
 *
 * Consolidated from:
 * - src/mcp/mcpServerCliEntry.ts
 */

import { MCPServerCLI } from "./server";

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

/**
 * Main entry point for the CLI MCP server
 * Handles STDIO transport initialization and connection
 */
function main(): void {
	try {
		// Create server instance from command line arguments
		const server = MCPServerCLI.fromCommandLineArgs();

		// Connect to STDIO transport
		server.connect();

		console.error("[MCPServerCLI] Server started successfully and connected to STDIO transport");
	} catch (error) {
		console.error(
			`[MCPServerCLI] Failed to start server: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	}
}

// ============================================================================
// TRANSPORT UTILITIES AND HELPERS
// ============================================================================

/**
 * Transport configuration interface
 */
export interface TransportConfig {
	type: "stdio" | "websocket" | "http";
	options?: Record<string, unknown>;
}

/**
 * Creates appropriate transport based on configuration
 */
export function createTransport(config: TransportConfig) {
	switch (config.type) {
		case "stdio":
			// STDIO transport is handled by MCPServerCLI.connect()
			return { type: "stdio" as const };
		case "websocket":
		case "http":
			// Future transport types - not implemented yet
			throw new Error(`Transport type '${config.type}' not yet implemented`);
		default:
			throw new Error(`Unknown transport type: ${config.type}`);
	}
}

/**
 * Transport factory function for creating CLI servers with STDIO transport
 */
export function createSTDIOServer(workspacePath?: string): MCPServerCLI {
	return workspacePath
		? MCPServerCLI.fromCommandLineArgs([process.argv[0] ?? "node", process.argv[1] ?? "", workspacePath])
		: MCPServerCLI.fromCommandLineArgs();
}

// ============================================================================
// MODULE ENTRY POINT
// ============================================================================

// Only run if this is the main module (CLI execution)
// Handle both ESM and CommonJS builds
const isMainModule =
	typeof require !== "undefined" ? require.main === module : import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
	main();
}

// Export for use as a module
export { main, MCPServerCLI };
