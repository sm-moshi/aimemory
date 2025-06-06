/**
 * Metadata Search Engine
 *
 * Provides advanced search and filtering capabilities over the metadata index.
 * Supports text search, metadata filtering, sorting, and pagination.
 */

import type {
	MetadataFilter,
	MetadataIndexEntry,
	SearchOptions,
	SearchResult,
	ValidationStatus,
} from "../types/index.js";

import {
	applyMetadataFilters,
	applyTextSearch,
	calculateTagStats,
	calculateTypeStats,
	extractAllFileTypes,
	extractAllTags,
	findByTags,
	findByType,
	findByValidationStatus,
	findLargestFiles,
	findRecentlyUpdated,
	rankSearchResults,
	sortEntries,
} from "./metadataQueryUtils.js";

import type { MetadataIndexManager } from "./MetadataIndexManager.js";

/**
 * Advanced search and filtering engine for metadata
 */
export class MetadataSearchEngine {
	constructor(private readonly indexManager: MetadataIndexManager) {}

	/**
	 * Perform a comprehensive search with filtering, sorting, and pagination
	 */
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
				filteredEntries = sortEntries(
					filteredEntries,
					options.sortBy,
					options.sortOrder ?? "desc",
				);
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

		if (options.query !== undefined) {
			result.query = options.query;
		}

		return result;
	}

	/**
	 * Find entries by specific metadata field values
	 */
	async findByMetadata(filter: MetadataFilter): Promise<MetadataIndexEntry[]> {
		const allEntries = this.indexManager.getIndex();
		return applyMetadataFilters(allEntries, filter);
	}

	/**
	 * Find entries by tags (files must have ALL specified tags)
	 */
	async findByTags(tags: string[]): Promise<MetadataIndexEntry[]> {
		const allEntries = this.indexManager.getIndex();
		return findByTags(allEntries, tags);
	}

	/**
	 * Find entries by file type
	 */
	async findByType(type: string): Promise<MetadataIndexEntry[]> {
		const allEntries = this.indexManager.getIndex();
		return findByType(allEntries, type);
	}

	/**
	 * Find entries by validation status
	 */
	async findByValidationStatus(status: ValidationStatus): Promise<MetadataIndexEntry[]> {
		const allEntries = this.indexManager.getIndex();
		return findByValidationStatus(allEntries, status);
	}

	/**
	 * Find recently updated entries
	 */
	async findRecentlyUpdated(limit = 10): Promise<MetadataIndexEntry[]> {
		const allEntries = this.indexManager.getIndex();
		return findRecentlyUpdated(allEntries, limit);
	}

	/**
	 * Find largest files by size
	 */
	async findLargestFiles(limit = 10): Promise<MetadataIndexEntry[]> {
		const allEntries = this.indexManager.getIndex();
		return findLargestFiles(allEntries, limit);
	}

	/**
	 * Get all unique tags from the index
	 */
	async getAllTags(): Promise<string[]> {
		const allEntries = this.indexManager.getIndex();
		return extractAllTags(allEntries);
	}

	/**
	 * Get all unique file types from the index
	 */
	async getAllFileTypes(): Promise<string[]> {
		const allEntries = this.indexManager.getIndex();
		return extractAllFileTypes(allEntries);
	}

	/**
	 * Get tag usage statistics
	 */
	async getTagStats(): Promise<Record<string, number>> {
		const allEntries = this.indexManager.getIndex();
		return calculateTagStats(allEntries);
	}

	/**
	 * Get file type statistics
	 */
	async getTypeStats(): Promise<Record<string, number>> {
		const allEntries = this.indexManager.getIndex();
		return calculateTypeStats(allEntries);
	}

	/**
	 * Extract filter-only options from search options
	 */
	private extractFiltersFromOptions(options: SearchOptions): MetadataFilter {
		const filters: MetadataFilter = {};

		if (options.type !== undefined) filters.type = options.type;
		if (options.tags !== undefined) filters.tags = options.tags;
		if (options.validationStatus !== undefined)
			filters.validationStatus = options.validationStatus;
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
