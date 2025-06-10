/**
 * Consolidated Security Utilities for AI Memory Extension
 *
 * This file combines functions for path validation, command validation,
 * input sanitization, and other security-related checks to provide a
 * single, robust module for ensuring application safety.
 */

import { isAbsolute, join, normalize, relative, resolve } from "node:path";
import {
	MemoryBankFileType,
	PortNumberSchema,
	SafeCommandSchema,
	SafePathSchema,
	type SafeProcessConfig,
	type SecurityAuditResult,
	ValidationError,
} from "../types";

/**
 * Validates if a given path stays within an allowed root directory.
 * This is a low-level utility for path validation.
 */
function validatePathWithinRoot(normalizedPath: string, allowedRoot: string): void {
	const resolvedRoot = resolve(allowedRoot);
	const resolvedPath = isAbsolute(normalizedPath) ? resolve(normalizedPath) : resolve(allowedRoot, normalizedPath);
	const isWithinRoot = resolvedPath.startsWith(resolvedRoot);

	if (!isWithinRoot) {
		throw new ValidationError("Path resolves outside allowed directory", "PATH_OUTSIDE_ROOT", {
			path: normalizedPath,
			root: allowedRoot,
			resolvedPath,
			resolvedRoot,
		});
	}
}

/**
 * Enhanced path sanitization with comprehensive security checks.
 * Prevents path traversal, null byte injection, and other path-based attacks.
 */
export function sanitizePath(inputPath: string, allowedRoot?: string): string {
	if (!inputPath || typeof inputPath !== "string") {
		throw new ValidationError("Path must be a non-empty string", "PATH_VALIDATION");
	}

	const cleanPath = inputPath.replace(/\0/g, "").trim();
	if (cleanPath !== inputPath) {
		throw new ValidationError("Path contains null bytes or invalid characters", "PATH_VALIDATION");
	}

	if (cleanPath.includes("..")) {
		throw new ValidationError("Path traversal detected", "PATH_TRAVERSAL_DETECTED");
	}

	if (isAbsolute(cleanPath) && !allowedRoot) {
		throw new ValidationError("Absolute paths not allowed", "ABSOLUTE_PATH_FORBIDDEN");
	}

	let normalizedPath = normalize(cleanPath);

	if (allowedRoot) {
		if (isAbsolute(normalizedPath)) {
			validatePathWithinRoot(normalizedPath, allowedRoot);
			const resolvedRoot = resolve(allowedRoot);
			const resolvedPath = resolve(normalizedPath);
			normalizedPath = relative(resolvedRoot, resolvedPath);
		} else {
			validatePathWithinRoot(normalizedPath, allowedRoot);
		}
	}

	return normalizedPath;
}

/**
 * Validates and constructs a safe file path for a known MemoryBankFileType.
 * Ensures the file type is valid and the path stays within the memory bank root.
 */
export function validateAndConstructKnownFilePath(memoryBankFolder: string, fileType: string): string {
	const validFileTypes = Object.values(MemoryBankFileType) as string[];
	if (!validFileTypes.includes(fileType)) {
		throw new Error(`Invalid file type: ${fileType}. Must be one of: ${validFileTypes.join(", ")}`);
	}
	const normalizedRoot = resolve(memoryBankFolder);
	const constructedPath = join(normalizedRoot, fileType);
	const normalizedPath = resolve(constructedPath);

	if (!normalizedPath.startsWith(normalizedRoot)) {
		throw new Error(`Invalid file path: ${fileType} resolves outside memory bank directory`);
	}

	return normalizedPath;
}

/**
 * Validates and constructs a safe path for an arbitrary relative path.
 * Used for operations that allow user-defined file paths within the memory bank.
 */
export function validateAndConstructArbitraryFilePath(memoryBankFolder: string, relativePath: string): string {
	if (relativePath.includes("..") || relativePath.startsWith("/") || relativePath.includes("\0")) {
		throw new Error(`Invalid relative path: ${relativePath} contains dangerous sequences`);
	}
	const normalizedRoot = resolve(memoryBankFolder);
	const constructedPath = join(normalizedRoot, relativePath);
	const normalizedPath = resolve(constructedPath);

	if (!normalizedPath.startsWith(normalizedRoot)) {
		throw new Error(`Invalid file path: ${relativePath} resolves outside memory bank directory`);
	}

	return normalizedPath;
}

/**
 * Validates file paths specifically for memory bank operations using Zod schemas
 * and enhanced sanitization.
 */
export function validateMemoryBankPath(relativePath: string, memoryBankRoot: string): string {
	try {
		const validatedPath = SafePathSchema.parse(relativePath);
		const sanitizedPath = sanitizePath(validatedPath, memoryBankRoot);
		return join(resolve(memoryBankRoot), sanitizedPath);
	} catch (error) {
		if (error instanceof ValidationError) {
			throw error;
		}
		throw new ValidationError(
			`Invalid memory bank path: ${error instanceof Error ? error.message : String(error)}`,
			"MEMORY_BANK_PATH_VALIDATION",
			{ path: relativePath },
		);
	}
}

/**
 * Validates commands to prevent injection attacks.
 */
export function validateCommand(command: string): string {
	try {
		return SafeCommandSchema.parse(command);
	} catch (error) {
		throw new ValidationError(
			`Unsafe command detected: ${error instanceof Error ? error.message : String(error)}`,
			"COMMAND_INJECTION_PREVENTION",
			{ command },
		);
	}
}

/**
 * Validates command arguments array to ensure no injection.
 */
export function validateCommandArgs(args: string[]): string[] {
	if (!Array.isArray(args)) {
		throw new ValidationError("Command arguments must be an array", "COMMAND_ARGS_VALIDATION");
	}

	return args.map((arg, index) => {
		if (typeof arg !== "string") {
			throw new ValidationError(`Argument at index ${index} must be a string`, "COMMAND_ARGS_VALIDATION", {
				index,
				type: typeof arg,
			});
		}

		if (/[;&|`]/.test(arg)) {
			throw new ValidationError(
				`Argument contains dangerous characters: ${arg}`,
				"COMMAND_INJECTION_PREVENTION",
				{
					argument: arg,
					index,
				},
			);
		}
		return arg;
	});
}

/**
 * Validates a complete process configuration for safe execution.
 */
export function validateProcessConfig(config: SafeProcessConfig): SafeProcessConfig {
	const validatedConfig: SafeProcessConfig = {
		command: validateCommand(config.command),
		args: validateCommandArgs(config.args),
	};

	if (config.cwd) {
		validatedConfig.cwd = sanitizePath(config.cwd);
	}

	if (config.timeout !== undefined) {
		if (typeof config.timeout !== "number" || config.timeout <= 0) {
			throw new ValidationError("Timeout must be a positive number", "TIMEOUT_VALIDATION");
		}
		validatedConfig.timeout = config.timeout;
	}

	if (config.env) {
		validatedConfig.env = validateEnvironmentVariables(config.env);
	}

	return validatedConfig;
}

// =============================================================================
// Network and Input Security
//=============================================================================

/**
 * Validates port numbers for network operations.
 */
export function validatePort(port: number): number {
	try {
		return PortNumberSchema.parse(port);
	} catch (error) {
		throw new ValidationError(
			`Invalid port number: ${error instanceof Error ? error.message : String(error)}`,
			"PORT_VALIDATION",
			{
				port,
			},
		);
	}
}

/**
 * Validates environment variables for safe usage.
 */
export function validateEnvironmentVariables(env: Record<string, string>): Record<string, string> {
	const validatedEnv: Record<string, string> = {};
	for (const [key, value] of Object.entries(env)) {
		if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
			throw new ValidationError(`Invalid environment variable name: ${key}`, "ENV_VAR_NAME_VALIDATION", { key });
		}
		if (typeof value !== "string") {
			throw new ValidationError(
				`Environment variable value must be a string: ${key}`,
				"ENV_VAR_VALUE_VALIDATION",
				{
					key,
					type: typeof value,
				},
			);
		}
		if (/[\0\n\r]/.test(value)) {
			throw new ValidationError(
				`Environment variable contains dangerous characters: ${key}`,
				"ENV_VAR_DANGEROUS_CHARS",
				{
					key,
				},
			);
		}
		validatedEnv[key] = value;
	}
	return validatedEnv;
}

/**
 * Generic input sanitization for user-provided strings.
 */
export function sanitizeUserInput(input: string, maxLength = 1000): string {
	if (typeof input !== "string") {
		return "";
	}
	const trimmed = input.trim().slice(0, maxLength);
	ensureNoNullBytes(trimmed);
	return trimmed;
}

/**
 * Ensures a string does not contain null bytes.
 */
function ensureNoNullBytes(text: string): void {
	if (text.includes("\0")) {
		throw new ValidationError("Input contains null bytes", "NULL_BYTE_DETECTED");
	}
}

/**
 * Sanitizes file content before writing to disk.
 */
export function sanitizeFileContent(content: string, maxSize = 1024 * 1024): string {
	if (typeof content !== "string") {
		throw new ValidationError("Content must be a string.", "CONTENT_VALIDATION");
	}
	ensureNoNullBytes(content);
	if (content.length > maxSize) {
		throw new ValidationError(`Content exceeds maximum size of ${maxSize} bytes`, "CONTENT_SIZE_EXCEEDED", {
			size: content.length,
			maxSize,
		});
	}
	return content;
}

/**
 * Performs a basic security audit on a string input.
 */
export function auditInput(input: string, _context: string): SecurityAuditResult {
	const errors: string[] = [];

	// 1. Script injection
	if (/<script\b[^>]*>[\s\S]*?<\/script\b[^>]*>/i.test(input)) {
		errors.push("Potential script injection detected.");
	}

	// 2. Path traversal
	if (/\.\.\//.test(input) || /\.\.\\/.test(input)) {
		errors.push("Path traversal characters detected.");
	}

	// 3. Shell metacharacters
	if (/[;&|`]/.test(input)) {
		errors.push("Shell metacharacters detected.");
	}

	// 4. javascript: protocol
	if (/javascript:/i.test(input)) {
		errors.push("Javascript protocol detected.");
	}

	return {
		isSecure: errors.length === 0,
		errors,
		warnings: [],
		sanitizedInput: input,
	};
}
