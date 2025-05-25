import * as path from "node:path";
// @ts-ignore
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
// @ts-ignore
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readMemoryBankFile, updateMemoryBankFile } from "../core/memoryBankCore.js";
import type { MemoryBankFileType } from "../core/memoryBankCore.js";
import { MemoryBankServiceCore } from "../core/memoryBankServiceCore.js";
import { registerMemoryBankPrompts } from "../lib/mcp-prompts-registry.js";
import {
	INITIALIZE_MEMORY_BANK_PROMPT,
	MEMORY_BANK_ALREADY_INITIALIZED_PROMPT,
} from "../lib/mcp-prompts.js";

// Initialize memory bank service core for advanced operations
// Note: Using process.cwd() since we're building to CommonJS and import.meta.url isn't available
const MEMORY_BANK_DIR = path.resolve(process.cwd(), "memory-bank");
const memoryBankCore = new MemoryBankServiceCore(MEMORY_BANK_DIR);

const server = new McpServer({
	name: "AI Memory MCP Server",
	version: "0.6.1",
});

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
server.tool("read-memory-bank-file", { fileType: z.string() }, async ({ fileType }) => {
	const content = await readMemoryBankFile(fileType as MemoryBankFileType);
	return { content: [{ type: "text", text: content }] };
});

server.tool(
	"update-memory-bank-file",
	{ fileType: z.string(), content: z.string() },
	async ({ fileType, content }) => {
		await updateMemoryBankFile(fileType as MemoryBankFileType, content);
		return { content: [{ type: "text", text: "success" }] };
	},
);

// NEW TOOL 1: Initialize memory bank
server.tool("init-memory-bank", {}, async () => {
	console.log("Initializing memory bank");
	try {
		const isInitialized = await memoryBankCore.getIsMemoryBankInitialized();
		if (!isInitialized) {
			await memoryBankCore.initializeFolders();
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
	console.log("Reading memory bank files");
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

// NEW TOOL 3: List memory bank files with metadata
server.tool("list-memory-bank-files", {}, async () => {
	console.log("Listing memory bank files");
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
		const files = memoryBankCore.getAllFiles();
		const fileListText = files
			.map(
				(file) =>
					`${file.type}: Last updated ${
						file.lastUpdated ? new Date(file.lastUpdated).toLocaleString() : "never"
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

// NEW TOOL 4: Health check memory bank
server.tool("health-check-memory-bank", {}, async () => {
	const report = await memoryBankCore.checkHealth();
	return { content: [{ type: "text", text: report }] };
});

// NEW TOOL 5: Review and update memory bank
server.tool("review-and-update-memory-bank", {}, async () => {
	// Memory bank readiness check
	if (!memoryBankCore.isReady()) {
		try {
			await memoryBankCore.loadFiles();
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
	await memoryBankCore.loadFiles();
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
