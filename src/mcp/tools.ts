/**
 * MCP Tools - Consolidated MCP Tool Implementation
 *
 * This module consolidates all MCP tool functionality including:
 * - Tool helpers and utilities
 * - Metadata tool registration
 * - Core memory bank MCP tools
 * - Metadata memory bank MCP tools
 *
 * Consolidated from:
 * - src/mcp/shared/mcpToolHelpers.ts
 * - src/mcp/shared/metadataToolRegistrar.ts
 * - src/mcp/coreMemoryBankMCP.ts
 * - src/mcp/metadataMemoryBankMCP.ts
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Core dependencies
import type { MemoryBankManager } from "../core/memory-bank";
import type { MetadataIndexManager } from "../core/metadata-index";
import type { MetadataSearchEngine } from "../core/metadata-search";

// Type alias for compatibility
type MemoryBankServiceCore = MemoryBankManager;

import { MemoryBankError, isError, tryCatch } from "../lib/types/core";
import type { AsyncResult, MemoryBankFileType, Result } from "../lib/types/core";
import type {
	BaseMCPServerConfig,
	CoreMemoryBankConfig,
	MCPErrorResponse,
	MCPResponse,
	MCPSuccessResponse,
} from "../lib/types/operations";
// Type imports
import { ReadMemoryBankFileSchema } from "../lib/types/system";
import type { SearchOptions } from "../lib/types/system";

// Utility imports
import { createLogger, getExtensionVersion, isValidMemoryBankFileType as validateFileType } from "../lib/utils";

// Base server import
import { BaseMCPServer } from "./shared/baseMcpServer";

// ============================================================================
// TOOL HELPERS AND UTILITIES
// ============================================================================

/**
 * Ensures memory bank is ready, handling common readiness patterns
 */
export async function ensureMemoryBankReady(memoryBank: MemoryBankServiceCore): AsyncResult<void, MemoryBankError> {
	if (!memoryBank.isReady()) {
		const loadResult: Result<MemoryBankFileType[], MemoryBankError> = await memoryBank.loadFiles();
		if (isError(loadResult)) {
			// If loading failed, return the error
			return loadResult; // loadFiles already returns MemoryBankError in its AsyncResult
		}

		if (!memoryBank.isReady()) {
			// If after loading, it's still not ready (unexpected), return an error
			return {
				success: false,
				error: new MemoryBankError(
					"Memory bank could not be initialized after loading. Please run init-memory-bank tool.",
					"INIT_FAILED_AFTER_LOAD",
				),
			};
		}
	}
	// If already ready, or successfully loaded and is now ready, return success
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

		const updateResult = await memoryBank.updateFile(fileType as MemoryBankFileType, content);
		if (isError(updateResult)) {
			return updateResult;
		}

		return { success: true, data: `File ${fileType} updated successfully.` };
	},

	/**
	 * Builds review response payload for memory bank content
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

		const reviewContent = [
			{
				type: "text" as const,
				text: `📊 Memory Bank Summary:\n${JSON.stringify(summaryData, null, 2)}\n\n📝 Full Content:\n\n${memoryBank.getFilesWithFilenames()}`,
			},
		];

		return {
			content: reviewContent,
			nextAction:
				"Based on this review, consider updating any files that need current information or corrections.",
		};
	},
};

// ============================================================================
// METADATA TOOL REGISTRAR
// ============================================================================

export class MetadataToolRegistrar {
	private metadataInitialized = false;

	constructor(
		private readonly memoryBank: MemoryBankServiceCore,
		private readonly metadataIndexManager: MetadataIndexManager,
		private readonly metadataSearchEngine: MetadataSearchEngine,
		private readonly logger: Console, // Using Console for now, can be typed to Logger if preferred
	) {}

	private async ensureMetadataReady(): Promise<void> {
		if (!this.metadataInitialized) {
			await this.metadataIndexManager.initialize();
			this.metadataInitialized = true;
		}
	}

	public registerQueryMemoryIndexTool(server: McpServer): void {
		const toolName = "query-memory-index";
		const paramsSchema = z.object({
			type: z.string().optional(),
			tags: z.array(z.string()).optional(),
			validationStatus: z.enum(["valid", "invalid", "unchecked", "schema_not_found"]).optional(),
			limit: z.number().min(1).max(100).default(50).optional(),
			offset: z.number().min(0).default(0).optional(),
			query: z.string().optional().describe("Text search in title and file paths"),
		});

		server.tool(toolName, paramsSchema.shape, async (params: z.infer<typeof paramsSchema>) => {
			const readyCheck = await ensureMemoryBankReady(this.memoryBank);
			if (isError(readyCheck)) {
				return createErrorResponse(readyCheck.error, toolName);
			}

			try {
				await this.ensureMetadataReady();
				const searchOptions: SearchOptions = {
					limit: params.limit ?? 50,
					offset: params.offset ?? 0,
				};

				if (params.type !== undefined) {
					// Only add defined values to avoid type mismatches
					searchOptions.type = params.type;
				}
				if (params.tags !== undefined) {
					searchOptions.tags = params.tags;
				}
				if (params.validationStatus !== undefined) {
					searchOptions.validationStatus = params.validationStatus;
				}
				if (params.query !== undefined) {
					searchOptions.query = params.query;
				}

				const searchResults = await this.metadataSearchEngine.search(searchOptions);

				const resultText = JSON.stringify(
					{
						results: searchResults.results,
						total: searchResults.total,
						hasMore: searchResults.hasMore,
						limit: params.limit ?? 50,
						offset: params.offset ?? 0,
						query: params.query,
						filters: searchResults.filters || {
							type: params.type,
							tags: params.tags,
							validationStatus: params.validationStatus,
						},
					},
					null,
					2,
				);
				return createSuccessResponse(
					`🔍 Found ${searchResults.results.length} files (${searchResults.total} total):\n\n${resultText}`,
				);
			} catch (error) {
				this.logger.error(`Error in ${toolName}:`, error);
				return createErrorResponse(
					error instanceof Error ? error : new Error("Unknown error during metadata search"),
					toolName,
				);
			}
		});
	}

	public registerValidateMemoryFileTool(server: McpServer): void {
		const toolName = "validate-memory-file";
		const paramsSchema = z.object({
			relativePath: z.string().describe("Relative path to the memory bank file to validate"),
		});

		server.tool(toolName, paramsSchema.shape, async (params: z.infer<typeof paramsSchema>) => {
			const readyCheck = await ensureMemoryBankReady(this.memoryBank);
			if (isError(readyCheck)) {
				return createErrorResponse(readyCheck.error, toolName);
			}
			try {
				await this.ensureMetadataReady();
				let entry = this.metadataIndexManager.getEntry(params.relativePath);
				if (!entry) {
					await this.metadataIndexManager.updateEntry(params.relativePath);
					entry = this.metadataIndexManager.getEntry(params.relativePath);
				}
				if (!entry) {
					throw new Error(`File not found after attempting update: ${params.relativePath}`);
				}
				const resultText = JSON.stringify(
					{
						relativePath: params.relativePath,
						validationStatus: entry.validationStatus ?? "unchecked",
						errors: entry.validationErrors || [],
						schema: entry.actualSchemaUsed ?? "default",
						isValid: entry.validationStatus === "valid",
						type: entry.type,
						fileMetrics: entry.fileMetrics,
						lastIndexed: entry.lastIndexed,
					},
					null,
					2,
				);
				let statusIcon = "⚠️";
				if (entry.validationStatus === "valid") statusIcon = "✅";
				else if (entry.validationStatus === "invalid") statusIcon = "❌";
				return createSuccessResponse(
					`${statusIcon} Validation result for ${params.relativePath}:\n\n${resultText}`,
				);
			} catch (error) {
				this.logger.error(`Error in ${toolName}:`, error);
				return createErrorResponse(
					error instanceof Error ? error : new Error("Unknown error during file validation"),
					toolName,
				);
			}
		});
	}

	public registerRebuildMetadataIndexTool(server: McpServer): void {
		const toolName = "rebuild-metadata-index";
		const paramsSchema = z.object({
			force: z.boolean().default(false).optional().describe("Force rebuild even if index exists"),
		});

		server.tool(toolName, paramsSchema.shape, async (_params: z.infer<typeof paramsSchema>) => {
			const readyCheck = await ensureMemoryBankReady(this.memoryBank);
			if (isError(readyCheck)) {
				return createErrorResponse(readyCheck.error, toolName);
			}
			try {
				await this.ensureMetadataReady();
				const startTime = Date.now();
				// Assuming params.force might be used by buildIndex if it accepts options
				const rebuildResult = await this.metadataIndexManager.buildIndex();
				const duration = Date.now() - startTime;
				const stats = await this.metadataIndexManager.getIndexStats();
				const resultText = JSON.stringify(
					{
						filesProcessed: rebuildResult.filesProcessed,
						filesIndexed: rebuildResult.filesIndexed,
						filesErrored: rebuildResult.filesErrored,
						rebuildTime: `${duration}ms`,
						indexPath: ".index/metadata.json",
						stats: {
							totalFiles: stats.totalFiles,
							validFiles: stats.validFiles,
							invalidFiles: stats.invalidFiles,
							uncheckedFiles: stats.uncheckedFiles,
							lastBuildTime: stats.lastBuildTime,
							totalSizeBytes: stats.totalSizeBytes,
							totalLineCount: stats.totalLineCount,
						},
						errors: rebuildResult.errors,
					},
					null,
					2,
				);
				return createSuccessResponse(`🔄 Metadata index rebuilt successfully:\n\n${resultText}`);
			} catch (error) {
				this.logger.error(`Error in ${toolName}:`, error);
				return createErrorResponse(
					error instanceof Error ? error : new Error("Unknown error during index rebuild"),
					toolName,
				);
			}
		});
	}

	public registerGetMetadataForFileTool(server: McpServer): void {
		const toolName = "get-metadata-for-file";
		const paramsSchema = z.object({
			relativePath: z.string().describe("Relative path to the memory bank file to get metadata for"),
		});

		server.tool(toolName, paramsSchema.shape, async (params: z.infer<typeof paramsSchema>) => {
			const readyCheck = await ensureMemoryBankReady(this.memoryBank);
			if (isError(readyCheck)) {
				return createErrorResponse(readyCheck.error, toolName);
			}
			try {
				await this.ensureMetadataReady();
				let entry = this.metadataIndexManager.getEntry(params.relativePath);
				if (!entry) {
					// Attempt to index the single file if not found
					await this.metadataIndexManager.updateEntry(params.relativePath);
					entry = this.metadataIndexManager.getEntry(params.relativePath);
				}

				if (!entry) {
					return createErrorResponse(
						new Error(`File not found in metadata index: ${params.relativePath}`),
						toolName,
					);
				}

				const resultText = JSON.stringify(entry, null, 2);
				return createSuccessResponse(`📄 Metadata for ${params.relativePath}:\n\n${resultText}`);
			} catch (error) {
				this.logger.error(`Error in ${toolName}:`, error);
				return createErrorResponse(
					error instanceof Error ? error : new Error("Unknown error retrieving metadata for file"),
					toolName,
				);
			}
		});
	}

	public registerGetMetadataIndexStatsTool(server: McpServer): void {
		const toolName = "get-metadata-index-stats";

		server.tool(toolName, {}, async () => {
			const readyCheck = await ensureMemoryBankReady(this.memoryBank);
			if (isError(readyCheck)) {
				return createErrorResponse(readyCheck.error, toolName);
			}
			try {
				await this.ensureMetadataReady();
				const stats = await this.metadataIndexManager.getIndexStats();
				const resultText = JSON.stringify(stats, null, 2);
				return createSuccessResponse(`📊 Metadata Index Stats:\n\n${resultText}`);
			} catch (error) {
				this.logger.error(`Error in ${toolName}:`, error);
				return createErrorResponse(
					error instanceof Error ? error : new Error("Unknown error retrieving index stats"),
					toolName,
				);
			}
		});
	}
}

// ============================================================================
// CORE MEMORY BANK MCP SERVER
// ============================================================================

/**
 * Core MCP Server for Memory Bank operations.
 * Extends BaseMCPServer and registers tools specific to core memory bank functionalities.
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
	 * This method overrides the one in BaseMCPServer to add or specialize tool registrations.
	 */
	protected override registerCustomTools(): void {
		this.logger.info("[CoreMemoryBankMCP] Registering custom/overridden tools...");

		// Register core tools not specific to metadata
		this._registerReadMemoryBankFileTool();

		// Register metadata-specific tools via the registrar
		// this._registerMetadataTools(); // Disabled: Metadata system not production ready
		// TODO: Re-enable metadata tools when they are production ready

		this.logger.info("[CoreMemoryBankMCP] Custom/overridden tool registration complete.");
	}

	/**
	 * Registers all metadata-related tools using the MetadataToolRegistrar.
	 */
	private _registerMetadataTools(): void {
		if (this.metadataToolRegistrar) {
			this.logger.info("[CoreMemoryBankMCP] Registering metadata tools...");
			// Call the actual, individual tool registration methods
			this.metadataToolRegistrar.registerQueryMemoryIndexTool(this.server);
			this.metadataToolRegistrar.registerValidateMemoryFileTool(this.server);
			this.metadataToolRegistrar.registerRebuildMetadataIndexTool(this.server);
			this.metadataToolRegistrar.registerGetMetadataForFileTool(this.server);
			this.metadataToolRegistrar.registerGetMetadataIndexStatsTool(this.server);
			this.logger.info("[CoreMemoryBankMCP] Metadata tools registered.");
		} else {
			this.logger.warn(
				"[CoreMemoryBankMCP] MetadataToolRegistrar not initialized. Skipping metadata tool registration.",
			);
		}
	}

	/**
	 * Registers the 'read-memory-bank-file' tool with specific schema.
	 * This might override a simpler version from BaseMCPServer if it exists,
	 * or add it if it doesn't.
	 */
	private _registerReadMemoryBankFileTool(): void {
		const toolName = "read-memory-bank-file";
		this.server.tool(
			toolName,
			ReadMemoryBankFileSchema.shape, // Use .shape for direct Zod object definition
			createMemoryBankTool(
				this.memoryBank,
				async (params: z.infer<typeof ReadMemoryBankFileSchema>): AsyncResult<string, MemoryBankError> => {
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
// METADATA MEMORY BANK MCP SERVER
// ============================================================================

/**
 * MCP Server providing metadata operations for memory bank files
 * Includes search, validation, and indexing capabilities
 */
export class MetadataMemoryBankMCP extends BaseMCPServer {
	constructor(config: CoreMemoryBankConfig) {
		// Handle flexible path configuration - require at least one path
		const memoryBankPath = config.memoryBankPath ?? config.workspacePath;

		if (!memoryBankPath) {
			throw new Error("MetadataMemoryBankMCP requires either memoryBankPath or workspacePath to be specified");
		}

		// Pass config to BaseMCPServer, which handles all initializations
		super({
			memoryBankPath,
			logger: config.logger ?? createLogger({ component: "MetadataMemoryBankMCP" }),
			name: config.name ?? "MetadataMemoryBankMCP", // Default name for this specific server
			version: config.version ?? getExtensionVersion(), // Use suffix for this specific server
		});
	}

	/**
	 * Register metadata-specific MCP tools
	 */
	protected override registerCustomTools(): void {
		// this.metadataToolRegistrar and this.server are inherited from BaseMCPServer
		this.metadataToolRegistrar.registerQueryMemoryIndexTool(this.server);
		this.metadataToolRegistrar.registerValidateMemoryFileTool(this.server);
		this.metadataToolRegistrar.registerRebuildMetadataIndexTool(this.server);
	}
}
