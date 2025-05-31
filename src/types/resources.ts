/**
 * Resource Management Types and Interfaces
 * Contains types for resource lifecycle management, cleanup, and monitoring
 */

// =============================================================================
// Resource Lifecycle Management
// =============================================================================

/**
 * Represents a managed resource with cleanup capabilities
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
 * Configuration for ResourceManager behavior
 */
export interface ResourceManagerConfig {
	maxIdleTime?: number; // milliseconds before auto-cleanup
	cleanupInterval?: number; // milliseconds between cleanup cycles
	enableAutoCleanup?: boolean;
}

/**
 * Statistics for resource management and cleanup operations
 */
export interface ResourceStats {
	totalResources: number;
	activeResources: number;
	cleanedUpResources: number;
	lastCleanupAt: Date | null;
	avgResourceLifetime: number;
}

// =============================================================================
// Resource Information and Monitoring
// =============================================================================

/**
 * Detailed information about a specific resource
 */
export interface ResourceInfo {
	id: string;
	type: string;
	isActive: boolean;
	ageMs: number;
	idleMs: number;
}

/**
 * Resource cleanup event data
 */
export interface ResourceCleanupEvent {
	resourceId: string;
	resourceType: string;
	cleanupDuration: number;
	success: boolean;
	error?: Error;
}
