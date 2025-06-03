/**
 * Adapter classes for performance layer integration
 *
 * These adapters allow legacy cache interfaces to work with the modern CacheManager,
 * enabling a smooth transition without breaking existing code.
 */

export { LegacyCacheAdapter } from "./LegacyCacheAdapter.js";
export { LegacyStatsAdapter } from "./LegacyStatsAdapter.js";
