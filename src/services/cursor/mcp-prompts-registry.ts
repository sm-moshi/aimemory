import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
	INITIALIZE_MEMORY_BANK_PROMPT,
	MEMORY_BANK_ALREADY_INITIALIZED_PROMPT,
	MEMORY_BANK_FILE_MISSING_PROMPT,
	MEMORY_BANK_HEALTH_CHECK_PROMPT,
	MEMORY_BANK_STRUCTURE_GUIDE_PROMPT,
	MEMORY_BANK_UPDATE_CONFIRMATION_PROMPT,
	MEMORY_BANK_USAGE_TIP_PROMPT,
	REVIEW_AND_UPDATE_MEMORY_BANK_PROMPT,
} from "./mcp-prompts.js";

type PromptFunction = () => string;
type ParameterizedPromptFunction = (param: string) => string;

export function registerMemoryBankPrompts(server: McpServer): void {
	// Simple prompts without parameters
	const simplePrompts: Record<string, string> = {
		"memory-bank-guide": INITIALIZE_MEMORY_BANK_PROMPT,
		"memory-bank-already-initialized": MEMORY_BANK_ALREADY_INITIALIZED_PROMPT,
		"memory-bank-health-check": MEMORY_BANK_HEALTH_CHECK_PROMPT,
		"memory-bank-structure-guide": MEMORY_BANK_STRUCTURE_GUIDE_PROMPT,
		"memory-bank-usage-tip": MEMORY_BANK_USAGE_TIP_PROMPT,
		"review-and-update-memory-bank": REVIEW_AND_UPDATE_MEMORY_BANK_PROMPT,
	};

	// Parameterized prompts (placeholder values for registration)
	const parameterizedPrompts: Record<string, string> = {
		"memory-bank-file-missing": MEMORY_BANK_FILE_MISSING_PROMPT("(unknown file)"),
		"memory-bank-update-confirmation": MEMORY_BANK_UPDATE_CONFIRMATION_PROMPT("(unknown file)"),
	};

	// Agentic guidance prompt
	const agenticPrompts: Record<string, string> = {
		"agentic-batch-update-guidance":
			"When the user requests to 'update memory bank' or a batch review, you should call the 'review-and-update-memory-bank' tool. For each file, suggest updates or prompt the user for new content, and always respect safety rules (never overwrite protected files without explicit consent). After all files are reviewed, provide a summary of changes.",
	};

	// Register all prompts using helper function
	registerPromptGroup(server, simplePrompts);
	registerPromptGroup(server, parameterizedPrompts);
	registerPromptGroup(server, agenticPrompts);
}

function registerPromptGroup(server: McpServer, prompts: Record<string, string>): void {
	for (const [name, text] of Object.entries(prompts)) {
		registerSinglePrompt(server, name, text);
	}
}

function registerSinglePrompt(server: McpServer, name: string, text: string): void {
	server.prompt(name, () => ({
		messages: [
			{
				role: "user",
				content: {
					type: "text",
					text,
				},
			},
		],
	}));
}
