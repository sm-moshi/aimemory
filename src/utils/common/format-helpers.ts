/**
 * Formatting Utility Helpers
 */

/**
 * Formats bytes to a human-readable string (e.g., KB, MB, GB).
 * @param bytes - The number of bytes.
 * @returns A human-readable string representing the byte size.
 */
export function formatBytes(bytes: number): string {
	if (bytes < 0) return "Invalid size"; // Handle negative bytes
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB", "PB"]; // Added TB, PB
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	// Ensure index is within bounds and handles very small positive numbers
	const actualIndex = Math.max(0, Math.min(i, sizes.length - 1));

	return `${Number.parseFloat((bytes / k ** actualIndex).toFixed(2))} ${sizes[actualIndex]}`;
}
