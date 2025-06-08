import * as vscode from "vscode";
import { CacheManager } from "./core/cache";
import { FileOperationManager } from "./core/file-operations";
import { MemoryBankManager } from "./core/memory-bank";
import { StreamingManager } from "./core/streaming";
import { CursorRulesService, updateCursorMCPConfig } from "./cursor-integration";
import { DIContainer } from "./lib/di-container";
import type { Logger as GenericLogger, LogContext, LogLevel, Logger } from "./lib/types/core";
import { createLogger, showVSCodeError } from "./lib/utils";
import { MemoryBankMCPAdapter } from "./mcp/server";
import type { MCPServerInterface } from "./mcp/server";
import { CommandHandler } from "./vscode/commands";
import { WebviewProvider } from "./vscode/webview-provider";
import {
	createMemoryBankRulesIfNotExists,
	getInitialConfiguration,
	getMemoryBankPath,
	parseLogLevel,
	setupConfigurationListeners,
} from "./vscode/workspace";

// Default MCP server options (for compatibility with existing interface)
const DEFAULT_MCP_PORT = 7331;

/**
 * Adapter to bridge VS Code Logger with generic Logger interface
 */
class VSCodeLoggerAdapter implements GenericLogger {
	constructor(private readonly vscodeLogger: Logger) {}

	trace(message: string, context?: LogContext): void {
		this.vscodeLogger.trace(message, context);
	}

	debug(message: string, context?: LogContext): void {
		this.vscodeLogger.debug(message, context);
	}

	info(message: string, context?: LogContext): void {
		this.vscodeLogger.info(message, context);
	}

	warn(message: string, context?: LogContext): void {
		this.vscodeLogger.warn(message, context);
	}

	error(message: string, context?: LogContext): void {
		this.vscodeLogger.error(message, context);
	}

	setLevel(level: LogLevel): void {
		this.vscodeLogger.setLevel(level);
	}
}

/**
 * Register all core services with the DI container
 */
function registerCoreServices(container: DIContainer, logger: Logger, context: vscode.ExtensionContext): void {
	const memoryBankPath = getMemoryBankPath();
	const loggerAdapter = new VSCodeLoggerAdapter(logger);
	const fileOperationManager = new FileOperationManager(loggerAdapter, memoryBankPath);

	// Register singletons
	container.register("Logger", () => logger, true);
	container.register("CacheManager", c => new CacheManager(c.resolve("Logger")), true);

	container.register(
		"StreamingManager",
		c => new StreamingManager(c.resolve("Logger"), fileOperationManager, memoryBankPath),
		true,
	);

	container.register("FileOperationManager", () => fileOperationManager, true);

	container.register(
		"MemoryBankServiceCore",
		c =>
			new MemoryBankManager(
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
		"MCPServerInterface",
		c =>
			new MemoryBankMCPAdapter(
				context,
				c.resolve<MemoryBankManager>("MemoryBankServiceCore"),
				c.resolve<Logger>("Logger"),
				DEFAULT_MCP_PORT,
			),
		true,
	);

	container.register(
		"WebviewProvider",
		c =>
			new WebviewProvider(
				context,
				c.resolve("MCPServerInterface"),
				c.resolve("MemoryBankServiceCore"),
				c.resolve("CursorRulesService"),
				c.resolve("MCPServerInterface"),
				c.resolve("Logger"),
			),
		true,
	);

	container.register("CommandHandler", c => new CommandHandler(c.resolve("MCPServerInterface")), true);
}

/**
 * Register all VS Code commands
 */
function registerCommands(
	context: vscode.ExtensionContext,
	container: DIContainer,
	webviewProvider: WebviewProvider,
	commandHandler: CommandHandler,
	mcpServer: MCPServerInterface,
	logger: Logger,
): void {
	const commands = [
		vscode.commands.registerCommand("aimemory.openWebview", () => {
			logger.debug("Opening webview", { operation: "openWebview" });
			webviewProvider.openWebview();
		}),

		vscode.commands.registerCommand("aimemory.updateMCPConfig", async () => {
			try {
				const fom = container.resolve<FileOperationManager>("FileOperationManager");
				await updateCursorMCPConfig(context.extensionPath, fom);
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
				const cursorRulesService = container.resolve<CursorRulesService>("CursorRulesService");
				const fileOperationManager = container.resolve<FileOperationManager>("FileOperationManager");
				await createMemoryBankRulesIfNotExists(cursorRulesService, logger, fileOperationManager);
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

		vscode.commands.registerTextEditorCommand("cursor.newChat", async (_editor, _edit, text) => {
			logger.debug("cursor.newChat command received", {
				text: typeof text === "string" ? `${text.substring(0, 100)}...` : String(text),
				operation: "cursor.newChat",
			});
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
			// Show output for VS Code logger
			if ("showOutput" in logger && typeof logger.showOutput === "function") {
				logger.showOutput();
			} else {
				vscode.window.showInformationMessage("AI Memory: Output channel functionality not available");
			}
		}),
	];

	context.subscriptions.push(...commands);
}

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	// Initialize logger with configuration using workspace utilities
	const { logLevel } = getInitialConfiguration();
	const logger = createLogger();
	logger.setLevel(logLevel);

	// Create and setup DI Container
	const container = new DIContainer();
	registerCoreServices(container, logger, context);

	// Resolve services from container
	const webviewProvider = container.resolve<WebviewProvider>("WebviewProvider");
	const commandHandler = container.resolve<CommandHandler>("CommandHandler");
	const mcpServer = container.resolve<MCPServerInterface>("MCPServerInterface");

	// Register commands and UI elements
	registerCommands(context, container, webviewProvider, commandHandler, mcpServer, logger);
	setupConfigurationListeners(context, container);

	logger.info("AI Memory extension activated.");
}

// This method is called when your extension is deactivated
export function deactivate() {
	// This method is called when your extension is deactivated Nothing to do here as we've registered disposal in the
	// activate function
}
