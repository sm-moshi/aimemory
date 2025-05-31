import { promises as fs } from "node:fs";
import * as path from "node:path";
import { MemoryBankError, isError, tryCatchAsync } from "../types/types.js";
import type {
	AsyncResult,
	FileCache,
	FileOperationContext,
	LegacyCacheStats,
	MemoryBank,
	MemoryBankFile,
	MemoryBankFileType,
	MemoryBankLogger,
} from "../types/types.js";
import { MemoryBankLoggerFactory } from "../utils/MemoryBankLogger.js";
import {
	CacheManager,
	ensureMemoryBankFolders,
	loadAllMemoryBankFiles,
	performHealthCheck,
	updateMemoryBankFile as updateMemoryBankFileHelper,
	validateAllMemoryBankFiles,
	validateAndConstructArbitraryFilePath,
	validateMemoryBankDirectory,
} from "../utils/fileOperationHelpers.js";

export class MemoryBankServiceCore implements MemoryBank {
	private readonly _memoryBankFolder: string;
	files: Map<MemoryBankFileType, MemoryBankFile> = new Map();
	private ready = false;
	private readonly logger: MemoryBankLogger;
	private readonly cacheManager: CacheManager;

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

	constructor(memoryBankPath: string, logger?: MemoryBankLogger) {
		this._memoryBankFolder = memoryBankPath;
		this.logger = logger || MemoryBankLoggerFactory.createLogger();
		this.cacheManager = new CacheManager(this._fileCache, this._cacheStats);
	}

	async getIsMemoryBankInitialized(): AsyncResult<boolean, MemoryBankError> {
		const result = await tryCatchAsync<boolean>(async () => {
			const context = this.createContext();
			const isValid = await validateMemoryBankDirectory(context);

			if (!isValid) {
				throw new MemoryBankError("Memory bank directory is invalid.", "INVALID_DIRECTORY");
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
			return {
				success: false,
				error: new MemoryBankError(
					`Operation failed: ${result.error.message}`,
					"UNKNOWN_ERROR",
					{ originalError: result.error },
				),
			};
		}

		return result;
	}

	async initializeFolders(): AsyncResult<void, MemoryBankError> {
		const result = await tryCatchAsync<void>(async () => {
			await ensureMemoryBankFolders(this._memoryBankFolder);
		});

		if (isError(result)) {
			// Wrap generic errors in a MemoryBankError
			return {
				success: false,
				error: new MemoryBankError(
					`Initialization failed: ${result.error.message}`,
					"INIT_ERROR",
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
			// Wrap generic errors in a MemoryBankError
			return {
				success: false,
				error: new MemoryBankError(
					`Failed to load files: ${result.error.message}`,
					"LOAD_ERROR",
					{ originalError: result.error },
				),
			};
		}

		return result; // It's a success result
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
			await fs.mkdir(path.dirname(fullPath), { recursive: true });
			await fs.writeFile(fullPath, content);

			const stats = await fs.stat(fullPath);
			this._fileCache.set(fullPath, { content, mtimeMs: stats.mtimeMs });
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
