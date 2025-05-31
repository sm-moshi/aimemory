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

/**
 * Helper function to get and validate workspace folder
 */
function getMemoryBankPath(): string {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		throw new Error("No workspace folder found");
	}
	return path.join(workspaceFolders[0].uri.fsPath, ".aimemory", "memory-bank");
}

/**
 * Register all core services with the DI container
 */
function registerCoreServices(
	container: DIContainer,
	logger: Logger,
	context: vscode.ExtensionContext,
): void {
	const memoryBankPath = getMemoryBankPath();

	// Register singletons
	container.register("Logger", () => logger, true);
	container.register("CacheManager", (c) => new CacheManager(c.resolve("Logger")), true);

	container.register(
		"StreamingManager",
		(c) => new StreamingManager(c.resolve("Logger"), memoryBankPath),
		true,
	);

	container.register(
		"FileOperationManager",
		(c) => new FileOperationManager(c.resolve("Logger"), memoryBankPath),
		true,
	);

	container.register(
		"MemoryBankServiceCore",
		(c) =>
			new MemoryBankServiceCore(
				memoryBankPath,
				c.resolve("Logger"),
				c.resolve("CacheManager"),
				c.resolve("StreamingManager"),
				c.resolve("FileOperationManager"),
			),
		true,
	);

	container.register("CursorRulesService", () => new CursorRulesService(context), true);

	container.register(
		"VSCodeMemoryBankService",
		(c) =>
			new VSCodeMemoryBankService(
				context,
				c.resolve("MemoryBankServiceCore"),
				c.resolve("CursorRulesService"),
				c.resolve("Logger"),
			),
		true,
	);

	container.register(
		"MCPServerInterface",
		(c) =>
			new MemoryBankMCPAdapter(
				context,
				c.resolve<VSCodeMemoryBankService>("VSCodeMemoryBankService"),
				c.resolve<Logger>("Logger"),
				DEFAULT_MCP_PORT,
			),
		true,
	);

	container.register(
		"WebviewManager",
		(c) =>
			new WebviewManager(
				context,
				c.resolve("MCPServerInterface"),
				c.resolve("VSCodeMemoryBankService"),
				c.resolve("CursorRulesService"),
				c.resolve("MCPServerInterface"),
				c.resolve("Logger"),
			),
		true,
	);

	container.register(
		"CommandHandler",
		(c) => new CommandHandler(c.resolve("MCPServerInterface")),
		true,
	);
}

/**
 * Register all VS Code commands
 */
function registerCommands(
	context: vscode.ExtensionContext,
	webviewManager: WebviewManager,
	commandHandler: CommandHandler,
	mcpServer: MCPServerInterface,
	logger: Logger,
): void {
	const commands = [
		vscode.commands.registerCommand("aimemory.openWebview", () => {
			console.log("Opening webview");
			webviewManager.openWebview();
		}),

		vscode.commands.registerCommand("aimemory.updateMCPConfig", async () => {
			try {
				await updateCursorMCPConfig(context.extensionPath);
				vscode.window.showInformationMessage(
					"Cursor MCP config (mcp.json) has been configured for AI Memory (STDIO).",
				);
			} catch (error) {
				await showVSCodeError("Failed to update Cursor MCP config", error);
			}
		}),

		vscode.commands.registerCommand("aimemory.startMCP", async () => {
			try {
				await mcpServer.start();
				await mcpServer.getMemoryBank().createMemoryBankRulesIfNotExists();
				vscode.window.showInformationMessage(
					"AI Memory MCP server started using STDIO transport. Ready for Cursor MCP integration.",
				);
			} catch (error) {
				await showVSCodeError("Failed to start MCP server", error);
			}
		}),

		vscode.commands.registerCommand("aimemory.stopServer", () => {
			mcpServer.stop();
		}),

		vscode.commands.registerTextEditorCommand("cursor.newChat", async (editor, edit, text) => {
			console.log("cursor.newChat", text);
			if (typeof text === "string" && text.trim().startsWith("/memory")) {
				const response = await commandHandler.processMemoryCommand(text);
				if (response) {
					vscode.window.showInformationMessage(`AI Memory: ${response}`);
					return;
				}
			}
			vscode.commands.executeCommand("_cursor.newChat", text);
		}),

		vscode.commands.registerCommand("aimemory.setLogLevel", async () => {
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
		}),

		vscode.commands.registerCommand("aimemory.showOutput", () => {
			logger.showOutput();
		}),
	];

	context.subscriptions.push(...commands);
}

/**
 * Setup configuration change listeners
 */
function setupConfigurationListeners(
	context: vscode.ExtensionContext,
	container: DIContainer,
): void {
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration("aimemory.logLevel")) {
				const newLevel =
					vscode.workspace.getConfiguration("aimemory").get<string>("logLevel") ?? "info";
				const resolvedLogger = container.resolve<Logger>("Logger");
				resolvedLogger.setLevel(parseLogLevel(newLevel));
				resolvedLogger.info(`Log level changed to: ${newLevel}`);
			}
		}),
	);
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Initialize logger with configuration
	const logger = Logger.getInstance();
	const config = vscode.workspace.getConfiguration("aimemory");
	const initialLevel = parseLogLevel(config.get<string>("logLevel") ?? "info");
	logger.setLevel(initialLevel);

	// Create and setup DI Container
	const container = new DIContainer();
	registerCoreServices(container, logger, context);

	// Setup configuration listeners
	setupConfigurationListeners(context, container);

	console.log("Registering open webview command");

	// Resolve services and register commands
	const webviewManager = container.resolve<WebviewManager>("WebviewManager");
	const commandHandler = container.resolve<CommandHandler>("CommandHandler");
	const mcpServer = container.resolve<MCPServerInterface>("MCPServerInterface");

	registerCommands(context, webviewManager, commandHandler, mcpServer, logger);

	console.log("AI Memory extension is now active!");

	// Register cleanup on deactivation
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
