/**
 * Standardized Error Types for AI Memory Extension
 */

/**
 * Custom error class for Memory Bank operations.
 * Provides a structured way to handle errors with specific codes and context.
 */
export class MemoryBankError extends Error {
	constructor(
		message: string,
		public code: string,
		public context?: Record<string, unknown>,
	) {
		super(message);
		this.name = "MemoryBankError";

		// Set prototype explicitly to ensure instanceof works correctly
		Object.setPrototypeOf(this, MemoryBankError.prototype);
	}
}
