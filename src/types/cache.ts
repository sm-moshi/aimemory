/**
 * Cache System Types and Interfaces
 * Contains types for cache management, LRU eviction, and performance monitoring
 */

import type { Stats } from "node:fs";

// =============================================================================
// Cache Entry and Statistics
// =============================================================================

/**
 * Enhanced cache entry with access tracking for LRU
 */
export interface CacheEntry {
	content: string;
	mtimeMs: number;
	lastAccessed: number;
	accessCount: number;
}

/**
 * Comprehensive cache statistics with eviction tracking
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
 * Configuration for enhanced CacheManager with LRU eviction
 */
export interface CacheManagerConfig {
	maxSize?: number;
	maxAge?: number; // in milliseconds
	enableMetrics?: boolean;
}

// =============================================================================
// Legacy Cache Types (for backward compatibility)
// =============================================================================

/**
 * Simple file cache entry (legacy)
 * @deprecated Use CacheEntry instead for enhanced functionality
 */
export interface FileCache {
	content: string;
	mtimeMs: number;
}

/**
 * Basic cache statistics (legacy)
 * @deprecated Use CacheStats instead for comprehensive metrics
 */
export interface BasicCacheStats {
	hits: number;
	misses: number;
	totalFiles: number;
	hitRate: number;
	lastReset: Date;
	reloads: number;
}
