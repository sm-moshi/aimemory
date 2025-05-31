/**
 * File Operations Types and Interfaces
 * Contains types for file system operations, templates, and content management
 */

import type { MemoryBankFileType } from "./core.js";

// =============================================================================
// File Content and Template Types
// =============================================================================

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

// =============================================================================
// File Operation Validation and Processing
// =============================================================================

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
 * Result of a file validation operation
 */
export interface ValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
	processedContent?: string;
}

// =============================================================================
// Batch File Operations
// =============================================================================

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

// =============================================================================
// Enhanced File Operations (Phase 1)
// =============================================================================

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
