/**
 * VS Code Commands - Consolidated Command Management
 *
 * This module consolidates all VS Code command functionality including:
 * - Memory bank command handlers (/memory status, /memory update, etc.)
 * - VS Code extension command registrations (openWebview, updateMCPConfig, etc.)
 * - Command parsing, validation, and result handling
 * - Help text and command documentation
 *
 * Consolidated from:
 * - src/app/extension/commandHandler.ts
 * - Command registration logic from src/extension.ts
 */

import * as vscode from "vscode";
import { formatErrorMessage } from "../lib/helpers";
// Utility imports - updated for consolidated structure
import { createLogger } from "../lib/logging";
// Core dependencies - updated for consolidated structure
import type { Logger, MemoryBankError, MemoryBankFile, MemoryBankFileType, Result } from "../lib/types/core";
import { isError, isSuccess } from "../lib/types/core";
import type { CommandResult, MCPServerInterface } from "../lib/types/operations";

// ============================================================================
// COMMAND RESULT UTILITIES
// ============================================================================

/**
 * Helper functions for creating consistent command results
 */
const createSuccessResult = (message: string): CommandResult => ({
	success: true,
	message,
});

const createErrorResult = (message: string, error?: MemoryBankError): CommandResult => {
	const result: CommandResult = { success: false, message };
	if (error !== undefined) {
		result.error = error;
	}
	return result;
};

// ============================================================================
// FILE CATEGORIZATION UTILITIES
// ============================================================================

/**
 * File categorization for status display
 */
const FILE_CATEGORIES = {
	core: "Core Files",
	systemPatterns: "System Patterns",
	techContext: "Tech Context",
	progress: "Progress",
	legacy: "Legacy Files",
} as const;

const LEGACY_CATEGORY = "legacy";

function categorizeFilesByType(files: MemoryBankFile[]): Record<string, string[]> {
	const categories = Object.keys(FILE_CATEGORIES).reduce(
		(acc, key) => {
			acc[key] = [];
			return acc;
		},
		{} as Record<string, string[]>,
	);

	for (const file of files) {
		const status = `${file.type}: Last updated ${file.lastUpdated ? new Date(file.lastUpdated).toLocaleString() : "never"}`;
		const category = file.type.includes("/") ? file.type.split("/")[0] : LEGACY_CATEGORY;

		if (category && categories[category]) {
			categories[category].push(status);
		} else {
			// Ensure LEGACY_CATEGORY exists
			categories[LEGACY_CATEGORY] ??= [];
			categories[LEGACY_CATEGORY].push(status);
		}
	}

	return categories;
}

function buildStatusDisplay(categories: Record<string, string[]>, selfHealingMsg: string): string {
	let output = "Memory Bank Status: Initialized\n\n";

	if (selfHealingMsg) {
		output += `${selfHealingMsg}\n\n`;
	}

	for (const [key, title] of Object.entries(FILE_CATEGORIES)) {
		const items = categories[key];
		if (items && items.length > 0) {
			output += `${title}:\n${items.join("\n")}\n\n`;
		}
	}

	return output.trim();
}

// ============================================================================
// MEMORY BANK COMMAND HANDLERS
// ============================================================================

async function handleHealthCommand(mcpServer: MCPServerInterface): Promise<CommandResult> {
	const healthResult = await mcpServer.getMemoryBank().checkHealth();

	if (isError(healthResult)) {
		return createErrorResult(formatErrorMessage("Error checking memory bank health", healthResult.error));
	}

	return createSuccessResult(healthResult.data);
}

async function handleInitializeCommand(mcpServer: MCPServerInterface): Promise<CommandResult> {
	try {
		await mcpServer.getMemoryBank().initializeFolders();
		await mcpServer.getMemoryBank().loadFiles();
		return createSuccessResult("Memory bank initialised successfully.");
	} catch (error) {
		return createErrorResult(formatErrorMessage("Error initialising memory bank", error));
	}
}

async function handleUpdateCommand(mcpServer: MCPServerInterface, args: string[]): Promise<CommandResult> {
	if (!args.length) {
		return createErrorResult(
			"Error: /memory update requires a file type argument\nUsage: /memory update <fileType> <content>",
		);
	}

	const fileType = args[0];
	const content = args.slice(1).join(" ");

	if (!fileType) {
		return createErrorResult(
			"Error: /memory update requires a valid file type\nUsage: /memory update <fileType> <content>",
		);
	}

	if (!content) {
		return createErrorResult("Error: /memory update requires content\nUsage: /memory update <fileType> <content>");
	}

	try {
		await mcpServer.updateMemoryBankFile(fileType, content);
		return createSuccessResult(`Successfully updated ${fileType}`);
	} catch (error) {
		return createErrorResult(formatErrorMessage(`Error updating ${fileType}`, error));
	}
}

async function handleWriteCommand(mcpServer: MCPServerInterface, args: string[]): Promise<CommandResult> {
	if (args.length < 2) {
		return createErrorResult(
			"Error: /memory write requires a relative path and content.\nUsage: /memory write <relativePath> <content>",
		);
	}

	const relativePath = args[0];
	const content = args.slice(1).join(" ");

	if (!relativePath) {
		return createErrorResult(
			"Error: /memory write requires a valid relative path\nUsage: /memory write <relativePath> <content>",
		);
	}

	try {
		await mcpServer.getMemoryBank().writeFileByPath(relativePath, content);
		return createSuccessResult(`Successfully wrote to ${relativePath}`);
	} catch (error) {
		return createErrorResult(formatErrorMessage(`Error writing to ${relativePath}`, error));
	}
}

async function handleStatusCommand(mcpServer: MCPServerInterface): Promise<CommandResult> {
	const memoryBank = mcpServer.getMemoryBank();
	const isInitializedResult: Result<boolean, MemoryBankError> = await memoryBank.getIsMemoryBankInitialized();

	if (isError(isInitializedResult)) {
		return createErrorResult(
			formatErrorMessage("Error checking memory bank initialization status", isInitializedResult.error),
		);
	}

	const isInitialized = isInitializedResult.data;

	if (!isInitialized) {
		return createSuccessResult(
			"Memory Bank Status: Not initialized\nUse the initialize-memory-bank tool to set up the memory bank.",
		);
	}

	const loadFilesResult: Result<MemoryBankFileType[], MemoryBankError> = await memoryBank.loadFiles();
	let selfHealingMsg = "";
	if (isSuccess(loadFilesResult)) {
		const successfulResult = loadFilesResult as {
			success: true;
			data: MemoryBankFileType[];
		};
		if (successfulResult.data.length > 0) {
			selfHealingMsg = `\n[Self-healing] Created missing files: ${successfulResult.data.join(", ")}`;
		}
	}

	const files = memoryBank.getAllFiles();
	const categories = categorizeFilesByType(files);
	let statusOutput = buildStatusDisplay(categories, selfHealingMsg);

	if (isError(loadFilesResult)) {
		statusOutput = `${formatErrorMessage("Error loading memory bank files", loadFilesResult.error)}\n\n${statusOutput}`;
	}

	return createSuccessResult(statusOutput);
}

// ============================================================================
// COMMAND HANDLER CLASS
// ============================================================================

/**
 * Handles memory bank commands sent in Cursor AI input
 * Processes commands like /memory status, /memory update, etc.
 */
export class CommandHandler {
	private readonly logger: Logger;

	constructor(private readonly mcpServer: MCPServerInterface) {
		this.logger = createLogger({ component: "CommandHandler" });
	}

	/**
	 * Process a /memory command sent in the Cursor AI input
	 * Format: /memory <command> [args...]
	 */
	async processMemoryCommand(text: string): Promise<string | undefined> {
		if (!text.trim().startsWith("/memory")) {
			return undefined;
		}

		const { command, args } = this.parseMemoryCommand(text);
		if (!command) {
			return this.getHelpText();
		}

		try {
			const result = await this.executeCommand(command, args);
			return result.message;
		} catch (error) {
			this.logger.error("Error processing command", {
				command,
				args: args.join(" "),
				error: error instanceof Error ? error.message : String(error),
				operation: "processMemoryCommand",
			});
			return formatErrorMessage("Error processing command", error);
		}
	}

	/**
	 * Execute the specified command with arguments
	 */
	private async executeCommand(command: string, args: string[]): Promise<CommandResult> {
		switch (command) {
			case "help":
				return createSuccessResult(this.getHelpText());
			case "status":
				return await handleStatusCommand(this.mcpServer);
			case "update":
				return await handleUpdateCommand(this.mcpServer, args);
			case "initialize":
			case "init":
				return await handleInitializeCommand(this.mcpServer);
			case "health":
				return await handleHealthCommand(this.mcpServer);
			case "write":
				return await handleWriteCommand(this.mcpServer, args);
			default:
				return createErrorResult(`Command "${command}" is not supported.\n\n${this.getHelpText()}`);
		}
	}

	/**
	 * Parse the memory command text and extract command and arguments
	 */
	private parseMemoryCommand(text: string): {
		command: string | null;
		args: string[];
	} {
		const parts = text.trim().split(" ");

		if (parts.length < 2) {
			return { command: null, args: [] };
		}

		// Remove the "/memory" part
		parts.shift();

		const command = parts[0];
		const args = parts.slice(1);

		return { command: command ?? null, args };
	}

	/**
	 * Get help text for memory commands
	 */
	private getHelpText(): string {
		return `AI Memory Bank Commands:
/memory help         - Show this help
/memory status       - Check memory bank status
/memory init         - Initialize memory bank
/memory health       - Check memory bank health
/memory update <fileType> <content> - Update a memory bank file
/memory write <path> <content> - Write content to a file by path`;
	}

	/**
	 * Process mode commands like /plan
	 * TODO: This is a placeholder for future plan command functionality
	 */
	async processModesCommand(text: string): Promise<string | undefined> {
		if (!text.trim().startsWith("/plan")) {
			return undefined;
		}

		// Placeholder implementation for /plan command
		return "";
	}
}

// ============================================================================
// VS CODE EXTENSION COMMAND REGISTRATIONS
// ============================================================================

/**
 * Registers all VS Code extension commands
 * Consolidates command registration logic from extension.ts
 */
export function registerExtensionCommands(
	context: vscode.ExtensionContext,
	webviewProvider: { openWebview(): void },
	mcpServer: MCPServerInterface,
	logger: Logger,
): void {
	// Register command disposables with context
	context.subscriptions.push(
		// Open AI Memory webview
		vscode.commands.registerCommand("aimemory.openWebview", () => {
			logger.debug("Opening webview", { operation: "openWebview" });
			webviewProvider.openWebview();
		}),

		// Update Cursor MCP configuration
		vscode.commands.registerCommand("aimemory.updateMCPConfig", async () => {
			try {
				logger.debug("Updating Cursor MCP config", {
					operation: "updateMCPConfig",
				});
				vscode.window.showInformationMessage(
					"Please use the 'Start MCP Server' command which includes MCP config update",
				);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				logger.error("Failed to update Cursor MCP config", {
					error: message,
					operation: "updateMCPConfig",
				});
				vscode.window.showErrorMessage(`Failed to update Cursor MCP config: ${message}`);
			}
		}),

		// Start MCP server
		vscode.commands.registerCommand("aimemory.startMCP", async () => {
			try {
				logger.debug("Starting MCP server", { operation: "startMCPServer" });
				await mcpServer.start();
				vscode.window.showInformationMessage("MCP server started successfully");
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				logger.error("Failed to start MCP server", {
					error: message,
					operation: "startMCPServer",
				});
				vscode.window.showErrorMessage(`Failed to start MCP server: ${message}`);
			}
		}),

		// Stop MCP server
		vscode.commands.registerCommand("aimemory.stopServer", () => {
			try {
				logger.debug("Stopping MCP server", { operation: "stopMCPServer" });
				mcpServer.stop();
				vscode.window.showInformationMessage("MCP server stopped successfully");
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				logger.error("Failed to stop MCP server", {
					error: message,
					operation: "stopMCPServer",
				});
				vscode.window.showErrorMessage(`Failed to stop MCP server: ${message}`);
			}
		}),

		// Set log level
		vscode.commands.registerCommand("aimemory.setLogLevel", async () => {
			const levels = ["trace", "debug", "info", "warning", "error"];
			const selected = await vscode.window.showQuickPick(levels, {
				placeHolder: "Select log level",
			});

			if (selected) {
				const config = vscode.workspace.getConfiguration("aimemory");
				await config.update("logLevel", selected, vscode.ConfigurationTarget.Workspace);
				vscode.window.showInformationMessage(`Log level set to: ${selected}`);
			}
		}),

		// Show output channel
		vscode.commands.registerCommand("aimemory.showOutput", async () => {
			logger.debug("Showing output channel", { operation: "showOutput" });
			try {
				if ("showOutput" in logger && typeof logger.showOutput === "function") {
					await logger.showOutput();
					logger.info("Output channel displayed successfully");
				} else {
					const loggerType = logger.constructor.name || "Unknown";
					logger.error(`Logger type ${loggerType} doesn't support showOutput method`);
					vscode.window.showInformationMessage("AI Memory: Output channel functionality not available");
				}
			} catch (error) {
				logger.error(
					`Failed to show output channel: ${error instanceof Error ? error.message : String(error)}`,
				);
				vscode.window.showErrorMessage(
					`AI Memory: Failed to show output channel - ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}),
	);
}

// ============================================================================
// FACTORY FUNCTIONS AND EXPORTS
// ============================================================================

/**
 * Factory function for creating command handler instances
 */
export function createCommandHandler(mcpServer: MCPServerInterface): CommandHandler {
	return new CommandHandler(mcpServer);
}

// Export types for convenience
export type { CommandResult };
