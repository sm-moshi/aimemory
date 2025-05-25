import * as vscode from 'vscode';
import type { MemoryBankMCPServer } from './mcp/mcpServer.js';
import type { MemoryBankFile } from './types/types.js';

export class CommandHandler {
  constructor(private mcpServer: MemoryBankMCPServer) {}

  /**
   * Process a /memory command sent in the Cursor AI input
   * Format: /memory <command> [args...]
   */
  async processMemoryCommand(text: string): Promise<string | undefined> {
    // Check if text starts with /memory
    if (!text.trim().startsWith('/memory')) {
      return undefined;
    }

    // Extract the command and args
    const parts = text.trim().split(' ');

    // Ensure we have at least "/memory" and a command
    if (parts.length < 2) {
      return this.getHelpText();
    }

    // Remove the "/memory" part
    parts.shift();

    // The first part is the command
    const command = parts[0];
    if (!command) {
      return this.getHelpText();
    }

    // The rest are arguments
    const args = parts.slice(1);

    try {
      switch (command) {
        case 'help': {
          return this.getHelpText();
        }

        case 'status': {
          const memoryBank = this.mcpServer.getMemoryBank();
          const isInitialized = await memoryBank.getIsMemoryBankInitialized();
          if (!isInitialized) {
            return 'Memory Bank Status: Not initialized\nUse the initialize-memory-bank tool to set up the memory bank.';
          }

          // Ensure the in-memory file list is up-to-date and all files are loaded/created
          const createdFiles = await memoryBank.loadFiles();
          let selfHealingMsg = '';
          if (createdFiles.length > 0) {
            selfHealingMsg = `\n[Self-healing] Created missing files: ${createdFiles.join(', ')}`;
          }

          // Get all files and their status
          const files = memoryBank.getAllFiles();

          // Group files by category
          const categories = {
            core: [] as string[],
            systemPatterns: [] as string[],
            techContext: [] as string[],
            progress: [] as string[],
            legacy: [] as string[],
          };

          for (const file of files) {
            const status = `${file.type}: Last updated ${file.lastUpdated ? new Date(file.lastUpdated).toLocaleString() : 'never'}`;
            if (file.type.startsWith('core/')) {
              categories.core.push(status);
            } else if (file.type.startsWith('systemPatterns/')) {
              categories.systemPatterns.push(status);
            } else if (file.type.startsWith('techContext/')) {
              categories.techContext.push(status);
            } else if (file.type.startsWith('progress/')) {
              categories.progress.push(status);
            } else {
              categories.legacy.push(status);
            }
          }

          // Build status output
          let output = 'Memory Bank Status: Initialized\n\n';
          if (selfHealingMsg) {
            output = `${output}${selfHealingMsg}\n\n`;
          }

          if (categories.core.length) {
            output += `Core Files:\n${categories.core.join('\n')}\n\n`;
          }
          if (categories.systemPatterns.length) {
            output += `System Patterns:\n${categories.systemPatterns.join('\n')}\n\n`;
          }
          if (categories.techContext.length) {
            output += `Tech Context:\n${categories.techContext.join('\n')}\n\n`;
          }
          if (categories.progress.length) {
            output += `Progress:\n${categories.progress.join('\n')}\n\n`;
          }
          if (categories.legacy.length) {
            output += `Legacy Files:\n${categories.legacy.join('\n')}`;
          }

          return output.trim();
        }

        case 'update': {
          if (!args.length) {
            return 'Error: /memory update requires a file type argument\nUsage: /memory update <fileType> <content>';
          }

          const fileType = args[0];
          const content = args.slice(1).join(' ');

          if (!content) {
            return 'Error: /memory update requires content\nUsage: /memory update <fileType> <content>';
          }

          try {
            await this.mcpServer.updateMemoryBankFile(fileType, content);
            return `Successfully updated ${fileType}`;
          } catch (error) {
            return `Error updating ${fileType}: ${error instanceof Error ? error.message : String(error)}`;
          }
        }

        case 'initialize':
        case 'init': {
          try {
            await this.mcpServer.getMemoryBank().initializeFolders();
            await this.mcpServer.getMemoryBank().loadFiles();
            return 'Memory bank initialised successfully.';
          } catch (error) {
            return `Error initialising memory bank: ${error instanceof Error ? error.message : String(error)}`;
          }
        }

        case 'health': {
          const healthReport = await this.mcpServer.getMemoryBank().checkHealth();
          return healthReport;
        }

        default: {
          return `Command "${command}" is not supported.\n\n${this.getHelpText()}`;
        }
      }
    } catch (error) {
      console.error('Error processing command:', error);
      return `Error processing command: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  //TODO: Think about if it's worth adding a /plan command or let that be handled by rules
  async processModesCommand(text: string): Promise<string | undefined> {
    // Check if text starts with /modes
    if (!text.trim().startsWith('/plan')) {
      return undefined;
    }

    return '';
  }

  /**
   * Show help text for available commands
   */
  private getHelpText(): string {
    return `
AI Memory Bank Commands:

/memory status - Check the status of all memory bank files
/memory update <fileType> <content> - Update a specific memory bank file
/memory initialize - Initialise the memory bank
/memory init - Alias for /memory initialize
/memory health - Check the health of the memory bank
/memory help - Show this help text

For more advanced operations, use the MCP tools:
- initialize-memory-bank
- list-memory-bank-files
- get-memory-bank-file
- update-memory-bank-file
`;
  }
}
