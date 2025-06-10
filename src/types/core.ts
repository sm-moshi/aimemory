/**
 * @file src/types/core.ts
 * @description Defines the core domain models for the AI Memory Extension. These interfaces and
 *   enums represent the fundamental data structures of the memory bank, such as files, metadata,
 *   and the main MemoryBank service contract.
 */

import type { FileOperationManager } from "../core/file-operations";
import type { StreamingManager } from "../core/streaming";
import type { AsyncResult, MemoryBankError } from "./error";
import type { Logger } from "./logging";
import type { FileCache, LegacyCacheStats } from "./system";

/**
 * Enumeration of all memory bank file types. Values should represent the full relative path from
 * the memory-bank root, including the extension. This provides a single source of truth for all
 * known file types within the system.
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

	// Hierarchical file types for system patterns
	SystemPatternsIndex = "systemPatterns/index.md",
	SystemPatternsArchitecture = "systemPatterns/architecture.md",
	SystemPatternsPatterns = "systemPatterns/patterns.md",
	SystemPatternsScanning = "systemPatterns/scanning.md",

	// Hierarchical file types for technology context
	TechContextIndex = "techContext/index.md",
	TechContextStack = "techContext/stack.md",
	TechContextDependencies = "techContext/dependencies.md",
	TechContextEnvironment = "techContext/environment.md",
}

/**
 * Defines the structure for YAML frontmatter metadata embedded in Markdown files.
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
	[key: string]: unknown; // Allows for additional, untyped properties.
}

/**
 * Represents a file within the memory bank, including its content and metadata.
 */
export interface MemoryBankFile {
	type: MemoryBankFileType;
	content: string; // Content WITHOUT frontmatter
	lastUpdated: Date;
	filePath?: string; // Absolute path
	relativePath?: string; // Path relative to memory-bank root
	metadata?: FrontmatterMetadata; // Parsed YAML frontmatter
	created?: Date; // From metadata.created if present
	validationStatus?: "valid" | "invalid" | "pending" | undefined; // Temporary: Was ValidationStatus, will be imported from ./metadata later
	validationErrors?: import("zod").ZodIssue[];
	actualSchemaUsed?: string;
}

/**
 * Defines the main service contract for the MemoryBankManager. All interactions with the
 * memory bank should go through this interface.
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
 * Represents a disposable resource that needs cleanup.
 */
export interface IDisposable {
	dispose(): void | Promise<void>;
}

/**
 * A grouping of related objects passed to file operations to provide necessary context
 * without relying on a DI container.
 */
export interface FileOperationContext {
	memoryBankFolder: string;
	logger: Logger;
	fileCache: Map<string, FileCache>;
	cacheStats: LegacyCacheStats;
	streamingManager: StreamingManager;
	fileOperationManager: FileOperationManager;
}
