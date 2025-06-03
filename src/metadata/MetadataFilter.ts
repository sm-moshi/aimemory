/**
 * Metadata Filter Utilities
 *
 * Pure functions for applying various filters to metadata entries.
 * Breaks down complex filtering logic into smaller, testable functions.
 */

import type { MetadataFilter, MetadataIndexEntry, ValidationStatus } from "../types/core.js";
import { hasAllTags, hasAnyTags, isDateInRange } from "./indexUtils.js";

/**
 * Apply all filters from a MetadataFilter object to entries
 */
export function applyMetadataFilters(
	entries: MetadataIndexEntry[],
	filter: MetadataFilter,
): MetadataIndexEntry[] {
	return entries.filter((entry) => matchesAllCriteria(entry, filter));
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
function matchesType(entry: MetadataIndexEntry, type?: string): boolean {
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
function matchesValidationStatus(
	entry: MetadataIndexEntry,
	validationStatus?: ValidationStatus,
): boolean {
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
export function applyTextSearch(
	entries: MetadataIndexEntry[],
	query: string,
): MetadataIndexEntry[] {
	const queryLower = query.toLowerCase().trim();
	if (!queryLower) return entries;

	return entries.filter((entry) => {
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
