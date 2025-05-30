import { MemoryBankFileType } from "../types/types.js";

const defaultTemplate =
	"# Memory Bank File\n\nThis file should contain project memory or context as appropriate.\n\n*This is a default template*\n";

const templateMap = new Map<MemoryBankFileType, string>([
	[
		MemoryBankFileType.ProjectBrief,
		"# Project Brief\n\nThis file should contain the foundation document that shapes all other files.\n\n*Foundation document that shapes all other files*\n\n## Core Requirements\n\n## Project Goals\n\n## Project Scope\n",
	],
	[
		MemoryBankFileType.ProductContext,
		"# Product Context\n\nThis file should contain a description of why this project exists, the problems it solves, how it should work, and user experience goals.\n\n## Why this project exists\n\n## Problems it solves\n\n## How it should work\n\n## User experience goals\n",
	],
	[
		MemoryBankFileType.ActiveContext,
		"# Active Context\n\nThis file should contain the current work focus, recent changes, next steps, and active decisions.\n\n## Current work focus\n\n## Recent changes\n\n## Next steps\n\n## Active decisions and considerations\n",
	],
	[
		MemoryBankFileType.SystemPatternsIndex,
		"# System Patterns Index\n\nThis file should contain a summary of system patterns and architecture.\n\n*Summary of system patterns and architecture*\n",
	],
	[
		MemoryBankFileType.SystemPatternsArchitecture,
		"# System Architecture\n\nThis file should contain a description of the overall system architecture.\n\n*Describe the overall system architecture here*\n",
	],
	[
		MemoryBankFileType.SystemPatternsPatterns,
		"# Patterns\n\nThis file should contain a list and description of design patterns in use.\n\n*List and describe design patterns in use*\n",
	],
	[
		MemoryBankFileType.SystemPatternsScanning,
		"# Scanning\n\nThis file should contain a description of scanning or analysis patterns.\n\n*Describe scanning or analysis patterns here*\n",
	],
	[
		MemoryBankFileType.TechContextIndex,
		"# Tech Context Index\n\nThis file should contain a summary of the technology stack and constraints.\n\n*Summary of technology stack and constraints*\n",
	],
	[
		MemoryBankFileType.TechContextStack,
		"# Technology Stack\n\nThis file should contain a list of all major technologies used.\n\n*List all major technologies used*\n",
	],
	[
		MemoryBankFileType.TechContextDependencies,
		"# Dependencies\n\nThis file should contain a list and description of project dependencies.\n\n*List and describe project dependencies*\n",
	],
	[
		MemoryBankFileType.TechContextEnvironment,
		"# Environment\n\nThis file should contain a description of the development and production environments.\n\n*Describe the development and production environments*\n",
	],
	[
		MemoryBankFileType.ProgressIndex,
		"# Progress Index\n\nThis file should contain a summary of project progress.\n\n*Summary of project progress*\n",
	],
	[
		MemoryBankFileType.ProgressCurrent,
		"# Current Progress\n\nThis file should contain a description of current work, blockers, and next steps.\n\n*Describe current work, blockers, and next steps*\n",
	],
	[
		MemoryBankFileType.ProgressHistory,
		"# Progress History\n\nThis file should contain a log of past progress and milestones.\n\n*Log of past progress and milestones*\n",
	],
]);

export function getTemplateForFileType(fileType: MemoryBankFileType): string {
	return templateMap.get(fileType) ?? defaultTemplate;
}
