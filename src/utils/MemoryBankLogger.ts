/**
 * Memory Bank Logger Utility
 *
 * Provides standardized logging functionality for Memory Bank operations.
 * Extracted from MemoryBankServiceCore to reduce class complexity.
 */

import type { MemoryBankLogger } from "../types/types.js";

/**
 * Simple logger implementation that writes to stderr
 * with consistent formatting for Memory Bank operations
 */
class StderrLogger implements MemoryBankLogger {
	private writeToStderr(level: string, message: string): void {
		process.stderr.write(`[${level.toUpperCase()}] ${message}\n`);
	}

	info(message: string): void {
		this.writeToStderr("info", message);
	}

	error(message: string): void {
		this.writeToStderr("error", message);
	}

	warn(message: string): void {
		this.writeToStderr("warn", message);
	}

	debug(message: string): void {
		this.writeToStderr("debug", message);
	}
}

/**
 * Console-compatible logger that writes all levels to stderr
 * Provides full Console interface compatibility for drop-in replacement
 */
class ConsoleCompatibleLogger implements Console {
	private writeToStderr(level: string, ...args: unknown[]): void {
		process.stderr.write(`[${level.toUpperCase()}] ${args.map(String).join(" ")}\n`);
	}

	log(...args: unknown[]): void {
		this.writeToStderr("log", ...args);
	}

	info(...args: unknown[]): void {
		this.writeToStderr("info", ...args);
	}

	warn(...args: unknown[]): void {
		this.writeToStderr("warn", ...args);
	}

	error(...args: unknown[]): void {
		this.writeToStderr("error", ...args);
	}

	debug(...args: unknown[]): void {
		this.writeToStderr("debug", ...args);
	}

	table(tabularData: unknown, properties?: string[]): void {
		process.stderr.write(`${JSON.stringify(tabularData, properties, 2)}\n`);
	}

	time(label?: string): void {
		console.time(label);
	}

	timeEnd(label?: string): void {
		console.timeEnd(label);
	}

	timeLog(label?: string, ...data: unknown[]): void {
		console.timeLog(label, ...data);
	}

	assert(condition?: boolean, ...data: unknown[]): void {
		if (!condition) {
			this.writeToStderr("assert", ...data);
		}
	}

	clear(): void {
		// No-op for stderr logger
	}

	count(label?: string): void {
		console.count(label);
	}

	countReset(label?: string): void {
		console.countReset(label);
	}

	dir(item: unknown, options?: unknown): void {
		process.stderr.write(`${JSON.stringify(item, null, 2)}\n`);
	}

	dirxml(...data: unknown[]): void {
		this.writeToStderr("dirxml", ...data);
	}

	group(...label: unknown[]): void {
		console.group(...label);
	}

	groupCollapsed(...label: unknown[]): void {
		console.groupCollapsed(...label);
	}

	groupEnd(): void {
		console.groupEnd();
	}

	profile(label?: string): void {
		console.profile(label);
	}

	profileEnd(label?: string): void {
		console.profileEnd(label);
	}

	timeStamp(label?: string): void {
		console.timeStamp(label);
	}

	trace(...data: unknown[]): void {
		this.writeToStderr("trace", ...data);
	}

	Console = console.Console;
}

/**
 * Factory functions for creating loggers
 */
export const MemoryBankLoggerFactory = {
	/**
	 * Creates a simple stderr logger with Memory Bank specific interface
	 */
	createSimpleLogger(): MemoryBankLogger {
		return new StderrLogger();
	},

	/**
	 * Creates a Console-compatible stderr logger for drop-in replacement
	 * Use this when you need full Console interface compatibility
	 */
	createConsoleLogger(): Console {
		return new ConsoleCompatibleLogger();
	},

	/**
	 * Creates a logger with the specified interface type
	 * @param type - The type of logger to create
	 */
	createLogger(type: "simple" | "console" = "simple"): MemoryBankLogger | Console {
		return type === "simple" ? this.createSimpleLogger() : this.createConsoleLogger();
	},
};

// Legacy function name for backward compatibility
export const createStderrLogger = MemoryBankLoggerFactory.createConsoleLogger;
