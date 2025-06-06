/**
 * Metadata System Types
 * Contains types and interfaces specific to the metadata indexing and search system.
 */

/**
 * Validation status for metadata entries
 */
export type ValidationStatus = "valid" | "invalid" | "unchecked" | "schema_not_found";

/**
 * Sort field options for metadata searches
 */
export type SortField = "created" | "updated" | "title" | "size" | "lines" | "relevance";

/**
 * Sort order options
 */
export type SortOrder = "asc" | "desc";

/**
 * Date filter field options
 */
export type DateFilterField = "created" | "updated" | "lastIndexed";

/**
 * File metrics extracted during indexing
 */
export interface FileMetrics {
	/** Raw file size in bytes */
	sizeBytes: number;
	/** Human-readable file size (e.g., "2.4 KB", "1.2 MB") */
	sizeFormatted: string;
	/** Total lines in the file (including frontmatter) */
	lineCount: number;
	/** Lines in content only (excluding frontmatter) */
	contentLineCount: number;
	/** Word count in content */
	wordCount: number;
	/** Character count in content */
	characterCount: number;
}

/**
 * Core metadata index entry for a single file
 */
export interface MetadataIndexEntry {
	/** Path relative to memory bank root */
	relativePath: string;
	/** Unique ID from frontmatter (if present) */
	id?: string;
	/** File type from frontmatter or inferred */
	type?: string;
	/** Title from frontmatter */
	title?: string;
	/** Description from frontmatter */
	description?: string;
	/** Tags array from frontmatter */
	tags?: string[];
	/** Created timestamp (ISO string) */
	created: string;
	/** Last updated timestamp (ISO string) */
	updated: string;
	/** File size and line metrics */
	fileMetrics: FileMetrics;
	/** Validation status from schema validation */
	validationStatus: ValidationStatus;
	/** Validation errors if status is invalid */
	validationErrors?: import("zod").z.ZodIssue[];
	/** Schema used for validation */
	actualSchemaUsed?: string;
	/** When this entry was last indexed */
	lastIndexed: string;
}

/**
 * Filter options for metadata queries
 */
export interface MetadataFilter {
	/** Filter by file type */
	type?: string;
	/** Filter by tags (files must have ALL specified tags) */
	tags?: string[];
	/** Filter by validation status */
	validationStatus?: ValidationStatus;
	/** Filter files created after this date (ISO string) */
	createdAfter?: string;
	/** Filter files created before this date (ISO string) */
	createdBefore?: string;
	/** Filter files updated after this date (ISO string) */
	updatedAfter?: string;
	/** Filter files updated before this date (ISO string) */
	updatedBefore?: string;
	/** Filter by minimum file size in bytes */
	minSizeBytes?: number;
	/** Filter by maximum file size in bytes */
	maxSizeBytes?: number;
	/** Filter by minimum line count */
	minLineCount?: number;
	/** Filter by maximum line count */
	maxLineCount?: number;
}

/**
 * Search options extending metadata filters with text search and pagination
 */
export interface SearchOptions extends MetadataFilter {
	/** Text search query (searches in title, description, and relativePath) */
	query?: string;
	/** Maximum number of results to return */
	limit?: number;
	/** Number of results to skip (for pagination) */
	offset?: number;
	/** Sort by field */
	sortBy?: SortField;
	/** Sort order */
	sortOrder?: SortOrder;
}

/**
 * Search result with metadata and pagination info
 */
export interface SearchResult {
	/** Matching entries */
	results: MetadataIndexEntry[];
	/** Total number of matches (before pagination) */
	total: number;
	/** Whether there are more results available */
	hasMore: boolean;
	/** Current offset */
	offset: number;
	/** Current limit */
	limit: number;
	/** Search query used */
	query?: string;
	/** Filters applied */
	filters: MetadataFilter;
}

/**
 * Index statistics and health information
 */
export interface IndexStats {
	/** Total number of files in index */
	totalFiles: number;
	/** Number of valid files */
	validFiles: number;
	/** Number of invalid files */
	invalidFiles: number;
	/** Number of unchecked files */
	uncheckedFiles: number;
	/** Total size of all files in bytes */
	totalSizeBytes: number;
	/** Total line count across all files */
	totalLineCount: number;
	/** When the index was last built */
	lastBuildTime: string;
	/** How long the last build took (milliseconds) */
	lastBuildDuration: number;
	/** Most common file types */
	fileTypeCounts: Record<string, number>;
	/** Most common tags */
	tagCounts: Record<string, number>;
}

/**
 * Result of rebuilding the metadata index
 */
export interface IndexRebuildResult {
	/** Number of files processed */
	filesProcessed: number;
	/** Number of files successfully indexed */
	filesIndexed: number;
	/** Number of files that failed to index */
	filesErrored: number;
	/** Time taken to rebuild (milliseconds) */
	duration: number;
	/** Any errors encountered during rebuild */
	errors: Array<{
		relativePath: string;
		error: string;
	}>;
	/** Updated index statistics */
	stats: IndexStats;
}

/**
 * Validation result for a specific file
 */
export interface FileValidationResult {
	/** Path of the validated file */
	relativePath: string;
	/** Validation status */
	validationStatus: ValidationStatus;
	/** Validation errors if invalid */
	validationErrors?: import("zod").z.ZodIssue[];
	/** Schema used for validation */
	schemaUsed: string;
	/** Human-readable error message if invalid */
	errorMessage?: string;
}

/**
 * Date range filter helper
 */
export interface DateRangeFilter {
	/** Start date (ISO string) */
	startDate?: string;
	/** End date (ISO string) */
	endDate?: string;
	/** Field to filter on */
	field: DateFilterField;
}

/**
 * Configuration for the metadata index manager
 */
export interface MetadataIndexConfig {
	/** Path to the memory bank directory */
	memoryBankPath: string;
	/** Path to store the index file (relative to memory bank) */
	indexFilePath?: string;
	/** Whether to automatically rebuild index on file changes */
	autoRebuild?: boolean;
	/** Debounce time for auto-rebuild (milliseconds) */
	rebuildDebounceMs?: number;
	/** Maximum age of index before forced rebuild (milliseconds) */
	maxIndexAge?: number;
}

/**
 * Event types for index change notifications
 */
export type IndexChangeEvent =
	| { type: "entry_added"; entry: MetadataIndexEntry }
	| { type: "entry_updated"; entry: MetadataIndexEntry }
	| { type: "entry_removed"; relativePath: string }
	| { type: "index_rebuilt"; stats: IndexStats }
	| { type: "index_error"; error: string };

/**
 * Callback function for index change events
 */
export type IndexChangeListener = (event: IndexChangeEvent) => void;
