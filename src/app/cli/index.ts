#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { program } from "commander";
import { createLogger } from "../../lib/logging";
import { createCLIServer } from "../../mcp/server";
import { LogLevel } from "../../types/logging";

program
	.version("0.8.0-dev.5")
	.option("--workspace <path>", "Workspace root (defaults to current working directory)")
	.option("--log-level <level>", "Log level: trace|debug|info|warn|error", "info")
	.option("--stdio", "Force stdio transport (default)", false)
	.parse(process.argv);

const cliOpts = program.opts();

async function main() {
	try {
		// Parse log level from flag or environment variable
		const logLevelString =
			(cliOpts.logLevel as string | undefined)?.toLowerCase() ?? process.env.LOG_LEVEL?.toLowerCase();
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
		const workspacePath = cliOpts.workspace ?? process.cwd();
		const mcp = createCLIServer({ memoryBankPath: workspacePath });
		const server = mcp.getServer();
		await server.connect(new StdioServerTransport());

		// Graceful shutdown
		process.once("SIGINT", () => {
			_logger.info("Received SIGINT – shutting down MCP server …");
			process.exit(0);
		});
		process.once("SIGTERM", () => {
			_logger.info("Received SIGTERM – shutting down MCP server …");
			process.exit(0);
		});

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
