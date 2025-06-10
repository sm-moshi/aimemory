/**
 * VS Code Webview Provider - Consolidated Webview Management
 *
 * This module consolidates all VS Code webview functionality including:
 * - Webview panel creation and lifecycle management
 * - Message handling between extension and React app
 * - MCP server integration and communication
 * - Cursor rules management integration
 * - Memory bank status and interaction
 *
 */

import * as crypto from "node:crypto";
import * as fsPromises from "node:fs/promises";
import * as http from "node:http";
import * as path from "node:path";
import * as vscode from "vscode";

// Core dependencies - updated for consolidated structure
import type { MemoryBankManager } from "../core/memory-bank";
import { getCursorMemoryBankRulesFile } from "../cursor-integration";
import type { Logger, MemoryBankFile } from "../lib/types/core";

// MCP server integration - updated for consolidated structure
import type { MCPServerInterface } from "../lib/types/operations";
// Type imports - updated for consolidated structure
import type { CursorMCPConfig, CursorMCPServerConfig } from "../lib/types/system";
import type {
	ServerAlreadyRunningMessage,
	WebviewLogMessage,
	WebviewToExtensionMessage,
} from "../webview/src/types/messages";
import type { CursorRulesService } from "./cursor-integration";
import type { MemoryBankMCPAdapter } from "./mcp-adapter";

import { getWorkspaceRoot } from "./workspace";

// Type alias for compatibility
type MemoryBankServiceCore = MemoryBankManager;

// ============================================================================
// CONSTANTS AND UTILITY FUNCTIONS
// ============================================================================

const _SELECT_FOLDER_COMMAND = "aimemory.selectWPFolder";
const _WEBVIEW_ASSETS_PATH = "dist/webview";

// TODO: Future utility functions for port extraction
// function ExtractPortFromUrl(url: string): number | null {
// 	const regex = /:(\d+)(?:\/|$)/;
// 	const match = regex.exec(url);
// 	return match?.[1] ? Number(match[1]) : null;
// }

// function ExtractPortsFromArgs(args: unknown[]): number[] {
// 	const ports: number[] = [];
// 	for (const arg of args) {
// 		const port = Number(arg);
// 		if (!Number.isNaN(port) && port > 1024 && port < 65536) {
// 			ports.push(port);
// 		}
// 	}
// 	return ports;
// }

/**
 * Extract ports from a single server configuration
 */
function extractPortsFromServer(server: CursorMCPServerConfig): number[] {
	const ports: number[] = [];
	if (server.url) {
		try {
			const url = new URL(server.url);
			if (url.port) {
				ports.push(Number.parseInt(url.port, 10));
			}
		} catch {
			// Invalid URL, ignore silently
		}
	}
	return ports;
}

/**
 * Utility to extract MCP server ports from .cursor/mcp.json
 */
async function getMcpPortsFromConfig(workspaceRoot: string): Promise<number[]> {
	try {
		const configPath = path.join(workspaceRoot, ".cursor", "mcp.json");
		const configRaw = await fsPromises.readFile(configPath, "utf-8");
		const config: CursorMCPConfig = JSON.parse(configRaw);

		if (!config?.mcpServers) {
			return [];
		}

		const ports: number[] = [];
		for (const serverConfig of Object.values(config.mcpServers)) {
			const serverPorts = extractPortsFromServer(serverConfig);
			ports.push(...serverPorts);
		}

		return ports;
	} catch {
		// If config not found or parse error, fallback
		return [];
	}
}

// ============================================================================
// WEBVIEW PROVIDER CLASS
// ============================================================================

/**
 * Manages VS Code webview panels for the AI Memory extension
 * Handles communication between the extension and React frontend
 */
export class WebviewProvider implements vscode.WebviewViewProvider {
	private panel: vscode.WebviewPanel | undefined;
	private webviewView: vscode.WebviewView | undefined;
	private readonly extensionUri: vscode.Uri;
	private readonly memoryBankService: MemoryBankServiceCore;
	private readonly cursorRulesService: CursorRulesService;
	private readonly logger: Logger;
	private readonly extensionContext: vscode.ExtensionContext;
	private readonly mcpAdapter: MemoryBankMCPAdapter;
	private readonly currentMemoryBankFiles: MemoryBankFile[] = [];
	private readonly lastError: string | null = null;
	private readonly mcpServerStatus: "running" | "stopped" | "starting" | "error" = "stopped";
	private readonly isWebviewReady = false;
	private readonly disposables: vscode.Disposable[] = [];
	private static readonly viewType = "aiMemoryWebview";
	private fileWatcher?: vscode.FileSystemWatcher;

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly mcpServer: MCPServerInterface,
		memoryBankService: MemoryBankServiceCore,
		cursorRulesService: CursorRulesService,
		logger: Logger,
	) {
		this.extensionUri = context.extensionUri;
		this.memoryBankService = memoryBankService;
		this.cursorRulesService = cursorRulesService;
		this.logger = logger;
		this.extensionContext = context;
		this.mcpAdapter = mcpServer as MemoryBankMCPAdapter;
		this.setupCommands();
	}

	// ============================================================================
	// INITIALIZATION AND SETUP
	// ============================================================================

	private setupCommands() {
		this.disposables.push(vscode.commands.registerCommand("aimemory.refreshWebview", () => this.refreshAllData()));
	}

	// Placeholder method to satisfy linter, actual implementation needed separately.
	private async refreshAllData(): Promise<void> {
		this.logger.info("WebviewProvider.refreshAllData called (placeholder)");
		// TODO: Implement data refreshing logic here.
		// This would involve fetching current statuses (MCP, MemoryBank, Rules)
		// and posting them to the webview.
		// Example calls (if methods exist and are appropriate):
		// if (this.panel) {
		//   await this.handleGetRulesStatus();
		//   await this.handleRequestMemoryBankStatus();
		//   await this.sendCurrentMCPServerStatus();
		// }
	}

	// ============================================================================
	// SERVER HEALTH MONITORING
	// ============================================================================

	// Checks if an MCP server is already running on a specific port
	private async checkServerHealth(port: number): Promise<boolean> {
		return new Promise<boolean>(resolve => {
			const request = http.get(`http://localhost:${port}/health`, res => {
				let data = "";

				// A chunk of data has been received
				res.on("data", chunk => {
					data += chunk;
				});

				// The whole response has been received
				res.on("end", () => {
					try {
						if (res.statusCode === 200) {
							const parsedData = JSON.parse(data);
							if (parsedData.status === "ok ok") {
								this.logger.debug("Server found running on port", {
									port,
									operation: "checkServerHealth",
								});
								resolve(true);
								return;
							}
						}
						resolve(false);
					} catch (e) {
						this.logger.warn("Error parsing JSON in health check", {
							port,
							error: e instanceof Error ? e.message : String(e),
							operation: "checkServerHealth",
						});
						resolve(false);
					}
				});
			});

			request.on("error", error => {
				this.logger.debug("No server running on port", {
					port,
					error: error.message,
					operation: "checkServerHealth",
				});
				resolve(false);
			});

			// Set timeout to avoid hanging
			request.setTimeout(1000, () => {
				this.logger.debug("Request to port timed out", {
					port,
					operation: "checkServerHealth",
				});
				request.destroy();
				resolve(false);
			});
		});
	}

	// Check standard ports for already running MCP servers
	private async checkForRunningServers() {
		// Try to get ports from .cursor/mcp.json, fallback to defaults
		const workspaceRoot = getWorkspaceRoot() ?? process.cwd();
		let portsToCheck = await getMcpPortsFromConfig(workspaceRoot);
		if (!portsToCheck.length) {
			// Fallback to default ports if config not found or empty
			portsToCheck = [7331, 7332]; // Same as DEFAULT_MCP_PORT and ALTERNATIVE_MCP_PORT
		}

		for (const port of portsToCheck) {
			// Check if a server is running on this port
			const isRunning = await this.checkServerHealth(port);
			if (isRunning) {
				// Check if our internal server is running (if applicable)
				const isInternalServer = this.mcpServer.isServerRunning();

				if (isInternalServer) {
					this.logger.info("Internal server is running", {
						port,
						operation: "checkForRunningServers",
					});
				} else {
					this.logger.info("External server found running", {
						port,
						operation: "checkForRunningServers",
					});
				}

				// Update the server state
				this.mcpServer.setExternalServerRunning(port);

				// Update the webview if it's open
				setTimeout(() => {
					if (this.panel) {
						this.panel.webview.postMessage({
							type: "MCPServerStatus",
							status: "started",
							port,
						});
					}
				}, 300);

				return true;
			}
		}

		return false;
	}

	// ============================================================================
	// WEBVIEW LIFECYCLE MANAGEMENT
	// ============================================================================

	public async openWebview() {
		this.logger.debug("WebviewProvider.openWebview called");

		// Check for running servers first
		await this.checkForRunningServers();

		// If we already have a panel, show it
		if (this.panel) {
			this.panel.reveal(vscode.ViewColumn.One);
			return;
		}

		// Create and show a new webview panel
		this.panel = vscode.window.createWebviewPanel(
			"aiMemoryWebview", // Identifies the type of the webview
			"AI Memory", // Title displayed in the UI
			vscode.ViewColumn.One, // Editor column to show the webview in
			{
				// Enable scripts in the webview
				enableScripts: true,
				// Restrict the webview to only load resources from the extension's directory and Vite dev server
				localResourceRoots: [
					vscode.Uri.joinPath(this.extensionUri, "dist"), // Allow access to the main dist folder
					vscode.Uri.joinPath(this.extensionUri, "dist", "webview"), // Explicitly allow webview assets
					vscode.Uri.parse("http://localhost:5173"), // Allow Vite dev server (HMR)
				],
				// Retain the webview when it becomes hidden
				retainContextWhenHidden: true,
			},
		);

		// Set the webview's HTML content
		this.panel.webview.html = this.getWebviewContent(this.panel.webview);

		console.log("Handlig message");

		// Handle messages from the webview
		this.panel.webview.onDidReceiveMessage(
			async (message: WebviewToExtensionMessage) => {
				console.log("Received message in extension:", message);
				switch (message.command) {
					case "getRulesStatus":
						await this.handleGetRulesStatus();
						break;
					case "resetRules":
						await this.handleResetRules();
						break;
					case "requestMemoryBankStatus":
						console.log("Requesting...");
						await this.handleRequestMemoryBankStatus();
						break;
					case "serverAlreadyRunning":
						await this.handleServerAlreadyRunning(message);
						break;
					case "startMCPServer":
						await this.handleStartMCPServer();
						break;
					case "stopMCPServer":
						await this.handleStopMCPServer();
						break;
					case "logMessage": {
						this.handleLogMessage(message);
						break;
					}
				}
			},
			undefined,
			this.context.subscriptions,
		);

		// Clean up resources when the panel is closed
		this.panel.onDidDispose(
			() => {
				this.onPanelDispose();
			},
			null,
			this.context.subscriptions,
		);

		// Initial status check
		setTimeout(async () => {
			await this.handleGetRulesStatus();
			await this.sendCurrentMCPServerStatus();
		}, 500);
	}

	public getWebviewPanel(): vscode.WebviewPanel | undefined {
		return this.panel;
	}

	// ============================================================================
	// MESSAGE HANDLERS
	// ============================================================================

	private async handleGetRulesStatus() {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			this.panel?.webview.postMessage({
				type: "rulesStatus",
				initialized: false,
			});
			return;
		}

		const cursorRulesPath = path.join(workspaceFolders[0]?.uri.fsPath ?? "", ".cursor/rules/memory-bank.mdc");

		let initialized = false;
		try {
			// Check if file exists
			await vscode.workspace.fs.stat(vscode.Uri.file(cursorRulesPath));
			initialized = true;
		} catch (error) {
			// File doesn't exist or access error - both indicate rules not initialized
			initialized = false;
			this.logger.debug(
				`Cursor rules file not found or inaccessible: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		console.log("Sending rules status:", initialized);
		// Send status to webview
		this.panel?.webview.postMessage({
			type: "rulesStatus",
			initialized,
		});
	}

	private async handleRequestMemoryBankStatus() {
		console.log("Here1");
		if (!this.panel) {
			return;
		}

		const isInitialized = await this.memoryBankService.getIsMemoryBankInitialized();

		console.log("Sending memory bank status:", isInitialized);

		this.panel.webview.postMessage({
			type: "memoryBankStatus",
			initialized: isInitialized,
		});
	}

	private async handleResetRules() {
		if (!this.validateWorkspaceForReset()) {
			return;
		}

		const result = await this.performRulesReset();
		if (this.isUserCancelledOverwrite(result.error)) {
			// User cancelled overwrite, not an error
			vscode.window.showInformationMessage("Rules reset cancelled.");
			return;
		}

		this.sendResetResult(result);

		// Log and show error on failure
		if (!result.success && result.error) {
			this.logger.error("Error resetting memory bank rules", {
				error: result.error,
				operation: "handleResetRules",
			});
			vscode.window.showErrorMessage(`Error resetting memory bank rules: ${result.error}`);
		}
	}

	private async handleServerAlreadyRunning(message: ServerAlreadyRunningMessage) {
		// Update our internal tracking that a server is already running
		console.log(`Server already running on port ${message.port}`);
		this.mcpServer.setExternalServerRunning(message.port);
		this.panel?.webview.postMessage({
			type: "MCPServerStatus",
			status: "started",
			port: message.port,
		});
	}

	private async handleStartMCPServer() {
		try {
			await this.mcpServer.start();
			const serverPort = this.mcpServer.getPort();
			const isStdioMode = !serverPort || serverPort === 0;

			// Send status message with proper port info for different transport modes
			this.panel?.webview.postMessage({
				type: "MCPServerStatus",
				status: "started",
				port: isStdioMode ? null : serverPort, // null indicates STDIO mode
				transport: isStdioMode ? "stdio" : "http",
			});

			this.logger.info(`MCP Server started successfully in ${isStdioMode ? "STDIO" : "HTTP"} mode`, {
				port: serverPort,
				transport: isStdioMode ? "stdio" : "http",
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.logger.error(`Failed to start MCP server: ${errorMessage}`);

			this.panel?.webview.postMessage({
				type: "MCPServerStatus",
				status: "error",
				error: errorMessage,
			});
		}
	}

	private async handleStopMCPServer() {
		await this.mcpServer.stop();
		this.sendCurrentMCPServerStatus();
	}

	private handleLogMessage(message: WebviewLogMessage) {
		const { level, text, meta } = message;

		switch (level) {
			case "info":
				this.logger.info(text, meta);
				break;
			case "error":
				this.logger.error(text, meta);
				break;
			default: {
				// biome-ignore lint/suspicious/noExplicitAny: To handle unexpected log levels
				const exhaustiveCheck: any = level;
				this.logger.warn(`Unknown log level from webview: ${exhaustiveCheck}`, {
					text,
					meta,
				});
				break;
			}
		}
	}

	// ============================================================================
	// RULES MANAGEMENT
	// ============================================================================

	/**
	 * Validate workspace exists for rules reset
	 */
	private validateWorkspaceForReset(): boolean {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			vscode.window.showErrorMessage("No workspace folder found");
			this.panel?.webview.postMessage({
				type: "resetRulesResult",
				success: false,
				error: "No workspace folder found",
			});
			this.logger.error("Reset rules failed: No workspace folder found");
			return false;
		}
		return true;
	}

	/**
	 * Perform the actual rules file reset operation
	 */
	private async performRulesReset(): Promise<{
		success: boolean;
		error?: string;
	}> {
		// Access FileOperationManager from the memory bank service
		const fileOperationManager = this.memoryBankService.fileOperationManager;
		const rulesContent = await getCursorMemoryBankRulesFile(fileOperationManager);
		await this.cursorRulesService.createRulesFile("memory-bank.mdc", rulesContent);
		vscode.window.showInformationMessage("Memory bank rules have been reset.");
		this.logger.info("Memory bank rules reset successfully.");
		return { success: true };
		// Errors will propagate to the caller (resetRules)
	}

	/**
	 * Check if error indicates user cancelled overwrite operation
	 */
	private isUserCancelledOverwrite(error: unknown): boolean {
		return (
			typeof error === "object" &&
			error !== null &&
			"message" in error &&
			typeof (error as { message: string }).message === "string" &&
			(error as { message: string }).message.includes("overwrite")
		);
	}

	/**
	 * Send reset result to webview
	 */
	private sendResetResult(result: { success: boolean; error?: string }): void {
		this.panel?.webview.postMessage({
			type: "resetRulesResult",
			success: result.success,
			...(result.error && { error: result.error }),
		});
	}

	// ============================================================================
	// MCP SERVER STATUS MANAGEMENT
	// ============================================================================

	/**
	 * Send current MCP server status to webview
	 */
	private async sendCurrentMCPServerStatus(): Promise<void> {
		if (!this.panel) {
			return;
		}

		try {
			// Cast to access implementation-specific method, now with a specific type
			const isRunning = (this.mcpServer as MemoryBankMCPAdapter).isServerRunning?.() ?? false;
			const serverPort = this.mcpServer.getPort();
			const isStdioMode = !serverPort || serverPort === 0;

			// Extract nested ternary operations for clarity
			const status = isRunning ? "started" : "stopped";
			const port = isRunning && !isStdioMode ? serverPort : null;
			const transport = this.determineTransportType(isRunning, isStdioMode);

			this.panel.webview.postMessage({
				type: "MCPServerStatus",
				status,
				port,
				transport,
			});

			const runningStatus = isRunning ? "running" : "stopped";
			const transportType = this.determineTransportType(isRunning, isStdioMode);

			this.logger.info(`Initial MCP server status sent to webview: ${runningStatus}`, {
				port: serverPort,
				transport: transportType,
				isStdioMode,
			});
		} catch (error) {
			this.logger.error(
				`Failed to get MCP server status: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Determine transport type based on server state
	 */
	private determineTransportType(isRunning: boolean, isStdioMode: boolean): string | undefined {
		if (!isRunning) {
			return undefined;
		}
		return isStdioMode ? "stdio" : "http";
	}

	// ============================================================================
	// HTML CONTENT GENERATION
	// ============================================================================

	/**
	 * Generates the HTML content for the webview, ensuring CSP compliance and secure asset loading.
	 * - Uses a strong nonce for scripts.
	 * - Loads all assets via webview.asWebviewUri.
	 * - CSP allows only required sources (scripts, styles, connect to MCP, images, fonts).
	 * - No unsafe-inline for scripts; only for styles if absolutely necessary.
	 * - All asset URIs are resolved at runtime for VSCode compatibility.
	 */
	private getWebviewContent(webview: vscode.Webview): string {
		// Generate a nonce for CSP
		const nonce = crypto.randomBytes(16).toString("base64");

		// Get path to dist folder for webview assets
		const distPath = path.join(this.extensionUri.fsPath, "dist", "webview");

		// Get paths to JS & CSS files
		const scriptPathOnDisk = path.join(distPath, "assets", "index.js");
		const stylePathOnDisk = path.join(distPath, "assets", "index.css");

		// Convert paths to webview URIs
		const scriptUri = webview.asWebviewUri(vscode.Uri.file(scriptPathOnDisk));
		const styleUri = webview.asWebviewUri(vscode.Uri.file(stylePathOnDisk));

		// Define Content Security Policy
		// Allows scripts with the correct nonce, styles from webview, and connections to localhost for the MCP server.
		// No unsafe-inline for scripts. Only allow inline styles if absolutely necessary (here, only for Tailwind JIT, otherwise remove).
		const mcpPort = this.mcpServer.getPort(); // Get the current MCP port
		const csp = [
			"default-src 'none'", // Block all by default
			`style-src ${webview.cspSource} 'unsafe-inline'`, // Allow styles from webview and inline (Tailwind JIT needs this)
			`script-src 'nonce-${nonce}'`, // Only allow scripts with this nonce
			`connect-src http://localhost:${mcpPort}`, // Only allow connecting to MCP server
			`img-src ${webview.cspSource} data:`, // Allow images from webview and data URIs
			`font-src ${webview.cspSource}`, // Allow fonts from webview
		].join("; ");

		// Return HTML with strict CSP and correct asset URIs
		return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${styleUri}" rel="stylesheet">
  <title>AI Memory</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${scriptUri}" nonce="${nonce}"></script>
</body>
</html>`;
	}

	// ============================================================================
	// CLEANUP AND DISPOSAL
	// ============================================================================

	private onPanelDispose() {
		this.panel = undefined;
		for (const d of this.disposables) {
			d.dispose();
		}
		this.disposables.length = 0;
	}

	resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext<unknown>,
		_token: vscode.CancellationToken,
	): void | Thenable<void> {
		this.webviewView = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this.extensionUri],
		};

		// Set up development hot reload
		this.setupDevelopmentReload();

		// Set up the webview content
		webviewView.webview.html = this.getWebviewContent(webviewView.webview);
	}

	private setupDevelopmentReload(): void {
		// Only enable in development mode - use safer environment checks
		try {
			const nodeEnv = process.env.NODE_ENV;
			const isDebugging = process.env.IS_EXTENSION_DEBUGGING;
			const isDevelopment = nodeEnv !== "production" || isDebugging === "true";

			if (!isDevelopment) {
				return;
			}

			// Watch webview dist files for changes
			this.fileWatcher = vscode.workspace.createFileSystemWatcher(
				new vscode.RelativePattern(this.extensionUri, "src/webview/dist/*"),
			);

			// Reload webview on file changes
			this.fileWatcher.onDidChange(() => {
				this.logger.debug("Webview files changed, reloading...");
				vscode.commands.executeCommand("workbench.action.webview.reloadWebviewAction");
			});

			this.fileWatcher.onDidCreate(() => {
				this.logger.debug("Webview files created, reloading...");
				vscode.commands.executeCommand("workbench.action.webview.reloadWebviewAction");
			});

			this.logger.info("🔥 Development hot reload enabled for webview");
		} catch (error) {
			// Silently fail if environment setup has issues
			this.logger.debug("Development reload setup failed, continuing without hot reload", {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	public dispose() {
		this.panel?.dispose();
	}
}

// ============================================================================
// EXPORTS AND FACTORY FUNCTIONS
// ============================================================================

/**
 * Factory function for creating webview provider instances
 */
export function createWebviewProvider(
	context: vscode.ExtensionContext,
	mcpServer: MCPServerInterface,
	memoryBankService: MemoryBankServiceCore,
	cursorRulesService: CursorRulesService,
	logger: Logger,
): WebviewProvider {
	return new WebviewProvider(context, mcpServer, memoryBankService, cursorRulesService, logger);
}

// Re-export types for convenience
export type { MemoryBankServiceCore };

// The main class is already exported above in the class declaration
