// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { CommandHandler } from "./commandHandler.js";
import { MemoryBankMCPAdapter } from "./mcp/mcpAdapter.js";
import type { MCPServerInterface } from "./types/mcpTypes.js";
import { updateCursorMCPConfig } from "./utils/cursor-config.js";
import { LogLevel, Logger } from "./utils/log.js";
import { WebviewManager } from "./webview/webviewManager.js";

// Default MCP server options (for compatibility with existing interface)
const DEFAULT_MCP_PORT = 7331;

// Helper to parse log level string from config
function parseLogLevel(levelStr: string): LogLevel {
	switch (levelStr) {
		case "trace":
			return LogLevel.Trace;
		case "debug":
			return LogLevel.Debug;
		case "info":
			return LogLevel.Info;
		case "warning":
			return LogLevel.Warning;
		case "error":
			return LogLevel.Error;
		default:
			return LogLevel.Info;
	}
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Initialise the singleton Logger and set log level from config
	const logger = Logger.getInstance();
	const config = vscode.workspace.getConfiguration("aimemory");
	const initialLevel = parseLogLevel(config.get<string>("logLevel") || "info");
	logger.setLevel(initialLevel);

	// Listen for changes to the log level config and update logger dynamically
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration("aimemory.logLevel")) {
				const newLevel =
					vscode.workspace.getConfiguration("aimemory").get<string>("logLevel") || "info";
				logger.setLevel(parseLogLevel(newLevel));
				logger.info(`Log level changed to: ${newLevel}`);
			}
		}),
	);

	console.log("Registering open webview command");

	// Create MCP server instance - using STDIO transport only
	const mcpServer: MCPServerInterface = new MemoryBankMCPAdapter(context, DEFAULT_MCP_PORT);

	// Create webview manager
	const webviewManager = new WebviewManager(context, mcpServer);

	// Register command to open the webview
	const openWebviewCommand = vscode.commands.registerCommand("aimemory.openWebview", () => {
		console.log("Opening webview");
		webviewManager.openWebview();
	});

	// Register a command to manually update Cursor MCP config
	const updateMCPConfigCommand = vscode.commands.registerCommand(
		"aimemory.updateMCPConfig",
		async () => {
			try {
				await updateCursorMCPConfig(mcpServer.getPort());
				vscode.window.showInformationMessage(
					`Cursor MCP config has been updated to use AI Memory server on port ${mcpServer.getPort()}`,
				);
			} catch (error) {
				vscode.window.showErrorMessage(
					`Failed to update Cursor MCP config: ${
						error instanceof Error ? error.message : String(error)
					}`,
				);
			}
		},
	);

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log("AI Memory extension is now active!");

	// Create command handler
	const commandHandler = new CommandHandler(mcpServer);

	// Register a command that starts the MCP server
	const startMCPCommand = vscode.commands.registerCommand("aimemory.startMCP", async () => {
		try {
			// Start the STDIO MCP server
			await mcpServer.start();

			// Show information about the MCP server
			vscode.window.showInformationMessage(
				"AI Memory MCP server started using STDIO transport. Ready for Cursor MCP integration.",
			);
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to start MCP server: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	});

	const stopServerCommand = vscode.commands.registerCommand("aimemory.stopServer", async () => {
		await mcpServer.stop();
	});

	// Register the Cursor AI command interceptor
	// This will intercept the commands sent to Cursor AI and process /memory commands
	const cursorApiCommands = vscode.commands.registerTextEditorCommand(
		"cursor.newChat",
		async (editor, edit, text) => {
			console.log("cursor.newChat", text);
			if (typeof text === "string" && text.trim().startsWith("/memory")) {
				// Process the memory command
				const response = await commandHandler.processMemoryCommand(text);

				if (response) {
					// Show the response in Cursor's chat UI or in an information message
					vscode.window.showInformationMessage(`AI Memory: ${response}`);
					return;
				}
			}

			// If not a memory command or command handling failed,
			// pass through to the original Cursor command
			vscode.commands.executeCommand("_cursor.newChat", text);
		},
	);

	// Register a command to set the log level via quick-pick UI
	const setLogLevelCommand = vscode.commands.registerCommand("aimemory.setLogLevel", async () => {
		const levels = [
			{ label: "Trace", value: "trace" },
			{ label: "Debug", value: "debug" },
			{ label: "Info", value: "info" },
			{ label: "Warning", value: "warning" },
			{ label: "Error", value: "error" },
			{ label: "Off", value: "off" },
		];
		const picked = await vscode.window.showQuickPick(levels, {
			placeHolder: "Select log level",
		});
		if (picked) {
			await vscode.workspace
				.getConfiguration("aimemory")
				.update("logLevel", picked.value, vscode.ConfigurationTarget.Global);
			logger.setLevel(parseLogLevel(picked.value));
			vscode.window.showInformationMessage(`AI Memory log level set to ${picked.label}`);
		}
	});

	// Register a command to show the AI Memory Output Channel
	const showOutputChannelCommand = vscode.commands.registerCommand("aimemory.showOutput", () => {
		const logger = Logger.getInstance();
		logger.showOutput();
	});

	// Add all commands to context subscriptions
	context.subscriptions.push(
		openWebviewCommand,
		updateMCPConfigCommand,
		startMCPCommand,
		cursorApiCommands,
		stopServerCommand,
		setLogLevelCommand,
		showOutputChannelCommand,
	);

	// Register a disposal event to stop the server when the extension is deactivated
	context.subscriptions.push({
		dispose: () => {
			mcpServer.stop();
		},
	});
}

// This method is called when your extension is deactivated
export function deactivate() {
	// This method is called when your extension is deactivated
	// Nothing to do here as we've registered disposal in the activate function
}
