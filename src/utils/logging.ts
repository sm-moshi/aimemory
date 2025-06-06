/**
 * Centralized Logging Factory and Implementations
 *
 * This file replaces:
 * - src/utils/common/generic-logger.ts (entire file)
 * - MemoryBankLoggerFactory
 * - StderrLogger and ConsoleCompatibleLogger classes
 * - Scattered logger creation logic
 */

import { LogLevel } from "@/types/logging.js";
import type { LogContext, Logger, LoggerConfig } from "@/types/logging.js";

/**
 * Environment detection for automatic logger selection
 */
const isVSCodeExtension = () => {
	try {
		// Check if we're running in VS Code extension context
		return typeof globalThis !== "undefined" && "vscode" in globalThis;
	} catch {
		return false;
	}
};

const isTestEnvironment = () => {
	return process.env.NODE_ENV === "test" || process.env.VITEST === "true";
};

/**
 * Console-based logger implementation for Node.js environments
 */
class ConsoleLogger implements Logger {
	private level: LogLevel;
	private readonly enableTimestamps: boolean;
	private readonly enableContext: boolean;
	private readonly component?: string;

	constructor(config: LoggerConfig = {}) {
		this.level = config.level ?? LogLevel.Info;
		this.enableTimestamps = config.enableTimestamps ?? true;
		this.enableContext = config.enableContext ?? true;
		this.component = config.component;
	}

	private shouldLog(level: LogLevel): boolean {
		return level >= this.level && this.level !== LogLevel.Off;
	}

	private formatMessage(level: string, message: string, context?: LogContext): string {
		const parts: string[] = [];

		if (this.enableTimestamps) {
			parts.push(new Date().toISOString());
		}

		parts.push(`[${level.toUpperCase()}]`);

		if (this.component) {
			parts.push(`[${this.component}]`);
		}

		if (context?.component && context.component !== this.component) {
			parts.push(`[${context.component}]`);
		}

		parts.push(message);

		if (this.enableContext && context) {
			const contextStr = this.formatContext(context);
			if (contextStr) {
				parts.push(contextStr);
			}
		}

		return parts.join(" ");
	}

	private formatContext(context: LogContext): string {
		const filtered = { ...context };
		// TODO: Avoid the delete operator as it can impact the performance.
		delete filtered.component; // Already shown in format

		const contextPairs = Object.entries(filtered)
			.filter(([_, value]) => value !== undefined)
			.map(([key, value]) => `${key}=${JSON.stringify(value)}`);

		return contextPairs.length > 0 ? `{${contextPairs.join(", ")}}` : "";
	}

	private writeToStderr(level: string, message: string, context?: LogContext): void {
		const formatted = this.formatMessage(level, message, context);
		process.stderr.write(`${formatted}\n`);
	}

	trace(message: string, context?: LogContext): void {
		if (this.shouldLog(LogLevel.Trace)) {
			this.writeToStderr("TRACE", message, context);
		}
	}

	debug(message: string, context?: LogContext): void {
		if (this.shouldLog(LogLevel.Debug)) {
			this.writeToStderr("DEBUG", message, context);
		}
	}

	info(message: string, context?: LogContext): void {
		if (this.shouldLog(LogLevel.Info)) {
			this.writeToStderr("INFO", message, context);
		}
	}

	warn(message: string, context?: LogContext): void {
		if (this.shouldLog(LogLevel.Warn)) {
			this.writeToStderr("WARN", message, context);
		}
	}

	error(message: string, context?: LogContext): void {
		if (this.shouldLog(LogLevel.Error)) {
			this.writeToStderr("ERROR", message, context);
		}
	}

	setLevel(level: LogLevel): void {
		this.level = level;
	}
}

/**
 * Test logger that captures logs for assertions
 */
class TestLogger implements Logger {
	public logs: Array<{ level: string; message: string; context?: LogContext }> = [];

	trace(message: string, context?: LogContext): void {
		this.logs.push({ level: "TRACE", message, context });
	}

	debug(message: string, context?: LogContext): void {
		this.logs.push({ level: "DEBUG", message, context });
	}

	info(message: string, context?: LogContext): void {
		this.logs.push({ level: "INFO", message, context });
	}

	warn(message: string, context?: LogContext): void {
		this.logs.push({ level: "WARN", message, context });
	}

	error(message: string, context?: LogContext): void {
		this.logs.push({ level: "ERROR", message, context });
	}

	setLevel(_level: LogLevel): void {
		// Test logger accepts all levels
	}

	clear(): void {
		this.logs = [];
	}
}

/**
 * No-op logger for production or when logging is disabled
 */
class NullLogger implements Logger {
	trace(_message: string, _context?: LogContext): void {}
	debug(_message: string, _context?: LogContext): void {}
	info(_message: string, _context?: LogContext): void {}
	warn(_message: string, _context?: LogContext): void {}
	error(_message: string, _context?: LogContext): void {}
	setLevel(_level: LogLevel): void {}
}

/**
 * VS Code-specific logger using output channel
 * This will be initialized lazily when VS Code API is available
 */
class VSCodeLogger implements Logger {
	private outputChannel: { appendLine: (text: string) => void; show: () => void } | null = null;
	private level: LogLevel;
	private readonly component?: string;

	constructor(config: LoggerConfig = {}) {
		this.level = config.level ?? LogLevel.Info;
		this.component = config.component;
		this.initializeOutputChannel();
	}

	private async initializeOutputChannel(): Promise<void> {
		try {
			const vscode = await import("vscode");
			this.outputChannel = vscode.window.createOutputChannel("AI Memory");
		} catch {
			// Fallback to console if VS Code API not available
			console.warn("VS Code API not available, falling back to console logging");
		}
	}

	private shouldLog(level: LogLevel): boolean {
		return level >= this.level && this.level !== LogLevel.Off;
	}

	private formatMessage(level: string, message: string, context?: LogContext): string {
		const timestamp = new Date().toISOString();
		const component = context?.component ?? this.component;
		const prefix = component ? `[${component}]` : "";

		let formatted = `${timestamp} - ${level.toUpperCase()} ${prefix} ${message}`;

		if (context) {
			const filtered = { ...context };
			// TODO: Avoid the delete operator as it can impact the performance.
			delete filtered.component;
			const contextStr = Object.entries(filtered)
				.filter(([_, value]) => value !== undefined)
				.map(([key, value]) => `${key}=${JSON.stringify(value)}`)
				.join(", ");

			if (contextStr) {
				formatted += ` {${contextStr}}`;
			}
		}

		return formatted;
	}

	private log(level: LogLevel, levelName: string, message: string, context?: LogContext): void {
		if (!this.shouldLog(level)) return;

		const formatted = this.formatMessage(levelName, message, context);

		if (this.outputChannel) {
			this.outputChannel.appendLine(formatted);
		} else {
			// Fallback to stderr if output channel not available
			process.stderr.write(`${formatted}\n`);
		}
	}

	trace(message: string, context?: LogContext): void {
		this.log(LogLevel.Trace, "TRACE", message, context);
	}

	debug(message: string, context?: LogContext): void {
		this.log(LogLevel.Debug, "DEBUG", message, context);
	}

	info(message: string, context?: LogContext): void {
		this.log(LogLevel.Info, "INFO", message, context);
	}

	warn(message: string, context?: LogContext): void {
		this.log(LogLevel.Warn, "WARN", message, context);
	}

	error(message: string, context?: LogContext): void {
		this.log(LogLevel.Error, "ERROR", message, context);
	}

	setLevel(level: LogLevel): void {
		this.level = level;
	}

	/**
	 * VS Code specific method to show the output channel
	 */
	showOutput(): void {
		if (this.outputChannel) {
			this.outputChannel.show();
		}
	}
}

/**
 * Centralized Logger Factory
 *
 * Replaces:
 * - MemoryBankLoggerFactory
 * - createStderrLogger function
 * - All scattered logger creation logic
 */
export class LoggerFactory {
	/**
	 * Create a logger with automatic environment detection
	 */
	static create(config: LoggerConfig = {}): Logger {
		if (isTestEnvironment()) {
			return LoggerFactory.createTestLogger(config);
		}

		if (isVSCodeExtension()) {
			return LoggerFactory.createVSCodeLogger(config);
		}

		return LoggerFactory.createConsoleLogger(config);
	}

	/**
	 * Create a console-based logger for Node.js environments
	 */
	static createConsoleLogger(config: LoggerConfig = {}): Logger {
		return new ConsoleLogger(config);
	}

	/**
	 * Create a VS Code output channel logger
	 */
	static createVSCodeLogger(config: LoggerConfig = {}): Logger {
		return new VSCodeLogger(config);
	}

	/**
	 * Create a test logger that captures logs for assertions
	 */
	static createTestLogger(_config: LoggerConfig = {}): TestLogger {
		return new TestLogger();
	}

	/**
	 * Create a null logger that discards all logs
	 */
	static createNullLogger(): Logger {
		return new NullLogger();
	}

	/**
	 * Create a logger with a specific component context
	 */
	static createComponentLogger(component: string, config: LoggerConfig = {}): Logger {
		return LoggerFactory.create({ ...config, component });
	}
}

/**
 * Convenience function for creating loggers (maintains backward compatibility)
 */
export const createLogger = LoggerFactory.create;

/**
 * Export the TestLogger class for test assertions
 */
export { TestLogger };
