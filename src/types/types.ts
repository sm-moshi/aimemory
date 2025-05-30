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
	// ProjectBriefFlat = "projectbrief.md",
	// ProductContextFlat = "productContext.md",
	// ActiveContextFlat = "activeContext.md",
	// SystemPatternsFlat = "systemPatterns.md",
	// TechContextFlat = "techContext.md",
	// ProgressFlat = "progress.md",
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

/**
 * Logger interface for Memory Bank operations
 * Provides standardized logging methods for Memory Bank components
 */
export interface MemoryBankLogger {
	info(message: string): void;
	error(message: string): void;
	warn(message: string): void;
	debug(message: string): void;
}

/**
 * Configuration for spawning MCP server process
 */
export interface ProcessSpawnConfig {
	serverPath: string;
	workspacePath: string;
	nodeExecutable: string;
	cwd: string;
	env?: Record<string, string>;
}

/**
 * Process event handlers configuration
 */
export interface ProcessEventHandlers {
	onError: (error: Error) => void;
	onExit: (code: number | null, signal: NodeJS.Signals | null) => void;
	onStderr?: (data: Buffer) => void;
}

/**
 * Individual MCP server configuration for Cursor
 */
export interface CursorMCPServerConfig {
	name: string;
	command?: string;
	args?: string[];
	cwd?: string;
	url?: string;
}

/**
 * Overall Cursor MCP configuration file structure
 */
export interface CursorMCPConfig {
	mcpServers?: Record<string, CursorMCPServerConfig>;
}

/**
 * Result of comparing two server configurations
 */
export interface ConfigComparisonResult {
	matches: boolean;
	differences?: string[];
}

/**
 * File cache entry structure
 */
export interface FileCache {
	content: string;
	mtimeMs: number;
}

/**
 * Cache statistics tracking
 */
export interface CacheStats {
	hits: number;
	misses: number;
	reloads: number;
}

/**
 * Context for file operations in memory bank services
 */
export interface FileOperationContext {
	memoryBankFolder: string;
	logger: MemoryBankLogger;
	fileCache: Map<string, FileCache>;
	cacheStats: CacheStats;
}

/**
 * Result of file validation operation
 */
export interface FileValidationResult {
	isValid: boolean;
	filePath: string;
	fileType?: MemoryBankFileType;
	error?: string;
}

/**
 * Result of health check operation
 */
export interface HealthCheckResult {
	isHealthy: boolean;
	issues: string[];
	summary: string;
}
