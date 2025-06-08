/**
 * @file src/lib/utils.ts
 * @description Consolidated general-purpose utility helpers.
 *
 * This file combines functions from the following legacy files:
 * - `src/utils/helpers.ts`
 * - `src/utils/logging.ts`
 * - `src/utils/system/process-helpers.ts`
 * - `src/utils/vscode/ui-helpers.ts`
 *
 * It provides a single, cohesive module for async operations, error handling,
 * logging, process management, type guards, and VS Code UI interactions.
 */

import { type ChildProcess, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionContext } from "vscode";
import type { z } from "zod";

import type { FileOperationManager } from "../core/file-operations";
import { formatErrorMessage, getErrorMessage } from "./helpers";
import {
	type IDisposable,
	type LogContext,
	LogLevel,
	type Logger,
	type LoggerConfig,
	MemoryBankFileType,
} from "./types/core";
import type { ProcessEventHandlers, ProcessSpawnConfig } from "./types/system";

// =================================================================
// Section: Environment Detection
// =================================================================

const isVSCodeExtension = () => {
	try {
		return typeof globalThis !== "undefined" && "vscode" in globalThis;
	} catch {
		return false;
	}
};

const isTestEnvironment = () => {
	const nodeEnv = process.env.NODE_ENV;
	const vitestEnv = process.env.VITEST;
	return nodeEnv === "test" || vitestEnv === "true";
};

// =================================================================
// Section: Logging Factory and Implementations
// =================================================================

class ConsoleLogger implements Logger {
	private level: LogLevel;
	private readonly enableTimestamps: boolean;
	private readonly enableContext: boolean;
	private readonly component: string | undefined;

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
		// ... (Implementation from src/utils/logging.ts)
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
		const { component, ...filtered } = context;
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

class TestLogger implements Logger {
	public logs: Array<{ level: string; message: string; context?: LogContext }> = [];

	trace(message: string, context?: LogContext): void {
		this.logs.push({ level: "TRACE", message, ...(context && { context }) });
	}

	debug(message: string, context?: LogContext): void {
		this.logs.push({ level: "DEBUG", message, ...(context && { context }) });
	}

	info(message: string, context?: LogContext): void {
		this.logs.push({ level: "INFO", message, ...(context && { context }) });
	}

	warn(message: string, context?: LogContext): void {
		this.logs.push({ level: "WARN", message, ...(context && { context }) });
	}

	error(message: string, context?: LogContext): void {
		this.logs.push({ level: "ERROR", message, ...(context && { context }) });
	}

	setLevel(_level: LogLevel): void {}

	clear(): void {
		this.logs = [];
	}
}

// biome-ignore lint/correctness/noUnusedVariables: <explanation>
class NullLogger implements Logger {
	trace(_message: string, _context?: LogContext): void {}
	debug(_message: string, _context?: LogContext): void {}
	info(_message: string, _context?: LogContext): void {}
	warn(_message: string, _context?: LogContext): void {}
	error(_message: string, _context?: LogContext): void {}
	setLevel(_level: LogLevel): void {}
}

class VSCodeLogger implements Logger {
	private outputChannel: { appendLine: (text: string) => void; show: () => void } | null = null;
	private outputChannelPromise: Promise<void> | null = null;
	private level: LogLevel;
	private readonly component: string | undefined;

	constructor(config: LoggerConfig = {}) {
		this.level = config.level ?? LogLevel.Info;
		this.component = config.component;
	}

	private async ensureOutputChannel(): Promise<void> {
		// ... (Implementation from src/utils/logging.ts)
		if (this.outputChannel) return;

		if (!this.outputChannelPromise) {
			this.outputChannelPromise = this.initializeOutputChannel();
		}

		await this.outputChannelPromise;
	}

	private async initializeOutputChannel(): Promise<void> {
		// ... (Implementation from src/utils/logging.ts)
		try {
			const vscode = await import("vscode");
			this.outputChannel = vscode.window.createOutputChannel("AI Memory");
		} catch {
			console.warn("VS Code API not available, falling back to console logging");
		}
	}

	private shouldLog(level: LogLevel): boolean {
		return level >= this.level && this.level !== LogLevel.Off;
	}

	private formatMessage(level: string, message: string, context?: LogContext): string {
		// ... (Implementation from src/utils/logging.ts)
		const timestamp = new Date().toISOString();
		const component = context?.component ?? this.component;
		const prefix = component ? `[${component}]` : "";
		let formatted = `${timestamp} - ${level.toUpperCase()} ${prefix} ${message}`;
		if (context) {
			const { component, ...filtered } = context;
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

	private async log(level: LogLevel, levelName: string, message: string, context?: LogContext): Promise<void> {
		if (!this.shouldLog(level)) return;
		const formatted = this.formatMessage(levelName, message, context);
		try {
			await this.ensureOutputChannel();
			if (this.outputChannel) {
				this.outputChannel.appendLine(formatted);
			} else {
				console.log(formatted);
			}
		} catch (error) {
			console.error("Failed to write to log:", error);
			console.log(formatted);
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

	async showOutput(): Promise<void> {
		try {
			await this.ensureOutputChannel();
			this.outputChannel?.show();
		} catch (error) {
			console.error("Failed to show output channel:", error);
		}
	}
}

export function createLogger(config: LoggerConfig = {}): Logger {
	if (isTestEnvironment()) {
		return new TestLogger();
	}
	if (isVSCodeExtension()) {
		return new VSCodeLogger(config);
	}
	return new ConsoleLogger(config);
}

// =================================================================
// Section: Async & Error Handling
// =================================================================

export function formatZodError(issues: z.ZodIssue[]): string {
	if (!issues || issues.length === 0) {
		return "No validation errors.";
	}
	const errorMessages = issues.map(issue => {
		const path = issue.path.join(".");
		return path ? `${path}: ${issue.message}` : issue.message;
	});
	return `Validation Failed: ${errorMessages.join("; ")}`;
}

// =================================================================
// Section: Type Guards
// =================================================================

const VALID_FILE_TYPES = Object.values(MemoryBankFileType);

export function isValidMemoryBankFileType(value: unknown): value is MemoryBankFileType {
	return typeof value === "string" && VALID_FILE_TYPES.includes(value as MemoryBankFileType);
}

export function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

// =================================================================
// Section: File I/O & Versioning
// =================================================================

export async function ensureDirectory(
	directoryPath: string,
	fileOperationManager: FileOperationManager,
	logger: Logger,
): Promise<string> {
	const mkdirResult = await fileOperationManager.mkdirWithRetry(directoryPath, { recursive: true });
	if (!mkdirResult.success) {
		const { error } = mkdirResult;
		if (error.code === "EEXIST") {
			logger.debug?.(`${directoryPath} directory already exists.`);
			return directoryPath;
		}
		const errorMessage = `Failed to create directory ${directoryPath}: ${error.message}`;
		logger.error(errorMessage);
		throw new Error(errorMessage);
	}
	return directoryPath;
}

export async function readJsonFile<T>(
	filePath: string,
	fileOperationManager: FileOperationManager,
	logger: Logger,
	defaultConfig: T,
): Promise<T> {
	const readResult = await fileOperationManager.readFileWithRetry(filePath);
	if (!readResult.success) {
		const { error } = readResult;
		if (error.code === "ENOENT") {
			logger.info?.(`Config file ${filePath} doesn't exist, using default.`);
		} else {
			logger.error(`Config file ${filePath} couldn't be read (${error.message}), using default.`);
		}
		return defaultConfig;
	}
	try {
		return JSON.parse(readResult.data) as T;
	} catch (parseError) {
		logger.error(`Config file ${filePath} couldn't be parsed (${getErrorMessage(parseError)}), using default.`);
		return defaultConfig;
	}
}

export async function writeJsonFile(
	filePath: string,
	data: unknown,
	fileOperationManager: FileOperationManager,
): Promise<void> {
	const writeResult = await fileOperationManager.writeFileWithRetry(filePath, JSON.stringify(data, null, 2));
	if (!writeResult.success) {
		throw new Error(`Failed to write config file ${filePath}: ${writeResult.error.message}`);
	}
}

function getPackageInfo() {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);
	const packageJsonPath = resolve(__dirname, "../../../package.json");
	try {
		const packageJsonContent = readFileSync(packageJsonPath, "utf8");
		return JSON.parse(packageJsonContent);
	} catch (error) {
		console.error(`Failed to read or parse package.json at ${packageJsonPath}`, error);
		return { version: "0.0.0", name: "unknown" };
	}
}

const packageInfo = getPackageInfo();

export function getExtensionVersion(): string {
	return packageInfo.version;
}

export function getExtensionName(): string {
	return packageInfo.name;
}

// =================================================================
// Section: Resource Management
// =================================================================

export class ResourceManager implements IDisposable {
	private readonly disposables: Set<IDisposable> = new Set();
	private disposed = false;

	constructor(private readonly logger: Logger) {}

	public add(disposable: IDisposable): void {
		if (this.disposed) {
			this.logger.warn("Adding disposable to a disposed ResourceManager. It will be disposed immediately.");
			disposable.dispose();
			return;
		}
		this.disposables.add(disposable);
	}

	public async dispose(): Promise<void> {
		if (this.disposed) {
			return;
		}
		this.disposed = true;
		this.logger.info(`Disposing ${this.disposables.size} resources.`);
		for (const disposable of this.disposables) {
			try {
				await Promise.resolve(disposable.dispose());
			} catch (e) {
				this.logger.error(`Error disposing resource: ${getErrorMessage(e)}`);
			}
		}
		this.disposables.clear();
	}
}

// =================================================================
// Section: Process Management & VS Code UI
// =================================================================

export async function showVSCodeError(message: string, error?: unknown): Promise<void> {
	try {
		const { window } = await import("vscode");
		const fullMessage = error ? formatErrorMessage(message, error) : message;
		window.showErrorMessage(fullMessage);
	} catch (importError) {
		console.error("showVSCodeError failed (are you in a non-VSCode environment?):", message, error, importError);
	}
}

export async function validateWorkspace(logger: Logger): Promise<string> {
	try {
		const { workspace } = await import("vscode");
		const workspaceFolders = workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			const msg = "No workspace folder found.";
			logger.error(msg);
			throw new Error(msg);
		}
		const firstFolder = workspaceFolders[0];
		if (!firstFolder) {
			const msg = "First workspace folder is undefined.";
			logger.error(msg);
			throw new Error(msg);
		}
		return firstFolder.uri.fsPath;
	} catch (importError) {
		const msg = "Failed to validate workspace (are you in a non-VSCode environment?)";
		logger.error(msg, { error: importError });
		throw new Error(msg);
	}
}

export function createProcessConfig(context: ExtensionContext, workspacePath: string): ProcessSpawnConfig {
	const serverPath = join(context.extensionPath, "dist", "index.cjs");
	const nodeExecutable = process.execPath ?? "node";
	return {
		serverPath,
		workspacePath,
		nodeExecutable,
		cwd: context.extensionPath,
		env: {
			...process.env,
			nodeEnv: "production",
		},
	};
}

export function spawnMCPServer(config: ProcessSpawnConfig): ChildProcess {
	return spawn(config.nodeExecutable, [config.serverPath, config.workspacePath], {
		stdio: "pipe",
		cwd: config.cwd,
		env: config.env,
	});
}

export function registerProcessEventHandlers(childProcess: ChildProcess, handlers: ProcessEventHandlers): void {
	childProcess.on("error", handlers.onError);
	childProcess.on("exit", handlers.onExit);
	if (handlers.onStderr && childProcess.stderr) {
		childProcess.stderr.on("data", handlers.onStderr);
	}
}

export async function waitForProcessStartup(childProcess: ChildProcess, timeoutMs = 1000): Promise<void> {
	await new Promise(resolve => setTimeout(resolve, timeoutMs));

	if (!childProcess || childProcess.killed) {
		throw new Error("Failed to start MCP server process");
	}
}

export async function launchMCPServerProcess(
	context: ExtensionContext,
	logger: Logger,
	eventHandlers: Omit<ProcessEventHandlers, "onStderr"> & { onStderr?: (data: Buffer) => void },
): Promise<ChildProcess> {
	const workspacePath = await validateWorkspace(logger);
	const config = createProcessConfig(context, workspacePath);
	logger.info(`Starting MCP STDIO server: ${config.serverPath} with workspace: ${workspacePath}`);
	const childProcess = spawnMCPServer(config);
	registerProcessEventHandlers(childProcess, eventHandlers);
	await waitForProcessStartup(childProcess);
	logger.info("MCP STDIO server started successfully");
	return childProcess;
}
