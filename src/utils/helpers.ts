/**
 * Consolidated General-Purpose Utility Helpers for AI Memory Extension
 *
 * This file combines various utility functions from across the old `utils`
 * structure into a single, cohesive module. It includes helpers for
 * async operations, error handling, formatting, resource management,
 * type guards, configuration I/O, process management, and versioning.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path"; // "join" is not used
import { fileURLToPath } from "node:url";
import type { z } from "zod";
import type { FileOperationManager } from "../core/file-operations";
import { createLogger } from "../lib/logging";
import type { IDisposable, Logger } from "../lib/types/core";
// Local/Relative Imports - These will be updated to relative paths
import { MemoryBankFileType } from "../lib/types/core";

// VS Code API is imported dynamically where needed to allow these helpers
// to be used in non-VS Code environments (e.g., tests, CLI).

// =============================================================================
// Section: Async Utility Helpers
// =============================================================================

/**
 * Creates a promise that resolves after a specified number of milliseconds.
 * @param ms The number of milliseconds to wait before resolving the promise.
 */
export function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// Section: Error Handling and Formatting
// =============================================================================

/**
 * Safely extracts an error message from any error type.
 * @param error The error to extract a message from.
 */
export function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * Creates a formatted error message with context.
 * @param context Context describing what operation failed.
 * @param error The error that occurred.
 */
export function formatErrorMessage(context: string, error: unknown): string {
	return `${context}: ${getErrorMessage(error)}`;
}

/**
 * Formats Zod validation issues into a human-readable string.
 * @param issues An array of ZodIssue objects.
 */
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

/**
 * Formats bytes to a human-readable string (e.g., KB, MB, GB).
 * @param bytes The number of bytes.
 */
export function formatBytes(bytes: number): string {
	if (bytes < 0) return "Invalid size";
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const actualIndex = Math.max(0, Math.min(i, sizes.length - 1));
	return `${Number.parseFloat((bytes / k ** actualIndex).toFixed(2))} ${sizes[actualIndex]}`;
}

// =============================================================================
// Section: Type Guards and Runtime Validation
// =============================================================================

const VALID_FILE_TYPES = Object.values(MemoryBankFileType);

/**
 * Type guard for MemoryBankFileType with runtime validation.
 */
export function isValidMemoryBankFileType(value: unknown): value is MemoryBankFileType {
	return typeof value === "string" && VALID_FILE_TYPES.includes(value as MemoryBankFileType);
}

/**
 * Type guard for non-empty string validation.
 */
export function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

// =============================================================================
// Section: File and Configuration I/O
// =============================================================================

/**
 * Ensures a directory exists at the given path.
 */
export async function ensureDirectory(
	directoryPath: string,
	fileOperationManager: FileOperationManager,
	logger: Logger,
): Promise<string> {
	const mkdirResult = await fileOperationManager.mkdirWithRetry(directoryPath, {
		recursive: true,
	});
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

/**
 * Reads and parses a JSON configuration file.
 */
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

/**
 * Writes data to a JSON configuration file with standardized formatting.
 */
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

// =============================================================================
// Section: Versioning
// =============================================================================

let cachedPackageInfo: {
	name: string;
	version: string;
	displayName: string;
} | null = null;
const versionLogger = createLogger({ component: "VersionUtils" });

function getPackageInfo() {
	if (cachedPackageInfo) {
		return cachedPackageInfo;
	}
	try {
		// This path resolution is fragile; it assumes a specific build structure.
		// It's better to pass the extension context path if possible.
		const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
		const packageJsonPath = resolve(projectRoot, "package.json");
		const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
		cachedPackageInfo = {
			name: packageJson.name ?? "aimemory",
			version: packageJson.version ?? "0.0.0",
			displayName: packageJson.displayName ?? "Cursor AI Memory",
		};
		return cachedPackageInfo;
	} catch (error) {
		versionLogger.warn("Failed to read package.json, using fallback version", {
			error: getErrorMessage(error),
		});
		return {
			name: "aimemory",
			version: "0.0.1",
			displayName: "Cursor AI Memory",
		};
	}
}

/**
 * Gets the current extension version from package.json.
 */
export function getExtensionVersion(): string {
	return getPackageInfo().version;
}

/**
 * Gets the extension name from package.json.
 */
export function getExtensionName(): string {
	return getPackageInfo().name;
}

// =============================================================================
// Section: Resource Management
// =============================================================================

/**
 * Manages the lifecycle of disposable resources, ensuring they are properly cleaned up.
 */
export class ResourceManager implements IDisposable {
	private readonly disposables: Set<IDisposable> = new Set();
	private disposed = false;

	constructor(private readonly logger: Logger) {}

	/**
	 * Adds a disposable resource to be managed.
	 */
	public add(disposable: IDisposable): void {
		if (this.disposed) {
			this.logger.warn("ResourceManager: Attempted to add to a disposed manager.");
			Promise.resolve(disposable.dispose()).catch(err =>
				this.logger.error(`Error disposing immediately added disposable: ${getErrorMessage(err)}`),
			);
			return;
		}
		this.disposables.add(disposable);
	}

	/**
	 * Disposes all managed resources.
	 */
	public async dispose(): Promise<void> {
		if (this.disposed) {
			return;
		}
		this.disposed = true;
		this.logger.info("Disposing all managed resources...");
		const disposePromises: Promise<void>[] = [];
		for (const disposable of this.disposables) {
			try {
				const result = disposable.dispose();
				if (result instanceof Promise) {
					disposePromises.push(
						result.catch(err => this.logger.error(`Async disposal error: ${getErrorMessage(err)}`)),
					);
				}
			} catch (err) {
				this.logger.error(`Sync disposal error: ${getErrorMessage(err)}`);
			}
		}
		await Promise.allSettled(disposePromises);
		this.disposables.clear();
		this.logger.info("All managed resources disposed.");
	}
}
