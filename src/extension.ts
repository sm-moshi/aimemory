// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { MemoryBankMCPServer } from "./mcpServer";
import { CommandHandler } from "./commandHandler";

// Default MCP server options
const DEFAULT_MCP_PORT = 7331;
const ALTERNATIVE_MCP_PORT = 7332;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log("AI Memory extension is now active!");

  // Create MCP server instance
  const mcpServer = new MemoryBankMCPServer(context, DEFAULT_MCP_PORT);

  // Create command handler
  const commandHandler = new CommandHandler(mcpServer);

  // Register a command that starts the MCP server
  const startMCPCommand = vscode.commands.registerCommand(
    "aimemory.startMCP",
    async () => {
      try {
        // Try to start the server with the default port
        await mcpServer.start();

        // Show information about how to connect to the MCP server
        vscode.window.showInformationMessage(
          `AI Memory MCP server started on port ${DEFAULT_MCP_PORT}. ` +
            `You can connect to it through Cursor's MCP integration.`
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
              `AI Memory MCP server started on port ${ALTERNATIVE_MCP_PORT}. ` +
                `You can connect to it through Cursor's MCP integration.`
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
