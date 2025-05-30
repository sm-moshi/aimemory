import { MemoryBankServiceCore } from "../core/memoryBankServiceCore.js";
import type { CoreMemoryBankConfig, MCPServerConfig } from "../types/mcpTypes.js";
import { BaseMCPServer } from "./shared/baseMcpServer.js";
import { createErrorResponse } from "./shared/mcpToolHelpers.js";

export class CoreMemoryBankMCP extends BaseMCPServer {
	constructor(config: CoreMemoryBankConfig) {
		const memoryBank = new MemoryBankServiceCore(config.memoryBankPath, config.logger);

		const serverConfig: MCPServerConfig = {
			name: "AI Memory MCP Server",
			version: "0.7.1",
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
		this.server.tool("review-and-update-memory-bank", {}, () =>
			this.handleReviewAndUpdateMemoryBank(),
		);
	}

	private async handleReviewAndUpdateMemoryBank() {
		try {
			await this.memoryBank.loadFiles();
			const files = this.memoryBank.getAllFiles();
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
		} catch (error) {
			return createErrorResponse(error, "Error reviewing memory bank");
		}
	}
}
