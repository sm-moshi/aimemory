/**
 * Result Pattern for Type-Safe Error Handling
 * Based on Rust's Result<T, E> pattern for predictable error handling
 */

/**
 * Result pattern for safe error handling without exceptions
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

/**
 * Async version of Result pattern for Promise-returning functions
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// =============================================================================
// Type Guards for Runtime Type Checking
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

// =============================================================================
// Result Helper Functions
// =============================================================================

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
