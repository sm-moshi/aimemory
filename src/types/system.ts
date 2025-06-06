/**
 * System-Level Types for AI Memory Extension
 * Consolidated from cache.ts, resources.ts, and parts of config.ts
 */

import type { DIContainer } from "@/utils/system/di-container.js";

// =============================================================================
// Cache Types (from cache.ts)
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

// =============================================================================
// Resource Management Types (from resources.ts)
// =============================================================================

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
export type ResourceType =
	| "memory"
	| "file-handle"
	| "operation-slot"
	| "cache-space"
	| "network-connection";

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

/**
 * Resource information for monitoring
 */
export interface ResourceInfo {
	id: string;
	type: string;
	isActive: boolean;
	ageMs: number;
	idleMs: number;
}

/**
 * Resource cleanup event details
 */
export interface ResourceCleanupEvent {
	resourceId: string;
	resourceType: string;
	cleanupDuration: number;
	success: boolean;
	error?: Error;
}

// Process and system configuration types are now in config.ts to avoid duplication
