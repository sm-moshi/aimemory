import type { MemoryBankError, MemoryBankFile, MemoryBankFileType, Result } from "@/types/index";
import { isError, isSuccess } from "@/types/index";
import type { CommandResult, MCPServerInterface } from "@/types/mcpTypes";
import { formatErrorMessage } from "@/utils/common/error-helpers";

// Helper functions for common patterns
const createSuccessResult = (message: string): CommandResult => ({ success: true, message });
const createErrorResult = (message: string, error?: MemoryBankError): CommandResult => {
	const result: CommandResult = { success: false, message };
	if (error !== undefined) {
		result.error = error;
	}
	return result;
};

// File categorization utilities
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
			if (!categories[LEGACY_CATEGORY]) {
				categories[LEGACY_CATEGORY] = [];
			}
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

// Command handlers as separate functions
async function handleHealthCommand(mcpServer: MCPServerInterface): Promise<CommandResult> {
	const healthResult = await mcpServer.getMemoryBank().checkHealth();

	if (isError(healthResult)) {
		return createErrorResult(
			formatErrorMessage("Error checking memory bank health", healthResult.error),
		);
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

async function handleUpdateCommand(
	mcpServer: MCPServerInterface,
	args: string[],
): Promise<CommandResult> {
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
		return createErrorResult(
			"Error: /memory update requires content\nUsage: /memory update <fileType> <content>",
		);
	}

	try {
		await mcpServer.updateMemoryBankFile(fileType, content);
		return createSuccessResult(`Successfully updated ${fileType}`);
	} catch (error) {
		return createErrorResult(formatErrorMessage(`Error updating ${fileType}`, error));
	}
}

async function handleWriteCommand(
	mcpServer: MCPServerInterface,
	args: string[],
): Promise<CommandResult> {
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
	const isInitializedResult: Result<boolean, MemoryBankError> =
		await memoryBank.getIsMemoryBankInitialized();

	if (isError(isInitializedResult)) {
		return createErrorResult(
			formatErrorMessage(
				"Error checking memory bank initialization status",
				isInitializedResult.error,
			),
		);
	}

	const isInitialized = isInitializedResult.data;

	if (!isInitialized) {
		return createSuccessResult(
			"Memory Bank Status: Not initialized\nUse the initialize-memory-bank tool to set up the memory bank.",
		);
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

	const files = memoryBank.getAllFiles();
	const categories = categorizeFilesByType(files);
	let statusOutput = buildStatusDisplay(categories, selfHealingMsg);

	if (isError(loadFilesResult)) {
		statusOutput = `${formatErrorMessage("Error loading memory bank files", loadFilesResult.error)}\n\n${statusOutput}`;
	}

	return createSuccessResult(statusOutput);
}

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
			const result = await this.executeCommand(command, args);
			return result.message;
		} catch (error) {
			console.error("Error processing command:", error);
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
				return createErrorResult(
					`Command "${command}" is not supported.\n\n${this.getHelpText()}`,
				);
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
