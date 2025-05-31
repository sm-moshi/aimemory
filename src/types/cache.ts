// =============================================================================
// Cache Management Types for AI Memory Extension
// =============================================================================

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
 * Cache entry with access tracking for LRU eviction (from system.ts)
 * This is used by FileOperationContext.
 */
export interface CacheEntry {
	content: string;
	mtimeMs: number;
	lastAccessed: number;
	accessCount: number;
}

/**
 * Basic Configuration for a cache manager (from system.ts)
 */
export interface BasicCacheConfig {
	maxSize?: number;
	maxAge?: number; // in milliseconds
	enableMetrics?: boolean;
}

/**
 * Basic file cache entry for legacy compatibility (from system.ts)
 */
export interface FileCache {
	content: string;
	mtimeMs: number;
}

/**
 * Legacy cache statistics interface for backward compatibility
 */
export interface LegacyCacheStats {
	hits: number;
	misses: number;
	totalFiles: number;
	hitRate: number;
	lastReset: Date;
	reloads: number;
}

/**
 * Detailed File cache entry with enhanced metadata
 */
export interface CacheEntryDetailed {
	content: string;
	lastModified: number;
	accessCount: number;
	size: number;
	encoding?: BufferEncoding;
	checksum?: string;
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
