import { type ChildProcess, spawn } from "node:child_process";
import * as path from "node:path";
import * as vscode from "vscode";
import { MemoryBankService } from "../core/memoryBank.js";
import type { MCPServerInterface } from "../types/mcpTypes.js";
import type { MemoryBankFileType } from "../types/types.js";
import { Logger } from "../utils/log.js";

/**
 * Adapter that provides the same interface as MemoryBankMCPServer
 * but uses the STDIO MCP server via child process management.
 *
 * This allows the extension to gradually migrate from Express to STDIO
 * without breaking the existing extension interface.
 */
export class MemoryBankMCPAdapter implements MCPServerInterface {
	private readonly context: vscode.ExtensionContext;
	private readonly memoryBank: MemoryBankService;
	private readonly logger: Logger;
	private childProcess: ChildProcess | null = null;
	private isRunning = false;
	private readonly defaultPort: number; // For compatibility with existing interface

	constructor(context: vscode.ExtensionContext, defaultPort = 3000) {
		this.context = context;
		this.defaultPort = defaultPort;
		this.memoryBank = new MemoryBankService(context);
		this.logger = Logger.getInstance();
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
			// Get the path to the compiled STDIO server
			const serverPath = path.join(this.context.extensionPath, "dist", "index.cjs");

			// Get the workspace path
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (!workspaceFolders || workspaceFolders.length === 0) {
				this.logger.error("AI Memory: No workspace folder found. Cannot start MCP server.");
				throw new Error("No workspace folder found to start MCP server.");
			}
			const workspacePath = workspaceFolders[0].uri.fsPath;

			this.logger.info(
				`Starting MCP STDIO server: ${serverPath} with workspace: ${workspacePath}`,
			);

			// Use process.execPath for the node command if available and makes sense for the context
			// This assumes the node running the extension is the desired node for the child process.
			const nodeExecutable = process.execPath || "node";

			// Spawn the STDIO server process
			this.childProcess = spawn(nodeExecutable, [serverPath, workspacePath], {
				stdio: "pipe", // We'll manage stdio ourselves for MCP communication
				cwd: this.context.extensionPath,
				env: {
					...process.env,
					NODE_ENV: "production",
				},
			});

			// Handle process events
			this.childProcess.on("error", (error) => {
				this.logger.error(`MCP server process error: ${error.message}`);
				this.isRunning = false;
				this.childProcess = null;
			});

			this.childProcess.on("exit", (code, signal) => {
				this.logger.info(`MCP server process exited with code ${code}, signal ${signal}`);
				this.isRunning = false;
				this.childProcess = null;
			});

			// Log stderr for debugging
			this.childProcess.stderr?.on("data", (data) => {
				this.logger.debug(`MCP server stderr: ${data}`);
			});

			// Wait a moment for the process to start
			await new Promise((resolve) => setTimeout(resolve, 1000));

			if (this.childProcess && !this.childProcess.killed) {
				this.isRunning = true;
				this.logger.info("MCP STDIO server started successfully");
			} else {
				throw new Error("Failed to start MCP server process");
			}
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
	getMemoryBank(): MemoryBankService {
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
