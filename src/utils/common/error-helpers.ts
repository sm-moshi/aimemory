/**
 * Generic Error Handling Utilities
 *
 * Pure error handling functions with no external dependencies.
 * These utilities can be used across any environment.
 */

import type { z } from "zod";

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
 * Console logging utility with consistent error formatting
 *
 * @param context - Context for the error
 * @param error - The error to log
 */
export function logError(context: string, error: unknown): void {
	console.error(formatErrorMessage(context, error));
}

/**
 * Formats Zod validation issues into a human-readable string.
 *
 * @param issues - An array of ZodIssue objects.
 * @returns A formatted string detailing the validation errors.
 */
export function formatZodError(issues: z.ZodIssue[]): string {
	if (!issues || issues.length === 0) {
		return "No validation errors.";
	}

	const errorMessages = issues.map(issue => {
		const path = issue.path.join(".");
		return path ? `${path}: ${issue.message}` : issue.message;
	});

	return `Validation Failed: ${errorMessages.join("; ")}`;
}
