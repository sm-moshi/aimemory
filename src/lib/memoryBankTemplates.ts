import { MemoryBankFileType } from "../types/types.js";

export function getTemplateForFileType(fileType: MemoryBankFileType): string {
	switch (fileType) {
		case MemoryBankFileType.ProjectBrief:
			return "# Project Brief\n\nThis file should contain the foundation document that shapes all other files.\n\n*Foundation document that shapes all other files*\n\n## Core Requirements\n\n## Project Goals\n\n## Project Scope\n";
		case MemoryBankFileType.ProductContext:
			return "# Product Context\n\nThis file should contain a description of why this project exists, the problems it solves, how it should work, and user experience goals.\n\n## Why this project exists\n\n## Problems it solves\n\n## How it should work\n\n## User experience goals\n";
		case MemoryBankFileType.ActiveContext:
			return "# Active Context\n\nThis file should contain the current work focus, recent changes, next steps, and active decisions.\n\n## Current work focus\n\n## Recent changes\n\n## Next steps\n\n## Active decisions and considerations\n";
		case MemoryBankFileType.SystemPatternsIndex:
			return "# System Patterns Index\n\nThis file should contain a summary of system patterns and architecture.\n\n*Summary of system patterns and architecture*\n";
		case MemoryBankFileType.SystemPatternsArchitecture:
			return "# System Architecture\n\nThis file should contain a description of the overall system architecture.\n\n*Describe the overall system architecture here*\n";
		case MemoryBankFileType.SystemPatternsPatterns:
			return "# Patterns\n\nThis file should contain a list and description of design patterns in use.\n\n*List and describe design patterns in use*\n";
		case MemoryBankFileType.SystemPatternsScanning:
			return "# Scanning\n\nThis file should contain a description of scanning or analysis patterns.\n\n*Describe scanning or analysis patterns here*\n";
		case MemoryBankFileType.TechContextIndex:
			return "# Tech Context Index\n\nThis file should contain a summary of the technology stack and constraints.\n\n*Summary of technology stack and constraints*\n";
		case MemoryBankFileType.TechContextStack:
			return "# Technology Stack\n\nThis file should contain a list of all major technologies used.\n\n*List all major technologies used*\n";
		case MemoryBankFileType.TechContextDependencies:
			return "# Dependencies\n\nThis file should contain a list and description of project dependencies.\n\n*List and describe project dependencies*\n";
		case MemoryBankFileType.TechContextEnvironment:
			return "# Environment\n\nThis file should contain a description of the development and production environments.\n\n*Describe the development and production environments*\n";
		case MemoryBankFileType.ProgressIndex:
			return "# Progress Index\n\nThis file should contain a summary of project progress.\n\n*Summary of project progress*\n";
		case MemoryBankFileType.ProgressCurrent:
			return "# Current Progress\n\nThis file should contain a description of current work, blockers, and next steps.\n\n*Describe current work, blockers, and next steps*\n";
		case MemoryBankFileType.ProgressHistory:
			return "# Progress History\n\nThis file should contain a log of past progress and milestones.\n\n*Log of past progress and milestones*\n";
		case MemoryBankFileType.ProjectBriefFlat:
			return "# Project Brief\n\nThis file should contain the foundation document that shapes all other files.\n\n*Foundation document that shapes all other files*\n\n## Core Requirements\n\n## Project Goals\n\n## Project Scope\n";
		case MemoryBankFileType.ProductContextFlat:
			return "# Product Context\n\nThis file should contain a description of why this project exists, the problems it solves, how it should work, and user experience goals.\n\n## Why this project exists\n\n## Problems it solves\n\n## How it should work\n\n## User experience goals\n";
		case MemoryBankFileType.ActiveContextFlat:
			return "# Active Context\n\nThis file should contain the current work focus, recent changes, next steps, and active decisions.\n\n## Current work focus\n\n## Recent changes\n\n## Next steps\n\n## Active decisions and considerations\n";
		case MemoryBankFileType.SystemPatternsFlat:
			return "# System Patterns\n\nThis file should contain system architecture, key technical decisions, design patterns in use, and component relationships.\n\n## System architecture\n\n## Key technical decisions\n\n## Design patterns in use\n\n## Component relationships\n";
		case MemoryBankFileType.TechContextFlat:
			return "# Tech Context\n\nThis file should contain technologies used, development setup, technical constraints, and dependencies.\n\n## Technologies used\n\n## Development setup\n\n## Technical constraints\n\n## Dependencies\n";
		case MemoryBankFileType.ProgressFlat:
			return "# Progress\n\nThis file should contain what works, what's left to build, current status, and known issues.\n\n## What works\n\n## What's left to build\n\n## Current status\n\n## Known issues\n";
		default:
			return "# Memory Bank File\n\nThis file should contain project memory or context as appropriate.\n\n*This is a default template*\n";
	}
}
