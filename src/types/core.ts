/**
 * Core Memory Bank Types and Interfaces
 * Contains fundamental enums, interfaces, and types for the Memory Bank system
 */

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
 * Represents a file within the memory bank
 */
export interface MemoryBankFile {
	type: MemoryBankFileType;
	content: string;
	lastUpdated: Date;
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

/**
 * Cache performance statistics
 */
export interface CacheStats {
	hits: number;
	misses: number;
	totalFiles: number;
	hitRate: number;
	lastReset: Date;
	reloads: number;
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
	cache: CacheStats;
	fileOperations: FileOperationStats;
	uptime: number;
	memoryUsage: number;
}

import type { MemoryBankError } from "./errors.js";
// Import dependencies
import type { AsyncResult } from "./result.js";
