/**
 * General Types and Legacy Compatibility
 * Contains miscellaneous types and backward compatibility re-exports
 * Most types have been moved to focused files - see types/index.ts
 */

// Re-export everything from the new focused type files for backward compatibility
export * from "./index.js";

// =============================================================================
// Legacy/Miscellaneous Types (to be moved to appropriate files)
// =============================================================================

/**
 * Logger interface for Memory Bank operations
 * Provides standardized logging methods for Memory Bank components
 */
export interface MemoryBankLogger {
	info(message: string): void;
	error(message: string): void;
	warn(message: string): void;
	debug(message: string): void;
}

/**
 * Configuration for spawning MCP server process
 */
export interface ProcessSpawnConfig {
	serverPath: string;
	workspacePath: string;
	nodeExecutable: string;
	cwd: string;
	env?: Record<string, string>;
}

/**
 * Process event handlers configuration
 */
export interface ProcessEventHandlers {
	onError: (error: Error) => void;
	onExit: (code: number | null, signal: NodeJS.Signals | null) => void;
	onStderr?: (data: Buffer) => void;
}

/**
 * Context for file operations in memory bank services
 */
export interface FileOperationContext {
	memoryBankFolder: string;
	logger: MemoryBankLogger;
	fileCache: Map<string, FileCache>;
	cacheStats: LegacyCacheStats;
}

/**
 * Result of file validation operation
 */
export interface FileValidationResult {
	isValid: boolean;
	filePath: string;
	fileType?: MemoryBankFileType;
	error?: string;
}

// Note: Import MemoryBankFileType and LegacyCacheStats from the new location
import type { FileCache, LegacyCacheStats, MemoryBankFileType } from "./index.js";
