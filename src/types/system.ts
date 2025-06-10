/**
 * @file src/types/system.ts
 * @description Defines types for cross-cutting system concerns, including caching, resource
 *   management, configuration, and metadata indexing.
 */

import type { DIContainer } from "../lib/di-container";

// --- Cache Management ---
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
export interface CacheEntry {
	content: string;
	mtimeMs: number;
	lastAccessed: number;
	accessCount: number;
}
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

// --- Dependency Injection ---
export type DependencyFactory<T> = (container: DIContainer) => T;
export interface Registration<T> {
	factory: DependencyFactory<T>;
	singleton: boolean;
	instance?: T;
}
export interface DIContainerConfig {
	enableLogging?: boolean;
	enableCircularDependencyDetection?: boolean;
}

// --- Resource Management ---
export interface ResourceStats {
	totalResources: number;
	activeResources: number;
	cleanedUpResources: number;
	lastCleanupAt: Date | null;
	avgResourceLifetime: number;
}
export type ResourceType = "memory" | "file-handle" | "operation-slot" | "cache-space" | "network-connection";
export interface ResourceManagerConfig {
	maxIdleTime?: number;
	cleanupInterval?: number;
	enableAutoCleanup?: boolean;
}

// --- Process & Config ---
export interface ExtensionConfig {
	memoryBank: {
		enabled: boolean;
		autoInitialize: boolean;
		watchFiles: boolean;
		cacheEnabled: boolean;
	};
	logging: {
		level: "error" | "warn" | "info" | "debug";
		outputToFile: boolean;
		maxLogSize: number;
	};
	cursor: {
		autoUpdateMCP: boolean;
		rulesPath: string;
		mcpConfigPath: string;
	};
}
export interface ProcessEventHandlers {
	onError: (error: Error) => void;
	onExit: (code: number | null, signal: NodeJS.Signals | null) => void;
	onStderr?: (data: Buffer) => void;
}
