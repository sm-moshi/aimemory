import type { Stats } from "node:fs";
import type { FileCache } from "../../types/cache.js";
import type { CacheManager } from "../CacheManager.js";

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
		// Create mock Stats object for updateCache method
		const mockStats: Stats = {
			mtimeMs: value.mtimeMs,
			size: value.content.length,
		} as Stats;

		this.cacheManager.updateCache(key, value.content, mockStats);
		this.keySet.add(key);
		return this;
	}

	get(key: string): FileCache | undefined {
		// Create mock Stats with current mtime for getCachedContent
		const mockStats: Stats = {
			mtimeMs: Date.now(), // Use current time to avoid invalidation
		} as Stats;

		const content = this.cacheManager.getCachedContent(key, mockStats);
		if (!content) return undefined;

		return {
			content,
			mtimeMs: Date.now(),
		};
	}

	has(key: string): boolean {
		// Check if cache has content for this key
		const mockStats: Stats = {
			mtimeMs: Date.now(),
		} as Stats;

		return this.cacheManager.getCachedContent(key, mockStats) !== null;
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
