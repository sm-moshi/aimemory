import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MemoryBankServiceCore } from "../core/memoryBankServiceCore.js";
import { registerMemoryBankPrompts } from "../lib/mcp-prompts-registry.js";
import type { MemoryBankFileType } from "../types/types.js";
import {
	MemoryBankOperations,
	createMemoryBankTool,
	createSimpleMemoryBankTool,
} from "./shared/mcpToolHelpers.js";

export class CoreMemoryBankMCP {
	private readonly server: McpServer;
	private readonly memoryBank: MemoryBankServiceCore;

	constructor(config: { memoryBankPath: string; logger?: Console }) {
		this.memoryBank = new MemoryBankServiceCore(config.memoryBankPath, config.logger);
		this.server = new McpServer(
			{
				name: "AI Memory MCP Server",
				version: "0.7.1",
			},
			{
				capabilities: {
					logging: {},
					tools: {},
				},
			},
		);
		this.registerResources();
		this.registerTools();
		registerMemoryBankPrompts(this.server);
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
			return {
				content: [
					{
						type: "text" as const,
						text: `Error reviewing memory bank: ${error instanceof Error ? error.message : String(error)}`,
					},
				],
				isError: true,
			};
		}
	}

	private registerResources() {
		// Register per-file resource for each memory bank file
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
				const type = fileType as MemoryBankFileType;
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
		// review-and-update-memory-bank - this one needs custom logic, kept as-is
		this.server.tool("review-and-update-memory-bank", {}, () =>
			this.handleReviewAndUpdateMemoryBank(),
		);
	}

	private registerTools() {
		// initialize-memory-bank - complexity reduced from ~20 to ~3
		this.server.tool(
			"init-memory-bank",
			{},
			createSimpleMemoryBankTool(
				this.memoryBank,
				() => MemoryBankOperations.initialize(this.memoryBank),
				"Error initializing memory bank",
			),
		);

		// read-memory-bank-files - complexity reduced from ~15 to ~3
		this.server.tool(
			"read-memory-bank-files",
			{},
			createSimpleMemoryBankTool(
				this.memoryBank,
				() => MemoryBankOperations.readAllFiles(this.memoryBank),
				"Error reading memory bank files",
			),
		);

		// update-memory-bank-file - complexity reduced from ~15 to ~3
		this.server.tool(
			"update-memory-bank-file",
			{
				fileType: z.string(),
				content: z.string(),
			},
			createMemoryBankTool(
				this.memoryBank,
				({ fileType, content }: { fileType: string; content: string }) =>
					MemoryBankOperations.updateFile(this.memoryBank, fileType, content),
				"Error updating memory bank file",
			),
		);

		// list-memory-bank-files - complexity reduced from ~15 to ~3
		this.server.tool(
			"list-memory-bank-files",
			{},
			createSimpleMemoryBankTool(
				this.memoryBank,
				() => MemoryBankOperations.listFiles(this.memoryBank),
				"Error listing memory bank files",
			),
		);

		// health-check-memory-bank - complexity reduced from ~8 to ~3
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

	getServer() {
		return this.server;
	}
}
