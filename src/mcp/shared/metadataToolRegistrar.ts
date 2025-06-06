import type { MetadataIndexManager } from "@/metadata/MetadataIndexManager.js";
import type { MetadataSearchEngine } from "@/metadata/MetadataSearchEngine.js";
// Assuming a generic console type or specific Logger type if consistently available
// For now, let\'s use console for broader compatibility or expect a Logger interface.
// import type { Logger } from "../../utils/vscode/vscode-logger.js";
import { isError } from "@/types/errorHandling.js";
import type { MemoryBankServiceCore } from "@core/memoryBankServiceCore.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
	createErrorResponse as createErrorResponseHelper,
	createSuccessResponse,
	ensureMemoryBankReady,
} from "./mcpToolHelpers.js";

export class MetadataToolRegistrar {
	private metadataInitialized = false;

	constructor(
		private readonly memoryBank: MemoryBankServiceCore,
		private readonly metadataIndexManager: MetadataIndexManager,
		private readonly metadataSearchEngine: MetadataSearchEngine,
		private readonly logger: Console, // Using Console for now, can be typed to Logger if preferred
		// TODO: Should we be using a logger instead of Console?
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
			validationStatus: z
				.enum(["valid", "invalid", "unchecked", "schema_not_found"])
				.optional(),
			limit: z.number().min(1).max(100).default(50).optional(),
			offset: z.number().min(0).default(0).optional(),
			query: z.string().optional().describe("Text search in title and file paths"),
		});

		server.tool(toolName, paramsSchema.shape, async params => {
			const readyCheck = await ensureMemoryBankReady(this.memoryBank);
			if (isError(readyCheck)) {
				return createErrorResponseHelper(readyCheck.error, toolName);
			}

			try {
				await this.ensureMetadataReady();
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
				return createErrorResponseHelper(
					error instanceof Error
						? error
						: new Error("Unknown error during metadata search"),
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

		server.tool(toolName, paramsSchema.shape, async params => {
			const readyCheck = await ensureMemoryBankReady(this.memoryBank);
			if (isError(readyCheck)) {
				return createErrorResponseHelper(readyCheck.error, toolName);
			}
			try {
				await this.ensureMetadataReady();
				let entry = this.metadataIndexManager.getEntry(params.relativePath);
				if (!entry) {
					await this.metadataIndexManager.updateEntry(params.relativePath);
					entry = this.metadataIndexManager.getEntry(params.relativePath);
				}
				if (!entry) {
					throw new Error(
						`File not found after attempting update: ${params.relativePath}`,
					);
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
				return createErrorResponseHelper(
					error instanceof Error
						? error
						: new Error("Unknown error during file validation"),
					toolName,
				);
			}
		});
	}

	public registerRebuildMetadataIndexTool(server: McpServer): void {
		const toolName = "rebuild-metadata-index";
		const paramsSchema = z.object({
			force: z
				.boolean()
				.default(false)
				.optional()
				.describe("Force rebuild even if index exists"),
		});

		server.tool(toolName, paramsSchema.shape, async _params => {
			const readyCheck = await ensureMemoryBankReady(this.memoryBank);
			if (isError(readyCheck)) {
				return createErrorResponseHelper(readyCheck.error, toolName);
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
				return createSuccessResponse(
					`🔄 Metadata index rebuilt successfully:\n\n${resultText}`,
				);
			} catch (error) {
				this.logger.error(`Error in ${toolName}:`, error);
				return createErrorResponseHelper(
					error instanceof Error
						? error
						: new Error("Unknown error during index rebuild"),
					toolName,
				);
			}
		});
	}

	public registerGetMetadataForFileTool(server: McpServer): void {
		const toolName = "get-metadata-for-file";
		const paramsSchema = z.object({
			relativePath: z
				.string()
				.describe("Relative path to the memory bank file to get metadata for"),
		});

		server.tool(toolName, paramsSchema.shape, async params => {
			const readyCheck = await ensureMemoryBankReady(this.memoryBank);
			if (isError(readyCheck)) {
				return createErrorResponseHelper(readyCheck.error, toolName);
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
					return createErrorResponseHelper(
						new Error(`File not found in metadata index: ${params.relativePath}`),
						toolName,
						"FILE_NOT_FOUND",
					);
				}

				const resultText = JSON.stringify(entry, null, 2);
				return {
					success: true,
					content: `📄 Metadata for ${params.relativePath}:\n\n${resultText}`,
				};
			} catch (error) {
				this.logger.error(`Error in ${toolName}:`, error);
				return createErrorResponseHelper(
					error instanceof Error
						? error
						: new Error("Unknown error retrieving metadata for file"),
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
				return createErrorResponseHelper(readyCheck.error, toolName);
			}
			try {
				await this.ensureMetadataReady();
				const stats = await this.metadataIndexManager.getIndexStats();
				const resultText = JSON.stringify(stats, null, 2);
				return {
					success: true,
					content: `📊 Metadata Index Stats:\n\n${resultText}`,
				};
			} catch (error) {
				this.logger.error(`Error in ${toolName}:`, error);
				return createErrorResponseHelper(
					error instanceof Error
						? error
						: new Error("Unknown error retrieving index stats"),
					toolName,
				);
			}
		});
	}
}
