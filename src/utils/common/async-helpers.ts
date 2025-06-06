/**
 * Asynchronous Utility Helpers
 */

/**
 * Creates a promise that resolves after a specified number of milliseconds.
 * @param ms - The number of milliseconds to wait before resolving the promise.
 * @returns A promise that resolves after the specified delay.
 */
export function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}
