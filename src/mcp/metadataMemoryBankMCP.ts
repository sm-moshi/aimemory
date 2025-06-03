import { z } from "zod";
import { CacheManager } from "../core/CacheManager.js";
import { FileOperationManager } from "../core/FileOperationManager.js";
import { MemoryBankServiceCore } from "../core/memoryBankServiceCore.js";
import { MetadataIndexManager } from "../metadata/MetadataIndexManager.js";
import { MetadataSearchEngine } from "../metadata/MetadataSearchEngine.js";
import { StreamingManager } from "../performance/StreamingManager.js";
import { isError } from "../types/errorHandling.js";
import type { CoreMemoryBankConfig } from "../types/mcpTypes.js";
import { BaseMCPServer } from "./shared/baseMcpServer.js";
import {
	createErrorResponse as createErrorResponseHelper,
	createSuccessResponse,
	ensureMemoryBankReady,
} from "./shared/mcpToolHelpers.js";

/**
 * MCP Server providing metadata operations for memory bank files
 * Includes search, validation, and indexing capabilities
 */
export class MetadataMemoryBankMCP extends BaseMCPServer {
	private readonly metadataIndexManager: MetadataIndexManager;
	private readonly metadataSearchEngine: MetadataSearchEngine;

	constructor(config: CoreMemoryBankConfig) {
		const logger = config.logger ?? console;
		const cacheManager = new CacheManager(logger);
		const streamingManager = new StreamingManager(logger, config.memoryBankPath, {
			sizeThreshold: 1024 * 1024, // 1MB
			chunkSize: 64 * 1024, // 64KB
			timeout: 5000, // 5 seconds
			enableProgressCallbacks: false,
		});
		const fileOperationManager = new FileOperationManager(logger, config.memoryBankPath);

		super({
			name: "MetadataMemoryBankMCP",
			version: "0.1.0",
			memoryBank: new MemoryBankServiceCore(
				config.memoryBankPath,
				logger,
				cacheManager,
				streamingManager,
				fileOperationManager,
			),
			logger,
		});

		// Initialize metadata components
		this.metadataIndexManager = new MetadataIndexManager(this.memoryBank, logger, {
			memoryBankPath: config.memoryBankPath,
		});
		this.metadataSearchEngine = new MetadataSearchEngine(this.metadataIndexManager);

		this.registerCustomTools();
	}

	/**
	 * Register metadata-specific MCP tools
	 */
	protected registerCustomTools(): void {
		this._registerQueryMemoryIndexTool();
		this._registerValidateMemoryFileTool();
		this._registerRebuildMetadataIndexTool();
	}

	/**
	 * Search and query the metadata index
	 * Chat aliases: "search memory", "find files", "query index"
	 */
	private _registerQueryMemoryIndexTool() {
		const toolName = "query-memory-index";
		const paramsSchema = z.object({
			type: z
				.string()
				.optional()
				.describe("Filter by file type (e.g., 'projectBrief', 'researchNote')"),
			tags: z
				.array(z.string())
				.optional()
				.describe("Filter by tags (files must have ALL specified tags)"),
			validationStatus: z
				.enum(["valid", "invalid", "unchecked", "schema_not_found"])
				.optional()
				.describe("Filter by validation status"),
			limit: z
				.number()
				.min(1)
				.max(100)
				.default(50)
				.optional()
				.describe("Maximum number of results (1-100, default: 50)"),
			offset: z
				.number()
				.min(0)
				.default(0)
				.optional()
				.describe("Number of results to skip for pagination"),
			query: z
				.string()
				.optional()
				.describe("Text search in title, description, and file paths"),
		});

		this.server.tool(toolName, paramsSchema.shape, async (params) => {
			const readyCheck = await ensureMemoryBankReady(this.memoryBank);
			if (isError(readyCheck)) {
				return createErrorResponseHelper(readyCheck.error, toolName);
			}

			try {
				const searchResults = await this.metadataSearchEngine.search({
					type: params.type,
					tags: params.tags,
					validationStatus: params.validationStatus,
					limit: params.limit ?? 50,
					offset: params.offset ?? 0,
					query: params.query,
				});

				const resultText = JSON.stringify(
					{
						results: searchResults.results,
						total: searchResults.total,
						hasMore: searchResults.hasMore,
						limit: params.limit ?? 50,
						offset: params.offset ?? 0,
						query: params.query,
						filters: {
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
				return createErrorResponseHelper(
					error instanceof Error
						? error
						: new Error("Unknown error during metadata search"),
					toolName,
				);
			}
		});
	}

	/**
	 * Validate a specific memory bank file
	 * Chat aliases: "validate file", "check file", "verify metadata"
	 */
	private _registerValidateMemoryFileTool() {
		const toolName = "validate-memory-file";
		const paramsSchema = z.object({
			relativePath: z
				.string()
				.describe(
					"Relative path to the memory bank file to validate (e.g., 'core/projectBrief.md')",
				),
		});

		this.server.tool(toolName, paramsSchema.shape, async (params) => {
			const readyCheck = await ensureMemoryBankReady(this.memoryBank);
			if (isError(readyCheck)) {
				return createErrorResponseHelper(readyCheck.error, toolName);
			}

			try {
				// Check if file exists in the index
				const entry = this.metadataIndexManager.getEntry(params.relativePath);
				let result: {
					validationStatus: string;
					validationErrors: import("zod").ZodIssue[];
					schemaUsed: string;
					errorMessage?: string;
				};

				if (!entry) {
					// File not found in index, try to update/add it
					await this.metadataIndexManager.updateEntry(params.relativePath);
					const updatedEntry = this.metadataIndexManager.getEntry(params.relativePath);

					if (!updatedEntry) {
						throw new Error(`File not found: ${params.relativePath}`);
					}

					result = {
						validationStatus: updatedEntry.validationStatus,
						validationErrors: updatedEntry.validationErrors || [],
						schemaUsed: updatedEntry.actualSchemaUsed ?? "default",
						errorMessage:
							updatedEntry.validationStatus === "invalid"
								? "Validation failed"
								: undefined,
					};
				} else {
					result = {
						validationStatus: entry.validationStatus,
						validationErrors: entry.validationErrors || [],
						schemaUsed: entry.actualSchemaUsed ?? "default",
						errorMessage:
							entry.validationStatus === "invalid" ? "Validation failed" : undefined,
					};
				}

				const resultText = JSON.stringify(
					{
						relativePath: params.relativePath,
						validationStatus: result.validationStatus,
						errors: result.validationErrors ?? [],
						schema: result.schemaUsed ?? "default",
						isValid: result.validationStatus === "valid",
						errorMessage: result.errorMessage,
					},
					null,
					2,
				);

				const statusIcon = result.validationStatus === "valid" ? "✅" : "❌";

				return createSuccessResponse(
					`${statusIcon} Validation result for ${params.relativePath}:\n\n${resultText}`,
				);
			} catch (error) {
				return createErrorResponseHelper(
					error instanceof Error
						? error
						: new Error("Unknown error during file validation"),
					toolName,
				);
			}
		});
	}

	/**
	 * Rebuild the metadata index
	 * Chat aliases: "rebuild index", "refresh metadata", "update index"
	 */
	private _registerRebuildMetadataIndexTool() {
		const toolName = "rebuild-metadata-index";
		const paramsSchema = z.object({
			force: z
				.boolean()
				.default(false)
				.optional()
				.describe("Force rebuild even if index exists and is recent"),
		});

		this.server.tool(toolName, paramsSchema.shape, async (params) => {
			const readyCheck = await ensureMemoryBankReady(this.memoryBank);
			if (isError(readyCheck)) {
				return createErrorResponseHelper(readyCheck.error, toolName);
			}

			try {
				const startTime = Date.now();
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
						},
						errors: rebuildResult.errors,
					},
					null,
					2,
				);

				return createSuccessResponse(
					`🔄 Metadata index rebuilt successfully:\n\n${resultText}`,
				);
			} catch (error) {
				return createErrorResponseHelper(
					error instanceof Error
						? error
						: new Error("Unknown error during index rebuild"),
					toolName,
				);
			}
		});
	}
}
