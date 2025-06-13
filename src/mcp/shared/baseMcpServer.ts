import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { FileOperationManager } from "../../core/file-operations";
import type { MemoryBankManager } from "../../core/memory-bank";
import { MemoryBankManager as ConcreteMemoryBankManager } from "../../core/memory-bank";
import { StreamingManager } from "../../core/streaming";
import { registerMemoryBankPrompts } from "../../cursor/mcp-prompts-registry";
import { createLogger } from "../../lib/logging";
import type { Logger, MemoryBankFileType } from "../../lib/types/core";
import { isError } from "../../lib/types/core";
import type { BaseMCPServerConfig } from "../../lib/types/operations";
import { getExtensionVersion, isValidMemoryBankFileType as validateFileType } from "../../lib/utils";
import {
	createErrorResponse,
	createMemoryBankTool,
	createSimpleMemoryBankTool,
	ensureMemoryBankReady,
	MemoryBankOperations,
} from "./mcpToolHelpers";

/**
 * Base MCP Server class that provides common functionality
 * for all MCP server implementations, reducing code duplication
 * and ensuring consistent behavior.
 */
export abstract class BaseMCPServer {
	protected readonly server: McpServer;
	protected readonly memoryBank: MemoryBankManager;
	protected readonly logger: Logger;
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

	protected registerDefaultResources(server: McpServer) {
		server.resource("memory-bank-file", "file:///{filepath}?fileType={fileType}", async (uri: URL) => {
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
				throw new Error(`File of type ${type} not found in memory bank.`);
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
