/**
 * Shared Cursor Config Helpers
 *
 * Utilities to reduce complexity in Cursor MCP configuration management.
 * Handles file operations, config comparison, and error handling patterns.
 */

import fs from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { window } from "vscode";
import { validateWorkspace } from "../mcp/shared/processHelpers.js";
import type { ConfigComparisonResult, CursorMCPConfig, MCPServerConfig } from "../types/config.js";
import { Logger } from "./log.js";

/**
 * Ensures the .cursor directory exists in the user's home directory.
 * If successful, returns the path to the .cursor directory.
 * If an unexpected error occurs during directory creation (other than it already existing),
 * the error is logged and rethrown.
 */
export async function ensureCursorDirectory(): Promise<string> {
	const homeDir = homedir();
	const cursorDir = join(homeDir, ".cursor");

	try {
		await fs.mkdir(cursorDir, { recursive: true });
		return cursorDir;
	} catch (err) {
		if (err instanceof Error && (err as NodeJS.ErrnoException).code === "EEXIST") {
			// Directory already exists, which is fine.
			Logger.getInstance().debug(".cursor directory already exists.");
			return cursorDir;
		}
		// For other errors, log and rethrow.
		let errorMessage = "Unexpected error creating .cursor directory";
		if (err instanceof Error) {
			errorMessage = `${errorMessage}: ${err.message}`;
			Logger.getInstance().error(errorMessage);
			throw err; // Rethrow the original error
		}
		// If it's not an Error instance, wrap it and throw
		errorMessage = `${errorMessage}: ${String(err)}`;
		Logger.getInstance().error(errorMessage);
		throw new Error(errorMessage);
	}
}

/**
 * Reads and parses the Cursor MCP configuration file
 * Reduces config reading complexity from ~6-7 branches to ~1
 */
export async function readCursorMCPConfig(): Promise<CursorMCPConfig> {
	const homeDir = homedir();
	const mcpConfigPath = join(homeDir, ".cursor", "mcp.json");

	try {
		const fileContent = await fs.readFile(mcpConfigPath, "utf-8");
		return JSON.parse(fileContent) as CursorMCPConfig;
	} catch (err) {
		if (err instanceof Error && (err as NodeJS.ErrnoException).code === "ENOENT") {
			Logger.getInstance().info("MCP config file doesn't exist, will create new one.");
		} else {
			Logger.getInstance().error(
				`MCP config file couldn't be read or parsed (${err instanceof Error ? err.message : String(err)}), creating new one.`,
			);
		}
		return { mcpServers: {} };
	}
}

/**
 * Writes the Cursor MCP configuration file
 * Standardizes config writing with proper formatting
 */
export async function writeCursorMCPConfig(config: CursorMCPConfig): Promise<void> {
	const homeDir = homedir();
	const mcpConfigPath = join(homeDir, ".cursor", "mcp.json");

	await fs.writeFile(mcpConfigPath, JSON.stringify(config, null, 2));
}

/**
 * Creates the AI Memory server configuration for Cursor MCP.
 * This configuration tells Cursor how to run the AI Memory MCP server.
 */
export function createAIMemoryServerConfig(workspacePath: string): MCPServerConfig {
	return {
		name: "AI Memory",
		command: "node",
		args: [join(workspacePath, "dist", "mcp-server.js"), "--workspace", workspacePath],
		cwd: workspacePath,
	};
}

/**
 * Compares two server configurations for equivalence
 */
export function compareServerConfigs(
	config1: MCPServerConfig,
	config2: MCPServerConfig,
): ConfigComparisonResult {
	const differences: string[] = [];

	if (config1.command !== config2.command) {
		differences.push(`command: ${config1.command} → ${config2.command}`);
	}

	if (config1.cwd !== config2.cwd) {
		differences.push(`cwd: ${config1.cwd} → ${config2.cwd}`);
	}

	if (JSON.stringify(config1.args) !== JSON.stringify(config2.args)) {
		differences.push(`args: ${JSON.stringify(config1.args)} → ${JSON.stringify(config2.args)}`);
	}

	return {
		matches: differences.length === 0,
		differences: differences.length > 0 ? differences : undefined,
	};
}

/**
 * High-level orchestrator for updating Cursor MCP configuration
 * Reduces updateCursorMCPConfig complexity from ~21 to ~5-6 complexity points
 */
export async function updateCursorMCPServerConfig(): Promise<void> {
	const logger = Logger.getInstance();

	try {
		// Validate workspace and get path
		const workspacePath = validateWorkspace(logger);

		// Ensure .cursor directory exists
		await ensureCursorDirectory();

		// Read existing configuration
		const existingConfig = await readCursorMCPConfig();
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
			await writeCursorMCPConfig(existingConfig);
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
