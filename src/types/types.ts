// =============================================================================
// Result Pattern for Type-Safe Error Handling
// =============================================================================

/**
 * Result pattern for safe error handling without exceptions
 * Based on Rust's Result<T, E> pattern for predictable error handling
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

/**
 * Async version of Result pattern for Promise-returning functions
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Standardized error hierarchy for Memory Bank operations
 */
export class MemoryBankError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly context?: Record<string, unknown>,
	) {
		super(message);
		this.name = "MemoryBankError";
	}
}

/**
 * Specific error types for different operation categories
 */
export class FileOperationError extends MemoryBankError {
	constructor(
		message: string,
		public readonly filePath: string,
		context?: Record<string, unknown>,
	) {
		super(message, "FILE_OPERATION_ERROR", { filePath, ...context });
		this.name = "FileOperationError";
	}
}

export class ValidationError extends MemoryBankError {
	constructor(
		message: string,
		public readonly validationType: string,
		context?: Record<string, unknown>,
	) {
		super(message, "VALIDATION_ERROR", { validationType, ...context });
		this.name = "ValidationError";
	}
}

export class CacheError extends MemoryBankError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, "CACHE_ERROR", context);
		this.name = "CacheError";
	}
}

// =============================================================================
// Type Guards for Runtime Type Checking
// =============================================================================

/**
 * Type guard to check if a Result is successful
 */
export function isSuccess<T, E>(result: Result<T, E>): result is { success: true; data: T } {
	return result.success === true;
}

/**
 * Type guard to check if a Result is an error
 */
export function isError<T, E>(result: Result<T, E>): result is { success: false; error: E } {
	return result.success === false;
}

/**
 * Type guard to check if an error is a MemoryBankError
 */
export function isMemoryBankError(error: unknown): error is MemoryBankError {
	return error instanceof MemoryBankError;
}

/**
 * Type guard to check if an error is a FileOperationError
 */
export function isFileOperationError(error: unknown): error is FileOperationError {
	return error instanceof FileOperationError;
}

/**
 * Type guard to check if an error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
	return error instanceof ValidationError;
}

// =============================================================================
// Result Helper Functions
// =============================================================================

/**
 * Creates a successful Result
 */
export function success<T>(data: T): Result<T, never> {
	return { success: true, data };
}

/**
 * Creates an error Result
 */
export function error<E>(error: E): Result<never, E> {
	return { success: false, error };
}

/**
 * Wraps a function that might throw into a Result
 */
export function tryCatch<T>(fn: () => T): Result<T, Error> {
	try {
		const data = fn();
		return success(data);
	} catch (err) {
		return error(err instanceof Error ? err : new Error(String(err)));
	}
}

/**
 * Wraps an async function that might throw into an AsyncResult
 */
export async function tryCatchAsync<T>(fn: () => Promise<T>): AsyncResult<T, Error> {
	try {
		const data = await fn();
		return success(data);
	} catch (err) {
		return error(err instanceof Error ? err : new Error(String(err)));
	}
}

// =============================================================================
// Existing Types (Enhanced with Result Pattern Support)
// =============================================================================

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

/**
 * Enhanced MemoryBank interface with Result pattern support
 * TODO: Gradually migrate methods to use Result pattern
 */
export interface MemoryBank {
	files: Map<MemoryBankFileType, MemoryBankFile>;
	initializeFolders(): AsyncResult<void, MemoryBankError>;
	loadFiles(): AsyncResult<MemoryBankFileType[], MemoryBankError>;
	getFile(type: MemoryBankFileType): MemoryBankFile | undefined;
	updateFile(type: MemoryBankFileType, content: string): AsyncResult<void, MemoryBankError>;
	getAllFiles(): MemoryBankFile[];
	getFilesWithFilenames(): string;
	writeFileByPath(relativePath: string, content: string): AsyncResult<void, MemoryBankError>;
	checkHealth(): AsyncResult<string, MemoryBankError>;
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
