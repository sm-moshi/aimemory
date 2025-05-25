import type * as http from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import * as vscode from "vscode";
import { z } from "zod";
import { MemoryBankService } from "../core/memoryBank.js";
import { registerMemoryBankPrompts } from "../lib/mcp-prompts-registry.js";
import {
	INITIALIZE_MEMORY_BANK_PROMPT,
	MEMORY_BANK_ALREADY_INITIALIZED_PROMPT,
} from "../lib/mcp-prompts.js";
import type { MemoryBankFileType } from "../types/types.js";
import { updateCursorMCPConfig } from "../utils/cursor-config.js";

export class MemoryBankMCPServer {
	private server: McpServer;
	private app: express.Express;
	private httpServer: http.Server | null = null;
	private memoryBank: MemoryBankService;
	private isRunning = false;
	private port: number;
	private transport: SSEServerTransport | null = null;

	constructor(
		private readonly context: vscode.ExtensionContext,
		port: number,
	) {
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
				version: "0.3.0",
			},
			{
				capabilities: {
					logging: {},
					tools: {},
				},
			},
		);

		this.setupRoutes();
		this.registerMCPResources();
		this.registerMCPTools();
		registerMemoryBankPrompts(this.server);
	}

	public getPort(): number {
		return this.port;
	}

	// Set the server as already running (detected externally)
	public setExternalServerRunning(port: number): void {
		console.log(`Setting external server as running on port ${port}`);
		this.port = port;
		this.isRunning = true;

		// Also update Cursor MCP config to point to this server
		updateCursorMCPConfig(port).catch((error) => {
			vscode.window.showErrorMessage(
				`Failed to update Cursor MCP config for external server: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		});
	}

	private setupRoutes(): void {
		// TODO: There is a TypeScript type issue with the Express route handlers
		// that needs to be fixed. The current implementation works at runtime
		// but has type errors with TypeScript's strict checking.

		// Health check route
		this.app.get("/health", (req, res) => {
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
			console.log("SSE endpoint hit - setting up keep-alive");

			// --- SSE Keep-Alive Implementation ---
			res.setHeader("Content-Type", "text/event-stream");
			res.setHeader("Cache-Control", "no-cache");
			res.setHeader("Connection", "keep-alive");
			res.setHeader("Access-Control-Allow-Origin", "*"); // Consider restricting in production

			// Keep-alive mechanism
			const keepAliveInterval = setInterval(() => {
				try {
					// Send a comment line as a ping
					res.write(": ping\n\n");
				} catch (e) {
					console.error("Error sending SSE keep-alive ping:", e);
					clearInterval(keepAliveInterval);
					// Optionally close the connection if writing fails
					if (!res.writableEnded) {
						res.end();
					}
				}
			}, 15000); // Send ping every 15 seconds

			console.log("SSE custom headers set, proceeding to transport creation and connection");

			try {
				// Create transport
				this.transport = new SSEServerTransport("/messages", res);

				// Connect MCP server to transport
				console.log("Attempting to connect MCP server to transport...");
				await this.server.connect(this.transport);
				console.log("MCP server connected to transport successfully.");

				// Now that connection is successful, explicitly send our initial connected message
				// This ensures it's sent after the transport has potentially set its own headers.
				if (!res.headersSent) {
					// If transport didn't send headers, flush ours
					res.flushHeaders();
				}
				res.write(": connected\n\n");
			} catch (connectionError) {
				console.error("Failed to connect MCP server to transport:", connectionError);
				clearInterval(keepAliveInterval);
				// Send an error event to the client if possible
				try {
					res.write(
						`event: error\ndata: ${JSON.stringify({ message: "MCP connection failed" })}\n\n`,
					);
				} catch (writeError) {
					console.error("Failed to send SSE error event:", writeError);
				}
				if (!res.writableEnded) {
					res.end(); // Close the connection on error
				}
				return; // Stop further execution for this request
			}

			// Clean up interval on client disconnect
			req.on("close", () => {
				console.log("SSE connection closed by client, clearing keep-alive interval.");
				clearInterval(keepAliveInterval);
				// Optionally handle server-side cleanup if needed when client disconnects
				// e.g., this.server.disconnect(this.transport) if the SDK supports it
				this.transport = null; // Clear transport reference
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

			// Safely handle potential null transport
			if (this.transport) {
				await this.transport.handlePostMessage(req, res);
			} else {
				console.error("Attempted to handle message, but transport is null");
				if (!res.headersSent) {
					res.status(503).json({ error: "Server transport not available" });
				}
			}
		});

		// Add at the end of setupRoutes()
		this.app.use(
			(
				err: unknown,
				req: express.Request,
				res: express.Response,
				next: express.NextFunction,
			) => {
				console.error("Unhandled error:", err);
				res.status(500).json({
					error: "Internal Server Error",
					details: err instanceof Error ? err.message : String(err),
				});
			},
		);
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
				// Memory bank readiness check
				if (!this.memoryBank.isReady()) {
					try {
						await this.memoryBank.loadFiles(); // TODO: Use returned createdFiles for webview feedback if needed
					} catch (err) {
						console.error("Memory bank not ready and failed to load:", err);
						throw new Error("Memory bank is not ready. Please initialise it first.");
					}
					if (!this.memoryBank.isReady()) {
						throw new Error("Memory bank is not ready. Please initialise it first.");
					}
				}
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
			},
		);

		// Root resource to list all memory bank files
		this.server.resource("memory-bank-root", "memory-bank://", async () => {
			// Memory bank readiness check
			if (!this.memoryBank.isReady()) {
				try {
					await this.memoryBank.loadFiles(); // TODO: Use returned createdFiles for webview feedback if needed
				} catch (err) {
					console.error("Memory bank not ready and failed to load:", err);
					throw new Error("Memory bank is not ready. Please initialise it first.");
				}
				if (!this.memoryBank.isReady()) {
					throw new Error("Memory bank is not ready. Please initialise it first.");
				}
			}
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
							2,
						),
					},
				],
			};
		});
	}

	private registerMCPTools(): void {
		this.server.tool(
			"init-memory-bank",
			"Initialize the memory bank and generate the project documentation",
			{},
			async (_, extra) => {
				console.log("Initializing memory bank");
				try {
					await this.memoryBank.createMemoryBankRulesIfNotExists();
					const isInitialized = await this.memoryBank.getIsMemoryBankInitialized();
					if (!isInitialized) {
						await this.memoryBank.initializeFolders();
						console.log("Memory bank not initialized, sending initialization prompt");
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
								text: `Error initializing memory bank: ${error instanceof Error ? error.message : String(error)}. Please try the command again.`,
							},
						],
						isError: true,
					};
				}
			},
		);

		this.server.tool("read-memory-bank-files", {}, async (_, extra) => {
			console.log("Reading memory bank files");
			try {
				// Memory bank readiness check
				if (!this.memoryBank.isReady()) {
					try {
						await this.memoryBank.loadFiles(); // TODO: Use returned createdFiles for webview feedback if needed
					} catch (err) {
						console.error("Memory bank not ready and failed to load:", err);
						return {
							content: [
								{
									type: "text" as const,
									text: "Memory bank is not ready. Please initialise it first.",
								},
							],
							isError: true,
						};
					}
					if (!this.memoryBank.isReady()) {
						return {
							content: [
								{
									type: "text" as const,
									text: "Memory bank is not ready. Please initialise it first.",
								},
							],
							isError: true,
						};
					}
				}
				// Ensure files are loaded (or reloaded) before getting content
				await this.memoryBank.loadFiles(); // TODO: Use returned createdFiles for webview feedback if needed
				const files = this.memoryBank.getFilesWithFilenames();
				console.log("Memory Bank Files Read Successfully.");
				return {
					content: [
						{
							type: "text" as const,
							// Ensure a fallback if files is empty or nullish
							text: files
								? `Here are the files in the memory bank: \n\n${files}`
								: "Memory bank is empty or could not be read.",
						},
					],
				};
			} catch (error) {
				console.error("Error reading memory bank files:", error);
				return {
					content: [
						{
							type: "text" as const,
							text: `Error reading memory bank files: ${
								error instanceof Error ? error.message : String(error)
							}`,
						},
					],
					isError: true,
				};
			}
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
		this.server.tool(
			"update-memory-bank-file",
			{
				fileType: z.string(),
				content: z.string(),
			},
			async ({ fileType, content }, extra) => {
				// Memory bank readiness check
				if (!this.memoryBank.isReady()) {
					try {
						await this.memoryBank.loadFiles(); // TODO: Use returned createdFiles for webview feedback if needed
					} catch (err) {
						console.error("Memory bank not ready and failed to load:", err);
						return {
							content: [
								{
									type: "text" as const,
									text: "Memory bank is not ready. Please initialise it first.",
								},
							],
							isError: true,
						};
					}
					if (!this.memoryBank.isReady()) {
						return {
							content: [
								{
									type: "text" as const,
									text: "Memory bank is not ready. Please initialise it first.",
								},
							],
							isError: true,
						};
					}
				}
				try {
					const type = fileType as MemoryBankFileType;
					await this.memoryBank.updateFile(type, content);

					return {
						content: [{ type: "text" as const, text: `Updated ${type} successfully` }],
					};
				} catch (error) {
					console.error(`Failed to update ${fileType}:`, error);
					return {
						content: [
							{
								type: "text" as const,
								text: `Error updating ${fileType}: ${
									error instanceof Error ? error.message : String(error)
								}`,
							},
						],
						isError: true,
					};
				}
			},
		);

		// List all memory bank files
		this.server.tool("list-memory-bank-files", {}, async (_, extra) => {
			console.log("Listing memory bank files");
			try {
				// Memory bank readiness check
				if (!this.memoryBank.isReady()) {
					try {
						await this.memoryBank.loadFiles(); // TODO: Use returned createdFiles for webview feedback if needed
					} catch (err) {
						console.error("Memory bank not ready and failed to load:", err);
						return {
							content: [
								{
									type: "text" as const,
									text: "Memory bank is not ready. Please initialise it first.",
								},
							],
							isError: true,
						};
					}
					if (!this.memoryBank.isReady()) {
						return {
							content: [
								{
									type: "text" as const,
									text: "Memory bank is not ready. Please initialise it first.",
								},
							],
							isError: true,
						};
					}
				}
				const files = this.memoryBank.getAllFiles();
				const fileListText = files
					.map(
						(file) =>
							`${file.type}: Last updated ${
								file.lastUpdated
									? new Date(file.lastUpdated).toLocaleString()
									: "never"
							}`,
					)
					.join("\n");

				console.log("Memory Bank Files Listed Successfully.");
				return {
					content: [
						{
							type: "text" as const,
							// Handle case where there are no files
							text: fileListText || "No memory bank files found.",
						},
					],
				};
			} catch (error) {
				console.error("Error listing memory bank files:", error);
				return {
					content: [
						{
							type: "text" as const,
							text: `Error listing memory bank files: ${
								error instanceof Error ? error.message : String(error)
							}`,
						},
					],
					isError: true,
				};
			}
		});

		this.server.tool("health-check-memory-bank", {}, async () => {
			const report = await this.memoryBank.checkHealth();
			return { content: [{ type: "text", text: report }] };
		});

		this.server.tool("review-and-update-memory-bank", {}, async () => {
			// Memory bank readiness check
			if (!this.memoryBank.isReady()) {
				try {
					await this.memoryBank.loadFiles();
				} catch (err) {
					return {
						content: [
							{
								type: "text" as const,
								text: "Memory bank is not ready. Please initialise it first.",
							},
						],
						isError: true,
					};
				}
			}
			await this.memoryBank.loadFiles();
			const files = this.memoryBank.getAllFiles();
			const reviewMessages = files.map((file) => ({
				type: "text" as const,
				text: `File: ${file.type}\n\n${file.content}\n\nDo you want to update this file? If yes, reply with the new content. If no, reply 'skip'.`,
			}));
			return {
				content: reviewMessages,
				nextAction: {
					type: "collect-updates",
					files: files.map((file) => file.type),
				},
			};
		});
	}

	// Start the server
	public async start(): Promise<void> {
		if (this.isRunning) {
			return;
		}

		// Helper to actually start the server on a given port
		const tryStartServer = (portToTry: number): Promise<void> => {
			return new Promise<void>((resolve, reject) => {
				this.httpServer = this.app.listen(portToTry, async () => {
					this.isRunning = true;
					this.port = portToTry;

					// Set keep-alive timeout (30s)
					this.httpServer?.setTimeout(30000);

					// Update Cursor MCP config to point to our server
					await updateCursorMCPConfig(this.port);

					vscode.window.showInformationMessage(
						`AI Memory MCP server started on port ${this.port} and Cursor MCP config updated`,
					);
					console.log(`AI Memory MCP server started on port ${this.port}`);
					resolve();
				});

				// Robust error handling
				this.httpServer.on("error", (err: NodeJS.ErrnoException) => {
					if (err.code === "EADDRINUSE") {
						// If first port fails, try alternative (7332)
						if (portToTry === 7331) {
							vscode.window.showWarningMessage(
								"Port 7331 is in use, trying port 7332...",
							);
							// Try alternative port
							tryStartServer(7332).then(resolve).catch(reject);
							return;
						}
						// If we get here, 7332 is also in use
						vscode.window.showErrorMessage(
							"Port 7332 is also in use. Please free a port and try again.",
						);
					} else {
						vscode.window.showErrorMessage(
							`Failed to start MCP server: ${err.message}`,
						);
					}
					reject(err);
				});

				// Log connection resets, socket hangups, etc.
				this.httpServer.on("clientError", (err, socket) => {
					console.error("Client connection error:", err.message);
					socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
				});
			});
		};

		try {
			await tryStartServer(this.port);
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to initialize memory bank: ${
					error instanceof Error ? error.message : String(error)
				}`,
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

	/**
	 * Get the memory bank service instance
	 */
	getMemoryBank(): MemoryBankService {
		return this.memoryBank;
	}

	/**
	 * Update a memory bank file
	 */
	async updateMemoryBankFile(fileType: string, content: string): Promise<void> {
		if (!this.memoryBank.isReady()) {
			await this.memoryBank.loadFiles(); // TODO: Use returned createdFiles for webview feedback if needed
		}
		await this.memoryBank.updateFile(fileType as MemoryBankFileType, content);
	}
}
