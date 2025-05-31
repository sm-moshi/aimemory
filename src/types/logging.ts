/**
 * Logging-related Types and Interfaces
 */

/**
 * Logger interface for Memory Bank operations (from types.ts)
 * Provides standardized logging methods for Memory Bank components
 */
export interface MemoryBankLogger {
	info(message: string): void;
	error(message: string): void;
	warn(message: string): void;
	debug(message: string): void;
}
