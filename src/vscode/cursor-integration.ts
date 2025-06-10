/**
 * VS Code Cursor Integration - VS Code Extension Specific Functions
 *
 * This module contains VS Code-specific cursor integration functionality that
 * requires VS Code APIs and cannot be used in standalone environments.
 */

import { join } from "node:path";
import { type ExtensionContext, FileType, Uri, window, workspace } from "vscode";

// Core imports
import type { FileOperationManager } from "../core/file-operations";
import { createLogger } from "../lib/logging";
import type { Logger } from "../lib/types/core";
import { getWorkspaceRoot } from "./workspace";

// Re-export standalone functions that work in both environments
export {
	compareServerConfigs,
	createAIMemoryServerConfig,
	ensureCursorDirectory,
	INITIALIZE_MEMORY_BANK_PROMPT,
	MEMORY_BANK_ALREADY_INITIALIZED_PROMPT,
	MEMORY_BANK_FILE_MISSING_PROMPT,
	MEMORY_BANK_UPDATE_CONFIRMATION_PROMPT,
	readCursorMCPConfig,
	registerMemoryBankPrompts,
	writeCursorMCPConfig,
} from "../cursor-integration";

/**
 * Updates the Cursor MCP config using VS Code workspace APIs
 */
export async function updateCursorMCPServerConfig(fileOperationManager: FileOperationManager): Promise<void> {
	const logger = createLogger({ component: "CursorMCPConfig" });

	try {
		// Get workspace using VS Code APIs
		const workspaceFolders = workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			throw new Error("No workspace folder found");
		}
		const workspacePath = workspaceFolders[0]?.uri.fsPath;
		if (!workspacePath) {
			throw new Error("No workspace folder found");
		}

		// Import standalone functions from cursor-integration module
		const {
			ensureCursorDirectory,
			readCursorMCPConfig,
			writeCursorMCPConfig,
			createAIMemoryServerConfig,
			compareServerConfigs,
		} = await import("../cursor-integration");

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

/**
 * Updates the Cursor MCP config to point to our MCP server (STDIO mode)
 * Main entry point for configuration updates
 */
export async function updateCursorMCPConfig(
	_extensionPath: string,
	fileOperationManager: FileOperationManager,
): Promise<void> {
	await updateCursorMCPServerConfig(fileOperationManager);
}

// === Rules Service ===

export class CursorRulesService {
	private readonly cursorRulesPath = ".cursor/rules/";
	private readonly logger: Logger;

	constructor(private readonly context: ExtensionContext) {
		this.logger = createLogger({ component: "CursorRulesService" });
	}

	async createRulesFile(filename: string, ruleContent: string): Promise<void> {
		const workspaceRoot = getWorkspaceRoot();
		if (!workspaceRoot) {
			window.showErrorMessage("No workspace folder found, please open a workspace first");
			return;
		}

		const rulesDir = join(workspaceRoot, this.cursorRulesPath);
		await this.ensureDirectoryExists(rulesDir);

		const ruleFileUri = Uri.file(join(rulesDir, filename));

		const shouldProceed = await this.checkFileOverwrite(ruleFileUri, filename);
		if (!shouldProceed) return;

		await this.writeRuleFile(ruleFileUri, ruleContent);
	}

	async readRulesFile(
		filename: string,
	): Promise<{ success: true; data: string } | { success: false; error: string }> {
		try {
			const workspaceRoot = getWorkspaceRoot();
			if (!workspaceRoot) {
				return { success: false, error: "No workspace folder found" };
			}

			const ruleFileUri = Uri.file(join(workspaceRoot, this.cursorRulesPath, filename));
			const fileContent = await workspace.fs.readFile(ruleFileUri);
			const content = new TextDecoder().decode(fileContent);

			return { success: true, data: content };
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return {
				success: false,
				error: `Failed to read rules file: ${errorMessage}`,
			};
		}
	}

	async deleteRulesFile(filename: string): Promise<void> {
		try {
			const workspaceRoot = getWorkspaceRoot();
			if (!workspaceRoot) {
				window.showErrorMessage("No workspace folder found, please open a workspace first");
				return;
			}

			const ruleFileUri = Uri.file(join(workspaceRoot, this.cursorRulesPath, filename));
			await workspace.fs.delete(ruleFileUri);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to delete rules file: ${errorMessage}`);
		}
	}

	async listAllRulesFilesInfo(): Promise<Array<{ name: string; lastUpdated?: Date }>> {
		try {
			const workspaceRoot = getWorkspaceRoot();
			if (!workspaceRoot) return [];

			const rulesDir = Uri.file(join(workspaceRoot, this.cursorRulesPath));

			try {
				const files = await workspace.fs.readDirectory(rulesDir);
				const mdcFiles = files
					.filter(([name, type]) => type === FileType.File && name.endsWith(".mdc"))
					.map(([name]) => ({ name })); // Could add stat info later if needed

				return mdcFiles;
			} catch {
				// Directory doesn't exist
				return [];
			}
		} catch (error) {
			this.logger.error("Error listing rules files", {
				error: error instanceof Error ? error.message : String(error),
				operation: "listAllRulesFilesInfo",
			});
			return [];
		}
	}

	private async checkFileOverwrite(fileUri: Uri, filename: string): Promise<boolean> {
		try {
			await workspace.fs.stat(fileUri);
			// File exists, ask for confirmation
			const result = await window.showWarningMessage(
				`The file ${filename} already exists in .cursor/rules/. Overwrite?`,
				{ modal: true },
				"Yes",
				"No",
			);

			if (result !== "Yes") {
				window.showInformationMessage(`Skipped creating ${filename}.`);
				return false;
			}
			return true;
		} catch {
			// File doesn't exist, proceed without confirmation
			return true;
		}
	}

	private async writeRuleFile(fileUri: Uri, content: string): Promise<void> {
		try {
			this.logger.debug("Creating cursor rules file", {
				filePath: fileUri.fsPath,
				operation: "writeRuleFile",
			});
			const encodedContent = new TextEncoder().encode(content);
			await workspace.fs.writeFile(fileUri, encodedContent);
		} catch (error) {
			this.logger.error("Error writing cursor rules file", {
				filePath: fileUri.fsPath,
				error: error instanceof Error ? error.message : String(error),
				operation: "writeRuleFile",
			});
			throw new Error(`Failed to write rules file: ${error}`);
		}
	}

	private async ensureDirectoryExists(dirPath: string): Promise<void> {
		try {
			await workspace.fs.createDirectory(Uri.file(dirPath));
			this.logger.debug("Ensured directory exists", {
				dirPath,
				operation: "ensureDirectoryExists",
			});
		} catch (error) {
			if (error instanceof Error && (error as { message: string }).message.includes("File exists")) {
				// Directory already exists, this is fine
				return;
			}
			throw error;
		}
	}
}

/**
 * Creates a VS Code-specific cursor integration instance
 */
export function createCursorIntegration(context: ExtensionContext, fileOperationManager: FileOperationManager) {
	const cursorRulesService = new CursorRulesService(context);

	return {
		cursorRulesService,
		updateCursorMCPConfig: (extensionPath: string) => updateCursorMCPConfig(extensionPath, fileOperationManager),
	};
}
