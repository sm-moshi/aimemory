import type { Stats } from "node:fs";
import type {
	CacheEntry,
	BasicCacheConfig as CacheManagerConfig,
	CacheStats,
} from "../types/cache.js";
import type { MemoryBankLogger } from "../types/logging.js";

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
		private readonly logger: MemoryBankLogger,
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
			memoryEstimate: this.formatBytes(totalBytes),
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

	/**
	 * Private: Format bytes to human readable string
	 */
	private formatBytes(bytes: number): string {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
	}
}
