/**
 * Standardized Error Types for AI Memory Extension
 * Consolidates all error types for the Memory Bank system
 */

/**
 * Base Memory Bank error class for all Memory Bank operations.
 * Provides a structured way to handle errors with specific codes and context.
 */
export class MemoryBankError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly context?: Record<string, unknown>,
	) {
		super(message);
		this.name = "MemoryBankError";

		// Set prototype explicitly to ensure instanceof works correctly
		Object.setPrototypeOf(this, MemoryBankError.prototype);
	}
}

/**
 * Specific error types for different operation categories
 */
export class FileOperationError extends MemoryBankError {
	constructor(
		message: string,
		public readonly filePath: string,
		context?: Record<string, unknown>,
	) {
		super(message, "FILE_OPERATION_ERROR", { filePath, ...context });
		this.name = "FileOperationError";
	}
}

export class ValidationError extends MemoryBankError {
	constructor(
		message: string,
		public readonly validationType: string,
		context?: Record<string, unknown>,
	) {
		super(message, "VALIDATION_ERROR", { validationType, ...context });
		this.name = "ValidationError";
	}
}

export class CacheError extends MemoryBankError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, "CACHE_ERROR", context);
		this.name = "CacheError";
	}
}

// =============================================================================
// Error Type Guards
// =============================================================================

/**
 * Type guard to check if an error is a MemoryBankError
 */
export function isMemoryBankError(error: unknown): error is MemoryBankError {
	return error instanceof MemoryBankError;
}

/**
 * Type guard to check if an error is a FileOperationError
 */
export function isFileOperationError(error: unknown): error is FileOperationError {
	return error instanceof FileOperationError;
}

/**
 * Type guard to check if an error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
	return error instanceof ValidationError;
}
