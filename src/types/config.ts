/**
 * @file src/types/config.ts
 * @description Defines types related to configuration, validation, and schemas. This includes
 *   VS Code and Cursor-specific configurations, as well as general-purpose validation structures
 *   and Zod schemas.
 */

import { z } from "zod/v4";
import { MemoryBankFileType } from "./core";

// --- Generic Validation ---

/**
 * A generic, unified structure for returning the result of a validation operation.
 */
export interface ValidationResult<TData = unknown, TContext = Record<string, unknown>> {
	isValid: boolean;
	errors: string[];
	warnings?: string[];
	data?: TData; // Optional processed data
	context?: TContext; // Optional context
}

export type SchemaValidationResult = ValidationResult<unknown, { filePath: string; fileType?: MemoryBankFileType }>;
export type FileProcessingResult = ValidationResult<string, { processedContent?: string }>;

// --- Configuration Interfaces ---

export interface CursorMCPServerConfig {
	name?: string;
	command: string;
	args?: string[];
	env?: Record<string, string>;
	cwd?: string;
	url?: string;
}

export interface CursorMCPConfig {
	mcpServers: Record<string, CursorMCPServerConfig>;
}

export interface ConfigComparisonResult {
	matches: boolean;
	differences?: string[];
}

export interface CursorRulesSettings {
	autoUpdate?: boolean;
	templatePath?: string;
	outputPath?: string;
	includeTimestamp?: boolean;
}

// --- Zod Schemas & Validation Functions ---

export const MemoryBankFileTypeSchema = z.enum(Object.values(MemoryBankFileType) as [string, ...string[]]);
export const NonEmptyStringSchema = z.string().min(1, { error: "String cannot be empty" });
export const SafePathSchema = z
	.string()
	.min(1, { error: "Path cannot be empty" })
	.refine(path => !path.includes("..") && !path.startsWith("/") && !path.includes("\0"), {
		error: "Path contains unsafe characters or sequences",
	});

export const ContentSchema = z.string().max(1024 * 1024, { error: "Content exceeds 1MB limit" });

export const WebviewMessageTypeSchema = z.enum([
	"getFiles",
	"updateFile",
	"getServerStatus",
	"refreshStatus",
	"openFile",
	"error",
	"success",
]);

export const WebviewMessageBaseSchema = z.object({
	type: WebviewMessageTypeSchema,
	id: z.string().optional(),
});

export const WebviewFileOperationSchema = WebviewMessageBaseSchema.extend({
	payload: z
		.object({
			fileType: MemoryBankFileTypeSchema.optional(),
			content: ContentSchema.optional(),
			path: SafePathSchema.optional(),
		})
		.optional(),
});

export function validateWebviewMessage(message: unknown): z.infer<typeof WebviewFileOperationSchema> {
	try {
		return WebviewFileOperationSchema.parse(message);
	} catch (error) {
		if (error instanceof z.core.$ZodError) {
			const issues = error.issues.map(err => `${err.path.join(".")}: ${err.message}`).join(", ");
			throw new Error(`Invalid webview message: ${issues}`);
		}
		throw new Error(`Webview message validation failed: ${error}`);
	}
}

// --- Security & Process Schemas ---

export const PortNumberSchema = z
	.number()
	.int()
	.min(1, { error: "Port must be greater than 0" })
	.max(65535, { error: "Port must be less than 65536" });

export const SafeCommandSchema = z
	.string()
	.min(1, { error: "Command cannot be empty" })
	.refine(cmd => !cmd.includes(";") && !cmd.includes("|") && !cmd.includes("&") && !cmd.includes("`"), {
		error: "Command contains potentially unsafe characters",
	})
	.refine(
		cmd => {
			const dangerous = ["rm -rf", "del /", "format", "dd if="];
			return !dangerous.some(danger => cmd.includes(danger));
		},
		{ error: "Command contains dangerous operations" },
	);

export interface SafeProcessConfig {
	command: string;
	args: string[];
	cwd?: string;
	timeout?: number;
	env?: Record<string, string>;
}

export interface SecurityAuditResult {
	isSecure: boolean;
	warnings: string[];
	errors: string[];
	sanitizedInput?: string;
}
