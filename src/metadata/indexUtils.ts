/**
 * Metadata Index Utility Functions
 *
 * Pure utility functions for metadata operations, file metrics calculation,
 * and search functionality. No external dependencies or side effects.
 */

import type { FileMetrics, MetadataIndexEntry, SortField, SortOrder } from "../types/core.js";

/**
 * Count the number of lines in a text string
 */
export function countLines(content: string): number {
	if (!content) return 0;
	return content.split("\n").length;
}

/**
 * Count the number of words in a text string
 */
export function countWords(content: string): number {
	if (!content) return 0;
	return content
		.trim()
		.split(/\s+/)
		.filter((word) => word.length > 0).length;
}

/**
 * Format file size in bytes to human-readable string
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
 * Calculate comprehensive file metrics from content and file stats
 */
export function calculateFileMetrics(
	fullContent: string,
	contentOnly: string,
	fileSizeBytes: number,
): FileMetrics {
	return {
		sizeBytes: fileSizeBytes,
		sizeFormatted: formatFileSize(fileSizeBytes),
		lineCount: countLines(fullContent),
		contentLineCount: countLines(contentOnly),
		wordCount: countWords(contentOnly),
		characterCount: contentOnly.length,
	};
}

/**
 * Extract searchable text from a metadata index entry
 * Combines title, description, relativePath, and tags for text searching
 */
export function extractSearchableText(entry: MetadataIndexEntry): string {
	const parts: string[] = [];

	if (entry.title) parts.push(entry.title);
	if (entry.description) parts.push(entry.description);
	if (entry.relativePath) parts.push(entry.relativePath);
	if (entry.tags && entry.tags.length > 0) parts.push(entry.tags.join(" "));

	return parts.join(" ").toLowerCase();
}

/**
 * Parse a flexible date string into a Date object
 * Handles various date formats including ISO strings, timestamps, etc.
 */
export function parseFlexibleDate(dateString: string): Date | null {
	if (!dateString) return null;

	try {
		// Try parsing as ISO string first
		const date = new Date(dateString);

		// Check if the date is valid
		if (Number.isNaN(date.getTime())) {
			return null;
		}

		return date;
	} catch {
		return null;
	}
}

/**
 * Check if a date falls within a specified range
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

/**
 * Check if an array contains all specified tags (case-insensitive)
 */
export function hasAllTags(fileTags: string[] | undefined, requiredTags: string[]): boolean {
	if (!fileTags || fileTags.length === 0) return requiredTags.length === 0;
	if (requiredTags.length === 0) return true;

	const fileTagsLower = fileTags.map((tag) => tag.toLowerCase());
	const requiredTagsLower = requiredTags.map((tag) => tag.toLowerCase());

	return requiredTagsLower.every((requiredTag) => fileTagsLower.includes(requiredTag));
}

/**
 * Check if an array contains any of the specified tags (case-insensitive)
 */
export function hasAnyTags(fileTags: string[] | undefined, requiredTags: string[]): boolean {
	if (!fileTags || fileTags.length === 0) return false;
	if (requiredTags.length === 0) return true;

	const fileTagsLower = fileTags.map((tag) => tag.toLowerCase());
	const requiredTagsLower = requiredTags.map((tag) => tag.toLowerCase());

	return requiredTagsLower.some((requiredTag) => fileTagsLower.includes(requiredTag));
}

/**
 * Calculate text search relevance score between a query and searchable text
 * Returns a score from 0-1 where 1 is perfect match
 */
export function calculateRelevanceScore(query: string, searchableText: string): number {
	if (!query || !searchableText) return 0;

	const queryLower = query.toLowerCase().trim();
	const textLower = searchableText.toLowerCase();

	// Exact phrase match gets highest score
	if (textLower.includes(queryLower)) {
		const position = textLower.indexOf(queryLower);
		// Earlier matches get higher scores
		const positionScore = 1 - position / textLower.length;
		return 0.8 + positionScore * 0.2;
	}

	// Word-based matching
	const queryWords = queryLower.split(/\s+/).filter((word) => word.length > 0);
	const textWords = textLower.split(/\s+/).filter((word) => word.length > 0);

	if (queryWords.length === 0 || textWords.length === 0) return 0;

	let matchingWords = 0;
	for (const queryWord of queryWords) {
		for (const textWord of textWords) {
			if (textWord.includes(queryWord) || queryWord.includes(textWord)) {
				matchingWords++;
				break;
			}
		}
	}

	return (matchingWords / queryWords.length) * 0.6;
}

/**
 * Rank search results by relevance to the query
 * Sorts entries by relevance score in descending order
 */
export function rankSearchResults(
	query: string,
	entries: MetadataIndexEntry[],
): MetadataIndexEntry[] {
	if (!query) return entries;

	const scored = entries.map((entry) => ({
		entry,
		score: calculateRelevanceScore(query, extractSearchableText(entry)),
	}));

	const sortedScored = [...scored].sort((a, b) => b.score - a.score);
	return sortedScored.map((item) => item.entry);
}

/**
 * Sort entries by a specified field and order
 */
export function sortEntries(
	entries: MetadataIndexEntry[],
	sortBy: SortField,
	sortOrder: SortOrder = "desc",
): MetadataIndexEntry[] {
	const sorted = [...entries].sort((a, b) => {
		let comparison = 0;

		switch (sortBy) {
			case "created":
				comparison = new Date(a.created).getTime() - new Date(b.created).getTime();
				break;
			case "updated":
				comparison = new Date(a.updated).getTime() - new Date(b.updated).getTime();
				break;
			case "title":
				comparison = (a.title ?? a.relativePath).localeCompare(b.title ?? b.relativePath);
				break;
			case "size":
				comparison = a.fileMetrics.sizeBytes - b.fileMetrics.sizeBytes;
				break;
			case "lines":
				comparison = a.fileMetrics.lineCount - b.fileMetrics.lineCount;
				break;
			case "relevance":
				// For relevance, we can't sort without a query context
				// This case would be handled by rankSearchResults
				return 0;
		}

		return sortOrder === "asc" ? comparison : -comparison;
	});

	return sorted;
}

/**
 * Generate file type from file path if not provided in metadata
 */
export function inferFileType(relativePath: string): string {
	const fileName = relativePath.split("/").pop() ?? "";
	const extension = fileName.split(".").pop()?.toLowerCase();

	// Map common file patterns to types
	if (fileName.toLowerCase().includes("brief")) return "projectBrief";
	if (fileName.toLowerCase().includes("readme")) return "documentation";
	if (fileName.toLowerCase().includes("todo")) return "taskList";
	if (fileName.toLowerCase().includes("note")) return "note";
	if (fileName.toLowerCase().includes("research")) return "researchNote";

	// Fallback to extension-based inference
	switch (extension) {
		case "md":
		case "markdown":
			return "documentation";
		case "txt":
			return "note";
		case "json":
			return "configuration";
		default:
			return "unknown";
	}
}

/**
 * Debounce function for limiting rapid consecutive calls
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
 * Create a deep clone of an object (for safely modifying index entries)
 */
export function deepClone<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}
