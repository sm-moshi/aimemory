/**
 * @file src/types/logging.ts
 * @description Defines the unified logging interfaces and types used throughout the AI Memory
 *   Extension. This ensures consistent, structured logging across all components, from the
 *   VS Code extension host to the MCP server.
 */

/**
 * Log levels for filtering and categorization.
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
 * Optional context for structured logging, allowing for detailed, queryable logs.
 */
export interface LogContext {
	component?: string;
	operation?: string;
	filePath?: string;
	duration?: number;
	[key: string]: unknown;
}

/**
 * Unified logger interface for all AI Memory Extension components.
 * This single interface is implemented by different logger classes (e.g., VSCodeLogger,
 * ConsoleLogger) to provide consistent logging behavior in different environments.
 */
export interface Logger {
	/**
	 * Log trace-level messages (most verbose).
	 */
	trace(message: string, context?: LogContext): void;

	/**
	 * Log debug-level messages for development.
	 */
	debug(message: string, context?: LogContext): void;

	/**
	 * Log informational messages.
	 */
	info(message: string, context?: LogContext): void;

	/**
	 * Log warning messages.
	 */
	warn(message: string, context?: LogContext): void;

	/**
	 * Log error messages.
	 */
	error(message: string, context?: LogContext): void;

	/**
	 * Set the minimum log level for the logger instance.
	 */
	setLevel(level: LogLevel): void;

	/**
	 * Show the output channel if available (VS Code specific).
	 */
	showOutput?(): void;
}

/**
 * Configuration for creating logger instances.
 */
export interface LoggerConfig {
	level?: LogLevel;
	enableTimestamps?: boolean;
	enableContext?: boolean;
	component?: string;
}
