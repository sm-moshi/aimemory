/**
 * File Operations Types and Interfaces
 * Contains types for file system operations, templates, streaming, and batch processing
 */

import type { MemoryBankFileType } from "./core.js";
import type { Result } from "./errorHandling.js";

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
	 * Security: Root directory for path validation - prevents path traversal attacks
	 * If provided, all file paths will be validated to ensure they remain within this root
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
 * Result of a file processing operation (use ValidationResult from config.ts for general validation)
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
 * Cache entry statistics for determining streaming strategy.
 * Used by StreamingManager to cache file stats.
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
