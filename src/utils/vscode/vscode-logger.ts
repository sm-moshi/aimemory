import type { LogContext } from "@/types/logging.js";
import * as vscode from "vscode";

/**
 * Log levels for the AI Memory extension Output Channel.
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
 * Singleton Logger for consistent, user-configurable logging.
 */
export class Logger {
	private static instance: Logger;
	private readonly output = vscode.window.createOutputChannel("AI Memory");
	private level: LogLevel = LogLevel.Info;

	private constructor() {}

	/**
	 * Get the singleton Logger instance.
	 */
	static getInstance(): Logger {
		if (!Logger.instance) {
			Logger.instance = new Logger();
		}
		return Logger.instance;
	}

	/**
	 * Set the current log level.
	 */
	setLevel(level: LogLevel) {
		this.level = level;
	}

	/**
	 * Log a message at the specified level, with optional structured metadata.
	 */
	log(level: LogLevel, msg: string, context?: LogContext) {
		if (level >= this.level && this.level !== LogLevel.Off) {
			const prefix = `[Webview] ${new Date().toISOString()} - ${LogLevel[level].toUpperCase()}`;
			const contextStr = context ? ` ${JSON.stringify(context)}` : "";
			this.output.appendLine(`${prefix} ${msg}${contextStr}`);
		}
	}

	/**
	 * Log an info-level message.
	 */
	info(msg: string, context?: LogContext) {
		this.log(LogLevel.Info, msg, context);
	}

	/**
	 * Log a warning-level message.
	 */
	warn(msg: string, context?: LogContext) {
		this.log(LogLevel.Warn, msg, context);
	}

	/**
	 * Log an error-level message.
	 */
	error(msg: string, context?: LogContext) {
		this.log(LogLevel.Error, msg, context);
	}

	/**
	 * Log a debug-level message.
	 */
	debug(msg: string, context?: LogContext) {
		this.log(LogLevel.Debug, msg, context);
	}

	/**
	 * Log a trace-level message.
	 */
	trace(msg: string, context?: LogContext) {
		this.log(LogLevel.Trace, msg, context);
	}

	/**
	 * Show the output channel to the user.
	 */
	showOutput() {
		this.output.show();
	}
}
