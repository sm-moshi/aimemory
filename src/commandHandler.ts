import type { MCPServerInterface } from "./types/mcpTypes.js";
import type { MemoryBankError, MemoryBankFile, MemoryBankFileType, Result } from "./types/types.js";
import { isError, isSuccess } from "./types/types.js";
import { formatErrorMessage } from "./utils/errorHelpers.js";

export class CommandHandler {
	constructor(private readonly mcpServer: MCPServerInterface) {}

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
			switch (command) {
				case "help":
					return this.getHelpText();
				case "status":
					return await this.handleStatusCommand();
				case "update":
					return await this.handleUpdateCommand(args);
				case "initialize":
				case "init":
					return await this.handleInitializeCommand();
				case "health": {
					const healthResult = await this.mcpServer.getMemoryBank().checkHealth();
					if (isError(healthResult)) {
						return formatErrorMessage(
							"Error checking memory bank health",
							healthResult.error,
						);
					}
					return healthResult.data;
				}
				case "write":
					return await this.handleWriteFileByPathCommand(args);
				default:
					return `Command "${command}" is not supported.\n\n${this.getHelpText()}`;
			}
		} catch (error) {
			console.error("Error processing command:", error);
			return formatErrorMessage("Error processing command", error);
		}
	}

	/**
	 * Parse the memory command text and extract command and arguments
	 */
	private parseMemoryCommand(text: string): { command: string | null; args: string[] } {
		const parts = text.trim().split(" ");

		if (parts.length < 2) {
			return { command: null, args: [] };
		}

		// Remove the "/memory" part
		parts.shift();

		const command = parts[0];
		const args = parts.slice(1);

		return { command: command || null, args };
	}

	/**
	 * Handle the status command
	 */
	private async handleStatusCommand(): Promise<string> {
		const memoryBank = this.mcpServer.getMemoryBank();
		const isInitializedResult: Result<boolean, MemoryBankError> =
			await memoryBank.getIsMemoryBankInitialized();

		if (isError(isInitializedResult)) {
			// If initialisation check itself fails, return an error message
			return formatErrorMessage(
				"Error checking memory bank initialization status",
				isInitializedResult.error,
			);
		}

		const isInitialized = isInitializedResult.data;

		if (!isInitialized) {
			return "Memory Bank Status: Not initialized\nUse the initialize-memory-bank tool to set up the memory bank.";
		}

		const loadFilesResult: Result<MemoryBankFileType[], MemoryBankError> =
			await memoryBank.loadFiles();

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

		// Regardless of whether loadFiles succeeded or failed, we want to show the status based on available files
		// If loadFiles failed, the categories will be based on potentially incomplete data, but it's better than nothing.
		const files = memoryBank.getAllFiles();
		const categories = this.categorizeFiles(files);

		// If loadFiles failed, prepend an error message to the status output
		let statusOutput = this.buildStatusOutput(categories, selfHealingMsg);
		if (isError(loadFilesResult)) {
			statusOutput = `${formatErrorMessage("Error loading memory bank files", loadFilesResult.error)}\n\n${statusOutput}`;
		}

		return statusOutput;
	}

	/**
	 * Categorize memory bank files by type
	 */
	private categorizeFiles(files: MemoryBankFile[]): Record<string, string[]> {
		const categories = {
			core: [] as string[],
			systemPatterns: [] as string[],
			techContext: [] as string[],
			progress: [] as string[],
			legacy: [] as string[],
		};

		for (const file of files) {
			const status = `${file.type}: Last updated ${file.lastUpdated ? new Date(file.lastUpdated).toLocaleString() : "never"}`;

			if (file.type.startsWith("core/")) {
				categories.core.push(status);
			} else if (file.type.startsWith("systemPatterns/")) {
				categories.systemPatterns.push(status);
			} else if (file.type.startsWith("techContext/")) {
				categories.techContext.push(status);
			} else if (file.type.startsWith("progress/")) {
				categories.progress.push(status);
			} else {
				categories.legacy.push(status);
			}
		}

		return categories;
	}

	/**
	 * Build the status output string from categorized files
	 */
	private buildStatusOutput(
		categories: Record<string, string[]>,
		selfHealingMsg: string,
	): string {
		let output = "Memory Bank Status: Initialized\n\n";

		if (selfHealingMsg) {
			output += `${selfHealingMsg}\n\n`;
		}

		const sections = [
			{ name: "Core Files", items: categories.core },
			{ name: "System Patterns", items: categories.systemPatterns },
			{ name: "Tech Context", items: categories.techContext },
			{ name: "Progress", items: categories.progress },
			{ name: "Legacy Files", items: categories.legacy },
		];

		for (const section of sections) {
			if (section.items.length > 0) {
				output += `${section.name}:\n${section.items.join("\n")}\n\n`;
			}
		}

		return output.trim();
	}

	/**
	 * Handle the update command
	 */
	private async handleUpdateCommand(args: string[]): Promise<string> {
		if (!args.length) {
			return "Error: /memory update requires a file type argument\nUsage: /memory update <fileType> <content>";
		}

		const fileType = args[0];
		const content = args.slice(1).join(" ");

		if (!content) {
			return "Error: /memory update requires content\nUsage: /memory update <fileType> <content>";
		}

		try {
			await this.mcpServer.updateMemoryBankFile(fileType, content);
			return `Successfully updated ${fileType}`;
		} catch (error) {
			return formatErrorMessage(`Error updating ${fileType}`, error);
		}
	}

	/**
	 * Handle the initialize command
	 */
	private async handleInitializeCommand(): Promise<string> {
		try {
			await this.mcpServer.getMemoryBank().initializeFolders();
			await this.mcpServer.getMemoryBank().loadFiles();
			return "Memory bank initialised successfully.";
		} catch (error) {
			return formatErrorMessage("Error initialising memory bank", error);
		}
	}

	/**
	 * Handle the write file by path command
	 * Usage: /memory write <relativePath> <content>
	 */
	private async handleWriteFileByPathCommand(args: string[]): Promise<string> {
		if (args.length < 2) {
			return "Error: /memory write requires a relative path and content.\nUsage: /memory write <relativePath> <content>";
		}

		const relativePath = args[0];
		const content = args.slice(1).join(" ");

		try {
			await this.mcpServer.getMemoryBank().writeFileByPath(relativePath, content);
			return `Successfully wrote to ${relativePath}`;
		} catch (error) {
			return formatErrorMessage(`Error writing to ${relativePath}`, error);
		}
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
	 * This is a placeholder for future plan command functionality
	 */
	async processModesCommand(text: string): Promise<string | undefined> {
		if (!text.trim().startsWith("/plan")) {
			return undefined;
		}

		// Placeholder implementation for /plan command
		return "";
	}
}
