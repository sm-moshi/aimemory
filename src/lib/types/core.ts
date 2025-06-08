/**
 * @file src/lib/types/core.ts
 * @description Consolidated core types for the AI Memory Extension.
 *
 * This file combines types from the following legacy files:
 * - `src/types/core.ts`
 * - `src/types/errorHandling.ts`
 * - `src/types/logging.ts`
 *
 * It provides a single source for fundamental enums, interfaces, error handling patterns,
 * and logging structures used throughout the application.
 */

// =================================================================
// Section: Core Memory Bank Types (from src/types/core.ts)
// =================================================================

import type { FileOperationManager } from "../../core/file-operations";
import type { StreamingManager } from "../../core/streaming";
import type { FileCache, LegacyCacheStats, ValidationStatus } from "./system";

/**
 * Enumeration of all memory bank file types. Values should represent the full relative path from
 * the memory-bank root, including extension.
 */
export enum MemoryBankFileType {
	// Core files
	ProjectBrief = "core/projectBrief.md",
	ProductContext = "core/productContext.md",
	ActiveContext = "core/activeContext.md",

	// Progress files
	ProgressCurrent = "progress/current.md",
	ProgressHistory = "progress/history.md",
	ProgressIndex = "progress/index.md",

	// Full path-based file types for hierarchical structure
	SystemPatternsIndex = "systemPatterns/index.md",
	SystemPatternsArchitecture = "systemPatterns/architecture.md",
	SystemPatternsPatterns = "systemPatterns/patterns.md",
	SystemPatternsScanning = "systemPatterns/scanning.md",

	TechContextIndex = "techContext/index.md",
	TechContextStack = "techContext/stack.md",
	TechContextDependencies = "techContext/dependencies.md",
	TechContextEnvironment = "techContext/environment.md",
}

/**
 * Basic metadata for a memory bank file
 */
export interface MemoryBankFileMetadata {
	lastUpdated: Date;
	size: number;
	exists: boolean;
}

/**
 * YAML frontmatter metadata structure
 */
export interface FrontmatterMetadata {
	id?: string;
	type?: string;
	title?: string;
	description?: string;
	tags?: string[];
	created?: string;
	updated?: string;
	version?: string;
	[key: string]: unknown; // Allow additional properties
}

/**
 * Represents a file within the memory bank
 */
export interface MemoryBankFile {
	type: MemoryBankFileType;
	content: string; // Content WITHOUT frontmatter
	lastUpdated: Date;

	// Phase 2: Metadata System additions
	filePath?: string; // Absolute path
	relativePath?: string; // Path relative to memory-bank root
	metadata?: FrontmatterMetadata; // Parsed YAML frontmatter
	created?: Date; // From metadata.created if present

	// Validation (Phase 2.2)
	validationStatus?: ValidationStatus;
	validationErrors?: import("zod").ZodIssue[];
	actualSchemaUsed?: string;
}

/**
 * Enhanced MemoryBank interface with Result pattern support
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
 * Batch file data for bulk operations
 */
export interface BatchFileData {
	filename: string;
	content: string;
}

/**
 * Configuration for memory bank initialization
 */
export interface MemoryBankConfig {
	workspaceRoot: string;
	enableLogging?: boolean;
	cacheEnabled?: boolean;
}

/**
 * Result of health check operation
 */
export interface HealthCheckResult {
	isHealthy: boolean;
	issues: string[];
	summary: string;
}

/**
 * File operation statistics
 */
export interface FileOperationStats {
	reads: number;
	writes: number;
	errors: number;
	averageReadTime: number;
	averageWriteTime: number;
}

/**
 * Complete system health and performance metrics
 */
export interface SystemMetrics {
	cache: LegacyCacheStats;
	fileOperations: FileOperationStats;
	uptime: number;
	memoryUsage: number;
}

/**
 * Context for file operations in memory bank services
 */
export interface FileOperationContext {
	memoryBankFolder: string;
	logger: Logger;
	fileCache: Map<string, FileCache>;
	cacheStats: LegacyCacheStats;
	streamingManager: StreamingManager;
	fileOperationManager: FileOperationManager;
}

/**
 * Interface for disposable resources.
 */
export interface IDisposable {
	dispose(): void | Promise<void>;
}

// =================================================================
// Section: Error Handling and Result Pattern (from src/types/errorHandling.ts)
// =================================================================

/**
 * Result pattern for safe error handling without exceptions Based on Rust's Result<T, E> pattern
 * for predictable error handling
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

/**
 * Async version of Result pattern for Promise-returning functions
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

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

/**
 * Base Memory Bank error class for all Memory Bank operations. Provides a structured way to handle
 * errors with specific codes and context.
 */
export class MemoryBankError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly context?: Record<string, unknown>,
	) {
		super(message);
		this.name = "MemoryBankError";

		// Set prototype explicitly to ensure instanceof works correctly
		Object.setPrototypeOf(this, MemoryBankError.prototype);
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

// =================================================================
// Section: Unified Logging System (from src/types/logging.ts)
// =================================================================

/**
 * Log levels for filtering and categorization
 */
export enum LogLevel {
	Trace = 0,
	Debug = 1,
	Info = 2,
	Warn = 3,
	Error = 4,
	Off = 5,
}

/**
 * Optional context for structured logging
 */
export interface LogContext {
	component?: string;
	operation?: string;
	filePath?: string;
	duration?: number;
	[key: string]: unknown;
}

/**
 * Unified logger interface for all AI Memory Extension components
 *
 * This single interface replaces:
 * - MemoryBankLogger
 * - BasicLogger
 * - Custom VS Code Logger interface
 */
export interface Logger {
	/**
	 * Log trace-level messages (most verbose)
	 */
	trace(message: string, context?: LogContext): void;

	/**
	 * Log debug-level messages for development
	 */
	debug(message: string, context?: LogContext): void;

	/**
	 * Log informational messages
	 */
	info(message: string, context?: LogContext): void;

	/**
	 * Log warning messages
	 */
	warn(message: string, context?: LogContext): void;

	/**
	 * Log error messages
	 */
	error(message: string, context?: LogContext): void;

	/**
	 * Set the minimum log level
	 */
	setLevel(level: LogLevel): void;

	/**
	 * Show the output channel if available (VS Code specific)
	 */
	showOutput?(): void;
}

/**

 * Configuration for logger implementations
 */
export interface LoggerConfig {
	level?: LogLevel;
	enableTimestamps?: boolean;
	enableContext?: boolean;
	component?: string;
}
