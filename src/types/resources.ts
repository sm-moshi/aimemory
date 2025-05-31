// =============================================================================
// Resource Management Types for AI Memory Extension
// =============================================================================

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
 * Resource with lifecycle management (from system.ts)
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
 * Configuration for resource manager behavior (from system.ts)
 */
export interface ResourceManagerConfig {
	maxIdleTime?: number; // milliseconds before auto-cleanup
	cleanupInterval?: number; // milliseconds between cleanup cycles
	enableAutoCleanup?: boolean;
}

/**
 * Resource information for monitoring (from system.ts)
 */
export interface ResourceInfo {
	id: string;
	type: string;
	isActive: boolean;
	ageMs: number;
	idleMs: number;
}

/**
 * Resource cleanup event details (from system.ts)
 */
export interface ResourceCleanupEvent {
	resourceId: string;
	resourceType: string;
	cleanupDuration: number;
	success: boolean;
	error?: Error;
}
