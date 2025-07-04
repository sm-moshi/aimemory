/**
 * VS Code MCP Adapter - VS Code Extension Integration
 *
 * This module contains VS Code-specific MCP adapter functionality for
 * integrating the standalone MCP server with the VS Code extension.
 *
 * This is separate from the standalone MCP server to avoid bundling
 * VS Code dependencies into the standalone server executable.
 */

import type { ChildProcess } from "node:child_process";
import type { ExtensionContext } from "vscode";

// Core dependencies
import type { MemoryBankManager } from "../core/memory-bank";
import { createLogger } from "../lib/logging";
import { StdioClient } from "../lib/stdio-client";
import type { MemoryBankFileType } from "../lib/types/core";
import type { MCPServerInterface } from "../lib/types/operations";
import { launchMCPServerProcess } from "../utils/process-helpers";

// Type alias for compatibility
type MemoryBankServiceCore = MemoryBankManager;

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
	private stdioClient: StdioClient | null = null;

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
		if (this.isRunning) {
			this.logger.info("MCP adapter already running");
			return;
		}
		if (this.childProcess && !this.childProcess.killed) {
			// Defensive: existing child process should be cleaned first
			this.logger.warn("Stale child process detected – cleaning up before restart");
			this.cleanup();
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

			// Create STDIO client once the process is live
			this.stdioClient = new StdioClient(this.childProcess);

			this.logger.info("StdioClient initialised – ready to send MCP tool calls");

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
		if (this.stdioClient) {
			this.stdioClient.dispose();
			this.stdioClient = null;
		}
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
		if (this.stdioClient?.isConnected()) {
			this.logger.debug("Routing update-memory-bank-file to child MCP server via STDIO client");
			await this.stdioClient.callTool("update-memory-bank-file", { fileType, content });
			return;
		}

		// Fallback to in-process implementation
		try {
			this.logger.info(`Child MCP server not available – falling back to direct update for '${fileType}'.`);
			await this.memoryBank.updateFile(fileType as MemoryBankFileType, content);
			this.logger.info(`Updated memory bank file locally: ${fileType}`);
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

		if (this.stdioClient?.isConnected()) {
			// Map simple commands to tool names
			let toolName: string | null = null;
			let toolArgs: Record<string, unknown> = {};
			if (command === "init") {
				toolName = "init-memory-bank";
				// Workspace path optional – rely on server default
			} else if (command === "status") {
				toolName = "health-check-memory-bank";
			} else if (command === "read") {
				if (!args.length) {
					return "Usage: read <fileType>";
				}
				toolName = "read-memory-bank-file";
				toolArgs = { fileType: args[0] };
			} else if (command === "list" || command === "list-files") {
				toolName = "list-memory-bank-files";
			} else if (command === "review") {
				toolName = "review-and-update-memory-bank";
			}

			if (toolName) {
				try {
					const result = await this.stdioClient.callTool(toolName, toolArgs);
					return typeof result === "string" ? result : JSON.stringify(result);
				} catch (err) {
					const msg = err instanceof Error ? err.message : String(err);
					this.logger.error(`Child MCP server error for '${toolName}': ${msg}`);
					return `Error from MCP server: ${msg}`;
				}
			}
		}

		// Fallback to in-process implementation
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
		if (this.stdioClient) {
			return this.stdioClient.isConnected();
		}
		return this.isRunning && this.childProcess !== null && !this.childProcess.killed;
	}
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
