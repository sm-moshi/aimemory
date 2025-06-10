/**
 * Shared MCP Tool Helpers
 *
 * Utilities to reduce complexity and eliminate duplication across
 * MCP server implementations (mcpServerCli, CoreMemoryBankMCP, MemoryBankMCPAdapter)
 */

import type { MemoryBankManager } from "../../core/memory-bank";
import type { AsyncResult, MemoryBankFileType, Result } from "../../lib/types/core";
import { isError, MemoryBankError, tryCatch } from "../../lib/types/core";
import type { MCPErrorResponse, MCPResponse, MCPSuccessResponse } from "../../lib/types/operations";

/**
 * Ensures memory bank is ready, handling common readiness patterns
 */
export async function ensureMemoryBankReady(memoryBank: MemoryBankManager): AsyncResult<void, MemoryBankError> {
	// Check if memory bank is initialized
	const isInitializedResult = await memoryBank.getIsMemoryBankInitialized();
	if (isError(isInitializedResult)) {
		return isInitializedResult;
	}

	// If not initialized, initialize it
	if (!isInitializedResult.data) {
		const initResult = await memoryBank.initializeFolders();
		if (isError(initResult)) {
			return initResult;
		}
	}

	// Load files to ensure they're available
	const loadResult: Result<MemoryBankFileType[], MemoryBankError> = await memoryBank.loadFiles();
	if (isError(loadResult)) {
		return loadResult;
	}

	return { success: true, data: undefined };
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
 */
export function createMemoryBankTool<T = unknown>(
	memoryBank: MemoryBankManager,
	handler: (args: T) => AsyncResult<string, MemoryBankError>,
	errorContext?: string,
) {
	return async (args: T): Promise<MCPResponse> => {
		const result = await ensureMemoryBankReady(memoryBank);
		if (isError(result)) {
			return createErrorResponse(result.error, errorContext);
		}

		const handlerResult = await handler(args);

		if (isError(handlerResult)) {
			return createErrorResponse(handlerResult.error, errorContext);
		}

		return createSuccessResponse(handlerResult.data);
	};
}

/**
 * Tool creator for tools that don't need arguments
 */
export function createSimpleMemoryBankTool(
	memoryBank: MemoryBankManager,
	handler: () => AsyncResult<string, MemoryBankError>,
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
	async initialize(memoryBank: MemoryBankManager): AsyncResult<string, MemoryBankError> {
		const isInitializedResult = await memoryBank.getIsMemoryBankInitialized();
		if (isError(isInitializedResult)) {
			return isInitializedResult;
		}

		const isInitialized = isInitializedResult.data;

		if (!isInitialized) {
			const initializeFoldersResult = await memoryBank.initializeFolders();
			if (isError(initializeFoldersResult)) {
				return initializeFoldersResult;
			}

			const loadFilesResult = await memoryBank.loadFiles();
			if (isError(loadFilesResult)) {
				return loadFilesResult;
			}

			return { success: true, data: "Memory bank initialized successfully." };
		}

		const loadFilesResult = await memoryBank.loadFiles();
		if (isError(loadFilesResult)) {
			return loadFilesResult;
		}

		return { success: true, data: "Memory bank already initialized." };
	},

	/**
	 * Read all files operation
	 */
	async readAllFiles(memoryBank: MemoryBankManager): AsyncResult<string, MemoryBankError> {
		const result = tryCatch(() => {
			const files = memoryBank.getFilesWithFilenames();
			return files
				? `Here are the files in the memory bank:\n\n${files}`
				: "Memory bank is empty or could not be read.";
		});

		if (isError(result)) {
			return {
				success: false,
				error: new MemoryBankError("Failed to read files", "READ_FILES_ERROR", {
					originalError: result.error,
				}),
			};
		}

		return result;
	},

	/**
	 * List files with metadata operation
	 */
	async listFiles(memoryBank: MemoryBankManager): AsyncResult<string, MemoryBankError> {
		const result = tryCatch(() => {
			const files = memoryBank.getAllFiles();
			const fileListText = files
				.map(
					file =>
						`${file.type}: Last updated ${
							file.lastUpdated ? new Date(file.lastUpdated).toLocaleString() : "never"
						}`,
				)
				.join("\n");
			return fileListText ?? "No memory bank files found.";
		});

		if (isError(result)) {
			return {
				success: false,
				error: new MemoryBankError("Failed to list files", "LIST_FILES_ERROR", {
					originalError: result.error,
				}),
			};
		}

		return result;
	},

	/**
	 * Health check operation
	 */
	async checkHealth(memoryBank: MemoryBankManager): AsyncResult<string, MemoryBankError> {
		return memoryBank.checkHealth();
	},

	/**
	 * Update file operation
	 */
	async updateFile(
		memoryBank: MemoryBankManager,
		fileType: string,
		content: string,
	): AsyncResult<string, MemoryBankError> {
		const updateResult = await memoryBank.updateFile(
			fileType as Parameters<typeof memoryBank.updateFile>[0],
			content,
		);

		if (isError(updateResult)) {
			return updateResult;
		}

		return { success: true, data: `Updated ${fileType} successfully` };
	},

	/**
	 * Core logic for reviewing and updating memory bank files.
	 * Returns the structure for the MCPResponse's content and nextAction fields.
	 */
	buildReviewResponsePayload(memoryBank: MemoryBankManager): {
		content: MCPResponse["content"];
		nextAction?: MCPResponse["nextAction"];
	} {
		const files = memoryBank.getAllFiles();
		if (files.length === 0) {
			return {
				content: [{ type: "text", text: "Memory bank is empty. No files to review." }],
				nextAction: { type: "idle" },
			};
		}
		const reviewMessages: MCPResponse["content"] = files.map(file => ({
			type: "text" as const,
			text: `File: ${file.type}\n\n${file.content}\n\nDo you want to update this file? If yes, reply with the new content. If no, reply 'skip'.`,
		}));

		const nextActionPayload: MCPResponse["nextAction"] = {
			type: "collect-updates",
			files: files.map(file => file.type as string),
		};

		return {
			content: reviewMessages,
			nextAction: nextActionPayload,
		};
	},
};
