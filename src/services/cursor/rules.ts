import * as fs from "node:fs/promises";
import * as path from "node:path";

// Read the markdown file content asynchronously
let memoryBankRulesContent: string;

async function loadMemoryBankRulesContent(): Promise<string> {
	if (!memoryBankRulesContent) {
		memoryBankRulesContent = await fs.readFile(
			path.join(__dirname, "memory-bank-rules.md"),
			"utf-8",
		);
	}
	return memoryBankRulesContent;
}

export const CURSOR_RULES_PATH = path.resolve(".cursor/rules/memory-bank.mdc");

export const CURSOR_MEMORY_BANK_FILENAME = "memory-bank.mdc";

export async function getCursorMemoryBankRulesFile(): Promise<string> {
	const content = await loadMemoryBankRulesContent();
	return `---
description: Cursor Memory Bank Rules
globs:
alwaysApply: true
---

${content}
`;
}
