/**
 * Core Memory Bank Types and Interfaces
 * Contains fundamental enums, interfaces, and types for the Memory Bank system
 */

// =============================================================================
// Logging Interface
// =============================================================================

/**
 * Logger interface for Memory Bank operations
 * Provides standardised logging methods for Memory Bank components
 */
export interface MemoryBankLogger {
	info(message: string): void;
	error(message: string): void;
	warn(message: string): void;
	debug(message: string): void;
}

// =============================================================================
// Memory Bank File System Types
// =============================================================================

/**
 * Enumeration of all memory bank file types.
 * Values should represent the full relative path from the memory-bank root, including extension.
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
	validationStatus?: "valid" | "invalid" | "unchecked" | "schema_not_found";
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

// =============================================================================
// Memory Bank Statistics and Monitoring
// =============================================================================

// Note: LegacyCacheStats is now imported from cache.ts to avoid duplication

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
	cache: import("./cache.js").LegacyCacheStats;
	fileOperations: FileOperationStats;
	uptime: number;
	memoryUsage: number;
}

import type { FileOperationManager } from "../core/FileOperationManager.js";
import type { StreamingManager } from "../performance/StreamingManager.js";
import type { FileCache, LegacyCacheStats } from "./cache.js";
// Import dependencies
import type { AsyncResult, MemoryBankError } from "./errorHandling.js";

/**
 * Context for file operations in memory bank services (from types.ts)
 */
export interface FileOperationContext {
	memoryBankFolder: string;
	logger: MemoryBankLogger;
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
