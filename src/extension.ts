import * as vscode from "vscode";
import { FileOperationManager } from "./core/file-operations";
import { MemoryBankManager } from "./core/memory-bank";
import { StreamingManager } from "./core/streaming";
import { updateCursorMCPConfig } from "./cursor/config";
import { createLogger } from "./lib/logging";
import type { Logger } from "./lib/types/core";
import type { MCPServerInterface } from "./lib/types/operations";
import { showVSCodeError } from "./lib/utils";
import { CommandHandler } from "./vscode/commands";
import { CursorRulesService } from "./vscode/cursor-integration";
import { MemoryBankMCPAdapter } from "./vscode/mcp-adapter";
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
 * Register all VS Code commands
 */
function registerCommands(
	context: vscode.ExtensionContext,
	webviewProvider: WebviewProvider,
	commandHandler: CommandHandler,
	mcpServer: MCPServerInterface,
	logger: Logger,
	fileOperationManager: FileOperationManager, // Pass service directly
): void {
	const commands = [
		vscode.commands.registerCommand("aimemory.openWebview", () => {
			logger.debug("Opening webview", { operation: "openWebview" });
			webviewProvider.openWebview();
		}),

		vscode.commands.registerCommand("aimemory.updateMCPConfig", async () => {
			try {
				// No longer need to resolve from container
				await updateCursorMCPConfig(context.extensionPath, fileOperationManager);
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
				const cursorRulesService = new CursorRulesService(context); // Create on demand or pass in
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
		vscode.commands.registerCommand("aimemory.showOutput", async () => {
			// Show output for VS Code logger
			try {
				if ("showOutput" in logger && typeof logger.showOutput === "function") {
					logger.showOutput();
					logger.info("Output channel displayed successfully");
				} else {
					const loggerType = logger.constructor.name || "Unknown";
					logger.error(`Logger type ${loggerType} doesn't support showOutput method`);
					vscode.window.showInformationMessage("AI Memory: Output channel functionality not available");
				}
			} catch (error) {
				logger.error(
					`Failed to show output channel: ${error instanceof Error ? error.message : String(error)}`,
				);
				vscode.window.showErrorMessage(
					`AI Memory: Failed to show output channel - ${error instanceof Error ? error.message : String(error)}`,
				);
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

	// Manually create and wire up services, inspired by the simpler v0.7.1 approach
	const memoryBankPath = getMemoryBankPath();
	const fileOperationManager = new FileOperationManager(logger, memoryBankPath);
	const streamingManager = new StreamingManager(logger, fileOperationManager, memoryBankPath);

	const memoryBankManager = new MemoryBankManager(memoryBankPath, logger, streamingManager, fileOperationManager);

	const cursorRulesService = new CursorRulesService(context);

	const mcpServer = new MemoryBankMCPAdapter(context, memoryBankManager, logger, DEFAULT_MCP_PORT);

	const webviewProvider = new WebviewProvider(context, mcpServer, memoryBankManager, cursorRulesService, logger);

	const commandHandler = new CommandHandler(mcpServer);

	// Register commands and UI elements
	registerCommands(context, webviewProvider, commandHandler, mcpServer, logger, fileOperationManager);
	// We no longer pass the container, but will need to refactor setupConfigurationListeners if it used it.
	setupConfigurationListeners(context, logger);

	logger.info("AI Memory extension activated.");
}

// This method is called when your extension is deactivated
export function deactivate() {
	// This method is called when your extension is deactivated Nothing to do here as we've registered disposal in the
	// activate function
}
