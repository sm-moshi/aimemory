import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CacheManager } from "../../core/Cache";
import { FileOperationManager } from "../../core/FileOperationManager";
import type { MemoryBankServiceCore } from "../../core/memoryBankServiceCore";
import { MemoryBankServiceCore as ConcreteMemoryBankServiceCore } from "../../core/memoryBankServiceCore";
import { registerMemoryBankPrompts } from "../../cursor/mcp-prompts-registry";
import { StreamingManager } from "../../performance/StreamingManager";
import { UpdateMemoryBankFileSchema } from "../../types/config";
import type { MemoryBankFileType } from "../../types/core";
import { isError } from "../../types/errorHandling";
import type { Logger } from "../../types/logging";
import type { BaseMCPServerConfig } from "../../types/mcpTypes";
import { getExtensionVersion, isValidMemoryBankFileType as validateFileType } from "../../utils/helpers";
import { createLogger } from "../../utils/logging";
import {
	MemoryBankOperations,
	createErrorResponse,
	createMemoryBankTool,
	createSimpleMemoryBankTool,
	ensureMemoryBankReady,
} from "./mcpToolHelpers";
import type { MetadataToolRegistrar } from "./metadataToolRegistrar";

/**
 * Base MCP Server class that provides common functionality
 * for all MCP server implementations, reducing code duplication
 * and ensuring consistent behavior.
 */
export abstract class BaseMCPServer {
	protected readonly server: McpServer;
	protected readonly memoryBank: MemoryBankServiceCore;
	protected readonly logger: Logger;
	protected readonly memoryBankPath: string;
	protected readonly metadataToolRegistrar: MetadataToolRegistrar;
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

			this.memoryBank = new ConcreteMemoryBankServiceCore(
				memoryBankPath,
				this.logger,
				cacheManager,
				streamingManager,
				fileOperationManager,
			);
		}

		// Initialize metadata tool registrar (temporarily disabled)
		this.metadataToolRegistrar = {} as MetadataToolRegistrar;

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
