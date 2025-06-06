/**
 * Unified Logging System for AI Memory Extension
 *
 * Single interface that replaces MemoryBankLogger, BasicLogger, and custom logger interfaces.
 * Supports structured logging with optional context for better debugging.
 */

/**
 * Log levels for filtering and categorization
 */
export enum LogLevel {
	Trace = 0,
	Debug = 1,
	Info = 2,
	Warn = 3,
	Error = 4,
	Off = 5,
}

/**
 * Optional context for structured logging
 */
export interface LogContext {
	component?: string;
	operation?: string;
	filePath?: string;
	duration?: number;
	[key: string]: unknown;
}

/**
 * Unified logger interface for all AI Memory Extension components
 *
 * This single interface replaces:
 * - MemoryBankLogger
 * - BasicLogger
 * - Custom VS Code Logger interface
 */
export interface Logger {
	/**
	 * Log trace-level messages (most verbose)
	 */
	trace(message: string, context?: LogContext): void;

	/**
	 * Log debug-level messages for development
	 */
	debug(message: string, context?: LogContext): void;

	/**
	 * Log informational messages
	 */
	info(message: string, context?: LogContext): void;

	/**
	 * Log warning messages
	 */
	warn(message: string, context?: LogContext): void;

	/**
	 * Log error messages
	 */
	error(message: string, context?: LogContext): void;

	/**
	 * Set the minimum log level (optional - implementations may ignore)
	 */
	setLevel?(level: LogLevel): void;
}

/**
 * Configuration for logger implementations
 */
export interface LoggerConfig {
	level?: LogLevel;
	enableTimestamps?: boolean;
	enableContext?: boolean;
	component?: string;
}
