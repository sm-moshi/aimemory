import { resolve } from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { INITIALIZE_MEMORY_BANK_PROMPT, MEMORY_BANK_ALREADY_INITIALIZED_PROMPT } from "../cursor/mcp-prompts";
import type { MemoryBankFileType } from "../types/core";
import { MemoryBankError, isError, tryCatchAsync } from "../types/index";
import type { AsyncResult, Result } from "../types/index";
import type { BaseMCPServerConfig, MCPServerCLIOptions } from "../types/mcpTypes";
import { getExtensionVersion } from "../utils/helpers";
import { createLogger } from "../utils/logging";
import { BaseMCPServer } from "./shared/baseMcpServer";
import {
	MemoryBankOperations,
	createErrorResponse,
	createMemoryBankTool,
	createSuccessResponse,
	ensureMemoryBankReady,
} from "./shared/mcpToolHelpers";

/**
 * Improved CLI-based MCP Server that extends BaseMCPServer and provides proper dependency injection
 * and testability.
 */
export class MCPServerCLI extends BaseMCPServer {
	private readonly logLevel: string;
	constructor(config?: MCPServerCLIOptions) {
		// Handle flexible path configuration
		const { MEMORY_BANK_PATH } = process.env;
		const memoryBankPath = config?.memoryBankPath ?? config?.workspacePath ?? MEMORY_BANK_PATH ?? process.cwd();

		// Create the unified config for the base class
		const baseConfig: BaseMCPServerConfig = {
			memoryBankPath,
			name: config?.name ?? "MCPServerCLI",
			version: config?.version ?? getExtensionVersion(),
			logger: config?.logger ?? createLogger({ component: "MCPServerCLI" }),
		};

		// Call super first
		super(baseConfig);

		// Set CLI-specific properties
		this.logLevel = config?.logLevel ?? "info";
	}

	/**
	 * Registers the 'init-memory-bank' tool with custom prompt handling.
	 */
	private _registerInitMemoryBankTool(): void {
		this.server.tool("init-memory-bank", {}, async () => {
			this.logger.info("Initializing memory bank via CLI tool");
			try {
				const isInitializedResult = await this.memoryBank.getIsMemoryBankInitialized();
				if (isError(isInitializedResult)) {
					this.logger.error("Error checking memory bank initialization status", {
						error: isInitializedResult.error.message,
						errorCode: isInitializedResult.error.code || "UNKNOWN",
						operation: "getIsMemoryBankInitialized",
					});
					return createErrorResponse(
						isInitializedResult.error,
						"Error checking memory bank initialization status",
					);
				}
				const isInitialized = isInitializedResult.data;

				if (!isInitialized) {
					const initFoldersResult = await this.memoryBank.initializeFolders();
					if (isError(initFoldersResult)) {
						this.logger.error("Error initializing memory bank folders", {
							error: initFoldersResult.error.message,
							errorCode: initFoldersResult.error.code || "UNKNOWN",
							operation: "initializeFolders",
						});
						return createErrorResponse(initFoldersResult.error, "Error initializing memory bank folders");
					}
					const loadFilesResult = await this.memoryBank.loadFiles();
					if (isError(loadFilesResult)) {
						this.logger.error("Error loading files after folder initialization", {
							error: loadFilesResult.error.message,
							errorCode: loadFilesResult.error.code || "UNKNOWN",
							operation: "loadFiles",
						});
						return createErrorResponse(
							loadFilesResult.error,
							"Error loading files after folder initialization",
						);
					}
					this.logger.info("Memory bank not initialized, sending initialization prompt");
					return createSuccessResponse(INITIALIZE_MEMORY_BANK_PROMPT);
				}
				const loadFilesResult = await this.memoryBank.loadFiles();
				if (isError(loadFilesResult)) {
					this.logger.error("Error loading files for already initialized bank", {
						error: loadFilesResult.error.message,
						errorCode: loadFilesResult.error.code || "UNKNOWN",
						operation: "loadFiles",
					});
					return createErrorResponse(loadFilesResult.error, "Error loading files");
				}
				return createSuccessResponse(MEMORY_BANK_ALREADY_INITIALIZED_PROMPT);
			} catch (error) {
				this.logger.error("Error in init-memory-bank tool", {
					error: error instanceof Error ? error.message : String(error),
					operation: "init-memory-bank",
				});
				return createErrorResponse(error, "Error initializing memory bank via CLI tool");
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
				async ({ fileType }: { fileType: string }): AsyncResult<string, MemoryBankError> => {
					const result = await tryCatchAsync(async () => {
						const file = this.memoryBank.getFile(fileType as MemoryBankFileType);
						if (!file) {
							throw new MemoryBankError(`File ${fileType} not found.`, "FILE_NOT_FOUND");
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
				"Error reading memory bank file via CLI tool",
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
						"Error preparing memory bank for review via CLI tool",
					);
				}

				const payload = MemoryBankOperations.buildReviewResponsePayload(this.memoryBank);

				return {
					content: payload.content,
					nextAction: payload.nextAction,
				};
			} catch (error) {
				this.logger.error("Unexpected error in review-and-update-memory-bank CLI tool", {
					error: error instanceof Error ? error.message : String(error),
					operation: "review-and-update-memory-bank",
				});
				return createErrorResponse(error, "Unexpected error reviewing memory bank via CLI tool");
			}
		});
	}

	/**
	 * Register CLI-specific tools with custom initialization logic Note: init-memory-bank tool is
	 * already registered by BaseMCPServer.registerCommonTools()
	 */
	protected override registerCustomTools(): void {
		this._registerReadMemoryBankFileTool();
		this._registerReviewAndUpdateTool();
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
			throw new Error("Workspace path argument not provided. MCP server cannot start without a workspace path.");
		}

		// Create a temporary logger for initialization logging
		const tempLogger = createLogger({ component: "MCPServerCLI-init" });

		tempLogger.info("Workspace argument (used as memoryBankPath)", {
			workspaceArg,
			operation: "fromCommandLineArgs",
		});
		tempLogger.info("Full memory bank directory", {
			memoryBankPath: resolve(workspaceArg, "memory-bank"),
			operation: "fromCommandLineArgs",
		});

		return new MCPServerCLI({
			memoryBankPath: workspaceArg,
			logger: createLogger({ component: "MCPServerCLI" }),
		});
	}

	/**
	 * Register metadata-specific tools
	 */
	private _registerMetadataTools(): void {
		this.metadataToolRegistrar.registerQueryMemoryIndexTool(this.server);
		this.metadataToolRegistrar.registerValidateMemoryFileTool(this.server);
		this.metadataToolRegistrar.registerRebuildMetadataIndexTool(this.server);
	}
}
