/**
 * Shared Cursor Config Helpers
 *
 * Utilities to reduce complexity in Cursor MCP configuration management.
 * Handles file operations, config comparison, and error handling patterns.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { window } from "vscode";
import type { FileOperationManager } from "../core/file-operations";
import { createLogger } from "../lib/logging";
import type { ConfigComparisonResult, CursorMCPConfig, CursorMCPServerConfig } from "../types";
import type { LogContext, Logger } from "../types/logging";

import { validateWorkspace } from "../utils/process-helpers";

/**
 * Ensures the .cursor directory exists in the user's home directory.
 * If successful, returns the path to the .cursor directory.
 * If an unexpected error occurs during directory creation (other than it already existing),
 * the error is logged and rethrown.
 */
export async function ensureCursorDirectory(
	_fileOperationManager: FileOperationManager,
	loggerOverride?: Logger,
): Promise<string> {
	const homeDir = homedir();
	const cursorDir = join(homeDir, ".cursor");
	const logger = loggerOverride ?? createLogger();

	try {
		// Use direct filesystem operations for system directories like .cursor
		// This bypasses memory bank path validation which is not appropriate for system paths
		const fs = await import("node:fs/promises");
		await fs.mkdir(cursorDir, { recursive: true });
		logger.debug(`Ensured .cursor directory exists: ${cursorDir}`);
		return cursorDir;
	} catch (error) {
		// Only throw if it's not an "already exists" error
		if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
			logger.debug(`Cursor directory already exists: ${cursorDir}`);
			return cursorDir;
		}

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
export async function readCursorMCPConfig(_fileOperationManager: FileOperationManager): Promise<CursorMCPConfig> {
	const homeDir = homedir();
	const mcpConfigPath = join(homeDir, ".cursor", "mcp.json");
	const defaultConfig: CursorMCPConfig = { mcpServers: {} };
	const logger = createLogger();

	try {
		// Use direct filesystem operations for system configuration files
		// This bypasses memory bank path validation which is not appropriate for system files
		const fs = await import("node:fs/promises");
		const configContent = await fs.readFile(mcpConfigPath, "utf-8");
		const config = JSON.parse(configContent) as CursorMCPConfig;
		logger.debug(`Successfully read Cursor MCP config: ${mcpConfigPath}`);
		return config;
	} catch (error) {
		// If file doesn't exist, return default config
		if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
			logger.debug(`Cursor MCP config file not found, using default: ${mcpConfigPath}`);
			return defaultConfig;
		}

		// For other errors, log and return default
		logger.warn("Failed to read Cursor MCP config file, using default", {
			operation: "readCursorMCPConfig",
			path: mcpConfigPath,
			error: error instanceof Error ? error.message : String(error),
		});
		return defaultConfig;
	}
}

/**
 * Writes the Cursor MCP configuration file
 * Standardizes config writing with proper formatting
 */
export async function writeCursorMCPConfig(
	config: CursorMCPConfig,
	_fileOperationManager: FileOperationManager,
): Promise<void> {
	const homeDir = homedir();
	const mcpConfigPath = join(homeDir, ".cursor", "mcp.json");
	const logger = createLogger();

	try {
		// Use direct filesystem operations for system configuration files
		// This bypasses memory bank path validation which is not appropriate for system files
		const fs = await import("node:fs/promises");
		const configJson = JSON.stringify(config, null, 2);
		await fs.writeFile(mcpConfigPath, configJson, "utf-8");
		logger.debug(`Successfully wrote Cursor MCP config: ${mcpConfigPath}`);
	} catch (error) {
		logger.error("Failed to write Cursor MCP config file", {
			operation: "writeCursorMCPConfig",
			path: mcpConfigPath,
			error: error instanceof Error ? error.message : String(error),
		});
		throw new Error(
			`Failed to write config file ${mcpConfigPath}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Creates the AI Memory server configuration for Cursor MCP.
 * This configuration tells Cursor how to run the AI Memory MCP server.
 * Uses the installed extension path, not the development workspace path.
 */
export function createAIMemoryServerConfig(workspacePath: string, extensionPath?: string): CursorMCPServerConfig {
	// If extensionPath is provided (running from VS Code extension), use it
	// Otherwise fall back to workspace path (development mode)
	const serverScriptPath = extensionPath
		? join(extensionPath, "dist", "index.cjs")
		: join(workspacePath, "dist", "index.cjs");

	return {
		name: "AI Memory",
		command: "node",
		args: [serverScriptPath, "--workspace", workspacePath],
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
export async function updateCursorMCPServerConfig(
	fileOperationManager: FileOperationManager,
	extensionPath?: string,
): Promise<void> {
	const logger = createLogger();

	try {
		// Validate workspace and get path
		const workspacePath = validateWorkspace(logger);

		// Ensure .cursor directory exists
		await ensureCursorDirectory(fileOperationManager);

		// Read existing configuration
		const existingConfig = await readCursorMCPConfig(fileOperationManager);
		existingConfig.mcpServers ??= {};

		// Create our server configuration with extension path
		const ourServerConfig = createAIMemoryServerConfig(workspacePath, extensionPath);

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
