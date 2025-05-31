import type { ChildProcess } from "node:child_process";
import type { ExtensionContext } from "vscode";
import type { VSCodeMemoryBankService } from "../core/vsCodeMemoryBankService.js";
import type { MCPServerInterface } from "../types/mcpTypes.js";
import type { MemoryBankFileType } from "../types/types.js";
import type { Logger } from "../utils/log.js";
import { launchMCPServerProcess } from "./shared/processHelpers.js";

/**
 * Adapter that provides the same interface as MemoryBankMCPServer
 * but uses the STDIO MCP server via child process management.
 *
 * This allows the extension to gradually migrate from Express to STDIO
 * without breaking the existing extension interface.
 */
export class MemoryBankMCPAdapter implements MCPServerInterface {
	private readonly context: ExtensionContext;
	private readonly memoryBank: VSCodeMemoryBankService;
	private readonly logger: Logger;
	private childProcess: ChildProcess | null = null;
	private isRunning = false;
	private readonly defaultPort: number; // For compatibility with existing interface

	constructor(
		context: ExtensionContext,
		memoryBankService: VSCodeMemoryBankService,
		logger: Logger,
		defaultPort = 3000,
	) {
		this.context = context;
		this.defaultPort = defaultPort;
		this.memoryBank = memoryBankService;
		this.logger = logger;
	}

	/**
	 * Start the STDIO MCP server as a child process
	 * Complexity reduced from ~19 to ~5 by extracting process management utilities
	 */
	async start(): Promise<void> {
		if (this.isRunning || this.childProcess) {
			this.logger.info("MCP adapter already running");
			return;
		}

		try {
			// Launch MCP server process using shared utilities
			this.childProcess = await launchMCPServerProcess(this.context, this.logger, {
				onError: (error) => {
					this.logger.error(`MCP server process error: ${error.message}`);
					this.isRunning = false;
					this.childProcess = null;
				},
				onExit: (code, signal) => {
					this.logger.info(
						`MCP server process exited with code ${code}, signal ${signal}`,
					);
					this.isRunning = false;
					this.childProcess = null;
				},
				onStderr: (data) => {
					this.logger.debug(`MCP server stderr: ${data}`);
				},
			});

			this.isRunning = true;
		} catch (error) {
			this.logger.error(
				`Failed to start MCP adapter: ${error instanceof Error ? error.message : String(error)}`,
			);
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
		this.logger.info(
			`setExternalServerRunning called with port ${port} (STDIO adapter ignores this)`,
		);
		// STDIO transport doesn't use external servers, so this is a no-op for compatibility
	}

	/**
	 * Get the memory bank service instance
	 */
	getMemoryBank(): VSCodeMemoryBankService {
		return this.memoryBank;
	}

	/**
	 * Update a memory bank file
	 * Note: This delegates to the memory bank service directly for now
	 * In a full implementation, this could communicate with the STDIO server
	 */
	async updateMemoryBankFile(fileType: string, content: string): Promise<void> {
		try {
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
		this.logger.info(`Handling command: ${command} with args: ${args.join(", ")}`);

		// For now, delegate to memory bank service
		// In a full implementation, this could communicate with the STDIO server
		switch (command) {
			case "init":
				await this.memoryBank.initializeFolders();
				await this.memoryBank.loadFiles();
				return "Memory bank initialized successfully";

			case "status": {
				const health = await this.memoryBank.checkHealth();
				return `Memory bank status: ${health}`;
			}

			default:
				return `Unknown command: ${command}`;
		}
	}

	/**
	 * Check if the adapter is running
	 */
	isServerRunning(): boolean {
		return this.isRunning && this.childProcess !== null && !this.childProcess.killed;
	}
}
