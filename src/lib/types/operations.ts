/**
 * @file src/lib/types/operations.ts
 * @description Consolidated operational types for the AI Memory Extension.
 *
 * This file combines types from the following legacy files:
 * - `src/types/fileOperations.ts`
 * - `src/types/mcpTypes.ts`
 * - `src/types/memoryBankSchemas.ts`
 *
 * It provides a single source for types related to file streaming,
 * MCP server interactions, and Zod validation schemas.
 */

// biome-ignore lint/correctness/noUnusedImports: <explanation>
import type { MemoryBankManager } from "../../core/memory-bank";
// biome-ignore lint/correctness/noUnusedImports: <explanation>
import type { AsyncResult, Logger, MemoryBankError, MemoryBankFileType, Result } from "./core";

// =================================================================
// Section: File & Streaming Operations (from src/types/fileOperations.ts)
// =================================================================

/**
 * Progress callback for streaming operations
 */
export type StreamingProgressCallback = (bytesRead: number, totalBytes: number) => void;

/**
 * Configuration for streaming manager behavior
 */
export interface StreamingManagerConfig {
	sizeThreshold?: number; // bytes - files larger than this will be streamed
	chunkSize?: number; // bytes - size of each chunk when streaming
	timeout?: number; // milliseconds - timeout for streaming operations
	enableProgressCallbacks?: boolean;
}

/**
 * Options for individual streaming operations
 */
export interface StreamingOptions {
	onProgress?: StreamingProgressCallback;
	timeout?: number;
	chunkSize?: number;
	enableCancellation?: boolean;
	/**
	 * Security: Root directory for path validation - prevents path traversal attacks If provided,
	 * all file paths will be validated to ensure they remain within this root
	 */
	allowedRoot?: string;
}

/**
 * Enhanced result with streaming metadata
 */
export interface StreamingResult {
	content: string;
	wasStreamed: boolean;
	duration: number;
	bytesRead: number;
	chunksProcessed?: number;
}

/**
 * Statistics for streaming operations
 */
export interface StreamingStats {
	totalOperations: number;
	streamedOperations: number;
	totalBytesRead: number;
	avgStreamingTime: number;
	avgNormalReadTime: number;
	largestFileStreamed: number;
	lastReset: Date;
}

/**
 * Streaming operation metadata
 */
export interface StreamingMetadata {
	filePath: string;
	fileSize: number;
	strategy: "normal" | "streaming";
	startTime: number;
	endTime?: number;
	bytesProcessed?: number;
	chunksProcessed?: number;
}

// Configuration for FileStreamer class
export interface FileStreamerConfig {
	defaultChunkSize: number;
	defaultTimeout: number;
	defaultEnableProgressCallbacks: boolean;
	// Optional onProgress for specific instances if needed, but defaults are primary
	onProgress?: (progress: { bytesRead: number; totalBytes: number; chunks: number }) => void;
}

/**
 * Context for the _handleStreamData method in FileStreamer.
 */
export interface StreamDataHandlerContext {
	bytesRead: { value: number };
	chunksProcessed: { value: number };
	totalSize: number;
	enableProgress: boolean;
	options?: StreamingOptions;
}

/**
 * Different strategies for handling file conflicts
 */
export type ConflictStrategy = "overwrite" | "preserve" | "merge" | "backup";

/**
 * Options for file update operations
 */
export interface FileUpdateOptions {
	conflictStrategy?: ConflictStrategy;
	createBackup?: boolean;
	validateContent?: boolean;
}

/**
 * Represents file content with metadata for template processing
 */
export interface FileContentTemplate {
	content: string;
	variables?: Record<string, string>;
	requiredVariables?: string[];
}

/**
 * Template context for memory bank file generation
 */
export interface TemplateContext {
	projectName?: string;
	workspaceRoot?: string;
	timestamp?: string;
	author?: string;
	version?: string;
	[key: string]: string | undefined;
}

/**
 * Maps file types to their default templates
 */
export type FileTemplateMap = {
	[K in MemoryBankFileType]: FileContentTemplate;
};

/**
 * Content validation rules for memory bank files
 */
export interface ContentValidationRules {
	maxSize?: number;
	requiredSections?: string[];
	forbiddenPatterns?: RegExp[];
	encoding?: BufferEncoding;
}

/**
 * File processing pipeline options
 */
export interface FileProcessingOptions {
	preprocessors?: Array<(content: string) => string>;
	postprocessors?: Array<(content: string) => string>;
	validation?: ContentValidationRules;
}

/**
 * Result of a file processing operation (use ValidationResult from config.ts for general
 * validation)
 */
export interface FileProcessingResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
	processedContent?: string;
}

/**
 * Options for batch file operations
 */
export interface BatchOperationOptions {
	concurrent?: boolean;
	maxConcurrency?: number;
	continueOnError?: boolean;
	timeout?: number;
}

/**
 * Result of a batch file operation
 */
export interface BatchOperationResult {
	successful: string[];
	failed: Array<{ file: string; error: Error }>;
	totalProcessed: number;
	duration: number;
}

/**
 * Configuration for retry behavior in file operations
 */
export interface RetryConfig {
	maxRetries: number;
	baseDelay: number;
	maxDelay: number;
	backoffFactor: number;
}

/**
 * Configuration for FileOperationManager
 */
export interface FileOperationManagerConfig {
	retryConfig?: Partial<RetryConfig>;
	timeout?: number;
}

/**
 * Standardized file error with additional context
 */
export interface FileError {
	code: string;
	message: string;
	path?: string;
	originalError?: Error;
}

/**
 * Cache entry statistics for determining streaming strategy. Used by StreamingManager to cache file
 * stats.
 */
export interface CachedFileStats {
	path: string;
	size: number;
	mtime: Date;
	wouldStream: boolean;
}

/**
 * Parameters for the internal _setupStreamAndEvents method in FileStreamer.
 */
export interface StreamSetupParameters {
	validatedPath: string;
	stats: import("node:fs").Stats;
	options?: StreamingOptions;
	originalFilePath: string;
	startTime: number;
}

/**
 * Mutable state for the internal _setupStreamAndEvents method in FileStreamer.
 */
export interface StreamSetupState {
	resolve: (value: Result<StreamingResult, FileError>) => void;
	chunks: Buffer[];
	bytesRead: { value: number };
	chunksProcessed: { value: number };
}

// =================================================================
// Section: MCP Server & Tooling (from src/types/mcpTypes.ts)
// =================================================================

/**
 * Common interface for MCP server implementations. As of Phase 1d, the extension uses STDIO
 * transport exclusively. This interface maintains compatibility with existing extension code.
 */
export interface MCPServerInterface {
	/**
	 * Start the MCP server
	 */
	start(): Promise<void>;

	/**
	 * Stop the MCP server
	 */
	stop(): void;

	/**
	 * Get the port number (for compatibility, STDIO adapters return a default)
	 */
	getPort(): number;

	/**
	 * Set external server running (for compatibility)
	 */
	setExternalServerRunning(port: number): void;

	/**
	 * Get the memory bank service instance
	 */
	getMemoryBank(): MemoryBankServiceCore;

	/**
	 * Update a memory bank file
	 */
	updateMemoryBankFile(fileType: string, content: string): Promise<void>;

	/**
	 * Handle a command
	 */
	handleCommand(command: string, args: string[]): Promise<string>;

	/**
	 * Check if the MCP server is currently running
	 */
	isServerRunning(): boolean;
}

/**
 * Standard MCP response types for tool handlers
 */
export interface MCPSuccessResponse {
	[x: string]: unknown;
	content: Array<{ type: "text"; text: string }>;
	isError?: false;
}

export interface MCPErrorResponse {
	[x: string]: unknown;
	content: Array<{ type: "text"; text: string }>;
	isError: true;
}

export type MCPResponse = MCPSuccessResponse | MCPErrorResponse;

/**
 * Unified MCP Server Configuration Interface
 *
 * This interface unifies all MCP server configuration needs across the codebase. Individual
 * implementations can require specific properties as needed.
 */
export interface MCPServerConfig {
	/** Path to the memory bank directory */
	memoryBankPath?: string;

	/** Legacy workspace path (mapped to memoryBankPath for backward compatibility) */
	workspacePath?: string;

	/** Server name (defaults provided by implementations) */
	name?: string;

	/** Server version (defaults provided by implementations) */
	version?: string;

	/** Logger instance using unified Logger interface */
	logger?: Logger;

	/** Log level for CLI implementations */
	logLevel?: string;

	/** Pre-configured memory bank instance (mainly for testing/DI) */
	memoryBank?: MemoryBankServiceCore;
}

// Type aliases for specific use cases (for clarity and backward compatibility)
export type BaseMCPServerConfig = MCPServerConfig;
export type CoreMemoryBankConfig = MCPServerConfig;
export type MCPServerCLIOptions = MCPServerConfig;
export type CLIServerConfig = MCPServerConfig;

/**
 * Original Configuration for base MCP server implementations. Kept for reference or specific use
 * cases where an instance is always pre-supplied.
 * @deprecated Use MCPServerConfig instead
 */
export interface MCPServerInstanceConfig {
	name: string;
	version: string;
	memoryBank: MemoryBankServiceCore;
	logger?: Logger;
}

/**
 * Error wrapper for type validation failures
 */
export class TypeValidationError extends Error {
	constructor(
		message: string,
		public readonly value: unknown,
	) {
		super(message);
		this.name = "TypeValidationError";
	}
}

/**
 * Result type for command handler operations
 */
export interface CommandResult {
	success: boolean;
	message: string;
	error?: MemoryBankError;
}

// =================================================================
// Section: Zod Schemas for Validation (from src/types/memoryBankSchemas.ts)
// =================================================================

import { z } from "zod";

// Base schema that all memory bank files should have
export const BaseFileSchema = z.object({
	id: z.string().uuid().optional(),
	type: z.string().optional(),
	title: z.string().optional(),
	description: z.string().optional(),
	tags: z.array(z.string()).optional(),
	created: z.string().datetime().optional(),
	updated: z.string().datetime().optional(),
	version: z.string().optional(),
});

// Project Brief specific schema
export const ProjectBriefSchema = BaseFileSchema.extend({
	type: z.literal("projectBrief"),
	title: z.string().min(1, "Title is required"),
	description: z.string().min(10, "Description must be at least 10 characters"),
	status: z.enum(["draft", "active", "completed", "archived"]).optional(),
	priority: z.enum(["low", "medium", "high", "critical"]).optional(),
});

// Research Note schema
export const ResearchNoteSchema = BaseFileSchema.extend({
	type: z.literal("researchNote"),
	topic: z.string().min(1, "Topic is required"),
	sources: z.array(z.string()).optional(),
	confidence: z.enum(["low", "medium", "high"]).optional(),
});

// Progress tracking schema
export const ProgressSchema = BaseFileSchema.extend({
	type: z.literal("progress"),
	phase: z.string().optional(),
	status: z.enum(["not-started", "in-progress", "completed", "blocked"]).optional(),
	blockers: z.array(z.string()).optional(),
});

// System Pattern schema
export const SystemPatternSchema = BaseFileSchema.extend({
	type: z.literal("systemPattern"),
	pattern: z.string().min(1, "Pattern is required"),
	category: z.enum(["architecture", "design", "performance", "security"]).optional(),
});

// Default schema for unknown types
export const DefaultFileSchema = BaseFileSchema;

// Schema registry for lookup
export const SCHEMA_REGISTRY: Record<string, z.ZodSchema> = {
	projectBrief: ProjectBriefSchema,
	researchNote: ResearchNoteSchema,
	progress: ProgressSchema,
	systemPattern: SystemPatternSchema,
	default: DefaultFileSchema,
};

/**
 * Get the appropriate schema for a given file type
 */
export function getSchemaForType(type?: string): z.ZodSchema {
	return SCHEMA_REGISTRY[type ?? "default"] || DefaultFileSchema;
}

/**
 * Validate frontmatter against the appropriate schema
 */
export function validateFrontmatter(
	metadata: unknown,
	type?: string,
): { success: true; data: unknown } | { success: false; error: z.ZodError } {
	const schema = getSchemaForType(type);
	return schema.safeParse(metadata);
}
