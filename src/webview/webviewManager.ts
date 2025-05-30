import * as crypto from "node:crypto";
import * as fsPromises from "node:fs/promises";
import * as http from "node:http";
import * as path from "node:path";
import * as vscode from "vscode";
import { MemoryBankService } from "../core/memoryBank.js";
import { CursorRulesService } from "../lib/cursor-rules-service.js";
import { CURSOR_MEMORY_BANK_RULES_FILE } from "../lib/cursor-rules.js";
import type { MCPServerInterface } from "../types/mcpTypes.js";
import { LogLevel, Logger } from "../utils/log.js";

/**
 * Extract port number from a URL string
 */
function extractPortFromUrl(url: string): number | null {
	const regex = /:(\d+)(?:\/|$)/;
	const match = regex.exec(url);
	return match?.[1] ? Number(match[1]) : null;
}

/**
 * Extract ports from server arguments array
 */
function extractPortsFromArgs(args: unknown[]): number[] {
	const ports: number[] = [];

	for (const arg of args) {
		const port = Number(arg);
		if (!Number.isNaN(port) && port > 1024 && port < 65536) {
			ports.push(port);
		}
	}

	return ports;
}

/**
 * Extract ports from a single server configuration
 */
function extractPortsFromServer(server: any): number[] {
	const ports: number[] = [];

	if (!server) {
		return ports;
	}

	if (typeof server.url === "string") {
		const port = extractPortFromUrl(server.url);
		if (port) {
			ports.push(port);
		}
	} else if (Array.isArray(server.args)) {
		ports.push(...extractPortsFromArgs(server.args));
	}

	return ports;
}

// Utility to extract MCP server ports from .cursor/mcp.json
async function getMCPPortsFromConfig(workspaceRoot: string): Promise<number[]> {
	try {
		const configPath = path.join(workspaceRoot, ".cursor", "mcp.json");
		const configRaw = await fsPromises.readFile(configPath, "utf-8");
		const config = JSON.parse(configRaw);

		if (!config?.mcpServers) {
			return [];
		}

		const ports: number[] = [];
		for (const key of Object.keys(config.mcpServers)) {
			const serverPorts = extractPortsFromServer(config.mcpServers[key]);
			ports.push(...serverPorts);
		}

		return ports;
	} catch {
		// If config not found or parse error, fallback
		return [];
	}
}

export class WebviewManager {
	private panel: vscode.WebviewPanel | undefined;
	private readonly extensionUri: vscode.Uri;
	private readonly memoryBankService: MemoryBankService;
	private readonly cursorRulesService: CursorRulesService;

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly mcpServer: MCPServerInterface,
	) {
		this.extensionUri = context.extensionUri;
		this.memoryBankService = new MemoryBankService(context);
		this.cursorRulesService = new CursorRulesService(context);
	}

	// Checks if an MCP server is already running on a specific port
	private async checkServerHealth(port: number): Promise<boolean> {
		return new Promise<boolean>((resolve) => {
			const request = http.get(`http://localhost:${port}/health`, (res) => {
				let data = "";

				// A chunk of data has been received
				res.on("data", (chunk) => {
					data += chunk;
				});

				// The whole response has been received
				res.on("end", () => {
					try {
						if (res.statusCode === 200) {
							const parsedData = JSON.parse(data);
							if (parsedData.status === "ok ok") {
								console.log(`Server found running on port ${port}`);
								resolve(true);
								return;
							}
						}
						resolve(false);
					} catch (e) {
						console.error("Error parsing JSON:", e);
						resolve(false);
					}
				});
			});

			request.on("error", (error) => {
				console.log(`No server running on port ${port}: ${error.message}`);
				resolve(false);
			});

			// Set timeout to avoid hanging
			request.setTimeout(1000, () => {
				console.log(`Request to port ${port} timed out`);
				request.destroy();
				resolve(false);
			});
		});
	}

	// Check standard ports for already running MCP servers
	private async checkForRunningServers() {
		// Try to get ports from .cursor/mcp.json, fallback to defaults
		const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
		let portsToCheck = await getMCPPortsFromConfig(workspaceRoot);
		if (!portsToCheck.length) {
			// Fallback to default ports if config not found or empty
			portsToCheck = [7331, 7332]; // Same as DEFAULT_MCP_PORT and ALTERNATIVE_MCP_PORT
		}

		for (const port of portsToCheck) {
			const isRunning = await this.checkServerHealth(port);
			if (isRunning) {
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

	public async openWebview() {
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
			async (message) => {
				console.log("Received message in extension:", message);
				switch (message.command) {
					case "getRulesStatus":
						await this.getRulesStatus();
						break;
					case "resetRules":
						await this.resetRules();
						break;
					case "requestMemoryBankStatus":
						console.log("Requesting...");
						await this.getMemoryBankStatus();
						break;
					case "serverAlreadyRunning":
						// Update our internal tracking that a server is already running
						console.log(`Server already running on port ${message.port}`);
						this.mcpServer.setExternalServerRunning(message.port);
						this.panel?.webview.postMessage({
							type: "MCPServerStatus",
							status: "started",
							port: message.port,
						});
						break;
					case "startMCPServer":
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

							Logger.getInstance().info(
								`MCP Server started successfully in ${isStdioMode ? "STDIO" : "HTTP"} mode`,
								{ port: serverPort, transport: isStdioMode ? "stdio" : "http" },
							);
						} catch (error) {
							const errorMessage =
								error instanceof Error ? error.message : String(error);
							Logger.getInstance().error(
								`Failed to start MCP server: ${errorMessage}`,
							);

							this.panel?.webview.postMessage({
								type: "MCPServerStatus",
								status: "error",
								error: errorMessage,
							});
						}
						break;
					case "stopMCPServer":
						try {
							this.mcpServer.stop();
							this.panel?.webview.postMessage({
								type: "MCPServerStatus",
								status: "stopped",
							});

							Logger.getInstance().info("MCP Server stopped successfully");
						} catch (error) {
							const errorMessage =
								error instanceof Error ? error.message : String(error);
							Logger.getInstance().error(
								`Failed to stop MCP server: ${errorMessage}`,
							);
						}
						break;
					case "logMessage": {
						// Route webview log messages to the Output Channel via Logger
						const level = message.level === "error" ? LogLevel.Error : LogLevel.Info;
						Logger.getInstance().log(level, message.text, message.meta);
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
				this.panel = undefined;
			},
			null,
			this.context.subscriptions,
		);

		// Initial status check
		setTimeout(async () => {
			await this.getRulesStatus();
			await this.sendCurrentMCPServerStatus();
		}, 500);
	}

	private async getRulesStatus() {
		if (!this.panel) {
			return;
		}

		// Check if Cursor rules file exists in workspace
		const workspaceFolders = vscode.workspace.workspaceFolders;
		console.log("Getting rules status for workspace", workspaceFolders);
		if (!workspaceFolders) {
			this.panel.webview.postMessage({
				type: "rulesStatus",
				initialized: false,
			});
			return;
		}

		const cursorRulesPath = path.join(
			workspaceFolders[0].uri.fsPath,
			".cursor/rules/memory-bank.mdc",
		);

		let initialized = false;
		try {
			// Check if file exists
			await vscode.workspace.fs.stat(vscode.Uri.file(cursorRulesPath));
			initialized = true;
		} catch (error) {
			// File doesn't exist or access error - both indicate rules not initialized
			initialized = false;
			Logger.getInstance().debug(
				`Cursor rules file not found or inaccessible: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		console.log("Sending rules status:", initialized);
		// Send status to webview
		this.panel.webview.postMessage({
			type: "rulesStatus",
			initialized,
		});
	}

	private async getMemoryBankStatus() {
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

	private async resetRules() {
		if (!this.panel) {
			return;
		}

		try {
			if (!this.validateWorkspaceForReset()) {
				return;
			}

			const resetResult = await this.performRulesReset();
			this.sendResetResult(resetResult); // For the success case
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			let logMessage = `Error resetting rules: ${errorMessage}`;
			let logLevelToUse = LogLevel.Error; // Renamed to avoid conflict with LogLevel enum itself

			if (this.isUserCancelledOverwrite(error)) {
				logMessage = `User cancelled rules overwrite: ${errorMessage}`;
				logLevelToUse = LogLevel.Info;
			}

			Logger.getInstance().log(logLevelToUse, logMessage);

			this.panel?.webview.postMessage({
				type: "resetRulesResult",
				success: false,
				error: errorMessage, // Send the original error message to the webview
			});
		}
	}

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
			Logger.getInstance().error("Reset rules failed: No workspace folder found");
			return false;
		}
		return true;
	}

	/**
	 * Perform the actual rules file reset operation
	 */
	private async performRulesReset(): Promise<{ success: boolean; error?: string }> {
		await this.cursorRulesService.createRulesFile(
			"memory-bank.mdc",
			CURSOR_MEMORY_BANK_RULES_FILE,
		);
		vscode.window.showInformationMessage("Memory bank rules have been reset.");
		Logger.getInstance().info("Memory bank rules reset successfully.");
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

	public getWebviewPanel(): vscode.WebviewPanel | undefined {
		return this.panel;
	}

	/**
	 * Send current MCP server status to webview
	 */
	private async sendCurrentMCPServerStatus(): Promise<void> {
		if (!this.panel) {
			return;
		}

		try {
			// Cast to access implementation-specific method
			const isRunning = (this.mcpServer as any).isServerRunning?.() ?? false;
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

			Logger.getInstance().info(
				`Initial MCP server status sent to webview: ${runningStatus}`,
				{
					port: serverPort,
					transport: transportType,
					isStdioMode,
				},
			);
		} catch (error) {
			Logger.getInstance().error(
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
}
