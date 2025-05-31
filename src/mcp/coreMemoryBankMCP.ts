import { CacheManager } from "../core/CacheManager.js";
import { FileOperationManager } from "../core/FileOperationManager.js";
import { MemoryBankServiceCore } from "../core/memoryBankServiceCore.js";
import { StreamingManager } from "../performance/StreamingManager.js";
import { MemoryBankFileType } from "../types/core.js";
import { isError } from "../types/errorHandling.js";
import type { CoreMemoryBankConfig } from "../types/mcpTypes.js";

import { z } from "zod";
import { BaseMCPServer } from "./shared/baseMcpServer.js";
import {
	MemoryBankOperations,
	createErrorResponse as createErrorResponseHelper,
	createSuccessResponse,
	ensureMemoryBankReady,
} from "./shared/mcpToolHelpers.js";

export class CoreMemoryBankMCP extends BaseMCPServer {
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
			name: "CoreMemoryBankMCP",
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
		this.registerCustomTools();
	}

	/**
	 * Register custom tools specific to CoreMemoryBankMCP
	 */
	protected registerCustomTools(): void {
		this._registerInitMemoryBankTool();
		this._registerReadMemoryBankFileTool();
		this._registerReviewAndUpdateTool();
		this._registerLoggingEnhancedTools();
	}

	private _registerInitMemoryBankTool() {
		// ... existing code ...
	}

	private _registerReadMemoryBankFileTool() {
		const toolName = "read-memory-bank-file";
		const paramsSchema = z.object({
			fileType: z.nativeEnum(MemoryBankFileType),
			tokens: z.number().optional(),
		});

		this.server.tool(toolName, paramsSchema.shape, async (params) => {
			const readyCheck = await ensureMemoryBankReady(this.memoryBank);
			if (isError(readyCheck)) {
				return createErrorResponseHelper(readyCheck.error, toolName);
			}

			const file = this.memoryBank.getFile(params.fileType);

			if (!file) {
				return createErrorResponseHelper(
					new Error(`File ${params.fileType} not found in memory bank.`),
					toolName,
				);
			}

			let contentToReturn = file.content;
			if (params.tokens) {
				// Basic token approximation (e.g., ~4 chars per token)
				const charLimit = params.tokens * 4;
				contentToReturn = contentToReturn.substring(0, charLimit);
				if (contentToReturn.length < file.content.length) {
					contentToReturn += "\n... (content truncated)";
				}
			}

			// Format metadata as text and return structured MCP response
			const metadataText = JSON.stringify(
				{
					metadata: file.metadata || {},
					validationStatus: file.validationStatus ?? "unchecked",
					validationErrors: file.validationErrors,
					actualSchemaUsed: file.actualSchemaUsed,
				},
				null,
				2,
			);

			return createSuccessResponse(`${contentToReturn}\n\n--- Metadata ---\n${metadataText}`);
		});
	}

	private _registerReviewAndUpdateTool() {
		const toolName = "review-and-update-memory-bank";
		this.server.tool(toolName, {}, async (_params: unknown) => {
			const readyCheck = await ensureMemoryBankReady(this.memoryBank);
			if (isError(readyCheck)) {
				return createErrorResponseHelper(readyCheck.error, toolName);
			}
			const { content, nextAction } = MemoryBankOperations.buildReviewResponsePayload(
				this.memoryBank,
			);
			return {
				content,
				nextAction: nextAction,
			};
		});
	}

	private _registerLoggingEnhancedTools() {
		// TODO: ... existing code ...
	}
}
