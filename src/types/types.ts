export interface MCPOptions {
	port: number;
}

export enum MemoryBankFileType {
	// Core
	ProjectBrief = "core/projectbrief.md",
	ProductContext = "core/productContext.md",
	ActiveContext = "core/activeContext.md",

	// System Patterns
	SystemPatternsIndex = "systemPatterns/index.md",
	SystemPatternsArchitecture = "systemPatterns/architecture.md",
	SystemPatternsPatterns = "systemPatterns/patterns.md",
	SystemPatternsScanning = "systemPatterns/scanning.md",

	// Tech Context
	TechContextIndex = "techContext/index.md",
	TechContextStack = "techContext/stack.md",
	TechContextDependencies = "techContext/dependencies.md",
	TechContextEnvironment = "techContext/environment.md",

	// Progress
	ProgressIndex = "progress/index.md",
	ProgressCurrent = "progress/current.md",
	ProgressHistory = "progress/history.md",

	// Legacy flat files (for migration/compatibility)
	ProjectBriefFlat = "projectbrief.md",
	ProductContextFlat = "productContext.md",
	ActiveContextFlat = "activeContext.md",
	SystemPatternsFlat = "systemPatterns.md",
	TechContextFlat = "techContext.md",
	ProgressFlat = "progress.md",
}

export interface MemoryBankFile {
	type: MemoryBankFileType;
	content: string;
	lastUpdated?: Date;
}

export interface MemoryBank {
	files: Map<MemoryBankFileType, MemoryBankFile>;
	initializeFolders(): Promise<void>;
	loadFiles(): Promise<MemoryBankFileType[]>;
	getFile(type: MemoryBankFileType): MemoryBankFile | undefined;
	updateFile(type: MemoryBankFileType, content: string): Promise<void>;
	getAllFiles(): MemoryBankFile[];
	getFilesWithFilenames(): string;
}

export interface MCPHandler {
	handleCommand(command: string, args: string[]): Promise<string>;
}
