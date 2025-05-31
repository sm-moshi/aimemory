import { resolve } from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CacheManager } from "../core/CacheManager.js";
import { FileOperationManager } from "../core/FileOperationManager.js";
import { MemoryBankServiceCore } from "../core/memoryBankServiceCore.js";
import { StreamingManager } from "../performance/StreamingManager.js";
import {
	INITIALIZE_MEMORY_BANK_PROMPT,
	MEMORY_BANK_ALREADY_INITIALIZED_PROMPT,
} from "../services/cursor/mcp-prompts.js";
import type { MemoryBankFileType } from "../types/core.js";
import { MemoryBankError, isError, tryCatchAsync } from "../types/index.js";
import type { AsyncResult, Result } from "../types/index.js";
import type {
	CLIServerConfig,
	MCPServerInstanceConfig as MCPServerConfig,
} from "../types/mcpTypes.js";
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
		const logger = config.logger ?? console; // Ensure logger is defined
		const memoryBankDir = resolve(config.workspacePath, "memory-bank");

		const cacheManager = new CacheManager(logger);
		const streamingManager = new StreamingManager(logger);
		const fileOperationManager = new FileOperationManager(logger);
		const memoryBank = new MemoryBankServiceCore(
			memoryBankDir,
			logger, // Pass the defined logger
			cacheManager,
			streamingManager,
			fileOperationManager,
		);

		const serverConfig: MCPServerConfig = {
			name: "AI Memory MCP Server",
			version: "0.8.0-dev.1",
			memoryBank,
			logger, // Pass the defined logger to BaseMCPServer config
		};

		super(serverConfig);
		this.workspacePath = config.workspacePath;
	}

	/**
	 * Registers the 'init-memory-bank' tool with custom prompt handling.
	 */
	private _registerInitMemoryBankTool(): void {
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
	}

	/**
	 * Registers the 'read-memory-bank-file' tool.
	 */
	private _registerReadMemoryBankFileTool(): void {
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
	}

	/**
	 * Registers the 'review-and-update-memory-bank' tool.
	 */
	private _registerReviewAndUpdateTool(): void {
		this.server.tool("review-and-update-memory-bank", {}, async () => {
			try {
				const readyResult = await ensureMemoryBankReady(this.memoryBank);
				if (isError(readyResult)) {
					return createErrorResponse(
						readyResult.error,
						"Error preparing memory bank for review",
					);
				}

				const payload = MemoryBankOperations.buildReviewResponsePayload(this.memoryBank);

				return {
					content: payload.content,
					nextAction: payload.nextAction,
				};
			} catch (error) {
				this.logger.error?.("Unexpected error in review-and-update-memory-bank:", error) ??
					console.error("Unexpected error in review-and-update-memory-bank:", error);
				return createErrorResponse(error, "Unexpected error reviewing memory bank");
			}
		});
	}

	/**
	 * Registers tools that use the enhanced logging helper.
	 */
	private _registerLoggingEnhancedTools(): void {
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
	}

	/**
	 * Register CLI-specific tools with custom initialization logic
	 */
	protected registerCustomTools(): void {
		this._registerInitMemoryBankTool();
		this._registerReadMemoryBankFileTool();
		this._registerLoggingEnhancedTools();
		this._registerReviewAndUpdateTool();
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
