import type { z } from "zod";

import { MemoryBankError } from "@/types/errorHandling.js";
import type { AsyncResult } from "@/types/index.js";
import type { CoreMemoryBankConfig } from "@/types/mcpTypes.js";
import { ReadMemoryBankFileSchema } from "@/types/validation.js";
import { validateFileType } from "@/utils/common/type-guards.js";
import { getExtensionVersion } from "@utils/version.js";
import { BaseMCPServer, type BaseMCPServerConfig } from "./shared/baseMcpServer.js";
import { createMemoryBankTool } from "./shared/mcpToolHelpers.js";

/**
 * Core MCP Server for Memory Bank operations.
 * Extends BaseMCPServer and registers tools specific to core memory bank functionalities.
 */
export class CoreMemoryBankMCP extends BaseMCPServer {
	constructor(config: CoreMemoryBankConfig) {
		// Handle flexible path configuration - require at least one path
		const memoryBankPath = config.memoryBankPath ?? config.workspacePath;

		if (!memoryBankPath) {
			throw new Error(
				"CoreMemoryBankMCP requires either memoryBankPath or workspacePath to be specified",
			);
		}

		// Create the unified config for the base class
		const baseConfig: BaseMCPServerConfig = {
			memoryBankPath,
			name: config.name ?? "CoreMemoryBankMCP",
			version: config.version ?? getExtensionVersion(),
			logger: config.logger ?? console,
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
		this._registerMetadataTools();

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
				async (
					params: z.infer<typeof ReadMemoryBankFileSchema>,
				): AsyncResult<string, MemoryBankError> => {
					const type = validateFileType(params.fileType);

					const file = this.memoryBank.getFile(type);
					if (!file) {
						return {
							success: false,
							error: new MemoryBankError(
								`File ${params.fileType} not found.`,
								"FILE_NOT_FOUND",
							),
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
