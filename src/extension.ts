import * as path from "node:path";
import * as vscode from "vscode";
import { CommandHandler } from "./commandHandler.js";
import { CacheManager } from "./core/CacheManager.js";
import { DIContainer } from "./core/DIContainer.js";
import { FileOperationManager } from "./core/FileOperationManager.js";
import { MemoryBankServiceCore } from "./core/memoryBankServiceCore.js";
import { VSCodeMemoryBankService } from "./core/vsCodeMemoryBankService.js";
import { LogLevel, Logger } from "./infrastructure/logging/vscode-logger.js";
import { showVSCodeError } from "./infrastructure/vscode/error-display.js";
import { MemoryBankMCPAdapter } from "./mcp/mcpAdapter.js";
import { StreamingManager } from "./performance/StreamingManager.js";
import { updateCursorMCPConfig } from "./services/cursor/config.js";
import { CursorRulesService } from "./services/cursor/rules-service.js";
import type { MCPServerInterface } from "./types/mcpTypes.js";
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
	const initialLevel = parseLogLevel(config.get<string>("logLevel") ?? "info");
	logger.setLevel(initialLevel);

	// Create DI Container
	const container = new DIContainer();

	// Register core services and dependencies with the container
	container.register("Logger", () => logger, true); // Register existing singleton instance

	container.register("CacheManager", (c) => new CacheManager(c.resolve("Logger")), true);

	container.register("StreamingManager", (c) => new StreamingManager(c.resolve("Logger")), true);

	container.register(
		"FileOperationManager",
		(c) => new FileOperationManager(c.resolve("Logger")),
		true,
	);

	container.register(
		"MemoryBankServiceCore",
		(c) => {
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (!workspaceFolders) {
				throw new Error(
					"Cannot initialize MemoryBankServiceCore: No workspace folder found",
				);
			}
			const memoryBankFolder = path.join(
				workspaceFolders[0].uri.fsPath,
				".aimemory",
				"memory-bank",
			);
			return new MemoryBankServiceCore(
				memoryBankFolder,
				c.resolve("Logger"),
				c.resolve("CacheManager"),
				c.resolve("StreamingManager"),
				c.resolve("FileOperationManager"),
			);
		},
		true,
	); // Register as singleton

	container.register(
		"CursorRulesService",
		() => {
			// CursorRulesService constructor needs context
			return new CursorRulesService(context);
		},
		true,
	); // Register as singleton

	container.register(
		"VSCodeMemoryBankService",
		(c) => {
			// VSCodeMemoryBankService constructor needs context, core, cursorRulesService, and logger
			return new VSCodeMemoryBankService(
				context,
				c.resolve("MemoryBankServiceCore"),
				c.resolve("CursorRulesService"),
				c.resolve("Logger"),
			);
		},
		true,
	); // Register as singleton

	container.register(
		"MCPServerInterface",
		(c) => {
			// MemoryBankMCPAdapter constructor needs context, memoryBankService, logger, and an optional port
			// We are using STDIO transport, so port can be default or null
			return new MemoryBankMCPAdapter(
				context,
				c.resolve<VSCodeMemoryBankService>("VSCodeMemoryBankService"),
				c.resolve<Logger>("Logger"),
				DEFAULT_MCP_PORT,
			);
		},
		true,
	); // Register as singleton

	container.register(
		"WebviewManager",
		(c) => {
			// WebviewManager constructor needs context, mcpServer, memoryBankService, cursorRulesService, mcpAdapter, logger
			return new WebviewManager(
				context,
				c.resolve("MCPServerInterface"),
				c.resolve("VSCodeMemoryBankService"),
				c.resolve("CursorRulesService"),
				c.resolve("MCPServerInterface"), // mcpAdapter is the same as MCPServerInterface here
				c.resolve("Logger"),
			);
		},
		true,
	); // Register as singleton

	container.register(
		"CommandHandler",
		(c) => {
			// CommandHandler constructor needs mcpServer
			return new CommandHandler(c.resolve("MCPServerInterface"));
		},
		true,
	); // Register as singleton

	// Listen for changes to the log level config and update logger dynamically
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration("aimemory.logLevel")) {
				const newLevel =
					vscode.workspace.getConfiguration("aimemory").get<string>("logLevel") ?? "info";
				// Resolve logger from container to ensure we get the registered instance
				const resolvedLogger = container.resolve<Logger>("Logger");
				resolvedLogger.setLevel(parseLogLevel(newLevel));
				resolvedLogger.info(`Log level changed to: ${newLevel}`);
			}
		}),
	);

	console.log("Registering open webview command");

	// Resolve top-level components from the container
	const webviewManager = container.resolve<WebviewManager>("WebviewManager");
	const commandHandler = container.resolve<CommandHandler>("CommandHandler");
	const mcpServer = container.resolve<MCPServerInterface>("MCPServerInterface");

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
				await updateCursorMCPConfig(context.extensionPath);
				vscode.window.showInformationMessage(
					"Cursor MCP config (mcp.json) has been configured for AI Memory (STDIO).",
				);
			} catch (error) {
				await showVSCodeError("Failed to update Cursor MCP config", error);
			}
		},
	);

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log("AI Memory extension is now active!");

	// Register a command that starts the MCP server
	const startMCPCommand = vscode.commands.registerCommand("aimemory.startMCP", async () => {
		try {
			// Start the STDIO MCP server
			await mcpServer.start();

			// Ensure the .cursor/rules/memory-bank.mdc file exists
			await mcpServer.getMemoryBank().createMemoryBankRulesIfNotExists();

			// Show information about the MCP server
			vscode.window.showInformationMessage(
				"AI Memory MCP server started using STDIO transport. Ready for Cursor MCP integration.",
			);
		} catch (error) {
			await showVSCodeError("Failed to start MCP server", error);
		}
	});

	const stopServerCommand = vscode.commands.registerCommand("aimemory.stopServer", () => {
		mcpServer.stop();
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
