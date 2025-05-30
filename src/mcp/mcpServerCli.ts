import { resolve } from "node:path";
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
import {
	MemoryBankOperations,
	createErrorResponse,
	createMemoryBankTool,
	createSimpleMemoryBankTool,
	createSuccessResponse,
	ensureMemoryBankReady,
} from "./shared/mcpToolHelpers.js";

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
const MEMORY_BANK_DIR = resolve(workspaceArg, "memory-bank");
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

// Existing tools - complexity reduced from ~15 to ~3
server.tool(
	"read-memory-bank-file",
	readMemoryBankFileSchema.shape,
	createMemoryBankTool(
		memoryBankCore,
		async ({ fileType }: { fileType: string }) => {
			const file = memoryBankCore.getFile(fileType as MemoryBankFileType);
			if (!file) {
				throw new Error(`File ${fileType} not found.`);
			}
			return file.content;
		},
		"Error reading memory bank file",
	),
);

server.tool(
	"update-memory-bank-file",
	updateMemoryBankFileSchema.shape,
	createMemoryBankTool(
		memoryBankCore,
		async ({ fileType, content }: { fileType: string; content: string }) => {
			await memoryBankCore.updateFile(fileType as MemoryBankFileType, content);
			return "success";
		},
		"Error updating memory bank file",
	),
);

// NEW TOOL 1: Initialize memory bank - custom implementation for prompts
server.tool("init-memory-bank", {}, async () => {
	console.error("Initializing memory bank");
	try {
		const isInitialized = await memoryBankCore.getIsMemoryBankInitialized();
		if (!isInitialized) {
			await memoryBankCore.initializeFolders();
			console.error("Memory bank not initialized, sending initialization prompt");
			return createSuccessResponse(INITIALIZE_MEMORY_BANK_PROMPT);
		}
		// Load memory bank files into memory
		await memoryBankCore.loadFiles();
		return createSuccessResponse(MEMORY_BANK_ALREADY_INITIALIZED_PROMPT);
	} catch (error) {
		console.error("Error initializing memory bank:", error);
		return createErrorResponse(error, "Error initializing memory bank");
	}
});

// NEW TOOL 2: Read all memory bank files - complexity reduced from ~25 to ~3
server.tool(
	"read-memory-bank-files",
	{},
	createSimpleMemoryBankTool(
		memoryBankCore,
		async () => {
			console.error("Reading memory bank files");
			const result = await MemoryBankOperations.readAllFiles(memoryBankCore);
			console.error("Memory Bank Files Read Successfully.");
			return result;
		},
		"Error reading memory bank files",
	),
);

// NEW TOOL 3: List memory bank files - complexity reduced from ~30 to ~3
server.tool(
	"list-memory-bank-files",
	{},
	createSimpleMemoryBankTool(
		memoryBankCore,
		async () => {
			console.error("Listing memory bank files");
			const result = await MemoryBankOperations.listFiles(memoryBankCore);
			console.error("Memory Bank Files Listed Successfully.");
			return result;
		},
		"Error listing memory bank files",
	),
);

// NEW TOOL 4: Health check memory bank - complexity reduced from ~5 to ~3
server.tool(
	"health-check-memory-bank",
	{},
	createSimpleMemoryBankTool(
		memoryBankCore,
		() => MemoryBankOperations.checkHealth(memoryBankCore),
		"Error checking memory bank health",
	),
);

// NEW TOOL 5: Review and update memory bank - custom logic, readiness pattern extracted
server.tool("review-and-update-memory-bank", {}, async () => {
	try {
		await ensureMemoryBankReady(memoryBankCore);
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
	} catch (error) {
		return createErrorResponse(error, "Error reviewing memory bank");
	}
});

const transport = new StdioServerTransport();
server.connect(transport);
