/**
 * Configuration and Validation Types for AI Memory Extension
 * Contains types for Cursor configuration, process management, validation, system settings, and Zod schemas
 * Consolidated from validation.ts for better organization
 */

import { z } from "zod";
import { MemoryBankFileType } from "./core.js";

// =============================================================================
// VALIDATION SCHEMAS & FUNCTIONS (consolidated from validation.ts)
// =============================================================================

/**
 * Schema for validating MemoryBankFileType
 */
export const MemoryBankFileTypeSchema = z.enum(
	Object.values(MemoryBankFileType) as [string, ...string[]],
);

/**
 * Schema for non-empty string validation
 */
export const NonEmptyStringSchema = z.string().min(1, "String cannot be empty");

/**
 * Schema for safe file path validation (prevents path traversal)
 */
export const SafePathSchema = z
	.string()
	.min(1, "Path cannot be empty")
	.refine(
		path => !path.includes("..") && !path.startsWith("/") && !path.includes("\0"),
		"Path contains unsafe characters or sequences",
	);

/**
 * Schema for optional content with size limits
 */
export const ContentSchema = z.string().max(1024 * 1024, "Content exceeds 1MB limit"); // 1MB limit

/**
 * Schema for init-memory-bank tool (no parameters)
 */
export const InitMemoryBankSchema = z.object({});

/**
 * Schema for read-memory-bank-files tool (no parameters)
 */
export const ReadMemoryBankFilesSchema = z.object({});

/**
 * Schema for update-memory-bank-file tool
 */
export const UpdateMemoryBankFileSchema = z.object({
	fileType: MemoryBankFileTypeSchema,
	content: ContentSchema,
});

/**
 * Schema for read-memory-bank-file tool
 */
export const ReadMemoryBankFileSchema = z.object({
	fileType: MemoryBankFileTypeSchema,
});

/**
 * Schema for list-memory-bank-files tool (no parameters)
 */
export const ListMemoryBankFilesSchema = z.object({});

/**
 * Schema for health-check-memory-bank tool (no parameters)
 */
export const HealthCheckMemoryBankSchema = z.object({});

/**
 * Schema for review-and-update-memory-bank tool (no parameters)
 */
export const ReviewAndUpdateMemoryBankSchema = z.object({});

/**
 * Schema for webview message types
 */
export const WebviewMessageTypeSchema = z.enum([
	"getFiles",
	"updateFile",
	"getServerStatus",
	"refreshStatus",
	"openFile",
	"error",
	"success",
]);

/**
 * Schema for webview message base structure
 */
export const WebviewMessageBaseSchema = z.object({
	type: WebviewMessageTypeSchema,
	id: z.string().optional(),
});

/**
 * Schema for webview file operation messages
 */
export const WebviewFileOperationSchema = WebviewMessageBaseSchema.extend({
	payload: z
		.object({
			fileType: MemoryBankFileTypeSchema.optional(),
			content: ContentSchema.optional(),
			path: SafePathSchema.optional(),
		})
		.optional(),
});

/**
 * Schema for command validation (prevents injection)
 */
export const SafeCommandSchema = z
	.string()
	.min(1, "Command cannot be empty")
	.refine(
		cmd => !cmd.includes(";") && !cmd.includes("|") && !cmd.includes("&") && !cmd.includes("`"),
		"Command contains potentially unsafe characters",
	)
	.refine(cmd => {
		// Check for dangerous commands
		const dangerous = ["rm -rf", "del /", "format", "dd if="];
		return !dangerous.some(danger => cmd.includes(danger));
	}, "Command contains dangerous operations");

/**
 * Schema for environment variable validation
 */
export const EnvironmentVariableSchema = z
	.string()
	.regex(/^[A-Z_][A-Z0-9_]*$/, "Invalid environment variable name format");

/**
 * Schema for port number validation
 */
export const PortNumberSchema = z
	.number()
	.int()
	.min(1, "Port must be greater than 0")
	.max(65535, "Port must be less than 65536");

/**
 * Validates and parses MCP tool parameters using the appropriate schema
 */
export function validateMCPToolParams<T>(
	toolName: string,
	params: unknown,
	schema: z.ZodSchema<T>,
): T {
	try {
		return schema.parse(params);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const issues = error.errors
				.map(err => `${err.path.join(".")}: ${err.message}`)
				.join(", ");
			throw new Error(`Invalid parameters for ${toolName}: ${issues}`);
		}
		throw new Error(`Validation failed for ${toolName}: ${error}`);
	}
}

/**
 * Validates webview messages with comprehensive error handling
 */
export function validateWebviewMessage(
	message: unknown,
): z.infer<typeof WebviewFileOperationSchema> {
	try {
		return WebviewFileOperationSchema.parse(message);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const issues = error.errors
				.map(err => `${err.path.join(".")}: ${err.message}`)
				.join(", ");
			throw new Error(`Invalid webview message: ${issues}`);
		}
		throw new Error(`Webview message validation failed: ${error}`);
	}
}

/**
 * Type guard for checking if a value is a valid file type
 */
export function isValidFileType(value: unknown): value is z.infer<typeof MemoryBankFileTypeSchema> {
	return MemoryBankFileTypeSchema.safeParse(value).success;
}

/**
 * Type guard for checking if a path is safe
 */
export function isSafePath(value: unknown): value is string {
	return SafePathSchema.safeParse(value).success;
}

export type ValidatedMCPParams = {
	initMemoryBank: z.infer<typeof InitMemoryBankSchema>;
	readMemoryBankFiles: z.infer<typeof ReadMemoryBankFilesSchema>;
	updateMemoryBankFile: z.infer<typeof UpdateMemoryBankFileSchema>;
	readMemoryBankFile: z.infer<typeof ReadMemoryBankFileSchema>;
	listMemoryBankFiles: z.infer<typeof ListMemoryBankFilesSchema>;
	healthCheckMemoryBank: z.infer<typeof HealthCheckMemoryBankSchema>;
	reviewAndUpdateMemoryBank: z.infer<typeof ReviewAndUpdateMemoryBankSchema>;
};

export type ValidatedWebviewMessage = z.infer<typeof WebviewFileOperationSchema>;

/**
 * Safe process execution configuration
 */
export interface SafeProcessConfig {
	command: string;
	args: string[];
	cwd?: string;
	timeout?: number;
	env?: Record<string, string>;
}

/**
 * Security audit result structure
 */
export interface SecurityAuditResult {
	isSecure: boolean;
	warnings: string[];
	errors: string[];
	sanitizedInput?: string;
}

// =============================================================================
// UNIFIED VALIDATION RESULT INTERFACE (replaces 3 different interfaces)
// =============================================================================

/**
 * Generic validation result interface that replaces FileProcessingResult, ValidationSchemaResult, and MetadataValidationResult
 * Uses generics to provide type safety while eliminating duplication
 */
export interface ValidationResult<TData = unknown, TContext = Record<string, unknown>> {
	isValid: boolean;
	errors: string[];
	warnings?: string[];

	// Optional processed data (for file processing)
	data?: TData;

	// Context information (flexible for different use cases)
	context?: TContext;
}

// Type aliases for specific use cases (maintains clarity and backwards compatibility)
export type FileProcessingResult = ValidationResult<string, { processedContent?: string }>;
export type SchemaValidationResult = ValidationResult<
	unknown,
	{ filePath: string; fileType?: MemoryBankFileType }
>;

// =============================================================================
// CURSOR CONFIGURATION TYPES
// =============================================================================

/**
 * Configuration for MCP server in Cursor
 */
export interface CursorMCPServerConfig {
	name?: string;
	command: string;
	args?: string[];
	env?: Record<string, string>;
	cwd?: string;
	url?: string; // For URL-based servers
}

/**
 * Complete Cursor MCP configuration structure
 */
export interface CursorMCPConfig {
	mcpServers: Record<string, CursorMCPServerConfig>;
}

/**
 * Result of comparing two server configurations
 */
export interface ConfigComparisonResult {
	matches: boolean;
	differences?: string[];
}

/**
 * Settings for Cursor rules generation and management
 */
export interface CursorRulesSettings {
	autoUpdate?: boolean;
	templatePath?: string;
	outputPath?: string;
	includeTimestamp?: boolean;
}

/**
 * Process environment configuration
 */
export interface ProcessEnvironment {
	NODE_ENV?: "development" | "production" | "test";
	DEBUG?: string;
	LOG_LEVEL?: "error" | "warn" | "info" | "debug" | "trace";
	WORKSPACE_ROOT?: string;
	[key: string]: string | undefined;
}

/**
 * Process execution options
 */
export interface ProcessOptions {
	cwd?: string;
	env?: ProcessEnvironment;
	timeout?: number;
	shell?: boolean;
	stdio?: "pipe" | "inherit" | "ignore";
}

/**
 * Result of a process execution
 */
export interface ProcessResult {
	exitCode: number;
	stdout: string;
	stderr: string;
	duration: number;
	signal?: NodeJS.Signals;
}

/**
 * VS Code extension configuration settings
 */
export interface ExtensionConfig {
	memoryBank: {
		enabled: boolean;
		autoInitialize: boolean;
		watchFiles: boolean;
		cacheEnabled: boolean;
	};
	logging: {
		level: "error" | "warn" | "info" | "debug";
		outputToFile: boolean;
		maxLogSize: number;
	};
	cursor: {
		autoUpdateMCP: boolean;
		rulesPath: string;
		mcpConfigPath: string;
	};
}

/**
 * Runtime configuration for the extension
 */
export interface RuntimeConfig {
	extensionPath: string;
	workspacePath: string;
	globalStoragePath: string;
	version: string;
	isDevelopment: boolean;
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
 * Validation context for file operations
 */
export interface ValidationContext {
	filePath: string;
	fileType?: string;
	allowedRoot?: string;
	maxSize?: number;
	requiredFields?: string[];
}

/**
 * File validation options
 */
export interface FileValidationOptions {
	checkSize?: boolean;
	maxSize?: number;
	allowedExtensions?: string[];
	requireExists?: boolean;
	checkReadable?: boolean;
	checkWritable?: boolean;
}

/**
 * Path validation options
 */
export interface PathValidationOptions {
	allowedRoot?: string;
	allowTraversal?: boolean;
	requireAbsolute?: boolean;
	allowSymlinks?: boolean;
}

/**
 * Validation rule definition
 */
export interface ValidationRule {
	name: string;
	message: string;
	validate: (value: unknown, context?: ValidationContext) => boolean;
}

/**
 * Validator configuration
 */
export interface ValidatorConfig {
	strict?: boolean;
	allowUnknownFields?: boolean;
	coerceTypes?: boolean;
	rules?: ValidationRule[];
}

/**
 * Field validation error
 */
export interface FieldValidationError {
	field: string;
	message: string;
	value?: unknown;
	expectedType?: string;
}

/**
 * Validation summary for complex objects
 */
export interface ValidationSummary {
	totalFields: number;
	validFields: number;
	invalidFields: number;
	fieldErrors: FieldValidationError[];
	overallValid: boolean;
}
