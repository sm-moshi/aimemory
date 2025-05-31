import { CacheManager } from "../core/CacheManager.js";
import { FileOperationManager } from "../core/FileOperationManager.js";
import { MemoryBankServiceCore } from "../core/memoryBankServiceCore.js";
import { StreamingManager } from "../performance/StreamingManager.js";
import { isError } from "../types/errorHandling.js";
import type { CoreMemoryBankConfig } from "../types/mcpTypes.js";

import { BaseMCPServer } from "./shared/baseMcpServer.js";
import {
	MemoryBankOperations,
	createErrorResponse as createErrorResponseHelper,
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
		// ... existing code ...
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
		// ... existing code ...
	}
}
