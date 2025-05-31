// =============================================================================
// Validation Types and Zod Schemas for AI Memory Extension
// =============================================================================

import { z } from "zod";
import { MemoryBankFileType } from "./core.js";

// =============================================================================
// Core Validation Schemas
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
		(path) => !path.includes("..") && !path.startsWith("/") && !path.includes("\0"),
		"Path contains unsafe characters or sequences",
	);

/**
 * Schema for optional content with size limits
 */
export const ContentSchema = z.string().max(1024 * 1024, "Content exceeds 1MB limit"); // 1MB limit

// =============================================================================
// MCP Tool Parameter Schemas
// =============================================================================

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

// =============================================================================
// Webview Communication Schemas
// =============================================================================

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

// =============================================================================
// Security Validation Schemas
// =============================================================================

/**
 * Schema for command validation (prevents injection)
 */
export const SafeCommandSchema = z
	.string()
	.min(1, "Command cannot be empty")
	.refine(
		(cmd) =>
			!cmd.includes(";") && !cmd.includes("|") && !cmd.includes("&") && !cmd.includes("`"),
		"Command contains potentially unsafe characters",
	)
	.refine((cmd) => {
		// Check for dangerous commands
		const dangerous = ["rm -rf", "del /", "format", "dd if="];
		return !dangerous.some((danger) => cmd.includes(danger));
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

// =============================================================================
// Utility Validation Functions
// =============================================================================

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
				.map((err) => `${err.path.join(".")}: ${err.message}`)
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
				.map((err) => `${err.path.join(".")}: ${err.message}`)
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

// =============================================================================
// Exported Types
// =============================================================================

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

// =============================================================================
// Security Configuration Interfaces
// =============================================================================

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

/**
 * Result of file validation operation (from types.ts)
 */
export interface FileValidationResult {
	isValid: boolean;
	filePath: string;
	fileType?: MemoryBankFileType;
	error?: string;
}
