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
	updateMemoryBankFile as updateMemoryBankFileHelper, // Renamed to avoid conflict
	validateAllMemoryBankFiles,
	validateAndConstructArbitraryFilePath,
	validateMemoryBankDirectory,
} from "../utils/fileOperationHelpers.js";

export class MemoryBankServiceCore implements MemoryBank {
	private readonly _memoryBankFolder: string;
	files: Map<MemoryBankFileType, MemoryBankFile> = new Map();
	private ready = false;
	private readonly logger: MemoryBankLogger; // Changed to MemoryBankLogger interface

	// In-memory cache and stats are now managed by CacheManager
	private readonly _fileCache: Map<string, FileCache> = new Map();
	private readonly _cacheStats: CacheStats = { hits: 0, misses: 0, reloads: 0 };
	private readonly cacheManager: CacheManager;

	constructor(memoryBankPath: string, logger?: MemoryBankLogger) {
		// Changed logger type
		this._memoryBankFolder = memoryBankPath;
		this.logger = logger || MemoryBankLoggerFactory.createLogger(); // Use factory
		this.cacheManager = new CacheManager(this._fileCache, this._cacheStats);
	}

	// Helper to create FileOperationContext
	private getFileOperationContext(): FileOperationContext {
		return {
			memoryBankFolder: this._memoryBankFolder,
			logger: this.logger,
			fileCache: this._fileCache, // Pass the actual maps
			cacheStats: this._cacheStats, // Pass the actual stats object
		};
	}

	async getIsMemoryBankInitialized(): Promise<boolean> {
		this.logger.info("Checking if memory bank is initialised...");
		const context = this.getFileOperationContext();

		try {
			const isDirectoryValid = await validateMemoryBankDirectory(context);
			if (!isDirectoryValid) {
				return false;
			}

			const { missingFiles, filesToInvalidate } = await validateAllMemoryBankFiles(context);

			// Invalidate cache for missing/invalid files
			for (const filePath of filesToInvalidate) {
				this.cacheManager.invalidateCache(filePath);
			}

			if (missingFiles.length > 0) {
				this.logger.info(
					`Memory bank is NOT initialised. Missing/invalid files: ${missingFiles.join(", ")}`,
				);
				return false;
			}

			this.logger.info("Memory bank is initialised.");
			return true;
		} catch (err) {
			this.logger.error(
				`Error checking memory bank initialisation: ${err instanceof Error ? err.message : String(err)}`,
			);
			return false;
		}
	}

	async initializeFolders(): Promise<void> {
		// Delegate to the new utility function
		await ensureMemoryBankFolders(this._memoryBankFolder);
	}

	async loadFiles(): Promise<MemoryBankFileType[]> {
		const context = this.getFileOperationContext();
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
		const context = this.getFileOperationContext();
		await updateMemoryBankFileHelper(type, content, context, this.files);
	}

	async writeFileByPath(relativePath: string, content: string): Promise<void> {
		const fullPath = validateAndConstructArbitraryFilePath(
			this._memoryBankFolder,
			relativePath,
		);
		await fs.mkdir(path.dirname(fullPath), { recursive: true }); // Ensure directory exists
		await fs.writeFile(fullPath, content);
		const stats = await fs.stat(fullPath);
		// Update cache after write
		this._fileCache.set(fullPath, { content, mtimeMs: stats.mtimeMs });
		this.logger.info(`Written file by path: ${relativePath}`);
	}

	getAllFiles(): MemoryBankFile[] {
		return Array.from(this.files.values());
	}

	getFilesWithFilenames(): string {
		return Array.from(this.files.entries())
			.map(([type, file]) => `${type}: ${file.content.substring(0, 40)}...`)
			.join("\n");
	}

	async checkHealth(): Promise<string> {
		const context = this.getFileOperationContext();
		const healthResult = await performHealthCheck(context);
		return healthResult.summary;
	}

	// Invalidate cache for a specific file or all files
	invalidateCache(filePath?: string) {
		// filePath in CacheManager needs to be absolute, ensure it is if provided
		const absoluteFilePath = filePath
			? path.resolve(this._memoryBankFolder, filePath)
			: undefined;
		this.cacheManager.invalidateCache(absoluteFilePath);
	}

	// Get current cache stats
	getCacheStats() {
		return this.cacheManager.getStats();
	}

	// Reset cache stats
	resetCacheStats() {
		this.cacheManager.resetStats();
	}
}
