/**
 * Cursor Integration - Consolidated Cursor Integration Logic
 *
 * This module consolidates all Cursor-specific functionality including:
 * - MCP prompts and prompt registration
 * - Configuration management
 * - Rules service integration
 *
 */

import { homedir } from "node:os";
import * as path from "node:path";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Core imports - updated for consolidated structure
import type { FileOperationManager } from "./core/file-operations";
import { createLogger } from "./lib/logging";
import type { Logger } from "./lib/types/core";
// Type imports for configuration
import type { ConfigComparisonResult, CursorMCPConfig, CursorMCPServerConfig } from "./lib/types/system";

// === Constants ===

export const CURSOR_RULES_PATH = path.resolve(".cursor/rules/memory-bank.mdc");
export const CURSOR_MEMORY_BANK_FILENAME = "memory-bank.mdc";

// === Configuration Management ===

/**
 * Ensures the .cursor directory exists in the user's home directory.
 * If successful, returns the path to the .cursor directory.
 * If an unexpected error occurs during directory creation (other than it already existing),
 * the error is logged and rethrown.
 */
export async function ensureCursorDirectory(
	_fileOperationManager: FileOperationManager,
	loggerOverride?: Logger,
): Promise<string> {
	const homeDir = homedir();
	const cursorDir = join(homeDir, ".cursor");
	const logger = loggerOverride ?? createLogger();

	try {
		// Use direct filesystem operations for system directories like .cursor
		// This bypasses memory bank path validation which is not appropriate for system paths
		const fs = await import("node:fs/promises");
		await fs.mkdir(cursorDir, { recursive: true });
		logger.debug(`Ensured .cursor directory exists: ${cursorDir}`);
		return cursorDir;
	} catch (error) {
		// Only throw if it's not an "already exists" error
		if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
			logger.debug(`Cursor directory already exists: ${cursorDir}`);
			return cursorDir;
		}

		logger.error("Unexpected error creating .cursor directory", {
			operation: "ensureCursorDirectory",
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		throw error;
	}
}

/**
 * Reads and parses the Cursor MCP configuration file
 * Uses direct filesystem operations to bypass memory bank path validation
 */
export async function readCursorMCPConfig(_fileOperationManager: FileOperationManager): Promise<CursorMCPConfig> {
	const homeDir = homedir();
	const mcpConfigPath = join(homeDir, ".cursor", "mcp.json");
	const defaultConfig: CursorMCPConfig = { mcpServers: {} };
	const logger = createLogger();

	try {
		// Use direct filesystem operations for system configuration files
		// This bypasses memory bank path validation which is not appropriate for system files
		const fs = await import("node:fs/promises");
		const configContent = await fs.readFile(mcpConfigPath, "utf-8");
		const config = JSON.parse(configContent) as CursorMCPConfig;
		logger.debug(`Successfully read Cursor MCP config: ${mcpConfigPath}`);
		return config;
	} catch (error) {
		// If file doesn't exist, return default config
		if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
			logger.debug(`Cursor MCP config file not found, using default: ${mcpConfigPath}`);
			return defaultConfig;
		}

		// For other errors, log and return default
		logger.warn("Failed to read Cursor MCP config file, using default", {
			operation: "readCursorMCPConfig",
			path: mcpConfigPath,
			error: error instanceof Error ? error.message : String(error),
		});
		return defaultConfig;
	}
}

/**
 * Writes the Cursor MCP configuration file
 * Uses direct filesystem operations to bypass memory bank path validation
 */
export async function writeCursorMCPConfig(
	config: CursorMCPConfig,
	_fileOperationManager: FileOperationManager,
): Promise<void> {
	const homeDir = homedir();
	const mcpConfigPath = join(homeDir, ".cursor", "mcp.json");
	const logger = createLogger();

	try {
		// Use direct filesystem operations for system configuration files
		// This bypasses memory bank path validation which is not appropriate for system files
		const fs = await import("node:fs/promises");
		const configJson = JSON.stringify(config, null, 2);
		await fs.writeFile(mcpConfigPath, configJson, "utf-8");
		logger.debug(`Successfully wrote Cursor MCP config: ${mcpConfigPath}`);
	} catch (error) {
		logger.error("Failed to write Cursor MCP config file", {
			operation: "writeCursorMCPConfig",
			path: mcpConfigPath,
			error: error instanceof Error ? error.message : String(error),
		});
		throw new Error(
			`Failed to write config file ${mcpConfigPath}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Creates the AI Memory server configuration for Cursor MCP.
 * This configuration tells Cursor how to run the AI Memory MCP server.
 */
export function createAIMemoryServerConfig(workspacePath: string): CursorMCPServerConfig {
	return {
		name: "AI Memory",
		command: "node",
		args: [join(workspacePath, "dist", "index.cjs"), workspacePath],
		cwd: workspacePath,
	};
}

/**
 * Compares two server configurations for equivalence
 */
export function compareServerConfigs(
	config1: CursorMCPServerConfig,
	config2: CursorMCPServerConfig,
): ConfigComparisonResult {
	const differences: string[] = [];

	if (config1.name !== config2.name) {
		differences.push(`name: ${config1.name ?? "undefined"} → ${config2.name ?? "undefined"}`);
	}
	if (config1.command !== config2.command) {
		differences.push(`command: ${config1.command} → ${config2.command}`);
	}

	if (config1.cwd !== config2.cwd) {
		differences.push(`cwd: ${config1.cwd} → ${config2.cwd}`);
	}

	// Ensure args are treated as arrays for comparison
	const args1String = JSON.stringify(config1.args ?? []);
	const args2String = JSON.stringify(config2.args ?? []);
	if (args1String !== args2String) {
		differences.push(`args: ${args1String} → ${args2String}`);
	}

	const matches = differences.length === 0;
	return {
		matches,
		...(differences.length > 0 && { differences }), // Only include if there are differences
	};
}

// Cache for the markdown file content
let memoryBankRulesContent: string;

async function loadMemoryBankRulesContent(fileOperationManager: FileOperationManager): Promise<string> {
	if (!memoryBankRulesContent) {
		// Try multiple paths to find the template file
		const possiblePaths = [
			// 1. Try relative to current file (works in bundled scenarios)
			path.join(path.dirname(new URL(import.meta.url).pathname), "..", "templates", "memory-bank-rules.md"),
			// 2. Try in dist directory relative to process.cwd() (VS Code extension path)
			path.join(process.cwd(), "dist", "templates", "memory-bank-rules.md"),
			// 3. Try in src directory relative to process.cwd() (development)
			path.join(process.cwd(), "src", "templates", "memory-bank-rules.md"),
		];

		let lastErrorMessage = "No paths attempted";

		for (const rulesPath of possiblePaths) {
			const readResult = await fileOperationManager.readFileWithRetry(rulesPath);
			if (readResult.success) {
				memoryBankRulesContent = readResult.data;
				return memoryBankRulesContent;
			}
			lastErrorMessage = readResult.error.message;
		}

		throw new Error(
			`Failed to load memory bank rules from any of the attempted paths: ${possiblePaths.join(", ")}. Last error: ${lastErrorMessage}`,
		);
	}
	return memoryBankRulesContent;
}

export async function getCursorMemoryBankRulesFile(fileOperationManager: FileOperationManager): Promise<string> {
	const content = await loadMemoryBankRulesContent(fileOperationManager);
	return `---
description: Cursor Memory Bank Rules
globs:
alwaysApply: true
---

${content}
`;
}

// === MCP Prompts ===

export const INITIALIZE_MEMORY_BANK_PROMPT = `I need you to initialize the Memory Bank for this project.

STEPS:
1. Read the Cursor rules at .cursor/rules/memory-bank.mdc to understand the Memory Bank structure
2. Create all required Memory Bank files with appropriate initial content for this project
3. Document the project goals, context, and technical details based on what you know
4. Once you've created the Memory Bank files, call the load-memory-bank-files tool to complete initialization

This is critical for maintaining project context between sessions. Please start immediately.`;

export const MEMORY_BANK_ALREADY_INITIALIZED_PROMPT =
	"The Memory Bank has already been initialized. Read the .cursor/rules/memory-bank.mdc file to understand the Memory Bank structure and how it works.";

export const MEMORY_BANK_HEALTH_CHECK_PROMPT =
	"Please check the health of the Memory Bank and report any missing or corrupted files. Suggest repairs if needed.";

export const MEMORY_BANK_FILE_MISSING_PROMPT = (fileType: string) =>
	`The file "${fileType}" is missing from the Memory Bank. Please create it using the appropriate template and document its intended content.`;

export const MEMORY_BANK_UPDATE_CONFIRMATION_PROMPT = (fileType: string) =>
	`You are about to update "${fileType}". Please confirm the changes and ensure you have user consent if this file is sensitive.`;

export const MEMORY_BANK_STRUCTURE_GUIDE_PROMPT =
	"Refer to the Memory Bank structure diagram in the ruleset to understand the relationship between files and modules. Use this as a guide when reading or updating files.";

export const MEMORY_BANK_USAGE_TIP_PROMPT =
	"Tip: Regularly review the Memory Bank for outdated or incomplete information. Keeping it up to date improves agent performance and project continuity.";

export const REVIEW_AND_UPDATE_MEMORY_BANK_PROMPT =
	"You are reviewing all memory bank files. For each file, review the content and suggest updates if needed. Always prompt before overwriting protected files. After all files are reviewed, summarise the changes made.";

// === MCP Prompts Registry ===

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
