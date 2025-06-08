/**
 * @file src/lib/types/system.ts
 * @description Consolidated system, configuration, and metadata types.
 *
 * This file combines types from the following legacy files:
 * - `src/types/system.ts` (Cache, DI, Resource Management)
 * - `src/types/config.ts` (Validation, Schemas, Cursor Config)
 * - `src/types/metadata.ts` (Metadata Indexing and Search)
 *
 * It provides a single source for all system-level type definitions.
 */

import { z } from "zod";
import type { DIContainer } from "../../core/di-container";
import { MemoryBankFileType } from "./core";

// =================================================================
// Section: System-Level Types (from src/types/system.ts)
// =================================================================

// ... (Content from src/types/system.ts)

/**
 * Enhanced cache statistics for monitoring file operations
 */
export interface CacheStats {
	hits: number;
	misses: number;
	evictions: number;
	totalFiles: number;
	hitRate: number;
	lastReset: Date;
	reloads: number;
	maxSize: number;
	currentSize: number;
}

/**
 * Cache entry with access tracking for LRU eviction
 */
export interface CacheEntry {
	content: string;
	mtimeMs: number;
	lastAccessed: number;
	accessCount: number;
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
	maxSize: number;
	maxAge: number;
	checkInterval: number;
	enabled: boolean;
	compressionEnabled?: boolean;
}

/**
 * Cache operation result
 */
export interface CacheOperation {
	success: boolean;
	key: string;
	hit: boolean;
	size?: number;
	error?: string;
}

/**
 * Cache eviction policy types
 */
export type CacheEvictionPolicy = "lru" | "lfu" | "fifo" | "ttl";

/**
 * Cache manager interface
 */
export interface CacheManager {
	get<T>(key: string): T | undefined;
	set<T>(key: string, value: T, ttl?: number): boolean;
	delete(key: string): boolean;
	clear(): void;
	getStats(): CacheStats;
	has(key: string): boolean;
	size(): number;
}

// Legacy compatibility types
export interface BasicCacheConfig {
	maxSize?: number;
	maxAge?: number;
	enableMetrics?: boolean;
}

export interface FileCache {
	content: string;
	mtimeMs: number;
}

export interface LegacyCacheStats {
	hits: number;
	misses: number;
	totalFiles: number;
	hitRate: number;
	lastReset: Date;
	reloads: number;
}

export interface CacheEntryDetailed {
	content: string;
	lastModified: number;
	accessCount: number;
	size: number;
	encoding?: BufferEncoding;
	checksum?: string;
}

/**
 * Factory function type for creating dependency instances
 */
export type DependencyFactory<T> = (container: DIContainer) => T;

/**
 * Registration entry for a dependency in the DI container
 */
export interface Registration<T> {
	factory: DependencyFactory<T>;
	singleton: boolean;
	instance?: T;
}

/**
 * Service registry for managing known service types
 */
export interface ServiceRegistry {
	[key: string]: unknown;
}

/**
 * Lifecycle hooks for dependency injection
 */
export interface DILifecycle {
	onBeforeCreate?: (key: string) => void;
	onAfterCreate?: <T>(key: string, instance: T) => void;
	onDispose?: <T>(key: string, instance: T) => void;
}

/**
 * Configuration options for the DI container
 */
export interface DIContainerConfig {
	enableLogging?: boolean;
	enableCircularDependencyDetection?: boolean;
	lifecycle?: DILifecycle;
}

/**
 * Resource usage statistics
 */
export interface ResourceStats {
	totalResources: number;
	activeResources: number;
	cleanedUpResources: number;
	lastCleanupAt: Date | null;
	avgResourceLifetime: number;
}

/**
 * Resource limits configuration
 */
export interface ResourceLimits {
	maxMemoryUsage: number;
	maxFileHandles: number;
	maxConcurrentOperations: number;
	maxCacheSize: number;
	operationTimeout: number;
}

/**
 * Resource allocation result
 */
export interface ResourceAllocation {
	success: boolean;
	resourceId: string;
	type: ResourceType;
	allocated: number;
	available: number;
	error?: string;
}

/**
 * Resource types
 */
export type ResourceType = "memory" | "file-handle" | "operation-slot" | "cache-space" | "network-connection";

/**
 * Resource cleanup configuration
 */
export interface ResourceCleanupConfig {
	interval: number;
	maxAge: number;
	forceCleanup: boolean;
	preserveCritical: boolean;
}

/**
 * Resource monitor interface
 */
export interface ResourceMonitor {
	getStats(): ResourceStats;
	checkLimits(): boolean;
	requestResource(type: ResourceType, amount: number): ResourceAllocation;
	releaseResource(resourceId: string): boolean;
	cleanup(): Promise<void>;
}

/**
 * Resource pool configuration
 */
export interface ResourcePoolConfig {
	initialSize: number;
	maxSize: number;
	growthFactor: number;
	shrinkThreshold: number;
	healthCheckInterval: number;
}

/**
 * Resource health status
 */
export interface ResourceHealth {
	status: "healthy" | "warning" | "critical";
	issues: string[];
	recommendations: string[];
	timestamp: number;
}

/**
 * Resource with lifecycle management
 */
export interface Resource {
	id: string;
	type: string;
	cleanup: () => Promise<void> | void;
	isActive: boolean;
	createdAt: Date;
	lastAccessed: Date;
}

/**
 * Configuration for resource manager behavior
 */
export interface ResourceManagerConfig {
	maxIdleTime?: number;
	cleanupInterval?: number;
	enableAutoCleanup?: boolean;
}

export interface ResourceInfo {
	id: string;
	type: string;
	isActive: boolean;
	ageMs: number;
	idleMs: number;
}

export interface ResourceCleanupEvent {
	resourceId: string;
	resourceType: string;
	cleanupDuration: number;
	success: boolean;
	error?: Error;
}

// =================================================================
// Section: Config & Validation Types (from src/types/config.ts)
// =================================================================

/**
 * Schema for validating MemoryBankFileType
 */
export const MemoryBankFileTypeSchema = z.enum(Object.values(MemoryBankFileType) as [string, ...string[]]);

/**
 * Schema for non-empty string validation
 */
export const NonEmptyStringSchema = z.string().min(1, "String cannot be empty");

/**
 * Schema for safe file path validation (prevents path traversal)
 */
export const SafePathSchema = z
	.string()
	.min(1, "Path cannot be empty")
	.refine(
		path => !path.includes("..") && !path.startsWith("/") && !path.includes("\0"),
		"Path contains unsafe characters or sequences",
	);

/**
 * Schema for optional content with size limits
 */
export const ContentSchema = z.string().max(1024 * 1024, "Content exceeds 1MB limit"); // 1MB limit

/**
 * Schema for init-memory-bank tool (no parameters)
 */
export const InitMemoryBankSchema = z.object({});

/**
 * Schema for read-memory-bank-files tool (no parameters)
 */
export const ReadMemoryBankFilesSchema = z.object({});

/**
 * Schema for update-memory-bank-file tool
 */
export const UpdateMemoryBankFileSchema = z.object({
	fileType: MemoryBankFileTypeSchema,
	content: ContentSchema,
});

/**
 * Schema for read-memory-bank-file tool
 */
export const ReadMemoryBankFileSchema = z.object({
	fileType: MemoryBankFileTypeSchema,
});

/**
 * Schema for list-memory-bank-files tool (no parameters)
 */
export const ListMemoryBankFilesSchema = z.object({});

/**
 * Schema for health-check-memory-bank tool (no parameters)
 */
export const HealthCheckMemoryBankSchema = z.object({});

/**
 * Schema for review-and-update-memory-bank tool (no parameters)
 */
export const ReviewAndUpdateMemoryBankSchema = z.object({});

/**
 * Schema for webview message types
 */
export const WebviewMessageTypeSchema = z.enum([
	"getFiles",
	"updateFile",
	"getServerStatus",
	"refreshStatus",
	"openFile",
	"error",
	"success",
]);

/**
 * Schema for webview message base structure
 */
export const WebviewMessageBaseSchema = z.object({
	type: WebviewMessageTypeSchema,
	id: z.string().optional(),
});

/**
 * Schema for webview file operation messages
 */
export const WebviewFileOperationSchema = WebviewMessageBaseSchema.extend({
	payload: z
		.object({
			fileType: MemoryBankFileTypeSchema.optional(),
			content: ContentSchema.optional(),
			path: SafePathSchema.optional(),
		})
		.optional(),
});

/**
 * Schema for command validation (prevents injection)
 */
export const SafeCommandSchema = z
	.string()
	.min(1, "Command cannot be empty")
	.refine(
		cmd => !cmd.includes(";") && !cmd.includes("|") && !cmd.includes("&") && !cmd.includes("`"),
		"Command contains potentially unsafe characters",
	)
	.refine(cmd => {
		// Check for dangerous commands
		const dangerous = ["rm -rf", "del /", "format", "dd if="];
		return !dangerous.some(danger => cmd.includes(danger));
	}, "Command contains dangerous operations");

/**
 * Schema for environment variable validation
 */
export const EnvironmentVariableSchema = z
	.string()
	.regex(/^[A-Z_][A-Z0-9_]*$/, "Invalid environment variable name format");

/**
 * Schema for port number validation
 */
export const PortNumberSchema = z
	.number()
	.int()
	.min(1, "Port must be greater than 0")
	.max(65535, "Port must be less than 65536");

/**
 * Validates and parses MCP tool parameters using the appropriate schema
 */
export function validateMCPToolParams<T>(toolName: string, params: unknown, schema: z.ZodSchema<T>): T {
	try {
		return schema.parse(params);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const issues = error.errors.map(err => `${err.path.join(".")}: ${err.message}`).join(", ");
			throw new Error(`Invalid parameters for ${toolName}: ${issues}`);
		}
		throw new Error(`Validation failed for ${toolName}: ${error}`);
	}
}

/**
 * Validates webview messages with comprehensive error handling
 */
export function validateWebviewMessage(message: unknown): z.infer<typeof WebviewFileOperationSchema> {
	try {
		return WebviewFileOperationSchema.parse(message);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const issues = error.errors.map(err => `${err.path.join(".")}: ${err.message}`).join(", ");
			throw new Error(`Invalid webview message: ${issues}`);
		}
		throw new Error(`Webview message validation failed: ${error}`);
	}
}

/**
 * Type guard for checking if a value is a valid file type
 */
export function isValidFileType(value: unknown): value is z.infer<typeof MemoryBankFileTypeSchema> {
	return MemoryBankFileTypeSchema.safeParse(value).success;
}

/**
 * Type guard for checking if a path is safe
 */
export function isSafePath(value: unknown): value is string {
	return SafePathSchema.safeParse(value).success;
}

export type ValidatedMCPParams = {
	initMemoryBank: z.infer<typeof InitMemoryBankSchema>;
	readMemoryBankFiles: z.infer<typeof ReadMemoryBankFilesSchema>;
	updateMemoryBankFile: z.infer<typeof UpdateMemoryBankFileSchema>;
	readMemoryBankFile: z.infer<typeof ReadMemoryBankFileSchema>;
	listMemoryBankFiles: z.infer<typeof ListMemoryBankFilesSchema>;
	healthCheckMemoryBank: z.infer<typeof HealthCheckMemoryBankSchema>;
	reviewAndUpdateMemoryBank: z.infer<typeof ReviewAndUpdateMemoryBankSchema>;
};

export type ValidatedWebviewMessage = z.infer<typeof WebviewFileOperationSchema>;

/**
 * Safe process execution configuration
 */
export interface SafeProcessConfig {
	command: string;
	args: string[];
	cwd?: string;
	timeout?: number;
	env?: Record<string, string>;
}

/**
 * Security audit result structure
 */
export interface SecurityAuditResult {
	isSecure: boolean;
	warnings: string[];
	errors: string[];
	sanitizedInput?: string;
}

/**
 * Generic validation result interface that replaces FileProcessingResult, ValidationSchemaResult,
 * and MetadataValidationResult Uses generics to provide type safety while eliminating duplication
 */
export interface ValidationResult<TData = unknown, TContext = Record<string, unknown>> {
	isValid: boolean;
	errors: string[];
	warnings?: string[];

	// Optional processed data (for file processing)
	data?: TData;

	// Context information (flexible for different use cases)
	context?: TContext;
}

// Type aliases for specific use cases (maintains clarity and backwards compatibility)
export type FileProcessingResult = ValidationResult<string, { processedContent?: string }>;
export type SchemaValidationResult = ValidationResult<unknown, { filePath: string; fileType?: MemoryBankFileType }>;

export interface CursorMCPServerConfig {
	name?: string;
	command: string;
	args?: string[];
	env?: Record<string, string>;
	cwd?: string;
	url?: string; // For URL-based servers
}

export interface CursorMCPConfig {
	mcpServers: Record<string, CursorMCPServerConfig>;
}

export interface ConfigComparisonResult {
	matches: boolean;
	differences?: string[];
}

export interface CursorRulesSettings {
	autoUpdate?: boolean;
	templatePath?: string;
	outputPath?: string;
	includeTimestamp?: boolean;
}

export interface ProcessEnvironment {
	nodeEnv?: "development" | "production" | "test";
	debug?: string;
	logLevel?: "error" | "warn" | "info" | "debug" | "trace";
	workspaceRoot?: string;
	[key: string]: string | undefined;
}

export interface ProcessOptions {
	cwd?: string;
	env?: ProcessEnvironment;
	timeout?: number;
	shell?: boolean;
	stdio?: "pipe" | "inherit" | "ignore";
}

export interface ProcessResult {
	exitCode: number;
	stdout: string;
	stderr: string;
	duration: number;
	signal?: NodeJS.Signals;
}

export interface ExtensionConfig {
	memoryBank: {
		enabled: boolean;
		autoInitialize: boolean;
		watchFiles: boolean;
		cacheEnabled: boolean;
	};
	logging: {
		level: "error" | "warn" | "info" | "debug";
		outputToFile: boolean;
		maxLogSize: number;
	};
	cursor: {
		autoUpdateMCP: boolean;
		rulesPath: string;
		mcpConfigPath: string;
	};
}

export interface RuntimeConfig {
	extensionPath: string;
	workspacePath: string;
	globalStoragePath: string;
	version: string;
	isDevelopment: boolean;
}

export interface ProcessSpawnConfig {
	serverPath: string;
	workspacePath: string;
	nodeExecutable: string;
	cwd: string;
	env?: Record<string, string>;
}

export interface ProcessEventHandlers {
	onError: (error: Error) => void;
	onExit: (code: number | null, signal: NodeJS.Signals | null) => void;
	onStderr?: (data: Buffer) => void;
}

export interface ValidationContext {
	filePath: string;
	fileType?: string;
	allowedRoot?: string;
	maxSize?: number;
	requiredFields?: string[];
}

export interface FileValidationOptions {
	checkSize?: boolean;
	maxSize?: number;
	allowedExtensions?: string[];
	requireExists?: boolean;
	checkReadable?: boolean;
	checkWritable?: boolean;
}

export interface PathValidationOptions {
	allowedRoot?: string;
	allowTraversal?: boolean;
	requireAbsolute?: boolean;
	allowSymlinks?: boolean;
}

export interface ValidationRule {
	name: string;
	message: string;
	validate: (value: unknown, context?: ValidationContext) => boolean;
}

export interface ValidatorConfig {
	strict?: boolean;
	allowUnknownFields?: boolean;
	coerceTypes?: boolean;
	rules?: ValidationRule[];
}

export interface FieldValidationError {
	field: string;
	message: string;
	value?: unknown;
	expectedType?: string;
}

export interface ValidationSummary {
	totalFields: number;
	validFields: number;
	invalidFields: number;
	fieldErrors: FieldValidationError[];
	overallValid: boolean;
}

// =================================================================
// Section: Metadata System Types (from src/types/metadata.ts)
// =================================================================

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
 * Metadata validation result using the unified ValidationResult pattern
 */
export type MetadataValidationResult = ValidationResult<
	unknown,
	{
		relativePath: string;
		validationStatus: ValidationStatus;
		schemaUsed: string;
		validationErrors?: import("zod").z.ZodIssue[];
	}
>;

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
