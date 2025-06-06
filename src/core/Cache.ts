import type { Stats } from "node:fs";
import type { Logger } from "@/types/logging.js";
import type {
	CacheEntry,
	BasicCacheConfig as CacheManagerConfig,
	CacheStats,
	FileCache,
	LegacyCacheStats,
} from "@/types/system.js";
import { formatBytes } from "@utils/common/format-helpers.js";

/**
 * Enhanced CacheManager with LRU eviction, bounded capacity, and performance monitoring.
 * Implements proper resource management for file caching operations.
 */
export class CacheManager {
	private readonly maxSize: number;
	private readonly maxAge: number;
	private readonly enableMetrics: boolean;
	private readonly cache: Map<string, CacheEntry> = new Map();
	private readonly accessOrder: Set<string> = new Set(); // For LRU tracking

	private readonly stats: CacheStats = {
		hits: 0,
		misses: 0,
		evictions: 0,
		totalFiles: 0,
		hitRate: 0,
		lastReset: new Date(),
		reloads: 0,
		maxSize: 0,
		currentSize: 0,
	};

	constructor(
		private readonly logger: Logger,
		config?: CacheManagerConfig,
	) {
		this.maxSize = config?.maxSize ?? 100; // Default: 100 files
		this.maxAge = config?.maxAge ?? 60 * 60 * 1000; // Default: 1 hour
		this.enableMetrics = config?.enableMetrics ?? true;
		this.stats.maxSize = this.maxSize;

		this.logger.debug(
			`CacheManager initialized with maxSize: ${this.maxSize}, maxAge: ${this.maxAge}ms`,
		);
	}

	/**
	 * Gets cached content if available and up-to-date
	 */
	getCachedContent(filePath: string, stats: Stats): string | null {
		this.cleanupExpiredEntries();

		const cached = this.cache.get(filePath);
		if (!cached) {
			this.recordMiss();
			return null;
		}

		// Check if file has been modified
		if (cached.mtimeMs !== stats.mtimeMs) {
			this.cache.delete(filePath);
			this.accessOrder.delete(filePath);
			this.recordMiss();
			return null;
		}

		// Check if entry has expired
		if (this.isExpired(cached)) {
			this.cache.delete(filePath);
			this.accessOrder.delete(filePath);
			this.recordMiss();
			return null;
		}

		// Update access tracking for LRU
		this.updateAccess(filePath, cached);
		this.recordHit();

		this.logger.debug(`Cache hit for: ${filePath}`);
		return cached.content;
	}

	/**
	 * Updates cache with new content, managing capacity and LRU eviction
	 */
	updateCache(filePath: string, content: string, stats: Stats): void {
		const now = Date.now();
		const existing = this.cache.get(filePath);

		// Create new cache entry
		const entry: CacheEntry = {
			content,
			mtimeMs: stats.mtimeMs,
			lastAccessed: now,
			accessCount: existing ? existing.accessCount + 1 : 1,
		};

		// Check if we need to evict entries to make room
		if (!existing && this.cache.size >= this.maxSize) {
			this.evictLRU();
		}

		// Add/update entry
		this.cache.set(filePath, entry);
		this.updateAccess(filePath, entry);

		if (existing) {
			this.stats.reloads++;
			this.logger.debug(`Cache updated for: ${filePath}`);
		} else {
			this.stats.totalFiles++;
			this.logger.debug(`Cache added for: ${filePath}`);
		}

		this.updateStats();
	}

	/**
	 * Invalidates cache for specific file or all files
	 */
	invalidateCache(filePath?: string): void {
		if (filePath) {
			const deleted = this.cache.delete(filePath);
			this.accessOrder.delete(filePath);
			if (deleted) {
				this.stats.totalFiles--;
				this.logger.debug(`Cache invalidated for: ${filePath}`);
			}
		} else {
			const size = this.cache.size;
			this.cache.clear();
			this.accessOrder.clear();
			this.stats.totalFiles = 0;
			this.logger.debug(`All cache entries invalidated: ${size} entries removed`);
		}
		this.updateStats();
	}

	/**
	 * Gets current cache statistics
	 */
	getStats(): CacheStats {
		this.updateStats();
		return { ...this.stats };
	}

	/**
	 * Resets cache statistics
	 */
	resetStats(): void {
		this.stats.hits = 0;
		this.stats.misses = 0;
		this.stats.evictions = 0;
		this.stats.reloads = 0;
		this.stats.lastReset = new Date();
		this.updateStats();
		this.logger.debug("Cache statistics reset");
	}

	/**
	 * Cleanup expired entries (can be called periodically)
	 */
	cleanupExpiredEntries(): number {
		const now = Date.now();
		let removedCount = 0;

		for (const [filePath, entry] of this.cache.entries()) {
			if (this.isExpired(entry, now)) {
				this.cache.delete(filePath);
				this.accessOrder.delete(filePath);
				removedCount++;
			}
		}

		if (removedCount > 0) {
			this.stats.totalFiles -= removedCount;
			this.stats.evictions += removedCount;
			this.logger.debug(`Cleanup removed ${removedCount} expired cache entries`);
			this.updateStats();
		}

		return removedCount;
	}

	/**
	 * Get cache usage information
	 */
	getCacheUsage(): {
		size: number;
		maxSize: number;
		utilizationPercent: number;
		memoryEstimate: string;
	} {
		let totalBytes = 0;
		for (const entry of this.cache.values()) {
			totalBytes += Buffer.byteLength(entry.content, "utf8");
		}

		return {
			size: this.cache.size,
			maxSize: this.maxSize,
			utilizationPercent: (this.cache.size / this.maxSize) * 100,
			memoryEstimate: formatBytes(totalBytes),
		};
	}

	/**
	 * Private: Update access tracking for LRU
	 */
	private updateAccess(filePath: string, entry: CacheEntry): void {
		entry.lastAccessed = Date.now();
		entry.accessCount++;

		// Update LRU order
		this.accessOrder.delete(filePath);
		this.accessOrder.add(filePath);
	}

	/**
	 * Private: Evict least recently used entry
	 */
	private evictLRU(): void {
		if (this.accessOrder.size === 0) return;

		// Get the least recently used entry (first in Set)
		const lruKey = this.accessOrder.values().next().value;
		if (lruKey) {
			this.cache.delete(lruKey);
			this.accessOrder.delete(lruKey);
			this.stats.evictions++;
			this.stats.totalFiles--;
			this.logger.debug(`LRU evicted: ${lruKey}`);
		}
	}

	/**
	 * Private: Check if cache entry has expired
	 */
	private isExpired(entry: CacheEntry, now = Date.now()): boolean {
		return now - entry.lastAccessed > this.maxAge;
	}

	/**
	 * Private: Record cache hit
	 */
	private recordHit(): void {
		if (this.enableMetrics) {
			this.stats.hits++;
		}
	}

	/**
	 * Private: Record cache miss
	 */
	private recordMiss(): void {
		if (this.enableMetrics) {
			this.stats.misses++;
		}
	}

	/**
	 * Private: Update calculated statistics
	 */
	private updateStats(): void {
		this.stats.currentSize = this.cache.size;
		const total = this.stats.hits + this.stats.misses;
		this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
	}
}

// ============================================================================
// Legacy Compatibility Adapters
// ============================================================================

/**
 * Adapter classes for performance layer integration
 *
 * These adapters allow legacy cache interfaces to work with the modern CacheManager,
 * enabling a smooth transition without breaking existing code.
 */

/**
 * Adapter that implements Map<string, FileCache> interface but delegates to CacheManager
 * This allows legacy code to work with the modern cache system seamlessly
 *
 * Note: This is a bridge implementation that maintains backward compatibility
 * while the core system transitions to use CacheManager directly
 */
export class LegacyCacheAdapter implements Map<string, FileCache> {
	// Track keys for iteration support
	private readonly keySet = new Set<string>();

	constructor(private readonly cacheManager: CacheManager) {}

	set(key: string, value: FileCache): this {
		// Create adapter Stats object to bridge legacy interface to modern CacheManager
		const adapterStats: Stats = {
			mtimeMs: value.mtimeMs,
			size: value.content.length,
		} as Stats;

		this.cacheManager.updateCache(key, value.content, adapterStats);
		this.keySet.add(key);
		return this;
	}

	get(key: string): FileCache | undefined {
		// Create adapter Stats with current mtime for getCachedContent
		const adapterStats: Stats = {
			mtimeMs: Date.now(), // Use current time to avoid invalidation
		} as Stats;

		const content = this.cacheManager.getCachedContent(key, adapterStats);
		if (!content) return undefined;

		return {
			content,
			mtimeMs: Date.now(),
		};
	}

	has(key: string): boolean {
		// Check if cache has content for this key
		const adapterStats: Stats = {
			mtimeMs: Date.now(),
		} as Stats;

		return this.cacheManager.getCachedContent(key, adapterStats) !== null;
	}

	delete(key: string): boolean {
		this.cacheManager.invalidateCache(key);
		const wasDeleted = this.keySet.delete(key);
		return wasDeleted;
	}

	clear(): void {
		this.cacheManager.invalidateCache(); // Invalidate all
		this.keySet.clear();
	}

	get size(): number {
		return this.cacheManager.getStats().totalFiles;
	}

	keys(): IterableIterator<string> {
		return this.keySet[Symbol.iterator]();
	}

	values(): IterableIterator<FileCache> {
		const values: FileCache[] = [];
		for (const key of this.keySet) {
			const entry = this.get(key);
			if (entry) values.push(entry);
		}
		return values[Symbol.iterator]();
	}

	entries(): IterableIterator<[string, FileCache]> {
		const entries: [string, FileCache][] = [];
		for (const key of this.keySet) {
			const entry = this.get(key);
			if (entry) entries.push([key, entry]);
		}
		return entries[Symbol.iterator]();
	}

	[Symbol.iterator](): IterableIterator<[string, FileCache]> {
		return this.entries();
	}

	forEach(
		callbackfn: (value: FileCache, key: string, map: Map<string, FileCache>) => void,
		thisArg?: unknown,
	): void {
		for (const [key, value] of this.entries()) {
			callbackfn.call(thisArg, value, key, this);
		}
	}

	get [Symbol.toStringTag](): string {
		return "LegacyCacheAdapter";
	}
}

/**
 * Adapter that implements LegacyCacheStats interface but delegates to CacheManager.getStats()
 * This allows legacy code to work with the modern cache system seamlessly
 */
export class LegacyStatsAdapter implements LegacyCacheStats {
	constructor(private readonly cacheManager: CacheManager) {}

	get hits(): number {
		return this.cacheManager.getStats().hits;
	}

	get misses(): number {
		return this.cacheManager.getStats().misses;
	}

	get hitRate(): number {
		return this.cacheManager.getStats().hitRate;
	}

	get totalFiles(): number {
		return this.cacheManager.getStats().totalFiles;
	}

	get reloads(): number {
		return this.cacheManager.getStats().reloads;
	}

	get lastReset(): Date {
		return this.cacheManager.getStats().lastReset;
	}
}
