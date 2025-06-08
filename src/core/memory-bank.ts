/**
 * @file src/core/memory-bank.ts
 * @description Core service for managing the AI Memory Bank.
 *
 * This file consolidates the logic from the legacy `src/core/memoryBankServiceCore.ts`
 * and acts as the central orchestrator for all memory bank operations, including
 * file I/O, caching, validation, and state management.
 */

import * as path from "node:path";
import matter from "gray-matter";

import type {
	AsyncResult,
	FileOperationContext,
	FrontmatterMetadata,
	HealthCheckResult,
	Logger,
	MemoryBank,
	MemoryBankFile,
} from "../lib/types/core";
import { MemoryBankError, MemoryBankFileType, isError, tryCatchAsync } from "../lib/types/core";
import { getSchemaForType } from "../lib/types/operations";
import { formatZodError } from "../lib/utils";
import {
	validateAllMemoryBankFiles,
	validateAndConstructArbitraryFilePath,
	validateAndConstructKnownFilePath,
	validateMemoryBankDirectory,
} from "../lib/validation";
import { getTemplateForFileType } from "../templates";

import type { CacheManager } from "./cache";
import { LegacyCacheAdapter, LegacyStatsAdapter } from "./cache";
import type { FileOperationManager } from "./file-operations";
import type { StreamingManager } from "./streaming";

/**
 * Manages all operations related to the AI Memory Bank.
 *
 * This class is the central orchestrator for file I/O, caching, validation,
 * and state management of the memory bank files. It implements the `MemoryBank`
 * interface and provides a robust, error-handled API for interacting with
 * the memory bank on the file system.
 */
export class MemoryBankManager implements MemoryBank {
	// =================================================================
	// Section: Properties
	// =================================================================

	private readonly memoryBankFolder: string;
	private ready = false;
	private readonly logger: Logger;

	// Service dependencies
	private readonly cacheManager: CacheManager;
	private readonly streamingManager: StreamingManager;
	private readonly fileOperationManager: FileOperationManager;

	// Public state
	public files: Map<MemoryBankFileType, MemoryBankFile> = new Map();

	// Compatibility adapters for legacy cache interfaces
	private readonly legacyCacheAdapter: LegacyCacheAdapter;
	private readonly legacyStatsAdapter: LegacyStatsAdapter;

	// =================================================================
	// Section: Constructor and Initialization
	// =================================================================

	constructor(
		memoryBankPath: string,
		logger: Logger,
		cacheManager: CacheManager,
		streamingManager: StreamingManager,
		fileOperationManager: FileOperationManager,
	) {
		this.memoryBankFolder = memoryBankPath;
		this.logger = logger;
		this.cacheManager = cacheManager;
		this.streamingManager = streamingManager;
		this.fileOperationManager = fileOperationManager;

		// Initialize adapters for performance layer integration
		this.legacyCacheAdapter = new LegacyCacheAdapter(cacheManager);
		this.legacyStatsAdapter = new LegacyStatsAdapter(cacheManager);
	}

	/**
	 * Checks if the memory bank has been fully initialized and is ready for operations.
	 * @returns `true` if ready, otherwise `false`.
	 */
	isReady(): boolean {
		return this.ready;
	}

	/**
	 * Ensures that all necessary subfolders within the memory bank directory exist,
	 * creating them if they are missing. This is a key part of the self-healing
	 * mechanism.
	 */
	async initializeFolders(): AsyncResult<void, MemoryBankError> {
		const result = await tryCatchAsync<void>(async () => {
			const subfolders = ["", "core", "systemPatterns", "techContext", "progress"];

			for (const subfolder of subfolders) {
				const folderPath = path.join(this.memoryBankFolder, subfolder);
				this.logger.debug(`[MemoryBankManager.initializeFolders] Ensuring folder: ${folderPath}`);
				const mkdirResult = await this.fileOperationManager.mkdirWithRetry(folderPath, {
					recursive: true,
				});
				if (!mkdirResult.success) {
					throw new MemoryBankError(
						`Failed to create directory ${folderPath}: ${mkdirResult.error.message}`,
						"MKDIR_ERROR",
						{ originalError: mkdirResult.error.originalError },
					);
				}
			}
		});

		if (isError(result)) {
			return {
				success: false,
				error: new MemoryBankError(
					`Initialization of folders failed: ${result.error.message}`,
					result.error instanceof MemoryBankError ? result.error.code : "INIT_FOLDERS_ERROR",
					{ originalError: result.error },
				),
			};
		}

		return result;
	}

	/**
	 * Loads all memory bank files from disk, creating them from templates if they
	 * don't exist. This method populates the `files` map and marks the service as ready.
	 * @returns An array of file types that were newly created.
	 */
	async loadFiles(): AsyncResult<MemoryBankFileType[], MemoryBankError> {
		const result = await tryCatchAsync<MemoryBankFileType[]>(async () => {
			const context = this.createContext();
			const createdFiles = await this.loadAllMemoryBankFiles(context);
			this.ready = true;
			return createdFiles;
		});

		if (isError(result)) {
			this.ready = false;
			let detailMessage = "An unknown error occurred during file loading.";
			if (result.error) {
				detailMessage =
					typeof result.error.message === "string" ? result.error.message : JSON.stringify(result.error);
			}
			const rawErrorString = result.error ? JSON.stringify(result.error, null, 2) : "No error object";
			this.logger.error(`[MemoryBankManager.loadFiles] Raw error from tryCatchAsync: ${rawErrorString}`);
			return {
				success: false,
				error: new MemoryBankError(
					`Failed to load files: ${detailMessage}`,
					result.error instanceof MemoryBankError ? result.error.code : "LOAD_ERROR",
					{ originalError: result.error },
				),
			};
		}

		return result;
	}

	// =================================================================
	// Section: Public API
	// =================================================================

	/**
	 * Retrieves a single memory bank file by its type.
	 * @param type The `MemoryBankFileType` to retrieve.
	 * @returns The `MemoryBankFile` object, or `undefined` if not found.
	 */
	getFile(type: MemoryBankFileType): MemoryBankFile | undefined {
		this.logger.info(`getFile called for: ${type}`);
		return this.files.get(type);
	}

	/**
	 * Retrieves all loaded memory bank files.
	 * @returns An array of all `MemoryBankFile` objects.
	 */
	getAllFiles(): MemoryBankFile[] {
		return Array.from(this.files.values());
	}

	/**
	 * Updates the content of a specific memory bank file on disk and in memory.
	 * @param type The `MemoryBankFileType` to update.
	 * @param content The new content to write to the file.
	 */
	async updateFile(type: MemoryBankFileType, content: string): AsyncResult<void, MemoryBankError> {
		const result = await tryCatchAsync<void>(async () => {
			const context = this.createContext();
			await this.updateMemoryBankFile(type, content, context);
		});

		if (isError(result)) {
			return {
				success: false,
				error: new MemoryBankError(`Failed to update file ${type}: ${result.error.message}`, "UPDATE_ERROR", {
					originalError: result.error,
				}),
			};
		}
		return result;
	}

	/**
	 * Writes content to an arbitrary file path within the memory bank.
	 * This is used for creating new, non-standard files.
	 * @param relativePath The path relative to the memory bank root.
	 * @param content The content to write.
	 */
	async writeFileByPath(relativePath: string, content: string): AsyncResult<void, MemoryBankError> {
		const result = await tryCatchAsync<void>(async () => {
			const fullPath = validateAndConstructArbitraryFilePath(this.memoryBankFolder, relativePath);
			const mkdirResult = await this.fileOperationManager.mkdirWithRetry(path.dirname(fullPath), {
				recursive: true,
			});
			if (!mkdirResult.success) {
				throw new MemoryBankError(
					`Failed to create directory for ${relativePath}: ${mkdirResult.error.message}`,
					"MKDIR_ERROR",
					{ originalError: mkdirResult.error.originalError },
				);
			}

			const writeResult = await this.fileOperationManager.writeFileWithRetry(fullPath, content);
			if (!writeResult.success) {
				throw new MemoryBankError(
					`Failed to write file to ${relativePath}: ${writeResult.error.message}`,
					"WRITE_FILE_ERROR",
					{ originalError: writeResult.error.originalError },
				);
			}

			const statResult = await this.fileOperationManager.statWithRetry(fullPath);
			if (!statResult.success) {
				this.logger.warn(`Failed to stat file ${fullPath} after writing: ${statResult.error.message}`);
			} else {
				this.legacyCacheAdapter.set(fullPath, {
					content,
					mtimeMs: statResult.data.mtimeMs,
				});
			}
			this.logger.info(`Written file by path: ${relativePath}`);
		});

		if (isError(result)) {
			return {
				success: false,
				error: new MemoryBankError(
					`Failed to write file by path ${relativePath}: ${result.error.message}`,
					"WRITE_ERROR",
					{ originalError: result.error },
				),
			};
		}
		return result;
	}

	/**
	 * Performs a health check of the memory bank, verifying that all required
	 * files and folders exist and are accessible.
	 * @returns A summary string of the health check result.
	 */
	async checkHealth(): AsyncResult<string, MemoryBankError> {
		const result = await tryCatchAsync<string>(async () => {
			const context = this.createContext();
			const healthResult = await this.performHealthCheck(context);
			return healthResult.summary;
		});

		if (isError(result)) {
			return {
				success: false,
				error: new MemoryBankError(`Health check failed: ${result.error.message}`, "HEALTH_CHECK_ERROR", {
					originalError: result.error,
				}),
			};
		}
		return result;
	}

	/**
	 * A diagnostic method to get a string representation of all loaded files,
	 * including a content preview and last update time.
	 * @returns A newline-separated string of file information.
	 */
	getFilesWithFilenames(): string {
		return Array.from(this.files.entries())
			.map(([type, file]) => {
				const preview = file.content.substring(0, 40);
				const lastUpdated = file.lastUpdated
					? `last updated: ${file.lastUpdated.toISOString().split("T")[0]}`
					: "last updated: unknown";
				return `${type}: ${preview}... (${lastUpdated})`;
			})
			.join("\n");
	}

	// =================================================================
	// Section: Cache and State Management
	// =================================================================

	/**
	 * Invalidates the cache for a specific file or for the entire memory bank.
	 * @param filePath Optional. The relative path of the file to invalidate. If omitted, the entire cache is cleared.
	 */
	invalidateCache(filePath?: string): void {
		const absoluteFilePath = filePath ? path.resolve(this.memoryBankFolder, filePath) : undefined;
		this.cacheManager.invalidateCache(absoluteFilePath);
	}

	/**
	 * Retrieves the current statistics for the cache.
	 * @returns A `CacheStats` object.
	 */
	getCacheStats() {
		return this.cacheManager.getStats();
	}

	/**
	 * Resets the cache statistics.
	 */
	resetCacheStats(): void {
		this.cacheManager.resetStats();
	}

	/**
	 * Provides access to the `FileOperationManager` instance, primarily for dependency injection.
	 */
	getFileOperationManager(): FileOperationManager {
		return this.fileOperationManager;
	}

	/**
	 * Checks if the memory bank directory and all required files are present.
	 * This is a read-only check.
	 */
	async getIsMemoryBankInitialized(): AsyncResult<boolean, MemoryBankError> {
		const result = await tryCatchAsync<boolean>(async () => {
			const context = this.createContext();
			const isValidDirectory = await validateMemoryBankDirectory(context);

			if (!isValidDirectory) {
				this.logger.warn("Memory bank directory is invalid or not found.");
				return false;
			}

			const { missingFiles, filesToInvalidate } = await validateAllMemoryBankFiles(context);
			this.invalidateFilesInCache(filesToInvalidate);

			const isInitialized = missingFiles.length === 0;
			if (isInitialized) {
				this.logSuccessfulInitialization();
			} else {
				this.logFailedInitialization(missingFiles);
			}

			return isInitialized;
		});

		if (isError(result)) {
			const originalErrorCode = result.error instanceof MemoryBankError ? result.error.code : "UNKNOWN_ERROR";
			return {
				success: false,
				error: new MemoryBankError(
					`Operation failed during getIsMemoryBankInitialized: ${result.error.message}`,
					originalErrorCode,
					{ originalError: result.error },
				),
			};
		}
		return result;
	}

	// =================================================================
	// Section: Internal Helpers - File Operations
	// =================================================================

	/**
	 * High-level orchestrator for loading all memory bank files.
	 * Iterates through all `MemoryBankFileType` enums, loads them, creates them
	 * from a template if missing, and populates the in-memory `files` map.
	 * @param context The operational context.
	 * @returns An array of file types that were newly created.
	 */
	private async loadAllMemoryBankFiles(context: FileOperationContext): Promise<MemoryBankFileType[]> {
		this.files.clear();
		context.logger.info("Loading all memory bank files...");

		const createdFiles: MemoryBankFileType[] = [];

		try {
			for (const fileType of Object.values(MemoryBankFileType)) {
				const { content: rawContent, stats, wasCreated } = await this.loadFileWithTemplate(fileType, context);

				if (wasCreated) {
					createdFiles.push(fileType);
				}

				const filePath = validateAndConstructKnownFilePath(context.memoryBankFolder, fileType);
				const parsedData = this.parseAndValidateMetadata(rawContent, fileType, context);
				const memoryBankFile = this.createMemoryBankFileEntry(fileType, stats, filePath, parsedData);

				this.files.set(fileType, memoryBankFile);
			}

			if (createdFiles.length > 0) {
				const msg = `Self-healing: Created missing files: ${createdFiles.join(", ")}`;
				context.logger.info(msg);
			}

			context.logger.info("Memory bank initialised successfully.");
			return createdFiles;
		} catch (error) {
			context.logger.error(
				`Error loading memory bank files: ${error instanceof Error ? error.message : String(error)}`,
			);
			throw error;
		}
	}

	/**
	 * Loads a single file, falling back to a template if it doesn't exist.
	 * This is a core part of the self-healing mechanism.
	 * @param fileType The type of file to load.
	 * @param context The operational context.
	 * @returns An object containing the file content, stats, and whether it was created.
	 */
	private async loadFileWithTemplate(
		fileType: MemoryBankFileType,
		context: FileOperationContext,
	): Promise<{ content: string; stats: import("node:fs").Stats; wasCreated: boolean }> {
		const filePath = validateAndConstructKnownFilePath(context.memoryBankFolder, fileType);

		const mkdirResult = await context.fileOperationManager.mkdirWithRetry(path.dirname(filePath), {
			recursive: true,
		});
		if (!mkdirResult.success) {
			throw mkdirResult.error;
		}

		const loadedFile = await this.loadFileFromDiskOrCache(filePath, fileType, context);
		if (loadedFile) {
			return { ...loadedFile, wasCreated: false };
		}

		context.logger.warn(
			`File ${filePath} for ${fileType} not found or unreadable, attempting to create from template.`,
		);
		const { content, stats } = await this.createFileFromTemplateAndCache(fileType, filePath, context);
		return { content, stats, wasCreated: true };
	}

	/**
	 * Reads a file from disk or retrieves it from the cache.
	 * @returns The file content and stats, or `null` if the file doesn't exist or is unreadable.
	 */
	private async loadFileFromDiskOrCache(
		filePath: string,
		fileType: MemoryBankFileType,
		context: FileOperationContext,
	): Promise<{ content: string; stats: import("node:fs").Stats } | null> {
		try {
			const statResult = await context.fileOperationManager.statWithRetry(filePath);
			if (!statResult.success) {
				context.logger.debug(`Stat failed for ${filePath}: ${statResult.error.message}`);
				return null;
			}
			const stats = statResult.data;

			const cached = context.fileCache.get(filePath);
			if (cached && cached.mtimeMs === stats.mtimeMs) {
				context.cacheStats.hits++;
				context.logger.info(`Loaded file from cache: ${fileType}`);
				return { content: cached.content, stats };
			}

			const streamingResult = await context.streamingManager.readFile(filePath);
			if (!streamingResult.success) {
				context.logger.warn(`Read failed for ${filePath}: ${streamingResult.error.message}`);
				return null;
			}
			const content = streamingResult.data.content;

			context.fileCache.set(filePath, { content, mtimeMs: stats.mtimeMs });
			context.cacheStats.misses++;
			context.logger.info(
				`Loaded file: ${fileType} (${streamingResult.data.wasStreamed ? "streamed" : "normal"} read)`,
			);
			return { content, stats };
		} catch (error) {
			context.logger.error(
				`Unexpected error in loadFileFromDiskOrCache for ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
			);
			return null;
		}
	}

	/**
	 * Creates a new file from its template, writes it to disk, and populates the cache.
	 * @returns An object containing the new content and stats.
	 */
	private async createFileFromTemplateAndCache(
		fileType: MemoryBankFileType,
		filePath: string,
		context: FileOperationContext,
	): Promise<{ content: string; stats: import("node:fs").Stats }> {
		const content = getTemplateForFileType(fileType);
		const writeResult = await context.fileOperationManager.writeFileWithRetry(filePath, content);
		if (!writeResult.success) throw writeResult.error;

		const newStatResult = await context.fileOperationManager.statWithRetry(filePath);
		if (!newStatResult.success) throw newStatResult.error;
		const stats = newStatResult.data;

		context.fileCache.set(filePath, { content, mtimeMs: stats.mtimeMs });
		context.logger.info(`Created missing file from template: ${fileType}`);
		return { content, stats };
	}

	/**
	 * Internal logic for updating a file, synchronizing the cache, and updating the in-memory `files` map.
	 */
	private async updateMemoryBankFile(
		fileType: MemoryBankFileType,
		content: string,
		context: FileOperationContext,
	): Promise<void> {
		const filePath = validateAndConstructKnownFilePath(context.memoryBankFolder, fileType);

		const writeResult = await context.fileOperationManager.writeFileWithRetry(filePath, content);
		if (!writeResult.success) throw writeResult.error;

		const statResult = await context.fileOperationManager.statWithRetry(filePath);
		if (!statResult.success) throw statResult.error;
		const stats = statResult.data;

		// Re-parse and update the in-memory representation
		const parsedData = this.parseAndValidateMetadata(content, fileType, context);
		const memoryBankFile = this.createMemoryBankFileEntry(fileType, stats, filePath, parsedData);
		this.files.set(fileType, memoryBankFile);

		// Update cache
		context.fileCache.set(filePath, { content, mtimeMs: stats.mtimeMs });

		context.logger.info(`Updated file: ${fileType}`);
	}

	// =================================================================
	// Section: Internal Helpers - Health Check
	// =================================================================

	/**
	 * Performs a comprehensive health check by verifying the root folder and all required files.
	 * @returns A `HealthCheckResult` object with a summary and list of issues.
	 */
	private async performHealthCheck(context: FileOperationContext): Promise<HealthCheckResult> {
		let issues: string[] = [];
		issues = issues.concat(await this.checkRootFolder(context));

		for (const fileType of Object.values(MemoryBankFileType)) {
			issues = issues.concat(await this.checkFileAndParentDir(fileType, context));
		}

		const isHealthy = issues.length === 0;
		const summary = isHealthy
			? "Memory Bank Health: ✅ All files and folders are present and readable."
			: `Memory Bank Health: ❌ Issues found:\n${issues.join("\n")}`;

		return { isHealthy, issues, summary };
	}

	/**
	 * Checks if the root memory bank folder exists and is a directory.
	 */
	private async checkRootFolder(context: FileOperationContext): Promise<string[]> {
		const issues: string[] = [];
		try {
			const rootStatResult = await context.fileOperationManager.statWithRetry(context.memoryBankFolder);
			if (!rootStatResult.success) {
				issues.push(`Error accessing root memory bank folder: ${rootStatResult.error.message}`);
			} else if (!rootStatResult.data.isDirectory()) {
				issues.push(`Root memory bank path is not a directory: ${context.memoryBankFolder}`);
			}
		} catch (e) {
			issues.push(
				`Unexpected error checking root memory bank folder: ${e instanceof Error ? e.message : String(e)}`,
			);
		}
		return issues;
	}

	/**
	 * Checks if a specific file and its parent directory exist and are accessible.
	 */
	private async checkFileAndParentDir(
		fileType: MemoryBankFileType,
		context: FileOperationContext,
	): Promise<string[]> {
		const issues: string[] = [];
		try {
			const filePath = validateAndConstructKnownFilePath(context.memoryBankFolder, fileType);
			const parentDir = path.dirname(filePath);

			if (parentDir !== context.memoryBankFolder) {
				try {
					const dirStatResult = await context.fileOperationManager.statWithRetry(parentDir);
					if (!dirStatResult.success) {
						issues.push(
							`Error accessing parent directory ${parentDir} for ${fileType}: ${dirStatResult.error.message}`,
						);
					} else if (!dirStatResult.data.isDirectory()) {
						issues.push(`Required parent path is not a directory: ${parentDir} for ${fileType}`);
					}
				} catch (dirError) {
					issues.push(
						`Missing or unreadable parent directory: ${parentDir} for ${fileType} (Error: ${dirError instanceof Error ? dirError.message : String(dirError)})`,
					);
				}
			}

			const fileStatResult = await context.fileOperationManager.statWithRetry(filePath);
			if (!fileStatResult.success) {
				issues.push(`Missing or unreadable file ${fileType}: ${fileStatResult.error.message}`);
			} else if (!fileStatResult.data.isFile()) {
				issues.push(`Path for ${fileType} exists but is not a file: ${filePath}`);
			}
		} catch (fileError) {
			issues.push(
				`Unexpected error checking file ${fileType}: ${fileError instanceof Error ? fileError.message : String(fileError)}`,
			);
		}
		return issues;
	}

	// =================================================================
	// Section: Internal Helpers - Metadata and Parsing
	// =================================================================

	private static readonly metadataProps = {
		created: "created",
		updated: "updated",
	} as const;

	private parseFrontmatter(content: string, _fileType: MemoryBankFileType) {
		try {
			const { data: metadata, content: contentWithoutFrontmatter } = matter(content);

			// Auto-manage timestamps
			metadata[MemoryBankManager.metadataProps.created] ??= new Date().toISOString();
			metadata[MemoryBankManager.metadataProps.updated] = new Date().toISOString();

			return {
				metadata,
				content: contentWithoutFrontmatter,
				parseSuccess: true,
			};
		} catch (error) {
			return {
				metadata: {},
				content,
				parseSuccess: false,
				parseError: error instanceof Error ? error.message : String(error),
			};
		}
	}

	private parseAndValidateMetadata(rawContent: string, fileType: MemoryBankFileType, context: FileOperationContext) {
		const { metadata, content, parseSuccess, parseError } = this.parseFrontmatter(rawContent, fileType);

		if (!parseSuccess) {
			if (parseError) {
				context.logger.warn(`Frontmatter parsing failed for ${fileType}: ${parseError}`);
			}
			return {
				content,
				metadata,
				validationStatus: "unchecked" as const,
				validationErrors: undefined,
				actualSchemaUsed: undefined,
			};
		}

		const metadataType = this.extractMetadataType(metadata);
		const schema = getSchemaForType(metadataType);
		const validationResult = schema.safeParse(metadata);

		if (validationResult.success) {
			return {
				content,
				metadata,
				validationStatus: "valid" as const,
				validationErrors: undefined,
				actualSchemaUsed: metadataType ?? "default",
			};
		}

		const actualSchemaUsed = metadataType ?? "default";
		context.logger.warn(
			`Frontmatter validation failed for ${fileType}: ${formatZodError(validationResult.error.issues)}`,
		);

		return {
			content,
			metadata,
			validationStatus: "invalid" as const,
			validationErrors: validationResult.error.issues,
			actualSchemaUsed,
		};
	}

	private createMemoryBankFileEntry(
		fileType: MemoryBankFileType,
		stats: import("node:fs").Stats,
		filePath: string,
		parsedData: ReturnType<typeof this.parseAndValidateMetadata>,
	): MemoryBankFile {
		const { content, metadata, validationStatus, validationErrors, actualSchemaUsed } = parsedData;
		const createdDate = this.extractCreatedDate(metadata);

		const entry: MemoryBankFile = {
			type: fileType,
			content,
			lastUpdated: stats.mtime,
			filePath,
			relativePath: fileType,
			metadata: metadata as FrontmatterMetadata,
			validationStatus,
			...(actualSchemaUsed !== undefined && { actualSchemaUsed }),
		};

		if (createdDate) {
			entry.created = createdDate;
		}
		if (validationErrors) {
			entry.validationErrors = validationErrors;
		}

		return entry;
	}

	private extractMetadataType(metadata: unknown): string | undefined {
		return typeof metadata === "object" && metadata !== null && "type" in metadata
			? String(metadata.type)
			: undefined;
	}

	private extractCreatedDate(metadata: unknown): Date | undefined {
		const metadataCreated =
			typeof metadata === "object" && metadata !== null && "created" in metadata
				? String(metadata.created)
				: undefined;
		return metadataCreated ? new Date(metadataCreated) : undefined;
	}

	// =================================================================
	// Section: Internal Helpers - Context and Logging
	// =================================================================

	private createContext(): FileOperationContext {
		return {
			memoryBankFolder: this.memoryBankFolder,
			logger: this.logger,
			fileCache: this.legacyCacheAdapter,
			cacheStats: this.legacyStatsAdapter,
			streamingManager: this.streamingManager,
			fileOperationManager: this.fileOperationManager,
		};
	}

	private invalidateFilesInCache(filesToInvalidate: string[]): void {
		for (const filePath of filesToInvalidate) {
			this.cacheManager.invalidateCache(filePath);
		}
	}

	private logSuccessfulInitialization(): void {
		this.logger.info("Memory bank is initialised.");
	}

	private logFailedInitialization(missingFiles: string[]): void {
		this.logger.info(`Memory bank is NOT initialised. Missing/invalid files: ${missingFiles.join(", ")}`);
	}
}
