/**
 * @file src/core/metadata-search.ts
 * @description Provides an advanced search and filtering engine for metadata.
 *
 * This file contains the logic for the "read" side of the metadata system.
 * It uses a pre-built index to perform complex queries, filtering, sorting,
 * and relevance ranking.
 */

import { isDateInRange } from "../lib/helpers";
import type {
	MetadataFilter,
	MetadataIndexEntry,
	SearchOptions,
	SearchResult,
	SortField,
	SortOrder,
	ValidationStatus,
} from "../lib/types/system";
import type { MetadataIndexManager } from "./metadata-index";

// =================================================================
// Section: Search & Filtering Utilities
// =================================================================

/**
 * Check if an array contains all specified tags (case-insensitive)
 */
export function hasAllTags(fileTags: string[] | undefined, requiredTags: string[]): boolean {
	if (!fileTags || fileTags.length === 0) return requiredTags.length === 0;
	if (requiredTags.length === 0) return true;

	const fileTagsLower = fileTags.map(tag => tag.toLowerCase());
	const requiredTagsLower = requiredTags.map(tag => tag.toLowerCase());

	return requiredTagsLower.every(requiredTag => fileTagsLower.includes(requiredTag));
}

/**
 * Check if an array contains any of the specified tags (case-insensitive)
 */
export function hasAnyTags(fileTags: string[] | undefined, requiredTags: string[]): boolean {
	if (!fileTags || fileTags.length === 0) return false;
	if (requiredTags.length === 0) return true;

	const fileTagsLower = fileTags.map(tag => tag.toLowerCase());
	const requiredTagsLower = requiredTags.map(tag => tag.toLowerCase());

	return requiredTagsLower.some(requiredTag => fileTagsLower.includes(requiredTag));
}

/**
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
	if (filter.minSizeBytes && sizeBytes < filter.minSizeBytes) return false;
	if (filter.maxSizeBytes && sizeBytes > filter.maxSizeBytes) return false;
	return true;
}

/**
 * Filter by line count range
 */
function matchesLineCountRange(entry: MetadataIndexEntry, filter: MetadataFilter): boolean {
	const { lineCount } = entry.fileMetrics;
	if (filter.minLineCount && lineCount < filter.minLineCount) return false;
	if (filter.maxLineCount && lineCount > filter.maxLineCount) return false;
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
 * Find entries by file type
 */
export function findByType(entries: MetadataIndexEntry[], type: string): MetadataIndexEntry[] {
	return entries.filter(entry => matchesType(entry, type));
}

/**
 * Find entries by validation status
 */
export function findByValidationStatus(entries: MetadataIndexEntry[], status: ValidationStatus): MetadataIndexEntry[] {
	return entries.filter(entry => matchesValidationStatus(entry, status));
}

/**
 * Find recently updated entries
 */
export function findRecentlyUpdated(entries: MetadataIndexEntry[], limit = 10): MetadataIndexEntry[] {
	const sorted = sortEntries(entries, "updated", "desc");
	return sorted.slice(0, limit);
}

/**
 * Find largest files by size
 */
export function findLargestFiles(entries: MetadataIndexEntry[], limit = 10): MetadataIndexEntry[] {
	const sorted = sortEntries(entries, "size", "desc");
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
				tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
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
		typeCounts[type] = (typeCounts[type] ?? 0) + 1;
	}
	return typeCounts;
}

/**
 * Extract searchable text from a metadata index entry for ranking purposes.
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
 */
export function calculateRelevanceScore(query: string, searchableText: string): number {
	if (!query || !searchableText) return 0;
	const queryLower = query.toLowerCase().trim();
	const textLower = searchableText.toLowerCase();

	if (textLower.includes(queryLower)) {
		const position = textLower.indexOf(queryLower);
		const positionScore = 1 - position / textLower.length;
		return 0.8 + positionScore * 0.2;
	}

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
 */
export function rankSearchResults(query: string, entries: MetadataIndexEntry[]): MetadataIndexEntry[] {
	if (!query) return entries;
	const scored = entries.map(entry => ({
		entry,
		score: calculateRelevanceScore(query, extractSearchableTextForRanking(entry)),
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
	return [...entries].sort((a, b) => {
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
				return 0;
		}
		return sortOrder === "asc" ? comparison : -comparison;
	});
}

// =================================================================
// Section: MetadataSearchEngine Class
// =================================================================

/**
 * Advanced search and filtering engine for metadata.
 */
export class MetadataSearchEngine {
	constructor(private readonly indexManager: MetadataIndexManager) {}

	async search(options: SearchOptions = {}): Promise<SearchResult> {
		const allEntries = this.indexManager.getIndex();
		let filteredEntries = applyMetadataFilters(allEntries, options);

		if (options.query) {
			filteredEntries = applyTextSearch(filteredEntries, options.query);
		}

		const total = filteredEntries.length;

		if (options.sortBy) {
			if (options.sortBy === "relevance" && options.query) {
				filteredEntries = rankSearchResults(options.query, filteredEntries);
			} else {
				filteredEntries = sortEntries(filteredEntries, options.sortBy, options.sortOrder ?? "desc");
			}
		} else if (options.query) {
			filteredEntries = rankSearchResults(options.query, filteredEntries);
		} else {
			filteredEntries = sortEntries(filteredEntries, "updated", "desc");
		}

		const offset = options.offset ?? 0;
		const limit = options.limit ?? 50;
		const paginatedEntries = filteredEntries.slice(offset, offset + limit);
		const hasMore = offset + paginatedEntries.length < total;

		const filters = this.extractFiltersFromOptions(options);
		const filtersWithQuery = { ...filters } as MetadataFilter & { query?: string };
		if (options.query !== undefined) {
			filtersWithQuery.query = options.query;
		}

		const result: SearchResult = {
			results: paginatedEntries,
			total,
			hasMore,
			offset,
			limit,
			filters: filtersWithQuery,
		};
		if (options.query !== undefined) result.query = options.query;

		return result;
	}

	async findByMetadata(filter: MetadataFilter): Promise<MetadataIndexEntry[]> {
		const allEntries = this.indexManager.getIndex();
		return applyMetadataFilters(allEntries, filter);
	}

	async findByTags(tags: string[]): Promise<MetadataIndexEntry[]> {
		const allEntries = this.indexManager.getIndex();
		return findByTags(allEntries, tags);
	}

	async findByType(type: string): Promise<MetadataIndexEntry[]> {
		const allEntries = this.indexManager.getIndex();
		return findByType(allEntries, type);
	}

	async findByValidationStatus(status: ValidationStatus): Promise<MetadataIndexEntry[]> {
		const allEntries = this.indexManager.getIndex();
		return findByValidationStatus(allEntries, status);
	}

	async findRecentlyUpdated(limit = 10): Promise<MetadataIndexEntry[]> {
		const allEntries = this.indexManager.getIndex();
		return findRecentlyUpdated(allEntries, limit);
	}

	async findLargestFiles(limit = 10): Promise<MetadataIndexEntry[]> {
		const allEntries = this.indexManager.getIndex();
		return findLargestFiles(allEntries, limit);
	}

	async getAllTags(): Promise<string[]> {
		const allEntries = this.indexManager.getIndex();
		return extractAllTags(allEntries);
	}

	async getAllFileTypes(): Promise<string[]> {
		const allEntries = this.indexManager.getIndex();
		return extractAllFileTypes(allEntries);
	}

	async getTagStats(): Promise<Record<string, number>> {
		const allEntries = this.indexManager.getIndex();
		return calculateTagStats(allEntries);
	}

	async getTypeStats(): Promise<Record<string, number>> {
		const allEntries = this.indexManager.getIndex();
		return calculateTypeStats(allEntries);
	}

	private extractFiltersFromOptions(options: SearchOptions): MetadataFilter {
		const filters: MetadataFilter = {};
		if (options.type !== undefined) filters.type = options.type;
		if (options.tags !== undefined) filters.tags = options.tags;
		if (options.validationStatus !== undefined) filters.validationStatus = options.validationStatus;
		if (options.createdAfter !== undefined) filters.createdAfter = options.createdAfter;
		if (options.createdBefore !== undefined) filters.createdBefore = options.createdBefore;
		if (options.updatedAfter !== undefined) filters.updatedAfter = options.updatedAfter;
		if (options.updatedBefore !== undefined) filters.updatedBefore = options.updatedBefore;
		if (options.minSizeBytes !== undefined) filters.minSizeBytes = options.minSizeBytes;
		if (options.maxSizeBytes !== undefined) filters.maxSizeBytes = options.maxSizeBytes;
		if (options.minLineCount !== undefined) filters.minLineCount = options.minLineCount;
		if (options.maxLineCount !== undefined) filters.maxLineCount = options.maxLineCount;
		return filters;
	}
}
