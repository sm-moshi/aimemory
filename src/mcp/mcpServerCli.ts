import * as path from "node:path";
// @ts-ignore
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { MemoryBankFileType } from "../core/memoryBankCore.js";
// @ts-ignore
import { MemoryBankServiceCore } from "../core/memoryBankServiceCore.js";
import { registerMemoryBankPrompts } from "../lib/mcp-prompts-registry.js";
import {
	INITIALIZE_MEMORY_BANK_PROMPT,
	MEMORY_BANK_ALREADY_INITIALIZED_PROMPT,
} from "../lib/mcp-prompts.js";

// Initialize memory bank service core for advanced operations

// Expect workspace path as the first argument (index 2 in process.argv)
// process.argv[0] is node executable, process.argv[1] is the script path
const workspaceArg = process.argv[2];

if (!workspaceArg) {
	console.error(
		"[mcpServerCli] Error: Workspace path argument not provided. MCP server cannot start without a workspace path.",
	);
	// Optional: Exit if critical, or attempt a default (though risky for pathing)
	process.exit(1); // Exit if workspace path is mandatory
}

// Resolve the memory bank directory relative to the provided workspace path
const MEMORY_BANK_DIR = path.resolve(workspaceArg, "memory-bank");
console.error(`[mcpServerCli] Workspace argument: ${workspaceArg}`);
console.error(`[mcpServerCli] MEMORY_BANK_DIR resolved to: ${MEMORY_BANK_DIR}`);

const memoryBankCore = new MemoryBankServiceCore(MEMORY_BANK_DIR);

const server = new McpServer({
	name: "AI Memory MCP Server",
	version: "0.7.1",
});

// Define Zod schemas for tool parameters
const readMemoryBankFileSchema = z.object({ fileType: z.string() });
const updateMemoryBankFileSchema = z.object({ fileType: z.string(), content: z.string() });

// Register MCP prompts
registerMemoryBankPrompts(server);

// Register MCP resources
// Resource 1: Individual memory bank files via URI template
server.resource(
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
		if (!memoryBankCore.isReady()) {
			try {
				await memoryBankCore.loadFiles();
			} catch (err) {
				console.error("Memory bank not ready and failed to load:", err);
				throw new Error("Memory bank is not ready. Please initialise it first.");
			}
			if (!memoryBankCore.isReady()) {
				throw new Error("Memory bank is not ready. Please initialise it first.");
			}
		}
		const type = fileType as MemoryBankFileType;
		const file = memoryBankCore.getFile(type);

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

// Resource 2: Root resource to list all memory bank files
server.resource("memory-bank-root", "memory-bank://", async () => {
	// Memory bank readiness check
	if (!memoryBankCore.isReady()) {
		try {
			await memoryBankCore.loadFiles();
		} catch (err) {
			console.error("Memory bank not ready and failed to load:", err);
			throw new Error("Memory bank is not ready. Please initialise it first.");
		}
		if (!memoryBankCore.isReady()) {
			throw new Error("Memory bank is not ready. Please initialise it first.");
		}
	}
	const files = memoryBankCore.getAllFiles();

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

// Existing tools
server.tool(
	"read-memory-bank-file",
	readMemoryBankFileSchema.shape,
	async (args: z.infer<typeof readMemoryBankFileSchema>, extra) => {
		const { fileType } = args;
		// Ensure files are loaded in the correct instance
		if (!memoryBankCore.isReady()) {
			try {
				await memoryBankCore.loadFiles();
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : String(err);
				console.error(
					`[mcpServerCli] Error loading files for read-memory-bank-file: ${errorMessage}`,
				);
				return {
					content: [
						{
							type: "text" as const,
							text: `Error loading memory bank: ${errorMessage}`,
						},
					],
					isError: true,
				};
			}
		}
		const file = memoryBankCore.getFile(fileType as MemoryBankFileType);
		if (!file) {
			return {
				content: [
					{
						type: "text" as const,
						text: `File ${fileType} not found.`,
					},
				],
				isError: true,
			};
		}
		return { content: [{ type: "text", text: file.content }] };
	},
);

server.tool(
	"update-memory-bank-file",
	updateMemoryBankFileSchema.shape,
	async (args: z.infer<typeof updateMemoryBankFileSchema>, extra) => {
		const { fileType, content } = args;
		try {
			// Ensure files are loaded in the correct instance if not ready,
			// though updateFile itself should handle necessary loading/checks.
			if (!memoryBankCore.isReady()) {
				await memoryBankCore.loadFiles();
			}
			await memoryBankCore.updateFile(fileType as MemoryBankFileType, content);
			return { content: [{ type: "text", text: "success" }] };
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`[mcpServerCli] Error in update-memory-bank-file: ${errorMessage}`);
			return {
				content: [
					{
						type: "text" as const,
						text: `Error updating file ${fileType}: ${errorMessage}`,
					},
				],
				isError: true,
			};
		}
	},
);

// NEW TOOL 1: Initialize memory bank
server.tool("init-memory-bank", {}, async () => {
	console.error("Initializing memory bank");
	try {
		const isInitialized = await memoryBankCore.getIsMemoryBankInitialized();
		if (!isInitialized) {
			await memoryBankCore.initializeFolders();
			console.error("Memory bank not initialized, sending initialization prompt");
			return {
				content: [
					{
						type: "text" as const,
						text: INITIALIZE_MEMORY_BANK_PROMPT,
					},
				],
			};
		}
		// Load memory bank files into memory
		await memoryBankCore.loadFiles();
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
});

// NEW TOOL 2: Read all memory bank files (plural)
server.tool("read-memory-bank-files", {}, async () => {
	console.error("Reading memory bank files");
	try {
		// Memory bank readiness check
		if (!memoryBankCore.isReady()) {
			try {
				await memoryBankCore.loadFiles();
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
			if (!memoryBankCore.isReady()) {
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
		await memoryBankCore.loadFiles();
		const files = memoryBankCore.getFilesWithFilenames();
		console.error("Memory Bank Files Read Successfully.");
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

// NEW TOOL 3: List memory bank files with metadata
server.tool("list-memory-bank-files", {}, async () => {
	console.error("Listing memory bank files");
	try {
		// Memory bank readiness check
		if (!memoryBankCore.isReady()) {
			console.error(
				"Memory bank not ready. Attempting to load files for 'list-memory-bank-files'...",
			);
			try {
				await memoryBankCore.loadFiles();
				// If loadFiles succeeds, check readiness again
				if (!memoryBankCore.isReady()) {
					console.error("Memory bank still not ready after load attempt.");
					return {
						content: [
							{
								type: "text" as const,
								text: "Memory bank is not ready and could not be loaded. Please initialise it first.",
							},
						],
						isError: true,
					};
				}
			} catch (err) {
				console.error(
					"Memory bank not ready and failed to load files during 'list-memory-bank-files':",
					err,
				);
				return {
					content: [
						{
							type: "text" as const,
							text: "Error attempting to load memory bank. Please initialise it first.",
						},
					],
					isError: true,
				};
			}
		}

		// If we reach here, either the memory bank was ready initially, or it became ready after the load attempt.
		const files = memoryBankCore.getAllFiles();
		const fileListText = files
			.map(
				(file) =>
					`${file.type}: Last updated ${
						file.lastUpdated ? new Date(file.lastUpdated).toLocaleString() : "never"
					}`,
			)
			.join("\n");

		console.error("Memory Bank Files Listed Successfully.");
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

// NEW TOOL 4: Health check memory bank
server.tool("health-check-memory-bank", {}, async () => {
	const report = await memoryBankCore.checkHealth();
	return { content: [{ type: "text", text: report }] };
});

// NEW TOOL 5: Review and update memory bank
server.tool("review-and-update-memory-bank", {}, async () => {
	// Memory bank readiness check
	if (!memoryBankCore.isReady()) {
		console.error(
			"Memory bank not ready. Attempting to load files for 'review-and-update-memory-bank'...",
		);
		try {
			await memoryBankCore.loadFiles();
			if (!memoryBankCore.isReady()) {
				// If loadFiles succeeds, check readiness again
				console.error(
					"Memory bank still not ready after load attempt for 'review-and-update-memory-bank'.",
				);
				return {
					content: [
						{
							type: "text" as const,
							text: "Memory bank is not ready and could not be loaded. Please initialise it first.",
						},
					],
					isError: true,
				};
			}
		} catch (err) {
			console.error(
				"Memory bank not ready and failed to load files during 'review-and-update-memory-bank':",
				err,
			);
			return {
				content: [
					{
						type: "text" as const,
						text: "Error attempting to load memory bank. Please initialise it first.",
					},
				],
				isError: true,
			};
		}
	}

	// If we reach here, the memory bank is ready (either initially or after a successful load attempt).
	// No need to call memoryBankCore.loadFiles() again if the above block handled it.
	const files = memoryBankCore.getAllFiles();
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

const transport = new StdioServerTransport();
server.connect(transport);
