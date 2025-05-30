import { promises as fs } from "node:fs";
import * as path from "node:path";
import type {
	CacheStats,
	FileCache,
	FileOperationContext,
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
	private readonly _cacheStats: CacheStats = { hits: 0, misses: 0, reloads: 0 };

	constructor(memoryBankPath: string, logger?: MemoryBankLogger) {
		this._memoryBankFolder = memoryBankPath;
		this.logger = logger || MemoryBankLoggerFactory.createLogger();
		this.cacheManager = new CacheManager(this._fileCache, this._cacheStats);
	}

	async getIsMemoryBankInitialized(): Promise<boolean> {
		try {
			const context = this.createContext();
			const isValid = await validateMemoryBankDirectory(context);
			if (!isValid) return false;

			const { missingFiles, filesToInvalidate } = await validateAllMemoryBankFiles(context);
			this.invalidateFilesInCache(filesToInvalidate);

			const isInitialized = missingFiles.length === 0;
			if (isInitialized) {
				this.logSuccessfulInitialization();
			} else {
				this.logFailedInitialization(missingFiles);
			}

			return isInitialized;
		} catch (err) {
			this.logger.error(
				`Error checking memory bank initialisation: ${err instanceof Error ? err.message : String(err)}`,
			);
			return false;
		}
	}

	async initializeFolders(): Promise<void> {
		await ensureMemoryBankFolders(this._memoryBankFolder);
	}

	async loadFiles(): Promise<MemoryBankFileType[]> {
		const context = this.createContext();
		const createdFiles = await loadAllMemoryBankFiles(context, this.files);
		this.ready = true;
		return createdFiles;
	}

	isReady(): boolean {
		return this.ready;
	}

	getFile(type: MemoryBankFileType): MemoryBankFile | undefined {
		this.logger.info(`getFile called for: ${type}`);
		return this.files.get(type);
	}

	async updateFile(type: MemoryBankFileType, content: string): Promise<void> {
		const context = this.createContext();
		await updateMemoryBankFileHelper(type, content, context, this.files);
	}

	async writeFileByPath(relativePath: string, content: string): Promise<void> {
		const fullPath = validateAndConstructArbitraryFilePath(
			this._memoryBankFolder,
			relativePath,
		);
		await fs.mkdir(path.dirname(fullPath), { recursive: true });
		await fs.writeFile(fullPath, content);

		const stats = await fs.stat(fullPath);
		this._fileCache.set(fullPath, { content, mtimeMs: stats.mtimeMs });
		this.logger.info(`Written file by path: ${relativePath}`);
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

	async checkHealth(): Promise<string> {
		const context = this.createContext();
		const healthResult = await performHealthCheck(context);
		return healthResult.summary;
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
