import path from "node:path";

// Import the markdown file directly
import memoryBankRulesContent from "./rules/memory-bank-rules.md";

export const CURSOR_RULES_PATH = path.resolve(".cursor/rules/memory-bank.mdc");

export const CURSOR_MEMORY_BANK_FILENAME = "memory-bank.mdc";

export const CURSOR_MEMORY_BANK_RULES_FILE = `---
description: Cursor Memory Bank Rules
globs:
alwaysApply: true
---

${memoryBankRulesContent}
`;
