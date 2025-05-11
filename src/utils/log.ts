import * as vscode from "vscode";

/**
 * Log levels for the AI Memory extension Output Channel.
 */
export enum LogLevel {
  Trace = 0,
  Debug = 1,
  Info = 2,
  Warning = 3,
  Error = 4,
  Off = 5,
}

/**
 * Singleton Logger for consistent, user-configurable logging.
 */
export class Logger {
  private static instance: Logger;
  private output = vscode.window.createOutputChannel("AI Memory");
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
  log(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
    if (level >= this.level && this.level !== LogLevel.Off) {
      const prefix = `[Webview] ${new Date().toISOString()} - ${LogLevel[level].toUpperCase()}`;
      const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
      this.output.appendLine(`${prefix} ${msg}${metaStr}`);
    }
  }

  /**
   * Log an info-level message.
   */
  info(msg: string, meta?: Record<string, unknown>) { this.log(LogLevel.Info, msg, meta); }
  /**
   * Log an error-level message.
   */
  error(msg: string, meta?: Record<string, unknown>) { this.log(LogLevel.Error, msg, meta); }
  /**
   * Log a debug-level message.
   */
  debug(msg: string, meta?: Record<string, unknown>) { this.log(LogLevel.Debug, msg, meta); }
}
