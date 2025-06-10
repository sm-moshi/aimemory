/**
 * @file src/types/operations.ts
 * @description Defines types related to specific "verb" operations within the application, such
 *   as file streaming, updates, batch processing, and retries. These types support the core
 *   functional logic of the application's services.
 */

import type { MemoryBankFileType } from "./core";
import type { Result } from "./error";

/**
 * A standardized error structure for file operations.
 */
export interface FileError {
	code: string;
	message: string;
	path?: string;
	originalError?: Error;
}

/**
 * Progress callback for streaming operations.
 */
export type StreamingProgressCallback = (bytesRead: number, totalBytes: number) => void;

/**
 * Configuration for the StreamingManager's behavior.
 */
export interface StreamingManagerConfig {
	sizeThreshold?: number; // Files larger than this will be streamed.
	chunkSize?: number; // Size of each chunk when streaming.
	timeout?: number; // Timeout for streaming operations.
	enableProgressCallbacks?: boolean;
}

/**
 * Options for individual streaming operations.
 */
export interface StreamingOptions {
	onProgress?: StreamingProgressCallback;
	timeout?: number;
	chunkSize?: number;
	enableCancellation?: boolean;
	allowedRoot?: string; // Security: Root directory for path validation.
}

/**
 * Represents the result of a file read, with metadata on whether it was streamed.
 */
export interface StreamingResult {
	content: string;
	wasStreamed: boolean;
	duration: number;
	bytesRead: number;
	chunksProcessed?: number;
}

/**
 * Configuration for the low-level FileStreamer class.
 */
export interface FileStreamerConfig {
	defaultChunkSize: number;
	defaultTimeout: number;
	defaultEnableProgressCallbacks: boolean;
	onProgress?: (progress: { bytesRead: number; totalBytes: number; chunks: number }) => void;
}

/**
 * Internal context for handling stream data chunks in FileStreamer.
 */
export interface StreamDataHandlerContext {
	bytesRead: { value: number };
	chunksProcessed: { value: number };
	totalSize: number;
	enableProgress: boolean;
	options?: StreamingOptions;
}

/**
 * Defines strategies for handling file conflicts during writes.
 */
export type ConflictStrategy = "overwrite" | "preserve" | "merge" | "backup";

/**
 * Options for file update operations.
 */
export interface FileUpdateOptions {
	conflictStrategy?: ConflictStrategy;
	createBackup?: boolean;
	validateContent?: boolean;
}

/**
 * Represents file content with variables for template processing.
 */
export interface FileContentTemplate {
	content: string;
	variables?: Record<string, string>;
	requiredVariables?: string[];
}

/**
 * Provides context for populating file templates.
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
 * Maps each memory bank file type to its default template.
 */
export type FileTemplateMap = {
	[K in MemoryBankFileType]: FileContentTemplate;
};

/**
 * Defines validation rules for file content.
 */
export interface ContentValidationRules {
	maxSize?: number;
	requiredSections?: string[];
	forbiddenPatterns?: RegExp[];
	encoding?: BufferEncoding;
}

/**
 * Options for a file processing pipeline.
 */
export interface FileProcessingOptions {
	preprocessors?: Array<(content: string) => string>;
	postprocessors?: Array<(content: string) => string>;
	validation?: ContentValidationRules;
}

/**
 * Options for batch file operations.
 */
export interface BatchOperationOptions {
	concurrent?: boolean;
	maxConcurrency?: number;
	continueOnError?: boolean;
	timeout?: number;
}

/**
 * The result of a batch file operation.
 */
export interface BatchOperationResult {
	successful: string[];
	failed: Array<{ file: string; error: Error }>;
	totalProcessed: number;
	duration: number;
}

/**
 * Configuration for retry behavior in file operations.
 */
export interface RetryConfig {
	maxRetries: number;
	baseDelay: number;
	maxDelay: number;
	backoffFactor: number;
}

/**
 * Configuration for the FileOperationManager.
 */
export interface FileOperationManagerConfig {
	retryConfig?: Partial<RetryConfig>;
	timeout?: number;
}

/**
 * Internal parameters for the FileStreamer's setup method.
 */
export interface StreamSetupParameters {
	validatedPath: string;
	stats: import("node:fs").Stats;
	options?: StreamingOptions;
	originalFilePath: string;
	startTime: number;
}

/**
 * Internal mutable state for the FileStreamer's setup method.
 */
export interface StreamSetupState {
	resolve: (value: Result<StreamingResult, FileError>) => void;
	chunks: Buffer[];
	bytesRead: { value: number };
	chunksProcessed: { value: number };
}
