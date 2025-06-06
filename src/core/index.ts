/**
 * Cache system with legacy compatibility adapters
 *
 * Exports the modern CacheManager and legacy adapters that enable smooth transition
 * without breaking existing code.
 */

export { CacheManager, LegacyCacheAdapter, LegacyStatsAdapter } from "./Cache.js";
export { MemoryBankServiceCore } from "./memoryBankServiceCore.js";
export { FileOperationManager } from "./FileOperationManager.js";
