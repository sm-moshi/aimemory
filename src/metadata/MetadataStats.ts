/**
 * Metadata Statistics Utilities
 *
 * Pure functions for extracting statistics and insights from metadata entries.
 */

import type { MetadataIndexEntry } from "../types/core.js";

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
