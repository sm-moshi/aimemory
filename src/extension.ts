// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as http from "node:http";
import { MemoryBankMCPServer } from "./mcpServer";
import { CommandHandler } from "./commandHandler";
import { WebviewManager } from "./webviewManager";
import { updateCursorMCPConfig } from "./utils/cursor-config";

// Default MCP server options
const DEFAULT_MCP_PORT = 7331;
const ALTERNATIVE_MCP_PORT = 7332;

let outputChannel: vscode.OutputChannel;

// Helper function to check if a server is running on the given port
async function isServerRunning(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const request = http.get(`http://localhost:${port}/health`, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

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

    request.on("error", () => {
      resolve(false);
    });

    // Set timeout to avoid hanging
    request.setTimeout(1000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('AI Memory');
  outputChannel.appendLine('AI Memory extension activated! 🐹');

  console.log("Registering open webview command");

  // Create MCP server instance first
  const mcpServer = new MemoryBankMCPServer(context, DEFAULT_MCP_PORT);

  // Create webview manager
  const webviewManager = new WebviewManager(context, mcpServer);

  // Register command to open the webview
  const openWebviewCommand = vscode.commands.registerCommand(
    "aimemory.openWebview",
    () => {
      console.log("Opening webview");
      webviewManager.openWebview();
    }
  );

  // Register a command to manually update Cursor MCP config
  const updateMCPConfigCommand = vscode.commands.registerCommand(
    "aimemory.updateMCPConfig",
    async () => {
      try {
        await updateCursorMCPConfig(mcpServer.getPort());
        vscode.window.showInformationMessage(
          `Cursor MCP config has been updated to use AI Memory server on port ${mcpServer.getPort()}`
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to update Cursor MCP config: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  );

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log("AI Memory extension is now active!");

  // Create command handler
  const commandHandler = new CommandHandler(mcpServer);

  // Register a command that starts the MCP server
  const startMCPCommand = vscode.commands.registerCommand(
    "aimemory.startMCP",
    async () => {
      try {
        // First check if there's already a server running on the default port
        const defaultServerRunning = await isServerRunning(DEFAULT_MCP_PORT);
        if (defaultServerRunning) {
          mcpServer.setExternalServerRunning(DEFAULT_MCP_PORT);
          vscode.window.showInformationMessage(
            `AI Memory MCP server already running on port ${DEFAULT_MCP_PORT}. Connecting to existing server.`
          );
          return;
        }

        // Check alternative port too
        const alternativeServerRunning = await isServerRunning(
          ALTERNATIVE_MCP_PORT
        );
        if (alternativeServerRunning) {
          mcpServer.setExternalServerRunning(ALTERNATIVE_MCP_PORT);
          vscode.window.showInformationMessage(
            `AI Memory MCP server already running on port ${ALTERNATIVE_MCP_PORT}. Connecting to existing server.`
          );
          return;
        }

        // No existing server found, try to start a new one
        // Try to start the server with the default port
        await mcpServer.start();

        // Show information about how to connect to the MCP server
        vscode.window.showInformationMessage(
          `AI Memory MCP server started on port ${DEFAULT_MCP_PORT}. You can connect to it through Cursor's MCP integration.`
        );
      } catch (error) {
        // If the default port is in use, try the alternative port
        if (error instanceof Error && error.message.includes("EADDRINUSE")) {
          try {
            // Create a new server with the alternative port
            const alternativeServer = new MemoryBankMCPServer(
              context,
              ALTERNATIVE_MCP_PORT
            );
            await alternativeServer.start();

            // Show information about how to connect to the MCP server
            vscode.window.showInformationMessage(
              `AI Memory MCP server started on port ${ALTERNATIVE_MCP_PORT}.
                You can connect to it through Cursor's MCP integration.`
            );
          } catch (innerError) {
            vscode.window.showErrorMessage(
              `Failed to start MCP server: ${
                innerError instanceof Error
                  ? innerError.message
                  : String(innerError)
              }`
            );
          }
        } else {
          vscode.window.showErrorMessage(
            `Failed to start MCP server: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    }
  );

  const stopServerCommand = vscode.commands.registerCommand(
    "aimemory.stopServer",
    async () => {
      await mcpServer.stop();
    }
  );

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
    }
  );

  // Add our command to the extension's subscriptions
  context.subscriptions.push(startMCPCommand);
  context.subscriptions.push(cursorApiCommands);
  context.subscriptions.push(stopServerCommand);
  context.subscriptions.push(openWebviewCommand);
  context.subscriptions.push(updateMCPConfigCommand);

  // Register a disposal event to stop the server when the extension is deactivated
  context.subscriptions.push({
    dispose: () => {
      mcpServer.stop();
    },
  });

  context.subscriptions.push(
    vscode.commands.registerCommand('aimemory.showOutput', () => {
      outputChannel.show();
    })
  );
}

export function getOutputChannel(): vscode.OutputChannel {
  return outputChannel;
}

// This method is called when your extension is deactivated
export function deactivate() {
  // This method is called when your extension is deactivated
  // Nothing to do here as we've registered disposal in the activate function
}
