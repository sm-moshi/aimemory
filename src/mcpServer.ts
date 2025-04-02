import * as vscode from "vscode";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { MemoryBankFileType } from "./types";
import { MemoryBankService } from "./memoryBank";
import { z } from "zod";
import express from "express";
import http from "http";
import {
  INITIALIZE_MEMORY_BANK_PROMPT,
  MEMORY_BANK_ALREADY_INITIALIZED_PROMPT,
} from "./lib/mcp-prompts";
import { CommandHandler } from "./commandHandler";
import { WebviewManager } from "./webviewManager";
import { updateCursorMCPConfig } from "./utils/cursor-config";

export class MemoryBankMCPServer {
  private server: McpServer;
  private app: express.Express;
  private httpServer: http.Server | null = null;
  private memoryBank: MemoryBankService;
  private isRunning = false;
  private port: number;
  private transport: SSEServerTransport | null = null;

  constructor(private context: vscode.ExtensionContext, port: number) {
    this.port = port;
    this.app = express();
    this.memoryBank = new MemoryBankService(context);

    this.app.get("/test", (req, res) => {
      res.status(200).json({ message: "Test endpoint hit" });
    });

    // Create MCP server
    this.server = new McpServer(
      {
        name: "AI Memory MCP Server",
        version: "0.1.0",
      },
      {
        capabilities: {
          logging: {},
          tools: {},
        },
      }
    );

    this.setupRoutes();
    this.registerMCPResources();
    this.registerMCPTools();
    this.registerMCPPrompts();
    // this.registerServerManager();
  }

  public getPort(): number {
    return this.port;
  }

  private setupRoutes(): void {
    // TODO: There is a TypeScript type issue with the Express route handlers
    // that needs to be fixed. The current implementation works at runtime
    // but has type errors with TypeScript's strict checking.

    // Health check route
    this.app.get("/health", function (req, res) {
      res.status(200).json({ status: "ok ok" });
    });

    // Status route for connection debugging
    this.app.get("/status", (req, res) => {
      res.status(200).json({
        mcpServer: !!this.server,
        transport: !!this.transport,
        isRunning: this.isRunning,
        port: this.port,
      });
    });

    // Setup SSE endpoint with simplified implementation
    this.app.get("/sse", async (req, res) => {
      console.log("SSE endpoint hit - using simplified implementation");

      // Basic SSE setup
      // res.setHeader("Content-Type", "text/event-stream");
      // res.setHeader("Cache-Control", "no-cache");
      // res.setHeader("Connection", "keep-alive");
      // res.setHeader("Access-Control-Allow-Origin", "*");
      // res.flushHeaders();

      // res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
      console.log("SSE headers sent and connection established");

      // Create transport without any extra error handling
      this.transport = new SSEServerTransport("/messages", res);

      // Connect in background to avoid blocking
      await this.server.connect(this.transport);
      // .then(() => console.log("MCP server connected to transport"))
      // .catch((err) => console.error("Connection error:", err));

      req.on("close", () => {
        console.log("SSE connection closed by client");
      });
    });

    this.app.post("/messages", async (req, res) => {
      console.log("Message received, transport:", !!this.transport);

      if (!this.transport) {
        console.error("No active transport found");
        res.status(503).json({
          error: "No active SSE connection",
          message: "Please reconnect to the SSE endpoint first",
        });
        return;
      }

      await this.transport!.handlePostMessage(req, res);
    });
  }

  private registerMCPResources(): void {
    // Register memory bank files as resources
    this.server.resource(
      "memory-bank-files",
      new ResourceTemplate("memory-bank://{fileType}", {
        list: async () => ({
          resources: [
            {
              uri: "memory-bank://",
              name: "Memory Bank Files",
            },
          ],
        }),
      }),
      async (uri, { fileType }) => {
        const type = fileType as MemoryBankFileType;
        const file = this.memoryBank.getFile(type);

        if (!file) {
          throw new Error(`File ${type} not found`);
        }

        return {
          contents: [
            {
              uri: uri.href,
              text: file.content,
            },
          ],
        };
      }
    );

    // Root resource to list all memory bank files
    this.server.resource("memory-bank-root", "memory-bank://", async () => {
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

  private registerMCPTools(): void {
    this.server.tool(
      "initialize-memory-bank",
      "Initialize the memory bank and generate the project documentation",
      {},
      async (_, extra) => {
        console.log("Initializing memory bank");

        try {
          await this.memoryBank.createMemoryBankRulesIfNotExists();

          const isInitialized =
            await this.memoryBank.getIsMemoryBankInitialized();

          if (!isInitialized) {
            await this.memoryBank.initializeFolders();
            console.log(
              "Memory bank not initialized, sending initialization prompt"
            );
            return {
              content: [
                {
                  type: "text" as const,
                  text: INITIALIZE_MEMORY_BANK_PROMPT,
                },
              ],
            };
          }

          //Load memory bank files into memory
          await this.memoryBank.loadFiles();

          return {
            content: [
              {
                type: "text" as const,
                text: MEMORY_BANK_ALREADY_INITIALIZED_PROMPT,
              },
            ],
          };
        } catch (error) {
          console.error("Error initializing memory bank:", error);
          return {
            content: [
              {
                type: "text" as const,
                text: `Error initializing memory bank: ${
                  error instanceof Error ? error.message : String(error)
                }. Please try the command again.`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    this.server.tool("read-memory-bank-files", {}, async (_, extra) => {
      console.log("Reading memory bank files");
      await this.memoryBank.loadFiles();
      const files = this.memoryBank.getFilesWithFilenames();
      console.log("Files:", files);
      return {
        content: [
          {
            type: "text" as const,
            text: `Here are the files in the memory bank: \n\n${files}`,
          },
        ],
      };
    });

    // Get memory bank file
    // this.server.tool(
    //   "get-memory-bank-file",
    //   {
    //     fileType: z.string(),
    //   },
    //   async ({ fileType }, extra) => {
    //     const type = fileType as MemoryBankFileType;
    //     const file = this.memoryBank.getFile(type);

    //     if (!file) {
    //       return {
    //         content: [
    //           { type: "text" as const, text: `File ${type} not found` },
    //         ],
    //         isError: true,
    //       };
    //     }

    //     return {
    //       content: [{ type: "text" as const, text: file.content }],
    //     };
    //   }
    // );

    // Update memory bank file
    // this.server.tool(
    //   "update-memory-bank-file",
    //   {
    //     fileType: z.string(),
    //     content: z.string(),
    //   },
    //   async ({ fileType, content }, extra) => {
    //     try {
    //       const type = fileType as MemoryBankFileType;
    //       await this.memoryBank.updateFile(type, content);

    //       return {
    //         content: [
    //           { type: "text" as const, text: `Updated ${type} successfully` },
    //         ],
    //       };
    //     } catch (error) {
    //       console.error(`Failed to update ${fileType}:`, error);
    //       return {
    //         content: [
    //           {
    //             type: "text" as const,
    //             text: `Error updating ${fileType}: ${
    //               error instanceof Error ? error.message : String(error)
    //             }`,
    //           },
    //         ],
    //         isError: true,
    //       };
    //     }
    //   }
    // );

    // List all memory bank files
    this.server.tool("list-memory-bank-files", {}, async (_, extra) => {
      const files = this.memoryBank.getAllFiles();

      return {
        content: [
          {
            type: "text" as const,
            text: files
              .map(
                (file) =>
                  `${file.type}: Last updated ${
                    file.lastUpdated
                      ? new Date(file.lastUpdated).toLocaleString()
                      : "never"
                  }`
              )
              .join("\n"),
          },
        ],
      };
    });
  }

  private registerMCPPrompts(): void {
    // Prompt for the bot to understand the memory bank structure
    this.server.prompt("memory-bank-guide", () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `You are an AI assistant with access to a Memory Bank for this project.
The Memory Bank contains files that document the project context, progress, and technical details.

Memory Bank files:
- projectbrief.md: The foundation document that defines core requirements and goals
- productContext.md: Why this project exists, problems it solves, user experience goals
- activeContext.md: Current work focus, recent changes, next steps
- systemPatterns.md: System architecture, key technical decisions, design patterns
- techContext.md: Technologies used, development setup, technical constraints
- progress.md: What works, what's left to build, current status

You can use the following tools:
- get-memory-bank-file: Retrieve the content of a specific memory bank file
- update-memory-bank-file: Update the content of a memory bank file
- list-memory-bank-files: List all available memory bank files

When interacting with the user, you should:
1. Start by reviewing all memory bank files to understand the project context
2. Help the user with their task based on the memory bank content
3. Update the memory bank files as needed to reflect new information

If the memory bank is missing information for a task, inform the user and suggest adding it.`,
          },
        },
      ],
    }));

    // Prompt for command processing
    this.server.prompt("memory-command-processor", () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `You are an AI assistant that can process special /memory commands.

IMPORTANT: Always look for and process commands that begin with "/memory" in the user's messages.

When you detect a /memory command, immediately use the process-memory-command tool to handle it.
Example commands:
- /memory initialize - Initialize the memory bank
- /memory list - List all memory bank files
- /memory get <filename> - Get content of a specific memory bank file

If the message doesn't contain a /memory command, respond normally to the user's query.`,
          },
        },
      ],
    }));
  }

  // Start the server
  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      return new Promise<void>((resolve, reject) => {
        this.httpServer = this.app.listen(this.port, async () => {
          this.isRunning = true;

          // Update Cursor MCP config to point to our server
          await updateCursorMCPConfig(this.port);

          vscode.window.showInformationMessage(
            `AI Memory MCP server started on port ${this.port} and Cursor MCP config updated`
          );
          console.log(`AI Memory MCP server started on port ${this.port}`);
          resolve();
        });

        this.httpServer.on("error", (err: NodeJS.ErrnoException) => {
          if (err.code === "EADDRINUSE") {
            vscode.window.showErrorMessage(
              `Port ${this.port} is already in use. Please try a different port.`
            );
          } else {
            vscode.window.showErrorMessage(
              `Failed to start MCP server: ${err.message}`
            );
          }
          reject(err);
        });
      });
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to initialize memory bank: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  // Stop the server
  public stop(): void {
    if (this.httpServer && this.isRunning) {
      this.httpServer.close();
      this.isRunning = false;
      vscode.window.showInformationMessage("AI Memory MCP server stopped");
    }
  }

  handleCommand(command: string, args: string[]): Promise<string> {
    // This method is for backward compatibility with the command handler
    return Promise.resolve("Please use the MCP server directly.");
  }

  // private async registerServerManager(): Promise<void> {
  //   this.webviewManager.getWebviewPanel()?.webview.onDidReceiveMessage(
  //     async (message) => {
  //       console.log("Received message in extension 4:", message);
  //       switch (message.command) {
  //         case "startMCPServer":
  //           await this.start();
  //           this.webviewManager.getWebviewPanel()?.webview.postMessage({
  //             type: "MCPServerStatus",
  //             status: "started",
  //           });
  //           break;
  //         case "stopMCPServer":
  //           await this.stop();
  //           this.webviewManager.getWebviewPanel()?.webview.postMessage({
  //             type: "MCPServerStatus",
  //             status: "stopped",
  //           });
  //           break;
  //       }
  //     },
  //     undefined,
  //     this.context.subscriptions
  //   );
  // }
}
