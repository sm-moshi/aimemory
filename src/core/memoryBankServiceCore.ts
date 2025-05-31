import * as path from "node:path";
import type { StreamingManager } from "../performance/StreamingManager.js";
import {
	validateAllMemoryBankFiles,
	validateMemoryBankDirectory,
} from "../services/validation/file-validation.js";
import type { FileCache, LegacyCacheStats } from "../types/cache.js";
import type {
	FileOperationContext,
	MemoryBank,
	MemoryBankFile,
	MemoryBankFileType,
} from "../types/core.js";
import { MemoryBankError, isError, tryCatchAsync } from "../types/errorHandling.js";
import type { AsyncResult } from "../types/errorHandling.js";
import type { MemoryBankLogger } from "../types/logging.js";
import { validateAndConstructArbitraryFilePath } from "../utils/files/path-validation.js";
import type { CacheManager } from "./CacheManager.js";
import type { FileOperationManager } from "./FileOperationManager.js";
import {
	loadAllMemoryBankFiles,
	performHealthCheck,
	updateMemoryBankFile as updateMemoryBankFileHelper,
} from "./memory-bank-file-helpers.js";

export class MemoryBankServiceCore implements MemoryBank {
	private readonly _memoryBankFolder: string;
	files: Map<MemoryBankFileType, MemoryBankFile> = new Map();
	private ready = false;
	private readonly logger: MemoryBankLogger;
	private readonly cacheManager: CacheManager;
	private readonly streamingManager: StreamingManager;
	private readonly fileOperationManager: FileOperationManager;

	// Cache management
	private readonly _fileCache: Map<string, FileCache> = new Map();
	private readonly _cacheStats: LegacyCacheStats = {
		hits: 0,
		misses: 0,
		totalFiles: 0,
		hitRate: 0,
		lastReset: new Date(),
		reloads: 0,
	};

	constructor(
		memoryBankPath: string,
		logger: MemoryBankLogger,
		cacheManager: CacheManager,
		streamingManager: StreamingManager,
		fileOperationManager: FileOperationManager,
	) {
		this._memoryBankFolder = memoryBankPath;
		this.logger = logger;
		this.cacheManager = cacheManager;
		this.streamingManager = streamingManager;
		this.fileOperationManager = fileOperationManager;
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
				const folderPath = path.join(this._memoryBankFolder, subfolder);
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
			const createdFiles = await loadAllMemoryBankFiles(context, this.files);
			this.ready = true;
			return createdFiles;
		});

		if (isError(result)) {
			this.ready = false;
			return {
				success: false,
				error: new MemoryBankError(
					`Failed to load files: ${result.error.message}`,
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
			await updateMemoryBankFileHelper(type, content, context, this.files);
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
				this._memoryBankFolder,
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
				this._fileCache.set(fullPath, { content, mtimeMs: statResult.data.mtimeMs });
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
			const healthResult = await performHealthCheck(context);
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
			? path.resolve(this._memoryBankFolder, filePath)
			: undefined;
		this.cacheManager.invalidateCache(absoluteFilePath);
	}

	getCacheStats() {
		return this.cacheManager.getStats();
	}

	resetCacheStats(): void {
		this.cacheManager.resetStats();
	}

	// Private helper methods
	private createContext(): FileOperationContext {
		return {
			memoryBankFolder: this._memoryBankFolder,
			logger: this.logger,
			fileCache: this._fileCache,
			cacheStats: this._cacheStats,
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
