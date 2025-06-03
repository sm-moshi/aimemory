/**
 * Metadata Finder Utilities
 *
 * Pure functions for finding specific subsets of metadata entries.
 */

import type { MetadataIndexEntry, ValidationStatus } from "../types/core.js";
import { hasAllTags, sortEntries } from "./indexUtils.js";

/**
 * Find entries by tags (files must have ALL specified tags)
 */
export function findByTags(entries: MetadataIndexEntry[], tags: string[]): MetadataIndexEntry[] {
	return entries.filter((entry) => hasAllTags(entry.tags, tags));
}

/**
 * Find entries by file type
 */
export function findByType(entries: MetadataIndexEntry[], type: string): MetadataIndexEntry[] {
	return entries.filter((entry) => entry.type === type);
}

/**
 * Find entries by validation status
 */
export function findByValidationStatus(
	entries: MetadataIndexEntry[],
	status: ValidationStatus,
): MetadataIndexEntry[] {
	return entries.filter((entry) => entry.validationStatus === status);
}

/**
 * Find recently updated entries
 */
export function findRecentlyUpdated(
	entries: MetadataIndexEntry[],
	limit = 10,
): MetadataIndexEntry[] {
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
