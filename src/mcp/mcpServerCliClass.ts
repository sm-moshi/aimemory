import { resolve } from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { MemoryBankServiceCore } from "../core/memoryBankServiceCore.js";
import {
	INITIALIZE_MEMORY_BANK_PROMPT,
	MEMORY_BANK_ALREADY_INITIALIZED_PROMPT,
} from "../lib/mcp-prompts.js";
import type { CLIServerConfig, MCPServerConfig } from "../types/mcpTypes.js";
import type { AsyncResult, MemoryBankFileType, Result } from "../types/types.js";
import { MemoryBankError, isError, tryCatchAsync } from "../types/types.js";
import { BaseMCPServer } from "./shared/baseMcpServer.js";
import {
	MemoryBankOperations,
	createErrorResponse,
	createMemoryBankTool,
	createSuccessResponse,
	ensureMemoryBankReady,
} from "./shared/mcpToolHelpers.js";

/**
 * Improved CLI-based MCP Server that extends BaseMCPServer
 * and provides proper dependency injection and testability.
 */
export class MCPServerCLI extends BaseMCPServer {
	private readonly workspacePath: string;

	constructor(config: CLIServerConfig) {
		const memoryBankDir = resolve(config.workspacePath, "memory-bank");
		const memoryBank = new MemoryBankServiceCore(memoryBankDir, config.logger);

		const serverConfig: MCPServerConfig = {
			name: "AI Memory MCP Server",
			version: "0.8.0-dev.1",
			memoryBank,
			logger: config.logger,
		};

		super(serverConfig);
		this.workspacePath = config.workspacePath;
	}

	/**
	 * Register CLI-specific tools with custom initialization logic
	 */
	protected registerCustomTools(): void {
		// Override init-memory-bank with custom prompt handling
		this.server.tool("init-memory-bank", {}, async () => {
			this.logger.info?.("Initializing memory bank") ??
				console.log("Initializing memory bank");
			try {
				const isInitialized = await this.memoryBank.getIsMemoryBankInitialized();
				if (!isInitialized) {
					await this.memoryBank.initializeFolders();
					this.logger.info?.(
						"Memory bank not initialized, sending initialization prompt",
					) ?? console.log("Memory bank not initialized, sending initialization prompt");
					return createSuccessResponse(INITIALIZE_MEMORY_BANK_PROMPT);
				}
				// Load memory bank files into memory
				await this.memoryBank.loadFiles();
				return createSuccessResponse(MEMORY_BANK_ALREADY_INITIALIZED_PROMPT);
			} catch (error) {
				this.logger.error?.("Error initializing memory bank:", error) ??
					console.error("Error initializing memory bank:", error);
				return createErrorResponse(error, "Error initializing memory bank");
			}
		});

		// Add read-memory-bank-file tool specific to CLI
		this.server.tool(
			"read-memory-bank-file",
			{ fileType: z.string() },
			createMemoryBankTool(
				this.memoryBank,
				async ({
					fileType,
				}: { fileType: string }): AsyncResult<string, MemoryBankError> => {
					const result = await tryCatchAsync(async () => {
						const file = this.memoryBank.getFile(fileType as MemoryBankFileType);
						if (!file) {
							throw new MemoryBankError(
								`File ${fileType} not found.`,
								"FILE_NOT_FOUND",
							);
						}
						return file.content;
					});

					if (isError(result)) {
						if (result.error instanceof MemoryBankError) {
							return result as Result<string, MemoryBankError>;
						}
						return {
							success: false,
							error: new MemoryBankError(
								`An unexpected error occurred while reading file ${fileType}: ${result.error.message}`,
								"READ_FILE_UNEXPECTED_ERROR",
								{ originalError: result.error },
							),
						};
					}

					return result;
				},
				"Error reading memory bank file",
			),
		);

		// Override tools with enhanced logging
		this.registerToolWithLogging("read-memory-bank-files", async () => {
			this.logger.info?.("Reading memory bank files") ??
				console.log("Reading memory bank files");
			const result = await MemoryBankOperations.readAllFiles(this.memoryBank);
			this.logger.info?.("Memory Bank Files Read Successfully.") ??
				console.log("Memory Bank Files Read Successfully.");
			return result;
		});

		this.registerToolWithLogging("list-memory-bank-files", async () => {
			this.logger.info?.("Listing memory bank files") ??
				console.log("Listing memory bank files");
			const result = await MemoryBankOperations.listFiles(this.memoryBank);
			this.logger.info?.("Memory Bank Files Listed Successfully.") ??
				console.log("Memory Bank Files Listed Successfully.");
			return result;
		});

		// review-and-update-memory-bank with readiness check
		this.server.tool("review-and-update-memory-bank", {}, async () => {
			try {
				await ensureMemoryBankReady(this.memoryBank);
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
		});
	}

	/**
	 * Helper method to register tools with enhanced logging
	 */
	private registerToolWithLogging(
		toolName: string,
		handler: () => AsyncResult<string, MemoryBankError>,
	): void {
		this.server.tool(
			toolName,
			{},
			createMemoryBankTool(this.memoryBank, handler, `Error executing ${toolName}`),
		);
	}

	/**
	 * Connect to STDIO transport
	 */
	connect(): void {
		const transport = new StdioServerTransport();
		this.server.connect(transport);
	}

	/**
	 * Static factory method for creating from command line arguments
	 */
	static fromCommandLineArgs(args: string[] = process.argv): MCPServerCLI {
		const workspaceArg = args[2];

		if (!workspaceArg) {
			throw new Error(
				"Workspace path argument not provided. MCP server cannot start without a workspace path.",
			);
		}

		console.error(`[MCPServerCLI] Workspace argument: ${workspaceArg}`);
		console.error(
			`[MCPServerCLI] Memory bank directory: ${resolve(workspaceArg, "memory-bank")}`,
		);

		return new MCPServerCLI({
			workspacePath: workspaceArg,
			logger: console,
		});
	}
}
