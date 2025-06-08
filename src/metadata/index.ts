/**
 * Metadata Module Barrel Exports
 *
 * Provides a single entry point for all metadata-related classes and utilities.
 */

// Core metadata management
export { MetadataIndexManager } from "./MetadataIndexManager";
export { MetadataSearchEngine } from "./MetadataSearchEngine";

// Utility functions
export * from "./indexUtils";

// Specialized utility modules
export * from "./metadataQueryUtils";

// Re-export types for convenience
export type {
	MetadataIndexEntry,
	MetadataFilter,
	SearchOptions,
	SearchResult,
	IndexStats,
	IndexRebuildResult,
	MetadataFileValidationResult,
	MetadataIndexConfig,
	IndexChangeEvent,
	IndexChangeListener,
	FileMetrics,
	DateRangeFilter,
} from "../types/index";
