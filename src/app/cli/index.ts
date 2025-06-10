#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { program } from "commander";
import { createLogger } from "../../lib/logging";
import { MCPServerCLI } from "../../mcp/server";
import { LogLevel } from "../../types/logging";

program
	.version("0.8.0-dev.5")
	.option("--port <port>", "Port to run the server on", "7331")
	.option("--stdio", "Use STDIO for transport", false)
	.option("--workspace <path>", "Workspace path", process.cwd())
	.option("--debug", "Enable debug mode", false)
	.parse(process.argv);

async function main() {
	try {
		// Parse LOG_LEVEL from environment with proper fallback
		const logLevelString = process.env.LOG_LEVEL?.toLowerCase();
		const logLevel =
			logLevelString === "trace"
				? LogLevel.Trace
				: logLevelString === "debug"
					? LogLevel.Debug
					: logLevelString === "info"
						? LogLevel.Info
						: logLevelString === "warn"
							? LogLevel.Warn
							: logLevelString === "error"
								? LogLevel.Error
								: LogLevel.Info; // Default fallback

		const _logger = createLogger({
			component: "MCPServerCLI",
			level: logLevel,
		});
		const mcp = MCPServerCLI.fromCommandLineArgs([process.argv[0] ?? "node", process.argv[1] ?? "", process.cwd()]);
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
