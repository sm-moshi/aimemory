import type { CoreMemoryBankConfig } from "@/types/mcpTypes.js";
import { getMCPServerVersion } from "@utils/version.js";
import { BaseMCPServer } from "./shared/baseMcpServer.js";

/**
 * MCP Server providing metadata operations for memory bank files
 * Includes search, validation, and indexing capabilities
 */
export class MetadataMemoryBankMCP extends BaseMCPServer {
	constructor(config: CoreMemoryBankConfig) {
		// Handle flexible path configuration - require at least one path
		const memoryBankPath = config.memoryBankPath ?? config.workspacePath;

		if (!memoryBankPath) {
			throw new Error(
				"MetadataMemoryBankMCP requires either memoryBankPath or workspacePath to be specified",
			);
		}

		// Pass config to BaseMCPServer, which handles all initializations
		super({
			memoryBankPath,
			logger: config.logger ?? console,
			name: config.name ?? "MetadataMemoryBankMCP", // Default name for this specific server
			version: config.version ?? getMCPServerVersion("metadata"), // Use suffix for this specific server
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
