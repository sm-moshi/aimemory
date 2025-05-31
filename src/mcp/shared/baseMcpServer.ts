import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MemoryBankServiceCore } from "../../core/memoryBankServiceCore.js";
import { registerMemoryBankPrompts } from "../../services/cursor/mcp-prompts-registry.js";
import { validateFileType } from "../../services/validation/type-guards.js";
import type { MemoryBankFileType } from "../../types/core.js";
import type { MCPServerInstanceConfig as MCPServerConfig } from "../../types/mcpTypes.js";
import { UpdateMemoryBankFileSchema, validateMCPToolParams } from "../../types/validation.js";
import {
	MemoryBankOperations,
	createMemoryBankTool,
	createSimpleMemoryBankTool,
	ensureMemoryBankReady,
} from "./mcpToolHelpers.js";

/**
 * Base MCP Server class that provides common functionality
 * for all MCP server implementations, reducing code duplication
 * and ensuring consistent behavior.
 */
export abstract class BaseMCPServer {
	protected readonly server: McpServer;
	protected readonly memoryBank: MemoryBankServiceCore;
	protected readonly logger: Console;

	constructor(config: MCPServerConfig) {
		this.memoryBank = config.memoryBank;
		this.logger = config.logger ?? console;

		this.server = new McpServer(
			{
				name: config.name,
				version: config.version,
			},
			{
				capabilities: {
					logging: {},
					tools: {},
				},
			},
		);

		this.initialize();
	}

	private initialize(): void {
		this.registerCommonResources();
		this.registerCommonTools();
		registerMemoryBankPrompts(this.server);

		// Allow subclasses to register additional resources/tools
		this.registerCustomResources();
		this.registerCustomTools();
	}

	/**
	 * Registers common resources that all MCP servers need
	 */
	private registerCommonResources(): void {
		// Individual memory bank files via URI template
		this.server.resource(
			"memory-bank-files",
			new ResourceTemplate("memory-bank://{fileType}", {
				list: async () => ({
					resources: [
						{
							uri: "memory-bank://",
							name: "Memory Bank Files",
						},
					],
				}),
			}),
			async (uri, { fileType }) => {
				await ensureMemoryBankReady(this.memoryBank);
				const type = this.validateFileType(
					Array.isArray(fileType) ? fileType[0] : fileType,
				);
				const file = this.memoryBank.getFile(type);

				if (!file) {
					throw new Error(`File ${type} not found`);
				}

				return {
					contents: [
						{
							uri: uri.href,
							text: file.content,
						},
					],
				};
			},
		);

		// Root resource to list all memory bank files
		this.server.resource("memory-bank-root", "memory-bank://", async () => {
			await ensureMemoryBankReady(this.memoryBank);
			const files = this.memoryBank.getAllFiles();

			return {
				contents: [
					{
						uri: "memory-bank://",
						text: JSON.stringify(
							files.map((file) => ({
								type: file.type,
								lastUpdated: file.lastUpdated,
							})),
							null,
							2,
						),
					},
				],
			};
		});
	}

	/**
	 * Registers common tools that all MCP servers need
	 */
	private registerCommonTools(): void {
		// Initialize memory bank
		this.server.tool(
			"init-memory-bank",
			{},
			createSimpleMemoryBankTool(
				this.memoryBank,
				() => MemoryBankOperations.initialize(this.memoryBank),
				"Error initializing memory bank",
			),
		);

		// Read all memory bank files
		this.server.tool(
			"read-memory-bank-files",
			{},
			createSimpleMemoryBankTool(
				this.memoryBank,
				() => MemoryBankOperations.readAllFiles(this.memoryBank),
				"Error reading memory bank files",
			),
		);

		// Update memory bank file
		this.server.tool(
			"update-memory-bank-file",
			{
				fileType: z.string(),
				content: z.string(),
			},
			createMemoryBankTool(
				this.memoryBank,
				(args: { fileType: string; content: string }) => {
					const validated = validateMCPToolParams(
						"update-memory-bank-file",
						args,
						UpdateMemoryBankFileSchema,
					);
					return MemoryBankOperations.updateFile(
						this.memoryBank,
						validated.fileType,
						validated.content,
					);
				},
				"Error updating memory bank file",
			),
		);

		// List memory bank files
		this.server.tool(
			"list-memory-bank-files",
			{},
			createSimpleMemoryBankTool(
				this.memoryBank,
				() => MemoryBankOperations.listFiles(this.memoryBank),
				"Error listing memory bank files",
			),
		);

		// Health check memory bank
		this.server.tool(
			"health-check-memory-bank",
			{},
			createSimpleMemoryBankTool(
				this.memoryBank,
				() => MemoryBankOperations.checkHealth(this.memoryBank),
				"Error checking memory bank health",
			),
		);
	}

	/**
	 * Type guard for MemoryBankFileType with runtime validation
	 */
	private validateFileType(fileType: string): MemoryBankFileType {
		return validateFileType(fileType);
	}

	/**
	 * Override in subclasses to register custom resources
	 */
	protected registerCustomResources(): void {
		// Default implementation does nothing
	}

	/**
	 * Override in subclasses to register custom tools
	 */
	protected registerCustomTools(): void {
		// Default implementation does nothing
	}

	/**
	 * Get the underlying MCP server instance
	 */
	getServer(): McpServer {
		return this.server;
	}
}
