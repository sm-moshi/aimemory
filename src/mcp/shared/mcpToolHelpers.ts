/**
 * Shared MCP Tool Helpers
 *
 * Utilities to reduce complexity and eliminate duplication across
 * MCP server implementations (mcpServerCli, CoreMemoryBankMCP, MemoryBankMCPAdapter)
 */

import type { MemoryBankServiceCore } from "../../core/memoryBankServiceCore.js";
import type { MCPErrorResponse, MCPResponse, MCPSuccessResponse } from "../../types/mcpTypes.js";

/**
 * Ensures memory bank is ready, handling common readiness patterns
 * Reduces complexity from ~8 branches to ~2 in calling code
 */
export async function ensureMemoryBankReady(memoryBank: MemoryBankServiceCore): Promise<void> {
	if (!memoryBank.isReady()) {
		try {
			await memoryBank.loadFiles();
			if (!memoryBank.isReady()) {
				throw new Error(
					"Memory bank could not be initialized. Please run init-memory-bank first.",
				);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			throw new Error(`Failed to load memory bank: ${message}`);
		}
	}
}

/**
 * Creates standardized success response
 */
export function createSuccessResponse(text: string): MCPSuccessResponse {
	return {
		content: [{ type: "text", text }],
	};
}

/**
 * Creates standardized error response
 */
export function createErrorResponse(error: unknown, context?: string): MCPErrorResponse {
	const message = error instanceof Error ? error.message : String(error);
	const fullMessage = context ? `${context}: ${message}` : message;

	return {
		content: [{ type: "text", text: fullMessage }],
		isError: true,
	};
}

/**
 * High-level tool creator that handles the standard pattern:
 * 1. Ensure memory bank readiness
 * 2. Execute handler
 * 3. Return standardized response
 *
 * Reduces tool complexity from ~8-10 to ~2-3 complexity points
 */
export function createMemoryBankTool<T = unknown>(
	memoryBank: MemoryBankServiceCore,
	handler: (args: T) => Promise<string>,
	errorContext?: string,
) {
	return async (args: T): Promise<MCPResponse> => {
		try {
			await ensureMemoryBankReady(memoryBank);
			const result = await handler(args);
			return createSuccessResponse(result);
		} catch (error) {
			return createErrorResponse(error, errorContext);
		}
	};
}

/**
 * Tool creator for tools that don't need arguments
 */
export function createSimpleMemoryBankTool(
	memoryBank: MemoryBankServiceCore,
	handler: () => Promise<string>,
	errorContext?: string,
) {
	return createMemoryBankTool(memoryBank, handler, errorContext);
}

/**
 * Memory bank operation handlers - common operations extracted
 */
export const MemoryBankOperations = {
	/**
	 * Initialize memory bank operation
	 */
	async initialize(memoryBank: MemoryBankServiceCore): Promise<string> {
		const isInitialized = await memoryBank.getIsMemoryBankInitialized();
		if (!isInitialized) {
			await memoryBank.initializeFolders();
			await memoryBank.loadFiles();
			return "Memory bank initialized successfully.";
		}
		await memoryBank.loadFiles();
		return "Memory bank already initialized.";
	},

	/**
	 * Read all files operation
	 */
	async readAllFiles(memoryBank: MemoryBankServiceCore): Promise<string> {
		const files = memoryBank.getFilesWithFilenames();
		return files
			? `Here are the files in the memory bank:\n\n${files}`
			: "Memory bank is empty or could not be read.";
	},

	/**
	 * List files with metadata operation
	 */
	async listFiles(memoryBank: MemoryBankServiceCore): Promise<string> {
		const files = memoryBank.getAllFiles();
		const fileListText = files
			.map(
				(file) =>
					`${file.type}: Last updated ${
						file.lastUpdated ? new Date(file.lastUpdated).toLocaleString() : "never"
					}`,
			)
			.join("\n");
		return fileListText || "No memory bank files found.";
	},

	/**
	 * Health check operation
	 */
	async checkHealth(memoryBank: MemoryBankServiceCore): Promise<string> {
		return await memoryBank.checkHealth();
	},

	/**
	 * Update file operation
	 */
	async updateFile(
		memoryBank: MemoryBankServiceCore,
		fileType: string,
		content: string,
	): Promise<string> {
		await memoryBank.updateFile(
			fileType as Parameters<typeof memoryBank.updateFile>[0],
			content,
		);
		return `Updated ${fileType} successfully`;
	},
};
