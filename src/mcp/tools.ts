/**
 * MCP Tools - Consolidated MCP Tool Implementations
 *
 * This module consolidates all MCP tool functionality including:
 * - Core memory bank tools and operations
 * - Tool helpers and response formatters
 * - Server extension classes
 *
 * Simplified approach - no complex metadata indexing, just direct file operations.
 */

// Core dependencies
import type { MemoryBankManager } from "../core/memory-bank";

// NOTE: Metadata system removed - keeping it simple with direct file operations

// Type alias for compatibility
type MemoryBankServiceCore = MemoryBankManager;

// Cursor integration imports
import { registerMemoryBankPrompts } from "../cursor/mcp-prompts-registry";
// Utility imports
import { createLogger } from "../lib/logging";
import type { AsyncResult, MemoryBankFileType, Result } from "../lib/types/core";
import { isError, MemoryBankError, tryCatch } from "../lib/types/core";
// Response types - Import from types to maintain consistency
import type {
	BaseMCPServerConfig,
	CoreMemoryBankConfig,
	MCPErrorResponse,
	MCPResponse,
	MCPSuccessResponse,
} from "../lib/types/operations";
import {
	formatMarkdownContent,
	getExtensionVersion,
	isValidMemoryBankFileType as validateFileType,
} from "../lib/utils";

// ============================================================================
// TOOL HELPERS AND UTILITIES
// ============================================================================

/**
 * Ensures memory bank is ready, handling common readiness patterns
 */
export async function ensureMemoryBankReady(memoryBank: MemoryBankServiceCore): AsyncResult<void, MemoryBankError> {
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
	memoryBank: MemoryBankServiceCore,
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
	memoryBank: MemoryBankServiceCore,
	handler: () => AsyncResult<string, MemoryBankError>,
	errorContext?: string,
) {
	return createMemoryBankTool(memoryBank, handler, errorContext);
}

// ============================================================================
// MEMORY BANK OPERATIONS
// ============================================================================

/**
 * Memory bank operation handlers - common operations extracted
 */
export const MemoryBankOperations = {
	/**
	 * Initialize memory bank operation
	 */
	async initialize(memoryBank: MemoryBankServiceCore): AsyncResult<string, MemoryBankError> {
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
	async readAllFiles(memoryBank: MemoryBankServiceCore): AsyncResult<string, MemoryBankError> {
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
	async listFiles(memoryBank: MemoryBankServiceCore): AsyncResult<string, MemoryBankError> {
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
	async checkHealth(memoryBank: MemoryBankServiceCore): AsyncResult<string, MemoryBankError> {
		return memoryBank.checkHealth();
	},

	/**
	 * Update file operation
	 */
	async updateFile(
		memoryBank: MemoryBankServiceCore,
		fileType: string,
		content: string,
	): AsyncResult<string, MemoryBankError> {
		if (!validateFileType(fileType)) {
			return {
				success: false,
				error: new MemoryBankError(`Invalid file type: ${fileType}`, "INVALID_FILE_TYPE"),
			};
		}

		// Apply markdown formatting to prevent linting errors (MD036, MD032, etc.)
		const formattedContent = formatMarkdownContent(content);

		const updateResult = await memoryBank.updateFile(fileType as MemoryBankFileType, formattedContent);
		if (isError(updateResult)) {
			return updateResult;
		}

		return { success: true, data: `Successfully updated ${fileType}` };
	},

	/**
	 * Build review response payload for review-and-update tool
	 */
	buildReviewResponsePayload(memoryBank: MemoryBankServiceCore): {
		content: MCPResponse["content"];
		nextAction?: MCPResponse["nextAction"];
	} {
		const files = memoryBank.getAllFiles();

		const summaryData = {
			totalFiles: files.length,
			fileTypes: files.map(f => f.type),
			lastUpdatedFiles: files
				.filter(f => f.lastUpdated)
				.sort((a, b) => (b.lastUpdated?.getTime() || 0) - (a.lastUpdated?.getTime() || 0))
				.slice(0, 3)
				.map(f => ({
					type: f.type,
					lastUpdated: f.lastUpdated ? new Date(f.lastUpdated).toLocaleString() : "never",
				})),
		};

		const summaryText = JSON.stringify(summaryData, null, 2);

		return {
			content: [
				{
					type: "text",
					text: `📁 Memory Bank Review:\n\n${summaryText}\n\n🔍 Review each file and suggest updates as needed. Use the update-memory-bank-file tool to apply changes.`,
				},
			],
			nextAction: "Review files individually and apply updates using update-memory-bank-file tool",
		};
	},
};

// ============================================================================
// SERVER EXTENSION CLASSES
// ============================================================================

/**
 * Base MCP Server class imported from consolidated server.ts
 * We re-export it here for convenience but it's defined in server.ts
 */
import { BaseMCPServer } from "./server";

/**
 * Core MCP Server for Memory Bank operations.
 * Extends BaseMCPServer and registers essential memory bank tools.
 * No complex metadata - just direct file operations.
 */
export class CoreMemoryBankMCP extends BaseMCPServer {
	constructor(config: CoreMemoryBankConfig) {
		// Handle flexible path configuration - require at least one path
		const memoryBankPath = config.memoryBankPath ?? config.workspacePath;

		if (!memoryBankPath) {
			throw new Error("CoreMemoryBankMCP requires either memoryBankPath or workspacePath to be specified");
		}

		// Create the unified config for the base class
		const baseConfig: BaseMCPServerConfig = {
			memoryBankPath,
			name: config.name ?? "CoreMemoryBankMCP",
			version: config.version ?? getExtensionVersion(),
			logger: config.logger ?? createLogger({ component: "CoreMemoryBankMCP" }),
			// Use conditional spreading for optional properties with exactOptionalPropertyTypes
			...(config.memoryBank && { memoryBank: config.memoryBank }),
		};

		super(baseConfig);
	}

	/**
	 * Registers custom tools specific to CoreMemoryBankMCP.
	 * This method overrides the one in BaseMCPServer to add core memory bank tools.
	 */
	protected override registerCustomTools(): void {
		this.logger.info("[CoreMemoryBankMCP] Registering custom/overridden tools...");

		// Register core tools for direct file operations
		this._registerReadMemoryBankFileTool();

		this.logger.info("[CoreMemoryBankMCP] Custom/overridden tool registration complete.");
	}

	/**
	 * Registers the 'read-memory-bank-file' tool with specific schema.
	 */
	private _registerReadMemoryBankFileTool(): void {
		const toolName = "read-memory-bank-file";
		this.server.tool(
			toolName,
			{
				fileType: {
					type: "string",
					description: "Type of memory bank file to read",
				},
			},
			createMemoryBankTool(
				this.memoryBank,
				// biome-ignore lint/suspicious/noExplicitAny: MCP SDK requires generic object parameters
				async (args: { [key: string]: any }): AsyncResult<string, MemoryBankError> => {
					const params = args as { fileType: string };
					if (!validateFileType(params.fileType)) {
						return {
							success: false,
							error: new MemoryBankError(`Invalid file type: ${params.fileType}`, "INVALID_FILE_TYPE"),
						};
					}

					const file = this.memoryBank.getFile(params.fileType);
					if (!file) {
						return {
							success: false,
							error: new MemoryBankError(`File ${params.fileType} not found.`, "FILE_NOT_FOUND"),
						};
					}
					return { success: true, data: file.content };
				},
				`Error in ${toolName} tool`, // Context for error response
			),
		);
		this.logger.info(`[CoreMemoryBankMCP] Registered tool: ${toolName}`);
	}
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export everything needed for MCP server implementations
export {
	type MemoryBankServiceCore,
	type MCPResponse,
	type MCPSuccessResponse,
	type MCPErrorResponse,
	registerMemoryBankPrompts,
};
