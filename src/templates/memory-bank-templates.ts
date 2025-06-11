import { MemoryBankFileType } from "../lib/types/core";

/**
 * Centralised template strings for each MemoryBankFileType.
 * Keep this file lightweight – no runtime logic other than a single exported function.
 */
const templates: Partial<Record<MemoryBankFileType, string>> = {
	[MemoryBankFileType.ProjectBrief]:
		"# Project Brief\n\n- **Project:** AI Memory\n- **Goal:** Create a VS Code extension that acts as a persistent, context-aware memory for AI assistants (e.g. Cursor).",
	[MemoryBankFileType.ProductContext]: "# Product Context\n\n> _Describe the target users and problem space here._",
	[MemoryBankFileType.ActiveContext]: "# Active Context\n\n> _Describe the current development focus here._",
	[MemoryBankFileType.ProgressCurrent]: "# Current Progress\n\n| Item | Status | Notes |\n|------|--------|-------|",
	[MemoryBankFileType.ProgressIndex]: "# Progress Index\n\nThis file indexes all progress reports.",
	[MemoryBankFileType.SystemPatternsIndex]: "# System Patterns – Index\n\nSee individual pattern docs for details.",
	[MemoryBankFileType.SystemPatternsArchitecture]:
		"# Architecture Overview\n\n> _High-level architecture description goes here._",
	[MemoryBankFileType.SystemPatternsPatterns]: "# Design Patterns Catalogue\n\n| Pattern | Purpose | Reference |",
	[MemoryBankFileType.SystemPatternsScanning]: "# Scanning & IO Strategy\n\nDescribe file-IO and loading strategies.",
	[MemoryBankFileType.TechContextIndex]:
		"# Technology Context – Index\n\nQuick links to stack, deps, and environment.",
	[MemoryBankFileType.TechContextStack]:
		"# Technology Stack\n\nReference techContext files for authoritative information.",
	[MemoryBankFileType.TechContextDependencies]: "# Dependencies Overview\n\nList key runtime and dev dependencies.",
	[MemoryBankFileType.TechContextEnvironment]: "# Development Environment\n\nDocument local/CI environment details.",
};

export function getTemplate(fileType: MemoryBankFileType): string {
	return templates[fileType] ?? `# ${fileType}\n\nThis file is auto-generated.`;
}
