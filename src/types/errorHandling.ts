/**
 * Error Handling and Result Pattern Types
 * Consolidated error handling for type-safe operations and domain-specific errors
 * Merged from result.ts and errors.ts
 */

// =============================================================================
// Result Pattern for Type-Safe Error Handling
// =============================================================================

/**
 * Result pattern for safe error handling without exceptions
 * Based on Rust's Result<T, E> pattern for predictable error handling
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

/**
 * Async version of Result pattern for Promise-returning functions
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// =============================================================================
// Result Pattern Type Guards and Utilities
// =============================================================================

/**
 * Type guard to check if a Result is successful
 */
export function isSuccess<T, E>(result: Result<T, E>): result is { success: true; data: T } {
	return result.success === true;
}

/**
 * Type guard to check if a Result is an error
 */
export function isError<T, E>(result: Result<T, E>): result is { success: false; error: E } {
	return result.success === false;
}

/**
 * Creates a successful Result
 */
export function success<T>(data: T): Result<T, never> {
	return { success: true, data };
}

/**
 * Creates an error Result
 */
export function error<E>(error: E): Result<never, E> {
	return { success: false, error };
}

/**
 * Wraps a function that might throw into a Result
 */
export function tryCatch<T>(fn: () => T): Result<T, Error> {
	try {
		const data = fn();
		return success(data);
	} catch (err) {
		return error(err instanceof Error ? err : new Error(String(err)));
	}
}

/**
 * Wraps an async function that might throw into an AsyncResult
 */
export async function tryCatchAsync<T>(fn: () => Promise<T>): AsyncResult<T, Error> {
	try {
		const data = await fn();
		return success(data);
	} catch (err) {
		return error(err instanceof Error ? err : new Error(String(err)));
	}
}

// =============================================================================
// Domain-Specific Error Classes
// =============================================================================

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
