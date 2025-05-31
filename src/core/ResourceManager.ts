import type { Resource, ResourceManagerConfig, ResourceStats } from "../types/system.js";
import type { MemoryBankLogger } from "../types/types.js";

/**
 * ResourceManager handles lifecycle management and cleanup of resources
 * such as file handles, timers, and other disposable objects.
 */
export class ResourceManager {
	private readonly resources: Map<string, Resource> = new Map();
	private readonly maxIdleTime: number;
	private readonly cleanupInterval: number;
	private readonly enableAutoCleanup: boolean;
	private cleanupTimer: NodeJS.Timeout | null = null;
	private isShuttingDown = false;

	private readonly stats: ResourceStats = {
		totalResources: 0,
		activeResources: 0,
		cleanedUpResources: 0,
		lastCleanupAt: null,
		avgResourceLifetime: 0,
	};

	constructor(
		private readonly logger: MemoryBankLogger,
		config?: ResourceManagerConfig,
	) {
		this.maxIdleTime = config?.maxIdleTime ?? 30 * 60 * 1000; // 30 minutes default
		this.cleanupInterval = config?.cleanupInterval ?? 5 * 60 * 1000; // 5 minutes default
		this.enableAutoCleanup = config?.enableAutoCleanup ?? true;

		if (this.enableAutoCleanup) {
			this.startAutoCleanup();
		}

		this.logger.debug(
			`ResourceManager initialized with maxIdleTime: ${this.maxIdleTime}ms, cleanupInterval: ${this.cleanupInterval}ms`,
		);
	}

	/**
	 * Register a resource for lifecycle management
	 */
	registerResource(id: string, type: string, cleanup: () => Promise<void> | void): void {
		if (this.isShuttingDown) {
			this.logger.warn(`Cannot register resource ${id} during shutdown`);
			return;
		}

		const resource: Resource = {
			id,
			type,
			cleanup,
			isActive: true,
			createdAt: new Date(),
			lastAccessed: new Date(),
		};

		// Clean up existing resource with same ID if it exists
		const existing = this.resources.get(id);
		if (existing) {
			this.logger.warn(`Resource ${id} already exists, cleaning up old instance`);
			this.cleanupResource(existing).catch((error) => {
				this.logger.error(`Error cleaning up existing resource ${id}: ${error}`);
			});
		}

		this.resources.set(id, resource);
		this.stats.totalResources++;
		this.stats.activeResources++;

		this.logger.debug(`Registered resource: ${id} (${type})`);
	}

	/**
	 * Update last accessed time for a resource
	 */
	touchResource(id: string): void {
		const resource = this.resources.get(id);
		if (resource?.isActive) {
			resource.lastAccessed = new Date();
		}
	}

	/**
	 * Manually cleanup a specific resource
	 */
	async cleanupResourceById(id: string): Promise<boolean> {
		const resource = this.resources.get(id);
		if (!resource) {
			this.logger.warn(`Resource ${id} not found for cleanup`);
			return false;
		}

		await this.cleanupResource(resource);
		this.resources.delete(id);
		return true;
	}

	/**
	 * Cleanup all idle resources (those not accessed recently)
	 */
	async cleanupIdleResources(): Promise<number> {
		const now = new Date();
		const idleResources: Resource[] = [];

		for (const resource of this.resources.values()) {
			if (
				resource.isActive &&
				now.getTime() - resource.lastAccessed.getTime() > this.maxIdleTime
			) {
				idleResources.push(resource);
			}
		}

		let cleanedCount = 0;
		for (const resource of idleResources) {
			try {
				await this.cleanupResource(resource);
				this.resources.delete(resource.id);
				cleanedCount++;
			} catch (error) {
				this.logger.error(`Error cleaning up idle resource ${resource.id}: ${error}`);
			}
		}

		if (cleanedCount > 0) {
			this.stats.lastCleanupAt = now;
			this.logger.debug(`Cleaned up ${cleanedCount} idle resources`);
		}

		return cleanedCount;
	}

	/**
	 * Cleanup all resources (typically called during shutdown)
	 */
	async cleanupAllResources(): Promise<void> {
		this.isShuttingDown = true;
		this.stopAutoCleanup();

		const allResources = Array.from(this.resources.values());
		this.logger.info(`Cleaning up ${allResources.length} resources during shutdown`);

		const cleanupPromises = allResources.map(async (resource) => {
			try {
				await this.cleanupResource(resource);
			} catch (error) {
				this.logger.error(
					`Error cleaning up resource ${resource.id} during shutdown: ${error}`,
				);
			}
		});

		await Promise.allSettled(cleanupPromises);
		this.resources.clear();
		this.stats.activeResources = 0;
		this.logger.info("All resources cleaned up");
	}

	/**
	 * Get resource statistics
	 */
	getStats(): ResourceStats {
		this.updateStats();
		return { ...this.stats };
	}

	/**
	 * Get detailed information about all resources
	 */
	getResourceInfo(): Array<{
		id: string;
		type: string;
		isActive: boolean;
		ageMs: number;
		idleMs: number;
	}> {
		const now = new Date();
		return Array.from(this.resources.values()).map((resource) => ({
			id: resource.id,
			type: resource.type,
			isActive: resource.isActive,
			ageMs: now.getTime() - resource.createdAt.getTime(),
			idleMs: now.getTime() - resource.lastAccessed.getTime(),
		}));
	}

	/**
	 * Force cleanup cycle (useful for testing or manual management)
	 */
	async forceCleanup(): Promise<number> {
		this.logger.debug("Force cleanup requested");
		return await this.cleanupIdleResources();
	}

	/**
	 * Private: Cleanup a single resource
	 */
	private async cleanupResource(resource: Resource): Promise<void> {
		if (!resource.isActive) {
			return; // Already cleaned up
		}

		resource.isActive = false;
		this.stats.activeResources--;
		this.stats.cleanedUpResources++;

		const startTime = Date.now();
		try {
			this.logger.debug(`Cleaning up resource: ${resource.id} (${resource.type})`);
			await resource.cleanup();
			const duration = Date.now() - startTime;
			this.logger.debug(`Successfully cleaned up resource ${resource.id} in ${duration}ms`);
		} catch (error) {
			const duration = Date.now() - startTime;
			this.logger.error(
				`Failed to cleanup resource ${resource.id} after ${duration}ms: ${error}`,
			);
			throw error;
		}
	}

	/**
	 * Private: Start automatic cleanup timer
	 */
	private startAutoCleanup(): void {
		if (this.cleanupTimer) {
			return; // Already started
		}

		this.cleanupTimer = setInterval(async () => {
			try {
				await this.cleanupIdleResources();
			} catch (error) {
				this.logger.error(`Error during automatic cleanup: ${error}`);
			}
		}, this.cleanupInterval);

		this.logger.debug("Automatic cleanup started");
	}

	/**
	 * Private: Stop automatic cleanup timer
	 */
	private stopAutoCleanup(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
			this.cleanupTimer = null;
			this.logger.debug("Automatic cleanup stopped");
		}
	}

	/**
	 * Private: Update calculated statistics
	 */
	private updateStats(): void {
		const now = new Date();
		let totalLifetime = 0;
		let resourceCount = 0;

		for (const resource of this.resources.values()) {
			if (!resource.isActive) {
				// Calculate lifetime for cleaned up resources
				totalLifetime += now.getTime() - resource.createdAt.getTime();
				resourceCount++;
			}
		}

		this.stats.avgResourceLifetime = resourceCount > 0 ? totalLifetime / resourceCount : 0;
	}
}
