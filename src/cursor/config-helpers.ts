/**
 * Shared Cursor Config Helpers
 *
 * Utilities to reduce complexity in Cursor MCP configuration management.
 * Handles file operations, config comparison, and error handling patterns.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { window } from "vscode";
import type { FileOperationManager } from "../core/FileOperationManager";
import type { ConfigComparisonResult, CursorMCPConfig, CursorMCPServerConfig } from "../types/config";
import type { LogContext, Logger } from "../types/logging";
import {
	ensureDirectory as genericEnsureDirectory,
	readJsonFile as genericReadJsonFile,
	writeJsonFile as genericWriteJsonFile,
} from "../utils/helpers";
import { createLogger } from "../utils/logging";
import { validateWorkspace } from "../utils/system/process-helpers";

/**
 * Ensures the .cursor directory exists in the user's home directory.
 * If successful, returns the path to the .cursor directory.
 * If an unexpected error occurs during directory creation (other than it already existing),
 * the error is logged and rethrown.
 */
export async function ensureCursorDirectory(
	fileOperationManager: FileOperationManager,
	loggerOverride?: Logger,
): Promise<string> {
	const homeDir = homedir();
	const cursorDir = join(homeDir, ".cursor");
	const logger = loggerOverride ?? createLogger();
	try {
		const loggerAdapter: Logger = {
			error: (message: string, context?: unknown) => logger.error(message, context ? { context } : undefined),
			warn: (message: string, context?: unknown) => logger.warn(message, context ? { context } : undefined),
			info: (message: string, context?: unknown) => logger.info(message, context ? { context } : undefined),
			debug: (message: string, context?: unknown) => logger.debug(message, context ? { context } : undefined),
			trace: (message: string, context?: unknown) => logger.debug(message, context ? { context } : undefined), // VS Code logger doesn't have trace, map to debug
			setLevel: () => {
				/* no-op */
			},
		};
		return await genericEnsureDirectory(cursorDir, fileOperationManager, loggerAdapter);
	} catch (error) {
		const context: LogContext = {
			operation: "ensureCursorDirectory",
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		};
		logger.error("Unexpected error creating .cursor directory", context);
		throw error;
	}
}

/**
 * Reads and parses the Cursor MCP configuration file
 */
export async function readCursorMCPConfig(fileOperationManager: FileOperationManager): Promise<CursorMCPConfig> {
	const homeDir = homedir();
	const mcpConfigPath = join(homeDir, ".cursor", "mcp.json");
	const defaultConfig: CursorMCPConfig = { mcpServers: {} };
	const logger = createLogger();
	const loggerAdapter: Logger = {
		error: (message: string, context?: unknown) => logger.error(message, context ? { context } : undefined),
		warn: (message: string, context?: unknown) => logger.warn(message, context ? { context } : undefined),
		info: (message: string, context?: unknown) => logger.info(message, context ? { context } : undefined),
		debug: (message: string, context?: unknown) => logger.debug(message, context ? { context } : undefined),
		trace: (message: string, context?: unknown) => logger.debug(message, context ? { context } : undefined), // VS Code logger doesn't have trace, map to debug
		setLevel: () => {
			/* no-op */
		},
	};
	return genericReadJsonFile<CursorMCPConfig>(mcpConfigPath, fileOperationManager, loggerAdapter, defaultConfig);
}

/**
 * Writes the Cursor MCP configuration file
 * Standardizes config writing with proper formatting
 */
export async function writeCursorMCPConfig(
	config: CursorMCPConfig,
	fileOperationManager: FileOperationManager,
): Promise<void> {
	const homeDir = homedir();
	const mcpConfigPath = join(homeDir, ".cursor", "mcp.json");
	return genericWriteJsonFile(mcpConfigPath, config, fileOperationManager);
}

/**
 * Creates the AI Memory server configuration for Cursor MCP.
 * This configuration tells Cursor how to run the AI Memory MCP server.
 */
export function createAIMemoryServerConfig(workspacePath: string): CursorMCPServerConfig {
	return {
		name: "AI Memory",
		command: "node",
		args: [join(workspacePath, "dist", "mcp-server"), "--workspace", workspacePath],
		cwd: workspacePath,
	};
}

/**
 * Compares two server configurations for equivalence
 */
export function compareServerConfigs(
	config1: CursorMCPServerConfig,
	config2: CursorMCPServerConfig,
): ConfigComparisonResult {
	const differences: string[] = [];

	if (config1.name !== config2.name) {
		differences.push(`name: ${config1.name ?? "undefined"} → ${config2.name ?? "undefined"}`);
	}
	if (config1.command !== config2.command) {
		differences.push(`command: ${config1.command} → ${config2.command}`);
	}

	if (config1.cwd !== config2.cwd) {
		differences.push(`cwd: ${config1.cwd} → ${config2.cwd}`);
	}

	// Ensure args are treated as arrays for comparison
	const args1String = JSON.stringify(config1.args ?? []);
	const args2String = JSON.stringify(config2.args ?? []);
	if (args1String !== args2String) {
		differences.push(`args: ${args1String} → ${args2String}`);
	}

	const matches = differences.length === 0;
	return {
		matches,
		...(differences.length > 0 && { differences }), // Only include if there are differences
	};
}

/**
 * High-level orchestrator for updating Cursor MCP configuration
 */
export async function updateCursorMCPServerConfig(fileOperationManager: FileOperationManager): Promise<void> {
	const logger = createLogger();

	try {
		// Validate workspace and get path
		const workspacePath = validateWorkspace(logger);

		// Ensure .cursor directory exists
		await ensureCursorDirectory(fileOperationManager);

		// Read existing configuration
		const existingConfig = await readCursorMCPConfig(fileOperationManager);
		existingConfig.mcpServers ??= {};

		// Create our server configuration
		const ourServerConfig = createAIMemoryServerConfig(workspacePath);

		// Compare configurations
		const existingServerConfig = existingConfig.mcpServers["AI Memory"];
		const comparison = existingServerConfig
			? compareServerConfigs(existingServerConfig, ourServerConfig)
			: { matches: false, differences: ["Config does not exist"] };

		// Update configuration if needed
		if (!comparison.matches) {
			existingConfig.mcpServers["AI Memory"] = ourServerConfig;
			await writeCursorMCPConfig(existingConfig, fileOperationManager);
			window.showInformationMessage("Cursor MCP config updated for AI Memory (STDIO).");

			if (comparison.differences) {
				logger.info(`Config updated with changes: ${comparison.differences.join(", ")}`);
			}
		} else {
			logger.info("AI Memory server already configured in Cursor MCP config (STDIO).");
		}
	} catch (error) {
		const errorMessage = `Failed to update Cursor MCP config: ${error instanceof Error ? error.message : String(error)}`;
		logger.error(errorMessage);
		window.showErrorMessage(errorMessage);
		throw error;
	}
}
