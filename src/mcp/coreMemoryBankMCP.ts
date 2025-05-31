import { MemoryBankServiceCore } from "../core/memoryBankServiceCore.js";
import type { CoreMemoryBankConfig, MCPResponse, MCPServerConfig } from "../types/mcpTypes.js";
import { isError } from "../types/types.js"; // Import isError
import type { MemoryBankError, MemoryBankFileType, Result } from "../types/types.js";
import { BaseMCPServer } from "./shared/baseMcpServer.js";
import { createErrorResponse } from "./shared/mcpToolHelpers.js";

export class CoreMemoryBankMCP extends BaseMCPServer {
	constructor(config: CoreMemoryBankConfig) {
		const memoryBank = new MemoryBankServiceCore(config.memoryBankPath, config.logger);

		const serverConfig: MCPServerConfig = {
			name: "AI Memory MCP Server",
			version: "0.8.0-dev.1",
			memoryBank,
			logger: config.logger,
		};

		super(serverConfig);
	}

	/**
	 * Register custom tools specific to CoreMemoryBankMCP
	 */
	protected registerCustomTools(): void {
		// review-and-update-memory-bank - this one needs custom logic
		// Manually handle AsyncResult and return appropriate MCPResponse
		this.server.tool("review-and-update-memory-bank", {}, () =>
			this.handleReviewAndUpdateMemoryBank(),
		);
	}

	private async handleReviewAndUpdateMemoryBank(): Promise<MCPResponse> {
		const loadFilesResult: Result<MemoryBankFileType[], MemoryBankError> =
			await this.memoryBank.loadFiles();

		if (isError(loadFilesResult)) {
			// If loading files failed, return an error response
			return createErrorResponse(
				loadFilesResult.error,
				"Error loading memory bank files for review",
			);
		}

		// If loading files was successful, proceed with original logic
		const files = this.memoryBank.getAllFiles(); // Assuming getAllFiles is synchronous or handles errors internally
		const reviewMessages = files.map((file) => ({
			type: "text" as const,
			text: `File: ${file.type}\n\n${file.content}\n\nDo you want to update this file? If yes, reply with the new content. If no, reply 'skip'.`,
		}));
		return {
			content: reviewMessages,
			nextAction: {
				type: "collect-updates",
				files: files.map((file) => file.type),
			},
		};
	}
}
