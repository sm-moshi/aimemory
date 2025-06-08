/**
 * MCP Server - Consolidated MCP Server Implementation
 *
 * This module consolidates all MCP server functionality including:
 * - Base MCP server class with common functionality
 * - CLI server implementation for STDIO transport
 * - VS Code adapter for extension integration
 *
 * Consolidated from:
 * - src/mcp/shared/baseMcpServer.ts
 * - src/mcp/mcpServerCliClass.ts
 * - src/mcp/mcpAdapter.ts
 */

import type { ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { ExtensionContext } from "vscode";
import { z } from "zod";

// Core dependencies - updated for consolidated structure
import { CacheManager } from "../core/cache";
import { FileOperationManager } from "../core/file-operations";
import type { MemoryBankManager } from "../core/memory-bank";
import { MemoryBankManager as ConcreteMemoryBankManager } from "../core/memory-bank";
import { StreamingManager } from "../core/streaming";

// Type imports - updated for consolidated structure
import type { AsyncResult, MemoryBankFileType, Result } from "../lib/types/core";
import { MemoryBankError, isError, tryCatchAsync } from "../lib/types/core";
import type { BaseMCPServerConfig, MCPServerCLIOptions, MCPServerInterface } from "../lib/types/operations";
import { UpdateMemoryBankFileSchema } from "../lib/types/system";

// Utility imports - updated for consolidated structure
import {
	createLogger,
	getExtensionVersion,
	launchMCPServerProcess,
	isValidMemoryBankFileType as validateFileType,
} from "../lib/utils";

// MCP tools import - from our consolidated tools
import {
	MemoryBankOperations,
	createErrorResponse,
	createMemoryBankTool,
	createSimpleMemoryBankTool,
	createSuccessResponse,
	ensureMemoryBankReady,
} from "./tools";

// Cursor integration imports
import {
	INITIALIZE_MEMORY_BANK_PROMPT,
	MEMORY_BANK_ALREADY_INITIALIZED_PROMPT,
	registerMemoryBankPrompts,
} from "../cursor-integration";

// Type compatibility alias
type MemoryBankServiceCore = MemoryBankManager;

// ============================================================================
// BASE MCP SERVER CLASS
// ============================================================================

/**
 * Base MCP Server class that provides common functionality
 * for all MCP server implementations, reducing code duplication
 * and ensuring consistent behavior.
 */
export abstract class BaseMCPServer {
	protected readonly server: McpServer;
	protected readonly memoryBank: MemoryBankServiceCore;
	protected readonly logger: ReturnType<typeof createLogger>;
	protected readonly memoryBankPath: string;
	protected readonly serverName: string;

	constructor(config: BaseMCPServerConfig) {
		// Handle flexible path configuration (memoryBankPath or workspacePath)
		const memoryBankPath = config.memoryBankPath ?? config.workspacePath ?? process.cwd();

		// Ensure we have a valid path
		if (!memoryBankPath) {
			throw new Error("MCPServer requires either memoryBankPath or workspacePath to be specified");
		}

		const serverName = config.name ?? "BaseMCPServer";
		const serverVersion = config.version ?? getExtensionVersion();

		this.server = new McpServer(
			{
				name: serverName,
				version: serverVersion,
			},
			{
				capabilities: {
					tools: {},
					resources: {},
				},
			},
		);

		// Initialize memory bank service with the resolved path
		this.memoryBankPath = memoryBankPath;
		this.logger = config.logger ?? createLogger();
		this.serverName = serverName;

		// Create MemoryBankServiceCore with all required dependencies if not provided
		if (config.memoryBank) {
			this.memoryBank = config.memoryBank;
		} else {
			// Create the required dependencies for MemoryBankServiceCore
			const cacheManager = new CacheManager(this.logger);
			const fileOperationManager = new FileOperationManager(this.logger, memoryBankPath);
			const streamingManager = new StreamingManager(this.logger, fileOperationManager, memoryBankPath, {
				sizeThreshold: 1024 * 1024, // 1MB
				chunkSize: 64 * 1024, // 64KB
				timeout: 5000, // 5 seconds
				enableProgressCallbacks: false,
			});

			this.memoryBank = new ConcreteMemoryBankManager(
				memoryBankPath,
				this.logger,
				cacheManager,
				streamingManager,
				fileOperationManager,
			);
		}

		// Set up the server
		this.initializeServer();
	}

	private initializeServer(): void {
		this.registerCommonResources();
		this.registerCommonTools();
		registerMemoryBankPrompts(this.server);

		this.registerCustomResources();
		this.registerCustomTools();
	}

	/**
	 * Registers common resources that all MCP servers need
	 */
	private registerCommonResources(): void {
		this.server.resource("memory-bank-files", "memory-bank://{fileType}", async (uri: URL) => {
			const readyCheck = await ensureMemoryBankReady(this.memoryBank);
			if (isError(readyCheck)) {
				throw readyCheck.error;
			}

			// Extract fileType from URI params
			const params = new URLSearchParams(uri.search);
			const fileType = params.get("fileType");

			if (!fileType) {
				throw new Error("fileType parameter is required");
			}

			const type = this.validateFileType(fileType);
			const file = this.memoryBank.getFile(type);

			if (!file) {
				throw new Error(`File ${type} not found`);
			}

			return {
				contents: [
					{
						uri: uri.toString(),
						text: file.content,
					},
				],
			};
		});

		this.server.resource("memory-bank-root", "memory-bank://", async () => {
			const readyCheck = await ensureMemoryBankReady(this.memoryBank);
			if (isError(readyCheck)) {
				throw readyCheck.error;
			}
			const files = this.memoryBank.getAllFiles();

			return {
				contents: [
					{
						uri: "memory-bank://",
						text: JSON.stringify(
							files.map(file => ({
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
		this.server.tool(
			"init-memory-bank",
			{},
			createSimpleMemoryBankTool(
				this.memoryBank,
				async () => {
					const isInitializedResult = await this.memoryBank.getIsMemoryBankInitialized();
					if (isError(isInitializedResult)) return isInitializedResult;

					const isInitialized = isInitializedResult.data;
					if (!isInitialized) {
						const initFoldersResult = await this.memoryBank.initializeFolders();
						if (isError(initFoldersResult)) return initFoldersResult;
						const loadFilesAfterInitResult = await this.memoryBank.loadFiles();
						if (isError(loadFilesAfterInitResult)) return loadFilesAfterInitResult;
						return {
							success: true,
							data: "Memory bank core initialized, folders created, and files loaded.",
						};
					}

					const loadFilesResult = await this.memoryBank.loadFiles();
					if (isError(loadFilesResult)) return loadFilesResult;
					return {
						success: true,
						data: "Memory bank core already initialized. Files loaded.",
					};
				},
				"Error initializing memory bank core",
			),
		);

		this.server.tool(
			"read-memory-bank-files",
			{},
			createSimpleMemoryBankTool(
				this.memoryBank,
				() => MemoryBankOperations.readAllFiles(this.memoryBank),
				"Error reading memory bank files",
			),
		);

		this.server.tool(
			"update-memory-bank-file",
			{
				fileType: z.string(),
				content: z.string(),
			},
			createMemoryBankTool(
				this.memoryBank,
				(args: { fileType: string; content: string }) => {
					const validationResult = UpdateMemoryBankFileSchema.safeParse(args);
					if (!validationResult.success) {
						const formattedErrors = validationResult.error.errors
							.map(e => `Parameter '${e.path.join(".")}': ${e.message}`)
							.join(", ");
						throw new Error(`Invalid parameters for update-memory-bank-file: ${formattedErrors}`);
					}
					const validatedArgs = validationResult.data;

					return MemoryBankOperations.updateFile(
						this.memoryBank,
						validatedArgs.fileType,
						validatedArgs.content,
					);
				},
				"Error updating memory bank file",
			),
		);

		this.server.tool(
			"list-memory-bank-files",
			{},
			createSimpleMemoryBankTool(
				this.memoryBank,
				() => MemoryBankOperations.listFiles(this.memoryBank),
				"Error listing memory bank files",
			),
		);

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

	protected validateFileType(fileType: string): MemoryBankFileType {
		if (!validateFileType(fileType)) {
			throw new Error(`Invalid file type: ${fileType}`);
		}
		return fileType;
	}

	protected registerCustomResources(): void {
		// Default implementation does nothing
	}

	protected registerCustomTools(): void {
		// Default implementation does nothing
	}

	protected registerReviewAndUpdateTool(): void {
		const toolName = "review-and-update-memory-bank";
		this.server.tool(toolName, {}, async (_params: unknown) => {
			const readyCheck = await ensureMemoryBankReady(this.memoryBank);
			if (isError(readyCheck)) {
				return createErrorResponse(readyCheck.error, toolName);
			}
			const { content, nextAction } = MemoryBankOperations.buildReviewResponsePayload(this.memoryBank);
			return {
				content,
				nextAction,
			};
		});
	}

	getServer(): McpServer {
		return this.server;
	}
}

// ============================================================================
// CLI MCP SERVER IMPLEMENTATION
// ============================================================================

/**
 * Improved CLI-based MCP Server that extends BaseMCPServer and provides proper dependency injection
 * and testability.
 */
export class MCPServerCLI extends BaseMCPServer {
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
}

// ============================================================================
// MCP ADAPTER FOR VS CODE INTEGRATION
// ============================================================================

/**
 * Adapter that provides the same interface as MemoryBankMCPServer
 * but uses the STDIO MCP server via child process management.
 *
 * This allows the extension to gradually migrate from Express to STDIO
 * without breaking the existing extension interface.
 */
export class MemoryBankMCPAdapter implements MCPServerInterface {
	private readonly context: ExtensionContext;
	private readonly memoryBank: MemoryBankServiceCore;
	private readonly logger: ReturnType<typeof createLogger>;
	private childProcess: ChildProcess | null = null;
	private isRunning = false;
	private readonly defaultPort: number; // For compatibility with existing interface

	constructor(
		context: ExtensionContext,
		memoryBankService: MemoryBankServiceCore,
		logger: ReturnType<typeof createLogger>,
		defaultPort = 3000,
	) {
		this.context = context;
		this.defaultPort = defaultPort;
		this.memoryBank = memoryBankService;
		this.logger = logger;
	}

	/**
	 * Start the STDIO MCP server as a child process
	 */
	async start(): Promise<void> {
		if (this.isRunning || this.childProcess) {
			this.logger.info("MCP adapter already running");
			return;
		}

		try {
			// Launch MCP server process using shared utilities
			this.childProcess = await launchMCPServerProcess(this.context, this.logger, {
				onError: (error: Error) => {
					this.logger.error(`MCP server process error: ${error.message}`);
					this.isRunning = false;
					this.childProcess = null;
				},
				onExit: (code: number | null, signal: NodeJS.Signals | null) => {
					this.logger.info(`MCP server process exited with code ${code}, signal ${signal}`);
					this.isRunning = false;
					this.childProcess = null;
				},
				onStderr: (data: Buffer | string) => {
					this.logger.debug(`MCP server stderr: ${data}`);
				},
			});

			this.isRunning = true;
		} catch (error) {
			this.logger.error(`Failed to start MCP adapter: ${error instanceof Error ? error.message : String(error)}`);
			this.cleanup();
			throw error;
		}
	}

	/**
	 * Stop the STDIO MCP server child process
	 */
	stop(): void {
		this.logger.info("Stopping MCP adapter");
		this.cleanup();
	}

	private cleanup(): void {
		if (this.childProcess) {
			this.childProcess.kill("SIGTERM");
			this.childProcess = null;
		}
		this.isRunning = false;
	}

	/**
	 * Get the "port" - returns default port for compatibility with existing interface
	 * Note: STDIO transport doesn't use ports, but we maintain interface compatibility
	 */
	getPort(): number {
		return this.defaultPort;
	}

	/**
	 * Set external server running - for compatibility with existing interface
	 * Note: STDIO transport doesn't use external servers, but we maintain interface compatibility
	 */
	setExternalServerRunning(port: number): void {
		this.logger.info(`setExternalServerRunning called with port ${port} (STDIO adapter ignores this)`);
		// STDIO transport doesn't use external servers, so this is a no-op for compatibility
	}

	/**
	 * Get the memory bank service instance
	 */
	getMemoryBank(): MemoryBankServiceCore {
		return this.memoryBank;
	}

	/**
	 * Update a memory bank file
	 * Note: This delegates to the memory bank service directly for now
	 * In a full implementation, this could communicate with the STDIO server
	 * TODO: Do the full implementation.
	 */
	async updateMemoryBankFile(fileType: string, content: string): Promise<void> {
		try {
			if (this.isServerRunning()) {
				this.logger.info(
					`MCP Adapter WARNING: Child MCP server is running. 'updateMemoryBankFile' for '${fileType}' is being handled directly by the adapter. This is a temporary implementation. Ideally, this should be an MCP tool call to the child server.`,
				);
			} else {
				this.logger.info(
					`MCP Adapter: Child MCP server is not running. Handling 'updateMemoryBankFile' for '${fileType}' directly.`,
				);
			}
			await this.memoryBank.updateFile(fileType as MemoryBankFileType, content);
			this.logger.info(`Updated memory bank file: ${fileType}`);
		} catch (error) {
			this.logger.error(
				`Failed to update memory bank file ${fileType}: ${error instanceof Error ? error.message : String(error)}`,
			);
			throw error;
		}
	}

	/**
	 * Handle command - for compatibility with existing interface
	 * Note: This delegates to the memory bank service directly for now
	 */
	async handleCommand(command: string, args: string[]): Promise<string> {
		this.logger.info(`MCP Adapter: Handling command: ${command} with args: ${args.join(", ")}`);

		const isChildServerRunning = this.isServerRunning();

		if (isChildServerRunning) {
			this.logger.info(
				`MCP Adapter WARNING: Child MCP server is running. Command '${command}' is being handled directly by the adapter. This is a temporary implementation. Ideally, this command should be dispatched to the child server as an MCP tool call.`,
			);
		} else {
			this.logger.info(
				`MCP Adapter: Child MCP server is not running. Handling command '${command}' directly as a fallback.`,
			);
		}

		// For now, delegate to memory bank service
		try {
			switch (command) {
				case "init":
					this.logger.debug(`MCP Adapter: Executing 'init' directly.`);
					await this.memoryBank.initializeFolders();
					await this.memoryBank.loadFiles();
					return "Memory bank initialized successfully";

				case "status": {
					this.logger.debug(`MCP Adapter: Executing 'status' directly.`);
					const health = await this.memoryBank.checkHealth();
					return `Memory bank status: ${health}`;
				}

				default:
					this.logger.info(`MCP Adapter NOTE: Unknown command '${command}' being handled by default case.`);
					return `Unknown command: ${command}`;
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.logger.error(`MCP Adapter: Error handling command '${command}' directly: ${errorMessage}`);
			return `Error executing command '${command}': ${errorMessage}`;
		}
	}

	/**
	 * Check if the adapter is running
	 */
	isServerRunning(): boolean {
		return this.isRunning && this.childProcess !== null && !this.childProcess.killed;
	}
}

// ============================================================================
// FACTORY FUNCTIONS AND EXPORTS
// ============================================================================

/**
 * Factory function for creating CLI server instances
 */
export function createCLIServer(options?: MCPServerCLIOptions): MCPServerCLI {
	return new MCPServerCLI(options);
}

/**
 * Factory function for creating adapter server instances
 */
export function createAdapterServer(
	context: ExtensionContext,
	memoryBankService: MemoryBankServiceCore,
	logger?: ReturnType<typeof createLogger>,
	defaultPort?: number,
): MemoryBankMCPAdapter {
	return new MemoryBankMCPAdapter(
		context,
		memoryBankService,
		logger ?? createLogger({ component: "MCPAdapter" }),
		defaultPort,
	);
}

// Re-export key types for convenience
export type { BaseMCPServerConfig, MCPServerCLIOptions, MCPServerInterface, MemoryBankServiceCore };
