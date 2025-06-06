/**
 * Metadata Module Barrel Exports
 *
 * Provides a single entry point for all metadata-related classes and utilities.
 */

// Core metadata management
export { MetadataIndexManager } from "./MetadataIndexManager.js";
export { MetadataSearchEngine } from "./MetadataSearchEngine.js";

// Utility functions
export * from "./indexUtils.js";

// Specialized utility modules
export * from "./metadataQueryUtils.js";

// Re-export types for convenience
export type {
	MetadataIndexEntry,
	MetadataFilter,
	SearchOptions,
	SearchResult,
	IndexStats,
	IndexRebuildResult,
	FileValidationResult,
	MetadataIndexConfig,
	IndexChangeEvent,
	IndexChangeListener,
	FileMetrics,
	DateRangeFilter,
} from "../types/index.js";
