/**
 * System Infrastructure Types and Interfaces
 * Contains types for caching, resource management, and dependency injection
 * Consolidated from cache.ts, resources.ts, and di.ts
 */

import type { DIContainer } from "../core/DIContainer.js";

// =============================================================================
// Cache Management Types
// =============================================================================

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
 * Enhanced cache statistics with eviction and size tracking
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
 * Configuration for cache manager behavior
 */
export interface CacheManagerConfig {
	maxSize?: number;
	maxAge?: number; // in milliseconds
	enableMetrics?: boolean;
}

/**
 * Basic file cache entry for legacy compatibility
 */
export interface FileCache {
	content: string;
	mtimeMs: number;
}

/**
 * Basic cache statistics for legacy compatibility
 * @deprecated Use CacheStats for enhanced functionality
 */
export interface BasicCacheStats {
	hits: number;
	misses: number;
	totalFiles: number;
	hitRate: number;
	lastReset: Date;
	reloads: number;
}

// =============================================================================
// Resource Management Types
// =============================================================================

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
	maxIdleTime?: number; // milliseconds before auto-cleanup
	cleanupInterval?: number; // milliseconds between cleanup cycles
	enableAutoCleanup?: boolean;
}

/**
 * Resource usage and cleanup statistics
 */
export interface ResourceStats {
	totalResources: number;
	activeResources: number;
	cleanedUpResources: number;
	lastCleanupAt: Date | null;
	avgResourceLifetime: number;
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

// =============================================================================
// Dependency Injection Types
// =============================================================================

/**
 * Factory function type for creating dependency instances
 * @template T - The type of the dependency to be created
 */
export type DependencyFactory<T> = (container: DIContainer) => T;

/**
 * Registration entry for a dependency in the DI container
 * @template T - The type of the dependency
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

// =============================================================================
// Streaming Management Types
// =============================================================================

/**
 * Progress callback for streaming operations
 */
export type StreamingProgressCallback = (bytesRead: number, totalBytes: number) => void;

/**
 * Configuration for streaming manager behavior
 */
export interface StreamingManagerConfig {
	sizeThreshold?: number; // bytes - files larger than this will be streamed
	chunkSize?: number; // bytes - size of each chunk when streaming
	timeout?: number; // milliseconds - timeout for streaming operations
	enableProgressCallbacks?: boolean;
}

/**
 * Options for individual streaming operations
 */
export interface StreamingOptions {
	onProgress?: StreamingProgressCallback;
	timeout?: number;
	chunkSize?: number;
	enableCancellation?: boolean;
	/**
	 * Security: Root directory for path validation - prevents path traversal attacks
	 * If provided, all file paths will be validated to ensure they remain within this root
	 */
	allowedRoot?: string;
}

/**
 * Enhanced result with streaming metadata
 */
export interface StreamingResult {
	content: string;
	wasStreamed: boolean;
	duration: number;
	bytesRead: number;
	chunksProcessed?: number;
}

/**
 * Statistics for streaming operations
 */
export interface StreamingStats {
	totalOperations: number;
	streamedOperations: number;
	totalBytesRead: number;
	avgStreamingTime: number;
	avgNormalReadTime: number;
	largestFileStreamed: number;
	lastReset: Date;
}

/**
 * Streaming operation metadata
 */
export interface StreamingMetadata {
	filePath: string;
	fileSize: number;
	strategy: "normal" | "streaming";
	startTime: number;
	endTime?: number;
	bytesProcessed?: number;
	chunksProcessed?: number;
}
