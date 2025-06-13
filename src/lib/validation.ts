/**
 * @file src/lib/validation.ts
 * @description Consolidated validation and security utilities.
 *
 * This file combines logic from the following legacy files:
 * - `src/utils/security.ts`
 * - `src/shared/validation/file-validation.ts`
 *
 * It provides a single, robust module for path validation, command validation,
 * input sanitization, and domain-specific memory bank file validation.
 */

import fs from "node:fs/promises";
import { isAbsolute, join, normalize, relative, resolve } from "node:path";
import { type FileOperationContext, MemoryBankFileType, ValidationError } from "./types/core";
import {
	PortNumberSchema,
	SafeCommandSchema,
	type SafeProcessConfig,
	type SchemaValidationResult,
	type SecurityAuditResult,
} from "./types/system";

// =================================================================
// Section: Path Security & Sanitization
// =================================================================

/**
 * Validates if a given path stays within an allowed root directory.
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
 * Validates memory bank paths using Zod schemas and enhanced sanitization.
 * Handles both relative and absolute paths correctly.
 */
export function validateMemoryBankPath(inputPath: string, memoryBankRoot: string): string {
	try {
		// Handle absolute paths by converting them to relative paths for validation
		let pathToValidate = inputPath;
		if (isAbsolute(inputPath)) {
			const resolvedRoot = resolve(memoryBankRoot);
			if (inputPath.startsWith(resolvedRoot)) {
				// Path is within the memory bank root, convert to relative
				pathToValidate = relative(resolvedRoot, inputPath);
				if (!pathToValidate) {
					// If relative path is empty, use "." for current directory
					pathToValidate = ".";
				}
			} else {
				// Absolute path outside memory bank root is invalid
				throw new ValidationError(`Absolute path outside memory bank root: ${inputPath}`, "PATH_OUTSIDE_ROOT", {
					path: inputPath,
					root: memoryBankRoot,
				});
			}
		}

		// Manual validation instead of SafePathSchema to avoid absolute path rejection
		if (!pathToValidate || typeof pathToValidate !== "string") {
			throw new ValidationError("Path must be a non-empty string", "PATH_VALIDATION");
		}

		if (pathToValidate.includes("..") || pathToValidate.includes("\0")) {
			throw new ValidationError("Path contains unsafe characters or sequences", "PATH_VALIDATION");
		}

		const sanitizedPath = sanitizePath(pathToValidate, memoryBankRoot);
		return join(resolve(memoryBankRoot), sanitizedPath);
	} catch (error) {
		if (error instanceof ValidationError) {
			throw error;
		}
		throw new ValidationError(
			`Invalid memory bank path: ${error instanceof Error ? error.message : String(error)}`,
			"MEMORY_BANK_PATH_VALIDATION",
			{ path: inputPath },
		);
	}
}

// =================================================================
// Section: Command Injection Prevention
// =================================================================

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

// =================================================================
// Section: Network, Input, and Content Security
// =================================================================

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
				{ key, type: typeof value },
			);
		}
		validatedEnv[key] = value;
	}
	return validatedEnv;
}

/**
 * Basic user input sanitization.
 */
export function sanitizeUserInput(input: string, maxLength = 1000): string {
	if (!input) return "";
	const trimmed = input.slice(0, maxLength);
	// Basic HTML tag stripping
	return trimmed.replace(/<[^>]*>?/gm, "");
}

/**
 * Ensures a string contains no null bytes.
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
	ensureNoNullBytes(content);

	if (content.length > maxSize) {
		throw new ValidationError(`Content exceeds max size of ${maxSize} bytes`, "CONTENT_SIZE_EXCEEDED", {
			size: content.length,
			maxSize,
		});
	}

	return content;
}

/**
 * Performs a security audit on an input string.
 */
export function auditInput(input: string, _context: string): SecurityAuditResult {
	const warnings: string[] = [];
	const errors: string[] = [];
	let sanitizedInput = input;

	if (input.includes("..")) {
		errors.push("Path traversal detected.");
	}

	if (/[<>&"']/.test(input)) {
		warnings.push("Potentially unescaped HTML/XML characters.");
		sanitizedInput = sanitizedInput
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}

	return {
		isSecure: errors.length === 0,
		warnings,
		errors,
		sanitizedInput,
	};
}

// =================================================================
// Section: Memory Bank File Validation (Domain-Specific)
// =================================================================

/**
 * Validates that the memory bank directory exists.
 */
export async function validateMemoryBankDirectory(context: FileOperationContext): Promise<boolean> {
	try {
		const stats = await fs.stat(context.memoryBankFolder);
		const isValid = stats.isDirectory();

		if (!isValid) {
			context.logger.error("Memory bank folder does not exist.");
		}

		return isValid;
	} catch {
		context.logger.error("Memory bank folder does not exist.");
		return false;
	}
}

/**
 * Validates a single memory bank file.
 */
export async function validateSingleFile(
	fileType: MemoryBankFileType,
	context: FileOperationContext,
): Promise<SchemaValidationResult> {
	const filePath = validateAndConstructKnownFilePath(context.memoryBankFolder, fileType);

	try {
		const stats = await fs.stat(filePath);

		if (!stats.isFile()) {
			context.logger.info(`Checked file: ${fileType} - Exists: false (not a file)`);
			return {
				isValid: false,
				errors: ["Not a file"],
				context: {
					filePath,
					fileType,
				},
			};
		}

		context.logger.info(`Checked file: ${fileType} - Exists: true`);
		return {
			isValid: true,
			errors: [],
			context: {
				filePath,
				fileType,
			},
		};
	} catch (error) {
		context.logger.info(`Checked file: ${fileType} - Exists: false`);
		return {
			isValid: false,
			errors: [error instanceof Error ? error.message : String(error)],
			context: {
				filePath,
				fileType,
			},
		};
	}
}

/**
 * Validates all memory bank files.
 */
export async function validateAllMemoryBankFiles(context: FileOperationContext): Promise<{
	missingFiles: MemoryBankFileType[];
	filesToInvalidate: string[];
	validationResults: SchemaValidationResult[];
}> {
	const allFileTypes = Object.values(MemoryBankFileType);
	const validationResults: SchemaValidationResult[] = [];
	const missingFiles: MemoryBankFileType[] = [];
	const filesToInvalidate: string[] = [];

	for (const fileType of allFileTypes) {
		const result = await validateSingleFile(fileType, context);
		validationResults.push(result);

		if (!result.isValid) {
			missingFiles.push(fileType);
			if (result.context?.filePath) {
				filesToInvalidate.push(result.context.filePath);
			}
		}
	}

	return { missingFiles, filesToInvalidate, validationResults };
}
