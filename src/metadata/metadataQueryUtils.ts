/**
 * Metadata Filter Utilities
 *
 * Pure functions for applying various filters to metadata entries.
 * Breaks down complex filtering logic into smaller, testable functions.
 */

import type { MetadataFilter, MetadataIndexEntry, SortField, SortOrder, ValidationStatus } from "../types/index";
import { hasAllTags, hasAnyTags, isDateInRange } from "./indexUtils";

/**x
 * Apply all filters from a MetadataFilter object to entries
 */
export function applyMetadataFilters(entries: MetadataIndexEntry[], filter: MetadataFilter): MetadataIndexEntry[] {
	return entries.filter(entry => matchesAllCriteria(entry, filter));
}

/**
 * Check if an entry matches all filter criteria
 */
function matchesAllCriteria(entry: MetadataIndexEntry, filter: MetadataFilter): boolean {
	return (
		matchesType(entry, filter.type) &&
		matchesTags(entry, filter.tags) &&
		matchesValidationStatus(entry, filter.validationStatus) &&
		matchesDateRanges(entry, filter) &&
		matchesSizeRange(entry, filter) &&
		matchesLineCountRange(entry, filter)
	);
}

/**
 * Filter by file type
 */
export function matchesType(entry: MetadataIndexEntry, type?: string): boolean {
	return !type || entry.type === type;
}

/**
 * Filter by tags (entry must have ANY of the specified tags - OR logic)
 */
function matchesTags(entry: MetadataIndexEntry, tags?: string[]): boolean {
	return !tags || tags.length === 0 || hasAnyTags(entry.tags, tags);
}

/**
 * Filter by validation status
 */
export function matchesValidationStatus(entry: MetadataIndexEntry, validationStatus?: ValidationStatus): boolean {
	return !validationStatus || entry.validationStatus === validationStatus;
}

/**
 * Filter by date ranges (created and updated)
 */
function matchesDateRanges(entry: MetadataIndexEntry, filter: MetadataFilter): boolean {
	const matchesCreatedRange =
		!filter.createdAfter && !filter.createdBefore
			? true
			: isDateInRange(entry.created, filter.createdAfter, filter.createdBefore);

	const matchesUpdatedRange =
		!filter.updatedAfter && !filter.updatedBefore
			? true
			: isDateInRange(entry.updated, filter.updatedAfter, filter.updatedBefore);

	return matchesCreatedRange && matchesUpdatedRange;
}

/**
 * Filter by file size range
 */
function matchesSizeRange(entry: MetadataIndexEntry, filter: MetadataFilter): boolean {
	const { sizeBytes } = entry.fileMetrics;

	if (filter.minSizeBytes && sizeBytes < filter.minSizeBytes) {
		return false;
	}

	if (filter.maxSizeBytes && sizeBytes > filter.maxSizeBytes) {
		return false;
	}

	return true;
}

/**
 * Filter by line count range
 */
function matchesLineCountRange(entry: MetadataIndexEntry, filter: MetadataFilter): boolean {
	const { lineCount } = entry.fileMetrics;

	if (filter.minLineCount && lineCount < filter.minLineCount) {
		return false;
	}

	if (filter.maxLineCount && lineCount > filter.maxLineCount) {
		return false;
	}

	return true;
}

/**
 * Apply text search to entries
 */
export function applyTextSearch(entries: MetadataIndexEntry[], query: string): MetadataIndexEntry[] {
	const queryLower = query.toLowerCase().trim();
	if (!queryLower) return entries;

	return entries.filter(entry => {
		const searchableText = extractSearchableText(entry);
		return searchableText.includes(queryLower);
	});
}

/**
 * Extract searchable text from an entry
 */
function extractSearchableText(entry: MetadataIndexEntry): string {
	const parts: string[] = [];

	if (entry.title) parts.push(entry.title);
	if (entry.description) parts.push(entry.description);
	if (entry.relativePath) parts.push(entry.relativePath);
	if (entry.type) parts.push(entry.type);
	if (entry.tags && entry.tags.length > 0) parts.push(entry.tags.join(" "));

	return parts.join(" ").toLowerCase();
}

/**
 * Find entries by tags (files must have ALL specified tags)
 */
export function findByTags(entries: MetadataIndexEntry[], tags: string[]): MetadataIndexEntry[] {
	return entries.filter(entry => hasAllTags(entry.tags, tags));
}

/**
 * Find entries by file type (uses matchesType from this file)
 */
export function findByType(entries: MetadataIndexEntry[], type: string): MetadataIndexEntry[] {
	return entries.filter(entry => matchesType(entry, type));
}

/**
 * Find entries by validation status (uses matchesValidationStatus from this file)
 */
export function findByValidationStatus(entries: MetadataIndexEntry[], status: ValidationStatus): MetadataIndexEntry[] {
	return entries.filter(entry => matchesValidationStatus(entry, status));
}

/**
 * Find recently updated entries
 */
export function findRecentlyUpdated(entries: MetadataIndexEntry[], limit = 10): MetadataIndexEntry[] {
	const sorted = sortEntries(entries, "updated", "desc"); // sortEntries comes from indexUtils.ts
	return sorted.slice(0, limit);
}

/**
 * Find largest files by size
 */
export function findLargestFiles(entries: MetadataIndexEntry[], limit = 10): MetadataIndexEntry[] {
	const sorted = sortEntries(entries, "size", "desc"); // sortEntries comes from indexUtils.ts
	return sorted.slice(0, limit);
}

/**
 * Get all unique tags from entries, sorted alphabetically
 */
export function extractAllTags(entries: MetadataIndexEntry[]): string[] {
	const tagSet = new Set<string>();

	for (const entry of entries) {
		if (entry.tags) {
			for (const tag of entry.tags) {
				tagSet.add(tag);
			}
		}
	}

	return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
}

/**
 * Get all unique file types from entries, sorted alphabetically
 */
export function extractAllFileTypes(entries: MetadataIndexEntry[]): string[] {
	const typeSet = new Set<string>();

	for (const entry of entries) {
		if (entry.type) {
			typeSet.add(entry.type);
		}
	}

	return Array.from(typeSet).sort((a, b) => a.localeCompare(b));
}

/**
 * Get tag usage statistics
 */
export function calculateTagStats(entries: MetadataIndexEntry[]): Record<string, number> {
	const tagCounts: Record<string, number> = {};

	for (const entry of entries) {
		if (entry.tags) {
			for (const tag of entry.tags) {
				tagCounts[tag] = (tagCounts[tag] || 0) + 1;
			}
		}
	}

	return tagCounts;
}

/**
 * Get file type statistics
 */
export function calculateTypeStats(entries: MetadataIndexEntry[]): Record<string, number> {
	const typeCounts: Record<string, number> = {};

	for (const entry of entries) {
		const type = entry.type ?? "unknown";
		typeCounts[type] = (typeCounts[type] || 0) + 1;
	}

	return typeCounts;
}

/**
 * Extract searchable text from a metadata index entry for ranking purposes.
 * Combines title, description, relativePath, and tags for text searching.
 * This version does NOT include entry.type.
 */
export function extractSearchableTextForRanking(entry: MetadataIndexEntry): string {
	const parts: string[] = [];

	if (entry.title) parts.push(entry.title);
	if (entry.description) parts.push(entry.description);
	if (entry.relativePath) parts.push(entry.relativePath);
	if (entry.tags && entry.tags.length > 0) parts.push(entry.tags.join(" "));

	return parts.join(" ").toLowerCase();
}

/**
 * Calculate text search relevance score between a query and searchable text.
 * Returns a score from 0-1 where 1 is perfect match.
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
	const queryWords = queryLower.split(/\s+/).filter(word => word.length > 0);
	const textWords = textLower.split(/\s+/).filter(word => word.length > 0);

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
 * Rank search results by relevance to the query.
 * Sorts entries by relevance score in descending order.
 */
export function rankSearchResults(query: string, entries: MetadataIndexEntry[]): MetadataIndexEntry[] {
	if (!query) return entries;

	const scored = entries.map(entry => ({
		entry,
		score: calculateRelevanceScore(query, extractSearchableTextForRanking(entry)), // Updated to use renamed function
	}));

	const sortedScored = [...scored].sort((a, b) => b.score - a.score);
	return sortedScored.map(item => item.entry);
}

/**
 * Sort entries by a specified field and order.
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
