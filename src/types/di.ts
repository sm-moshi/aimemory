import type { DIContainer } from "../core/DIContainer.js";

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
