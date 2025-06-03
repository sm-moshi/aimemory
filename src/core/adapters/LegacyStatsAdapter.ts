import type { LegacyCacheStats } from "../../types/cache.js";
import type { CacheManager } from "../CacheManager.js";

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
