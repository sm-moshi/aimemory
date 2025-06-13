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

import { resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Core dependencies - updated for consolidated structure
import { FileOperationManager } from "../core/file-operations";
import type { MemoryBankManager } from "../core/memory-bank";
import { MemoryBankManager as ConcreteMemoryBankManager } from "../core/memory-bank";
import { StreamingManager } from "../core/streaming";
import { createLogger } from "../lib/logging";
// Type imports - updated for consolidated structure
import type { AsyncResult, MemoryBankFileType } from "../lib/types/core";
import { isError, MemoryBankError } from "../lib/types/core";
import type { BaseMCPServerConfig, MCPServerCLIOptions } from "../lib/types/operations";

// Utility imports - updated for consolidated structure
import { getExtensionVersion, isValidMemoryBankFileType as validateFileType } from "../lib/utils";
import { LogLevel } from "../types/logging";
// MCP prompts import - VS Code independent
import {
	INITIALIZE_MEMORY_BANK_PROMPT,
	MEMORY_BANK_ALREADY_INITIALIZED_PROMPT,
	registerMemoryBankPrompts,
} from "./prompts";
// MCP tools import - from our consolidated tools
import {
	createErrorResponse,
	createMemoryBankTool,
	createSimpleMemoryBankTool,
	ensureMemoryBankReady,
	MemoryBankOperations,
} from "./tools";

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

						return {
							success: true,
							data: "Memory bank initialized successfully.",
						};
					}

					return { success: true, data: "Memory bank already initialized." };
				},
				"Error initializing memory bank",
			),
		);

		// Load files tool
		this.server.tool(
			"read-memory-bank-files",
			{},
			createSimpleMemoryBankTool(
				this.memoryBank,
				() => MemoryBankOperations.readAllFiles(this.memoryBank),
				"Error reading memory bank files",
			),
		);

		// List files tool
		this.server.tool(
			"list-memory-bank-files",
			{},
			createSimpleMemoryBankTool(
				this.memoryBank,
				() => MemoryBankOperations.listFiles(this.memoryBank),
				"Error listing memory bank files",
			),
		);

		// Health check tool
		this.server.tool(
			"health-check-memory-bank",
			{},
			createSimpleMemoryBankTool(
				this.memoryBank,
				() => MemoryBankOperations.checkHealth(this.memoryBank),
				"Error checking memory bank health",
			),
		);

		// File update tool
		this.server.tool(
			"update-memory-bank-file",
			{
				fileType: {
					type: "string",
					description: "Type of memory bank file to update",
				},
				content: {
					type: "string",
					description: "Content to write to the file",
				},
			},
			createMemoryBankTool(
				this.memoryBank,
				// biome-ignore lint/suspicious/noExplicitAny: MCP SDK requires generic object parameters
				(args: { [key: string]: any }) => {
					const params = args as { fileType: string; content: string };

					// Basic validation without Zod
					if (!params.fileType || typeof params.fileType !== "string") {
						throw new Error(
							"Invalid parameters for update-memory-bank-file: fileType must be a non-empty string",
						);
					}
					if (typeof params.content !== "string") {
						throw new Error("Invalid parameters for update-memory-bank-file: content must be a string");
					}

					return MemoryBankOperations.updateFile(this.memoryBank, params.fileType, params.content);
				},
				"Error updating memory bank file",
			),
		);

		// Register the review tool
		this.registerReviewAndUpdateTool();
	}

	/**
	 * Validates that the provided fileType is a valid MemoryBankFileType
	 */
	protected validateFileType(fileType: string): MemoryBankFileType {
		if (!validateFileType(fileType)) {
			throw new Error(`Invalid file type: ${fileType}`);
		}
		return fileType;
	}

	protected registerCustomResources(): void {
		// Override in subclasses to add custom resources
	}

	protected registerCustomTools(): void {
		// Override in subclasses to add custom tools
	}

	protected registerReviewAndUpdateTool(): void {
		this.server.tool("review-and-update-memory-bank", {}, async () => {
			const readyCheck = await ensureMemoryBankReady(this.memoryBank);
			if (isError(readyCheck)) {
				return createErrorResponse(readyCheck.error, "Error preparing memory bank for review");
			}

			const reviewData = MemoryBankOperations.buildReviewResponsePayload(this.memoryBank);

			// Add CLI-specific guidance
			const cliGuidance = "\n\n💡 CLI Usage: Use 'update-memory-bank-file' tool to modify files after review.";
			if (reviewData.content[0]) {
				reviewData.content[0].text += cliGuidance;
			}

			return reviewData;
		});
	}

	/**
	 * Gets the underlying MCP server instance
	 */
	getServer(): McpServer {
		return this.server;
	}
}

// ============================================================================
// CLI MCP SERVER CLASS  (VS Code Independent)
// ============================================================================

/**
 * Standalone CLI MCP Server for Memory Bank operations.
 * Can be run independently without VS Code.
 */
export class MCPServerCLI extends BaseMCPServer {
	constructor(config?: MCPServerCLIOptions) {
		// Set defaults for CLI operation
		const cliConfig: BaseMCPServerConfig = {
			name: config?.name ?? "AI Memory MCP Server",
			version: config?.version ?? getExtensionVersion(),
			memoryBankPath: config?.workspacePath ?? config?.memoryBankPath ?? process.cwd(),
			logger: config?.logger ?? createLogger({ component: "MCPServerCLI" }),
		};

		super(cliConfig);
	}

	/**
	 * Registers CLI-specific init tool that accepts workspace path parameter
	 */
	private _registerInitMemoryBankTool(): void {
		this.server.tool(
			"init-memory-bank",
			{
				workspacePath: {
					type: "string",
					description: "Path to workspace directory (optional)",
				},
			},
			createMemoryBankTool(
				this.memoryBank,
				// biome-ignore lint/suspicious/noExplicitAny: MCP SDK requires generic object parameters
				async (args: { [key: string]: any }): AsyncResult<string, MemoryBankError> => {
					const params = args as { workspacePath?: string };
					// Use provided workspace path or default to current
					const workspacePath = params.workspacePath ?? this.memoryBankPath;
					this.logger.debug(`Initializing memory bank at: ${workspacePath}`);

					const isInitializedResult = await this.memoryBank.getIsMemoryBankInitialized();
					if (isError(isInitializedResult)) {
						return isInitializedResult;
					}

					const isInitialized = isInitializedResult.data;

					if (!isInitialized) {
						const initializeFoldersResult = await this.memoryBank.initializeFolders();
						if (isError(initializeFoldersResult)) {
							return initializeFoldersResult;
						}

						const loadFilesResult = await this.memoryBank.loadFiles();
						if (isError(loadFilesResult)) {
							return loadFilesResult;
						}

						return {
							success: true,
							data: `Memory bank initialized successfully at ${workspacePath}. Use \`${INITIALIZE_MEMORY_BANK_PROMPT}\` prompt to get started.`,
						};
					}

					const loadFilesResult = await this.memoryBank.loadFiles();
					if (isError(loadFilesResult)) {
						return loadFilesResult;
					}

					return {
						success: true,
						data: `Memory bank already initialized at ${workspacePath}. ${MEMORY_BANK_ALREADY_INITIALIZED_PROMPT}`,
					};
				},
				"Error initializing memory bank", // Context for error response
			),
		);
	}

	/**
	 * Registers CLI-specific read tool that accepts fileType parameter
	 */
	private _registerReadMemoryBankFileTool(): void {
		this.server.tool(
			"read-memory-bank-file",
			{
				fileType: {
					type: "string",
					description: "Type of memory bank file to read",
				},
			},
			createMemoryBankTool(
				this.memoryBank,
				// biome-ignore lint/suspicious/noExplicitAny: MCP SDK requires generic object parameters
				async (args: { [key: string]: any }): AsyncResult<string, MemoryBankError> => {
					const params = args as { fileType: string };
					if (!validateFileType(params.fileType)) {
						return {
							success: false,
							error: new MemoryBankError(`Invalid file type: ${params.fileType}`, "INVALID_FILE_TYPE"),
						};
					}

					const file = this.memoryBank.getFile(params.fileType);
					if (!file) {
						return {
							success: false,
							error: new MemoryBankError(`File ${params.fileType} not found.`, "FILE_NOT_FOUND"),
						};
					}
					return { success: true, data: file.content };
				},
				"Error reading memory bank file", // Context for error response
			),
		);
	}

	/**
	 * CLI-specific review tool that includes current files summary
	 */
	private _registerReviewAndUpdateTool(): void {
		this.server.tool("review-and-update-memory-bank", {}, async () => {
			const readyCheck = await ensureMemoryBankReady(this.memoryBank);
			if (isError(readyCheck)) {
				return createErrorResponse(readyCheck.error, "Error preparing memory bank for review");
			}

			const reviewData = MemoryBankOperations.buildReviewResponsePayload(this.memoryBank);

			// Add CLI-specific guidance
			const cliGuidance = "\n\n💡 CLI Usage: Use 'update-memory-bank-file' tool to modify files after review.";
			if (reviewData.content[0]) {
				reviewData.content[0].text += cliGuidance;
			}

			return reviewData;
		});
	}

	/**
	 * Override to register CLI-specific tools
	 */
	protected override registerCustomTools(): void {
		this.logger.info("[MCPServerCLI] Registering CLI-specific tools...");
		// Note: Base class already registers init-memory-bank and review-and-update-memory-bank
		this._registerReadMemoryBankFileTool();
		// Skip _registerReviewAndUpdateTool() - already registered by base class
	}

	/**
	 * Connect to STDIO transport for CLI operation
	 */
	connect(): void {
		const transport = new StdioServerTransport();
		this.server.connect(transport);
		this.logger.info(`[${this.serverName}] Connected to STDIO transport`);
	}

	/**
	 * Factory method to create MCPServerCLI from command line arguments
	 */
	static fromCommandLineArgs(args: string[] = process.argv): MCPServerCLI {
		// Parse workspace path from command line arguments
		let workspacePath: string | undefined;

		const workspaceIndex = args.indexOf("--workspace");
		if (workspaceIndex !== -1 && workspaceIndex + 1 < args.length) {
			workspacePath = args[workspaceIndex + 1];
		}

		// Resolve workspace path if provided, otherwise use cwd
		const resolvedWorkspacePath = workspacePath ? resolve(workspacePath) : process.cwd();

		// Parse LOG_LEVEL from environment with proper fallback
		const logLevelString = process.env.LOG_LEVEL?.toLowerCase();
		const logLevel =
			logLevelString === "trace"
				? LogLevel.Trace
				: logLevelString === "debug"
					? LogLevel.Debug
					: logLevelString === "info"
						? LogLevel.Info
						: logLevelString === "warn"
							? LogLevel.Warn
							: logLevelString === "error"
								? LogLevel.Error
								: LogLevel.Info; // Default fallback

		return new MCPServerCLI({
			workspacePath: resolvedWorkspacePath,
			logger: createLogger({
				component: "MCPServerCLI",
				level: logLevel,
			}),
		});
	}
}

// ============================================================================
// EXPORTS (VS Code Independent)
// ============================================================================

/**
 * Factory function for creating CLI servers
 */
export function createCLIServer(options?: MCPServerCLIOptions): MCPServerCLI {
	return new MCPServerCLI(options);
}

// Note: MemoryBankMCPAdapter moved to separate file (mcp-adapter.ts)
// to avoid VS Code dependencies in standalone server
