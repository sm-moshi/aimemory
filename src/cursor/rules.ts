import * as path from "node:path";
import type { FileOperationManager } from "../core/FileOperationManager";

// Cache for the markdown file content
let memoryBankRulesContent: string;

async function loadMemoryBankRulesContent(fileOperationManager: FileOperationManager): Promise<string> {
	if (!memoryBankRulesContent) {
		const rulesPath = path.join(__dirname, "memory-bank-rules.md");
		const readResult = await fileOperationManager.readFileWithRetry(rulesPath);

		if (!readResult.success) {
			throw new Error(`Failed to load memory bank rules: ${readResult.error.message}`);
		}

		memoryBankRulesContent = readResult.data;
	}
	return memoryBankRulesContent;
}

export const CURSOR_RULES_PATH = path.resolve(".cursor/rules/memory-bank.mdc");

export const CURSOR_MEMORY_BANK_FILENAME = "memory-bank.mdc";

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
