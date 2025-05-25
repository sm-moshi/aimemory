import * as path from "node:path";
import * as fs from "node:fs";

// Read the markdown file content
const memoryBankRulesContent = fs.readFileSync(
	path.join(__dirname, "rules", "memory-bank-rules.md"),
	"utf-8",
);

export const CURSOR_RULES_PATH = path.resolve(".cursor/rules/memory-bank.mdc");

export const CURSOR_MEMORY_BANK_FILENAME = "memory-bank.mdc";

export const CURSOR_MEMORY_BANK_RULES_FILE = `---
description: Cursor Memory Bank Rules
globs:
alwaysApply: true
---

${memoryBankRulesContent}
`;
