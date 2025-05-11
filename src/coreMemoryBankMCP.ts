import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MemoryBankFileType } from "./types.js";
import { MemoryBankServiceCore } from "./memoryBankServiceCore.js";
import { z } from "zod";

export class CoreMemoryBankMCP {
  private server: McpServer;
  private memoryBank: MemoryBankServiceCore;

  constructor(config: { memoryBankPath: string; logger?: Console }) {
    this.memoryBank = new MemoryBankServiceCore(config.memoryBankPath, config.logger);
    this.server = new McpServer(
      {
        name: "AI Memory MCP Server",
        version: "0.0.1",
      },
      {
        capabilities: {
          logging: {},
          tools: {},
        },
      }
    );
    this.registerResources();
    this.registerTools();
    this.registerPrompts();
  }

  private registerResources() {
    // TODO: Register memory bank files as resources (move logic from MemoryBankMCPServer, but use this.memoryBank)
    // ...
    this.server.resource(
    "memory-bank-root",
    "memory-bank://",
    async () => {
      // Return a simple status or list of files
      const files = this.memoryBank.getAllFiles();
      return {
        contents: [
          {
            uri: "memory-bank://",
            text: JSON.stringify(
              files.map((file) => ({
                type: file.type,
                lastUpdated: file.lastUpdated,
              })),
              null,
              2
            ),
          },
        ],
      };
    });
  }

  private registerTools() {
    // initialize-memory-bank
    this.server.tool(
      "initialize-memory-bank",
      {},
      async () => {
        try {
          const isInitialized = await this.memoryBank.getIsMemoryBankInitialized();
          if (!isInitialized) {
            await this.memoryBank.initializeFolders();
            await this.memoryBank.loadFiles();
            return {
              content: [
                {
                  type: "text" as const,
                  text: "Memory bank initialized successfully.",
                },
              ],
            };
          }
          await this.memoryBank.loadFiles();
          return {
            content: [
              {
                type: "text" as const,
                text: "Memory bank already initialized.",
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error initializing memory bank: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // read-memory-bank-files
    this.server.tool(
      "read-memory-bank-files",
      {},
      async () => {
        try {
          await this.memoryBank.loadFiles();
          const files = this.memoryBank.getFilesWithFilenames();
          return {
            content: [
              {
                type: "text" as const,
                text: files ? `Here are the files in the memory bank:\n\n${files}` : "Memory bank is empty or could not be read.",
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error reading memory bank files: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // update-memory-bank-file
    this.server.tool(
      "update-memory-bank-file",
      {
        fileType: z.string(),
        content: z.string(),
      },
      async ({ fileType, content }) => {
        try {
          await this.memoryBank.loadFiles();
          await this.memoryBank.updateFile(fileType as MemoryBankFileType, content);
          return {
            content: [
              { type: "text" as const, text: `Updated ${fileType} successfully` },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error updating ${fileType}: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // list-memory-bank-files
    this.server.tool(
      "list-memory-bank-files",
      {},
      async () => {
        try {
          await this.memoryBank.loadFiles();
          const files = this.memoryBank.getAllFiles();
          const fileListText = files
            .map(
              (file) =>
                `${file.type}: Last updated ${
                  file.lastUpdated ? new Date(file.lastUpdated).toLocaleString() : "never"
                }`
            )
            .join("\n");
          return {
            content: [
              {
                type: "text" as const,
                text: fileListText || "No memory bank files found.",
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error listing memory bank files: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  }

  private registerPrompts() {
    // TODO: Register MCP prompts (move logic from MemoryBankMCPServer)
    // ...
  }

  getServer() {
    return this.server;
  }
}
