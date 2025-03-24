import * as vscode from "vscode";
import { MemoryBankMCPServer } from "./mcpServer";

export class CommandHandler {
  constructor(private mcpServer: MemoryBankMCPServer) {}

  /**
   * Process a /memory command sent in the Cursor AI input
   * Format: /memory <command> [args...]
   */
  async processMemoryCommand(text: string): Promise<string | undefined> {
    // Check if text starts with /memory
    if (!text.trim().startsWith("/memory")) {
      return undefined;
    }

    // Extract the command and args
    const parts = text.trim().split(" ");

    // Ensure we have at least "/memory" and a command
    if (parts.length < 2) {
      return this.getHelpText();
    }

    // Remove the "/memory" part
    parts.shift();

    // The first part is the command
    const command = parts.shift()!;

    // The rest are arguments
    const args = parts;

    try {
      // In the new MCP-based implementation, we don't directly handle commands
      // Instead, we provide information about the MCP server
      if (command === "help") {
        return this.getHelpText();
      }

      if (command === "status") {
        return "AI Memory MCP server is running. Use it through Cursor's built-in MCP support.";
      }

      // For all other commands, we'll just provide the help text
      return `Command "${command}" is not directly supported. Please use Cursor's MCP integration to access the AI Memory MCP server.\n\n${this.getHelpText()}`;
    } catch (error) {
      console.error("Error processing command:", error);
      return `Error processing command: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  }

  //TODO: Think about if it's worth adding a /plan command or let that be handled by rules
  async processModesCommand(text: string): Promise<string | undefined> {
    // Check if text starts with /modes
    if (!text.trim().startsWith("/plan")) {
      return undefined;
    }

    return "";
  }

  /**
   * Show help text for available commands
   */
  private getHelpText(): string {
    return `
AI Memory Bank MCP Commands:

This extension now uses the Model Context Protocol (MCP) for communication.
The MCP server exposes the following functionality:

Resources:
- memory-bank:// - List all memory bank files
- memory-bank://{fileType} - Access a specific memory bank file

Tools:
- initialize-memory-bank - Initialize the memory bank with template files
- list-memory-bank-files - List all memory bank files
- get-memory-bank-file - Get the content of a specific memory bank file
- update-memory-bank-file - Update the content of a specific memory bank file

Prompts:
- initialize-memory-bank - Prompt for initializing the memory bank
- update-memory-bank-file - Prompt for updating a memory bank file

You can use these capabilities through Cursor's MCP integration.
`;
  }
}
