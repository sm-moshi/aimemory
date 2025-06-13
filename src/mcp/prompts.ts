/**
 * MCP Prompts - VS Code-independent prompt definitions and registration
 *
 * This module contains all MCP-related prompts and registration logic
 * without any VS Code dependencies, making it suitable for both
 * the standalone MCP server and VS Code extension contexts.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// === Memory Bank Prompts ===

export const INITIALIZE_MEMORY_BANK_PROMPT = `
You are going to help the user set up their AI Memory Bank. This is a structured knowledge management system that allows you to persist and recall information across conversations.

## What is an AI Memory Bank?

The AI Memory Bank is a collection of markdown files organized into categories:
- **Core**: Essential context about the user's projects, goals, and preferences
- **Progress**: Tracking tasks, achievements, and learning progress
- **Tech Context**: Technical decisions, architecture, and development context
- **System Patterns**: Reusable patterns, templates, and methodologies

## Memory Bank Structure

The memory bank consists of these key files:
- \`core/projectBrief.md\` - Project overview, goals, and context
- \`core/activeContext.md\` - Current focus areas and priorities
- \`progress/current.md\` - Active tasks and recent progress
- \`progress/achievements.md\` - Completed goals and milestones
- \`techContext/architecture.md\` - Technical architecture and decisions
- \`techContext/stack.md\` - Technology stack and tooling choices
- \`systemPatterns/workflows.md\` - Development and operational workflows
- \`systemPatterns/templates.md\` - Reusable templates and patterns

## Getting Started

I'll help you initialize your memory bank with appropriate templates and guide you through customizing them for your specific needs. This will enable persistent context and knowledge sharing across all our conversations.

Ready to begin? I'll start by creating the basic structure and then we can customize each section based on your specific project and goals.
`;

export const MEMORY_BANK_ALREADY_INITIALIZED_PROMPT = `
Your AI Memory Bank is already set up and ready to use! The memory bank is a structured knowledge management system that helps maintain context across conversations.

## Current Structure

Your memory bank contains organized information in these categories:
- **Core**: Project context, goals, and user preferences
- **Progress**: Task tracking and achievement history
- **Tech Context**: Technical decisions and architecture
- **System Patterns**: Workflows, templates, and methodologies

## How to Use It

You can:
- Ask me to recall specific information: "What's in my current progress?"
- Request updates: "Update my active context with the new project requirements"
- Add new insights: "Remember that we decided to use React for the frontend"
- Review patterns: "Show me my usual development workflow"

## Available Commands

- \`/memory status\` - View current memory bank status
- \`/memory read [category]\` - Read specific category files
- \`/memory update [file]\` - Update specific memory bank files

The system will automatically reference relevant information from your memory bank to provide more contextual and personalized assistance.

How can I help you with your memory bank today?
`;

// Additional prompt constants
export const MEMORY_BANK_FILE_MISSING_PROMPT = (fileType: string) =>
	`The file "${fileType}" is missing from the Memory Bank. Please create it using the appropriate template and document its intended content.`;

export const MEMORY_BANK_UPDATE_CONFIRMATION_PROMPT = (fileType: string) =>
	`You are about to update "${fileType}". Please confirm the changes and ensure you have user consent if this file is sensitive.`;

// === Prompt Registration ===

/**
 * Registers all memory bank prompts with the MCP server
 * This function is VS Code-independent and can be used in standalone servers
 */
export function registerMemoryBankPrompts(server: McpServer): void {
	const prompts = {
		"initialize-memory-bank": INITIALIZE_MEMORY_BANK_PROMPT,
		"memory-bank-already-initialized": MEMORY_BANK_ALREADY_INITIALIZED_PROMPT,
	};

	registerPromptGroup(server, prompts);
}

/**
 * Registers a group of prompts with the MCP server
 */
function registerPromptGroup(server: McpServer, prompts: Record<string, string>): void {
	for (const [name, text] of Object.entries(prompts)) {
		registerSinglePrompt(server, name, text);
	}
}

/**
 * Registers a single prompt with the MCP server
 */
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
