/**
 * Cache system with legacy compatibility adapters
 *
 * Exports the modern CacheManager and legacy adapters that enable smooth transition
 * without breaking existing code.
 */

export { CacheManager, LegacyCacheAdapter, LegacyStatsAdapter } from "./cache";
export { MemoryBankManager } from "./memory-bank";
export { FileOperationManager } from "./file-operations";
