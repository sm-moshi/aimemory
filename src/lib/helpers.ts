/**
 * @file src/lib/helpers.ts
 * @description A collection of pure, general-purpose helper functions.
 *
 * This file contains stateless utility functions for common tasks like string
 * manipulation, date handling, formatting, and asynchronous operations. These
 * helpers are designed to be reusable throughout the entire codebase.
 */

// =================================================================
// Section: Async & Error Handling Helpers
// =================================================================

/**
 * Pauses execution for a specified number of milliseconds.
 * @param ms The number of milliseconds to sleep.
 * @returns A promise that resolves after the specified duration.
 */
export function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extracts a consistent, human-readable error message from an unknown error type.
 * @param error The error object, which can be of any type.
 * @returns A string representing the error message.
 */
export function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * Formats an error message with a given context.
 * @param context A string describing the context where the error occurred.
 * @param error The error object.
 * @returns A formatted error string.
 */
export function formatErrorMessage(context: string, error: unknown): string {
	return `${context}: ${getErrorMessage(error)}`;
}

// =================================================================
// Section: Formatting Helpers
// =================================================================

/**
 * Formats a file size in bytes into a human-readable string (e.g., "1.23 KB").
 * Uses 1024 as the base for calculations (KB, MB, GB).
 * @param bytes The file size in bytes.
 * @returns A formatted string representing the file size.
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 B";

	const units = ["B", "KB", "MB", "GB", "TB"];
	let size = bytes;
	let unitIndex = 0;

	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}

	const precision = unitIndex > 0 ? 1 : 0;
	return `${size.toFixed(precision)} ${units[unitIndex]}`;
}

/**
 * An alias for `formatFileSize` for consistency with other formatting functions.
 * @param bytes The size in bytes.
 * @returns A formatted string.
 */
export function formatBytes(bytes: number): string {
	if (bytes < 0) return "Invalid size";
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const actualIndex = Math.max(0, Math.min(i, sizes.length - 1));
	return `${Number.parseFloat((bytes / k ** actualIndex).toFixed(2))} ${sizes[actualIndex]}`;
}

// =================================================================
// Section: String & Content Helpers
// =================================================================

/**
 * Counts the number of lines in a given string.
 * @param content The string content to analyze.
 * @returns The total number of lines.
 */
export function countLines(content: string): number {
	if (!content) return 0;
	return content.split("\n").length;
}

/**
 * Counts the number of words in a given string.
 * @param content The string content to analyze.
 * @returns The total number of words.
 */
export function countWords(content: string): number {
	if (!content) return 0;
	return content
		.trim()
		.split(/\s+/)
		.filter(word => word.length > 0).length;
}

// =================================================================
// Section: Date Helpers
// =================================================================

/**
 * Parses a flexible date string into a Date object.
 * Handles various common date formats like ISO strings and timestamps.
 * @param dateString The date string to parse.
 * @returns A `Date` object, or `null` if parsing fails.
 */
export function parseFlexibleDate(dateString: string): Date | null {
	if (!dateString) return null;

	try {
		const date = new Date(dateString);
		if (Number.isNaN(date.getTime())) {
			return null;
		}
		return date;
	} catch {
		return null;
	}
}

/**
 * Checks if a given date falls within a specified date range.
 * @param date The date string to check.
 * @param startDate The start of the range (optional).
 * @param endDate The end of the range (optional).
 * @returns `true` if the date is within the range, `false` otherwise.
 */
export function isDateInRange(date: string, startDate?: string, endDate?: string): boolean {
	const targetDate = parseFlexibleDate(date);
	if (!targetDate) return false;

	if (startDate) {
		const start = parseFlexibleDate(startDate);
		if (start && targetDate < start) return false;
	}

	if (endDate) {
		const end = parseFlexibleDate(endDate);
		if (end && targetDate > end) return false;
	}

	return true;
}

// =================================================================
// Section: General Programming Utilities
// =================================================================

/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was invoked.
 * @param func The function to debounce.
 * @param wait The number of milliseconds to delay.
 * @returns A new debounced function.
 */
export function debounce<T extends (...args: unknown[]) => void>(
	func: T,
	wait: number,
): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout | undefined;

	return (...args: Parameters<T>) => {
		const later = () => {
			timeout = undefined;
			func(...args);
		};

		if (timeout) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(later, wait);
	};
}

/**
 * Creates a deep clone of an object using JSON serialization.
 * Note: This will not preserve functions, `undefined`, or `Symbol` values.
 * @param obj The object to clone.
 * @returns A deep copy of the object.
 */
export function deepClone<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}
