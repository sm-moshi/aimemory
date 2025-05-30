/**
 * Error Handling Utilities
 *
 * Standardized error handling patterns to eliminate code duplication
 * across the AI Memory extension codebase.
 */

/**
 * Safely extracts an error message from any error type
 * Handles both Error instances and unknown error types
 *
 * @param error - The error to extract a message from
 * @returns A safe string representation of the error message
 */
export function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * Creates a formatted error message with context
 *
 * @param context - Context describing what operation failed
 * @param error - The error that occurred
 * @returns A formatted error message
 */
export function formatErrorMessage(context: string, error: unknown): string {
	return `${context}: ${getErrorMessage(error)}`;
}

/**
 * VSCode-specific error display utility
 * Shows error message to user via VSCode's UI
 *
 * @param message - The error message to display
 * @param error - Optional error object for additional context
 */
export async function showVSCodeError(message: string, error?: unknown): Promise<void> {
	const { window } = await import("vscode");
	const fullMessage = error ? formatErrorMessage(message, error) : message;
	window.showErrorMessage(fullMessage);
}

/**
 * Console logging utility with consistent error formatting
 *
 * @param context - Context for the error
 * @param error - The error to log
 */
export function logError(context: string, error: unknown): void {
	console.error(formatErrorMessage(context, error));
}
