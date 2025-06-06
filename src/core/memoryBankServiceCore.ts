import * as path from "node:path";
import type { StreamingManager } from "@/performance/StreamingManager";
import { getTemplateForFileType } from "@/shared/templates/memory-bank-templates.js";
import {
	validateAllMemoryBankFiles,
	validateMemoryBankDirectory,
} from "@/shared/validation/file-validation";
import type {
	FileOperationContext,
	MemoryBank,
	MemoryBankFile,
	MemoryBankFileType,
} from "@/types/core";
import { type AsyncResult, MemoryBankError, isError, tryCatchAsync } from "@/types/errorHandling";
import { getSchemaForType } from "@/types/memoryBankSchemas.js";
import { formatZodError } from "@utils/common/error-helpers.js";
import { validateAndConstructArbitraryFilePath } from "@utils/index";
import { validateAndConstructFilePath } from "@utils/path-validation.js";
import matter from "gray-matter";
import { LegacyCacheAdapter, LegacyStatsAdapter } from "./Cache.js";
import type { CacheManager, FileOperationManager } from "./index.js";

const _DEFAULT_RETRY_ATTEMPTS = 3;

export class MemoryBankServiceCore implements MemoryBank {
	private readonly memoryBankFolder: string;
	files: Map<MemoryBankFileType, MemoryBankFile> = new Map();
	private ready = false;
	private readonly logger: Logger;
	private readonly cacheManager: CacheManager;
	private readonly streamingManager: StreamingManager;
	private readonly fileOperationManager: FileOperationManager;

	// Cache adapters for performance layer integration
	private readonly legacyCacheAdapter: LegacyCacheAdapter;
	private readonly legacyStatsAdapter: LegacyStatsAdapter;

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

	async getIsMemoryBankInitialized(): AsyncResult<boolean, MemoryBankError> {
		const result = await tryCatchAsync<boolean>(async () => {
			const context = this.createContext();
			const isValidDirectory = await validateMemoryBankDirectory(context);

			if (!isValidDirectory) {
				// Directory validation failed, but this is a valid check result, not an unexpected error.
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
			// This block now only catches truly unexpected errors during the process.
			const originalErrorCode =
				result.error instanceof MemoryBankError ? result.error.code : "UNKNOWN_ERROR";
			return {
				success: false,
				error: new MemoryBankError(
					`Operation failed during getIsMemoryBankInitialized: ${result.error.message}`,
					originalErrorCode,
					{ originalError: result.error },
				),
			};
		}

		// If tryCatchAsync succeeded (meaning validations returned boolean, not threw), result is { success: true, data: boolean }
		return result;
	}

	async initializeFolders(): AsyncResult<void, MemoryBankError> {
		const result = await tryCatchAsync<void>(async () => {
			const subfolders = [
				"", // root for legacy files. Ensures memoryBankFolder itself is checked/created if needed by mkdir.
				"core",
				"systemPatterns",
				"techContext",
				"progress",
			];

			for (const subfolder of subfolders) {
				const folderPath = path.join(this.memoryBankFolder, subfolder);
				this.logger.debug(
					`[MemoryBankServiceCore.initializeFolders] Ensuring folder: ${folderPath}`,
				);
				const mkdirResult = await this.fileOperationManager.mkdirWithRetry(folderPath, {
					recursive: true,
				});
				if (!mkdirResult.success) {
					// If a specific folder creation fails, wrap and throw to be caught by tryCatchAsync
					throw new MemoryBankError(
						`Failed to create directory ${folderPath}: ${mkdirResult.error.message}`,
						"MKDIR_ERROR",
						{ originalError: mkdirResult.error.originalError },
					);
				}
			}
		});

		if (isError(result)) {
			// This catches errors from tryCatchAsync, including our wrapped MemoryBankError
			return {
				success: false,
				error: new MemoryBankError(
					`Initialization of folders failed: ${result.error.message}`,
					result.error instanceof MemoryBankError
						? result.error.code
						: "INIT_FOLDERS_ERROR",
					{ originalError: result.error },
				),
			};
		}

		return result; // It's a success result
	}

	async loadFiles(): AsyncResult<MemoryBankFileType[], MemoryBankError> {
		const result = await tryCatchAsync<MemoryBankFileType[]>(async () => {
			const context = this.createContext();
			const createdFiles = await this.loadAllMemoryBankFiles(context);
			this.ready = true;
			return createdFiles;
		});

		if (isError(result)) {
			this.ready = false;
			// Ensure a clean error message
			let detailMessage = "An unknown error occurred during file loading.";
			if (result.error) {
				detailMessage =
					typeof result.error.message === "string"
						? result.error.message
						: JSON.stringify(result.error);
			}
			// Log the raw error structure separately if possible, or concatenate
			const rawErrorString = result.error
				? JSON.stringify(result.error, null, 2)
				: "No error object";
			this.logger.error(
				`[MemoryBankServiceCore.loadFiles] Raw error from tryCatchAsync: ${rawErrorString}`,
			);
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

	isReady(): boolean {
		return this.ready;
	}

	getFile(type: MemoryBankFileType): MemoryBankFile | undefined {
		this.logger.info(`getFile called for: ${type}`);
		return this.files.get(type);
	}

	async updateFile(
		type: MemoryBankFileType,
		content: string,
	): AsyncResult<void, MemoryBankError> {
		const result = await tryCatchAsync<void>(async () => {
			const context = this.createContext();
			await this.updateMemoryBankFile(type, content, context);
		});

		if (isError(result)) {
			// Wrap generic errors in a MemoryBankError
			return {
				success: false,
				error: new MemoryBankError(
					`Failed to update file ${type}: ${result.error.message}`,
					"UPDATE_ERROR",
					{ originalError: result.error },
				),
			};
		}

		return result; // It's a success result
	}

	async writeFileByPath(
		relativePath: string,
		content: string,
	): AsyncResult<void, MemoryBankError> {
		const result = await tryCatchAsync<void>(async () => {
			const fullPath = validateAndConstructArbitraryFilePath(
				this.memoryBankFolder,
				relativePath,
			);
			// Ensure directory exists using FileOperationManager
			const mkdirResult = await this.fileOperationManager.mkdirWithRetry(
				path.dirname(fullPath),
				{ recursive: true },
			);
			if (!mkdirResult.success) {
				throw new MemoryBankError(
					`Failed to create directory for ${relativePath}: ${mkdirResult.error.message}`,
					"MKDIR_ERROR",
					{ originalError: mkdirResult.error.originalError },
				);
			}

			// Write file using FileOperationManager
			const writeResult = await this.fileOperationManager.writeFileWithRetry(
				fullPath,
				content,
			);
			if (!writeResult.success) {
				throw new MemoryBankError(
					`Failed to write file to ${relativePath}: ${writeResult.error.message}`,
					"WRITE_FILE_ERROR",
					{ originalError: writeResult.error.originalError },
				);
			}

			// Stat file using FileOperationManager to get mtime for cache
			const statResult = await this.fileOperationManager.statWithRetry(fullPath);
			if (!statResult.success) {
				// Log warning if stat fails, but proceed as write was successful
				this.logger.warn(
					`Failed to stat file ${fullPath} after writing: ${statResult.error.message}`,
				);
			} else {
				// Use adapter instead of direct cache access
				this.legacyCacheAdapter.set(fullPath, {
					content,
					mtimeMs: statResult.data.mtimeMs,
				});
			}
			this.logger.info(`Written file by path: ${relativePath}`);
		});

		if (isError(result)) {
			// Wrap generic errors in a MemoryBankError
			return {
				success: false,
				error: new MemoryBankError(
					`Failed to write file by path ${relativePath}: ${result.error.message}`,
					"WRITE_ERROR",
					{ originalError: result.error },
				),
			};
		}

		return result; // It's a success result
	}

	getAllFiles(): MemoryBankFile[] {
		return Array.from(this.files.values());
	}

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

	async checkHealth(): AsyncResult<string, MemoryBankError> {
		const result = await tryCatchAsync<string>(async () => {
			const context = this.createContext();
			const healthResult = await this.performHealthCheck(context);
			return healthResult.summary;
		});

		if (isError(result)) {
			return {
				success: false,
				error: new MemoryBankError(
					`Health check failed: ${result.error.message}`,
					"HEALTH_CHECK_ERROR",
					{ originalError: result.error },
				),
			};
		}

		return result;
	}

	invalidateCache(filePath?: string): void {
		const absoluteFilePath = filePath
			? path.resolve(this.memoryBankFolder, filePath)
			: undefined;
		this.cacheManager.invalidateCache(absoluteFilePath);
	}

	getCacheStats() {
		return this.cacheManager.getStats();
	}

	resetCacheStats(): void {
		this.cacheManager.resetStats();
	}

	/**
	 * Get the FileOperationManager instance for dependency injection
	 */
	getFileOperationManager(): FileOperationManager {
		return this.fileOperationManager;
	}

	// ============================================================================
	// Private Helper Methods (moved from memory-bank-file-helpers.ts)
	// ============================================================================

	/**
	 * Constants for metadata property names
	 */
	private static readonly metadataProps = {
		CREATED: "created",
		UPDATED: "updated",
	} as const;

	/**
	 * Parse frontmatter from file content and return parsed metadata
	 */
	private parseFrontmatter(content: string, _fileType: MemoryBankFileType) {
		try {
			const { data: metadata, content: contentWithoutFrontmatter } = matter(content);

			// Auto-manage timestamps if not present
			metadata[MemoryBankServiceCore.metadataProps.CREATED] ??= new Date().toISOString();
			metadata[MemoryBankServiceCore.metadataProps.UPDATED] = new Date().toISOString();

			return {
				metadata,
				content: contentWithoutFrontmatter,
				parseSuccess: true,
			};
		} catch (error) {
			// If frontmatter parsing fails, treat as plain content
			return {
				metadata: {},
				content,
				parseSuccess: false,
				parseError: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Creates a file from a template, writes it to disk, and updates the cache.
	 */
	private async createFileFromTemplateAndCache(
		fileType: MemoryBankFileType,
		filePath: string,
		context: FileOperationContext,
	): Promise<{ content: string; stats: import("node:fs").Stats }> {
		const content = getTemplateForFileType(fileType);
		const writeResult = await context.fileOperationManager.writeFileWithRetry(
			filePath,
			content,
		);
		if (!writeResult.success) throw writeResult.error;

		const newStatResult = await context.fileOperationManager.statWithRetry(filePath);
		if (!newStatResult.success) throw newStatResult.error;
		const stats = newStatResult.data;

		// Update cache
		context.fileCache.set(filePath, { content, mtimeMs: stats.mtimeMs });
		context.logger.info(`Created missing file from template: ${fileType}`);
		return { content, stats };
	}

	/**
	 * Attempts to load a file from disk or cache.
	 * Returns null if the file doesn't exist or an error occurs during stat/read.
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
				context.logger.warn(
					`Read failed for ${filePath}: ${streamingResult.error.message}`,
				);
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
	 * Loads a single file with template fallback and caching
	 */
	private async loadFileWithTemplate(
		fileType: MemoryBankFileType,
		context: FileOperationContext,
	): Promise<{ content: string; stats: import("node:fs").Stats; wasCreated: boolean }> {
		const filePath = validateAndConstructFilePath(context.memoryBankFolder, fileType);

		// Ensure directory exists
		const mkdirResult = await context.fileOperationManager.mkdirWithRetry(
			path.dirname(filePath),
			{
				recursive: true,
			},
		);
		if (!mkdirResult.success) {
			throw mkdirResult.error;
		}

		const loadedFile = await this.loadFileFromDiskOrCache(filePath, fileType, context);

		if (loadedFile) {
			return { ...loadedFile, wasCreated: false };
		}

		// If loadedFile is null, it means the file needs to be created from a template.
		context.logger.warn(
			`File ${filePath} for ${fileType} not found or unreadable, attempting to create from template.`,
		);
		const { content, stats } = await this.createFileFromTemplateAndCache(
			fileType,
			filePath,
			context,
		);
		return { content, stats, wasCreated: true };
	}

	/**
	 * Checks the root memory bank folder.
	 */
	private async checkRootFolder(context: FileOperationContext): Promise<string[]> {
		const issues: string[] = [];
		try {
			const rootStatResult = await context.fileOperationManager.statWithRetry(
				context.memoryBankFolder,
			);
			if (!rootStatResult.success) {
				issues.push(
					`Error accessing root memory bank folder: ${rootStatResult.error.message}`,
				);
			} else if (!rootStatResult.data.isDirectory()) {
				issues.push(
					`Root memory bank path is not a directory: ${context.memoryBankFolder}`,
				);
			}
		} catch (e) {
			issues.push(
				`Unexpected error checking root memory bank folder: ${e instanceof Error ? e.message : String(e)}`,
			);
		}
		return issues;
	}

	/**
	 * Checks a specific file type and its parent directory.
	 */
	private async checkFileAndParentDir(
		fileType: MemoryBankFileType,
		context: FileOperationContext,
	): Promise<string[]> {
		const issues: string[] = [];
		try {
			const filePath = validateAndConstructFilePath(context.memoryBankFolder, fileType);
			const parentDir = path.dirname(filePath);

			// Check parent directory first if it's not the root memory bank folder itself
			if (parentDir !== context.memoryBankFolder) {
				try {
					const dirStatResult =
						await context.fileOperationManager.statWithRetry(parentDir);
					if (!dirStatResult.success) {
						issues.push(
							`Error accessing parent directory ${parentDir} for ${fileType}: ${dirStatResult.error.message}`,
						);
					} else if (!dirStatResult.data.isDirectory()) {
						issues.push(
							`Required parent path is not a directory: ${parentDir} for ${fileType}`,
						);
					}
				} catch (dirError) {
					issues.push(
						`Missing or unreadable parent directory: ${parentDir} for ${fileType} (Error: ${dirError instanceof Error ? dirError.message : String(dirError)})`,
					);
				}
			}

			// Check the file itself
			const fileStatResult = await context.fileOperationManager.statWithRetry(filePath);
			if (!fileStatResult.success) {
				issues.push(
					`Missing or unreadable file ${fileType}: ${fileStatResult.error.message}`,
				);
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

	/**
	 * Performs comprehensive health check of memory bank
	 */
	private async performHealthCheck(
		context: FileOperationContext,
	): Promise<import("@/types/core.js").HealthCheckResult> {
		let issues: string[] = [];

		// Check root folder
		issues = issues.concat(await this.checkRootFolder(context));

		// Check all required files and their parent directories
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
	 * Extract metadata type from parsed frontmatter safely
	 */
	private extractMetadataType(metadata: unknown): string | undefined {
		return typeof metadata === "object" && metadata !== null && "type" in metadata
			? String(metadata.type)
			: undefined;
	}

	/**
	 * Extract created date from metadata safely
	 */
	private extractCreatedDate(metadata: unknown): Date | undefined {
		const metadataCreated =
			typeof metadata === "object" && metadata !== null && "created" in metadata
				? String(metadata.created)
				: undefined;
		return metadataCreated ? new Date(metadataCreated) : undefined;
	}

	/**
	 * Parse and validate frontmatter metadata
	 */
	private parseAndValidateMetadata(
		rawContent: string,
		fileType: MemoryBankFileType,
		context: FileOperationContext,
	) {
		const { metadata, content, parseSuccess, parseError } = this.parseFrontmatter(
			rawContent,
			fileType,
		);

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

	/**
	 * Create MemoryBankFile entry from processed data
	 */
	private createMemoryBankFileEntry(
		fileType: MemoryBankFileType,
		stats: import("node:fs").Stats,
		filePath: string,
		parsedData: ReturnType<typeof this.parseAndValidateMetadata>,
	): MemoryBankFile {
		const { content, metadata, validationStatus, validationErrors, actualSchemaUsed } =
			parsedData;
		const createdDate = this.extractCreatedDate(metadata);

		const entry: MemoryBankFile = {
			type: fileType,
			content,
			lastUpdated: stats.mtime,
			filePath,
			relativePath: fileType,
			metadata: metadata as import("../types/core.js").FrontmatterMetadata,
			validationStatus,
			// Use conditional spreading for optional properties with exactOptionalPropertyTypes
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

	/**
	 * High-level orchestrator for loading all memory bank files
	 */
	private async loadAllMemoryBankFiles(
		context: FileOperationContext,
	): Promise<MemoryBankFileType[]> {
		this.files.clear();
		context.logger.info("Loading all memory bank files...");

		const createdFiles: MemoryBankFileType[] = [];

		try {
			for (const fileType of Object.values(MemoryBankFileType)) {
				const {
					content: rawContent,
					stats,
					wasCreated,
				} = await this.loadFileWithTemplate(fileType, context);

				if (wasCreated) {
					createdFiles.push(fileType);
				}

				const filePath = validateAndConstructFilePath(context.memoryBankFolder, fileType);
				const parsedData = this.parseAndValidateMetadata(rawContent, fileType, context);
				const memoryBankFile = this.createMemoryBankFileEntry(
					fileType,
					stats,
					filePath,
					parsedData,
				);

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
	 * Updates a file with cache synchronization
	 */
	private async updateMemoryBankFile(
		fileType: MemoryBankFileType,
		content: string,
		context: FileOperationContext,
	): Promise<void> {
		const filePath = validateAndConstructFilePath(context.memoryBankFolder, fileType);

		const writeResult = await context.fileOperationManager.writeFileWithRetry(
			filePath,
			content,
		);
		if (!writeResult.success) throw writeResult.error;

		const statResult = await context.fileOperationManager.statWithRetry(filePath);
		if (!statResult.success) throw statResult.error;
		const stats = statResult.data;

		// Update files map
		this.files.set(fileType, {
			type: fileType,
			content,
			lastUpdated: stats.mtime,
		});

		// Update cache
		context.fileCache.set(filePath, { content, mtimeMs: stats.mtimeMs });

		context.logger.info(`Updated file: ${fileType}`);
	}

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
		this.logger.info(
			`Memory bank is NOT initialised. Missing/invalid files: ${missingFiles.join(", ")}`,
		);
	}
}
