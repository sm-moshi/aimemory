import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { CursorRulesService } from "../lib/cursor-rules-service.js";
import { CURSOR_MEMORY_BANK_FILENAME, CURSOR_MEMORY_BANK_RULES_FILE } from "../lib/cursor-rules.js";
import type {
	CacheStats,
	FileCache,
	FileOperationContext,
	MemoryBank,
	MemoryBankFile,
	MemoryBankFileType,
	MemoryBankLogger,
} from "../types/types.js";
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
import { Logger } from "../utils/log.js";

export class MemoryBankService implements MemoryBank {
	private readonly _memoryBankFolder: string;
	files: Map<MemoryBankFileType, MemoryBankFile> = new Map();
	private readonly cursorRulesService: CursorRulesService;
	private ready = false;
	private readonly logger: Logger;

	// Cache and stats managed by CacheManager
	private readonly _fileCache: Map<string, FileCache> = new Map();
	private readonly _cacheStats: CacheStats = { hits: 0, misses: 0, reloads: 0 };
	private readonly cacheManager: CacheManager;

	constructor(private readonly context: vscode.ExtensionContext) {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			throw new Error("No workspace folder found");
		}
		this._memoryBankFolder = path.join(
			workspaceFolders[0].uri.fsPath,
			".aimemory",
			"memory-bank",
		);
		this.cursorRulesService = new CursorRulesService(this.context);
		this.logger = Logger.getInstance();
		this.cacheManager = new CacheManager(this._fileCache, this._cacheStats);
	}

	// Helper to create FileOperationContext, using the VSCode Logger adapter
	private getFileOperationContext(): FileOperationContext {
		// Adapter to satisfy MemoryBankLogger interface for utilities
		const utilityLogger: MemoryBankLogger = {
			info: (message: string) => this.logger.info(message),
			error: (message: string) => this.logger.error(message),
			warn: (message: string) => this.logger.info(message), // No warn in VSCode Logger, map to info
			debug: (message: string) => this.logger.debug(message),
		};
		return {
			memoryBankFolder: this._memoryBankFolder,
			logger: utilityLogger,
			fileCache: this._fileCache,
			cacheStats: this._cacheStats,
		};
	}

	async createMemoryBankRulesIfNotExists(): Promise<void> {
		await this.cursorRulesService.createRulesFile(
			CURSOR_MEMORY_BANK_FILENAME,
			CURSOR_MEMORY_BANK_RULES_FILE,
		);
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
			let message = "Error checking memory bank initialisation";
			if (err instanceof Error) {
				message += `: ${err.message}`;
			} else {
				message += `: ${String(err)}`;
			}
			this.logger.info(message);
			return false;
		}
	}

	async initializeFolders(): Promise<void> {
		// Delegate to the new utility function
		await ensureMemoryBankFolders(this._memoryBankFolder);
	}

	/**
	 * Loads all memory bank files asynchronously, creating them from template if missing.
	 * Sets the ready state accordingly.
	 * Returns an array of created file types if self-healing occurred.
	 */
	async loadFiles(): Promise<MemoryBankFileType[]> {
		const context = this.getFileOperationContext();
		let createdFiles: MemoryBankFileType[] = [];

		try {
			createdFiles = await loadAllMemoryBankFiles(context, this.files);

			if (createdFiles.length > 0) {
				vscode.window.showInformationMessage(
					`Memory Bank repaired: ${createdFiles.length} file(s) created.`,
					{ modal: false },
				);
			}
			this.ready = true;
			return createdFiles;
		} catch (error) {
			this.ready = false; // Ensure ready is false on error
			this.logger.error(
				`Failed to load memory bank: ${error instanceof Error ? error.message : String(error)}`,
			);
			throw error; // Rethrow to allow callers to handle
		}
	}

	/**
	 * Returns true if the memory bank is ready (all files loaded and available).
	 */
	isReady(): boolean {
		return this.ready;
	}

	getFile(type: MemoryBankFileType): MemoryBankFile | undefined {
		this.logger.info(`getFile called for: ${type}`);
		return this.files.get(type);
	}

	async updateFile(type: MemoryBankFileType, content: string): Promise<void> {
		const context = this.getFileOperationContext();
		try {
			await updateMemoryBankFileHelper(type, content, context, this.files);
		} catch (err) {
			this.logger.info(
				`Error updating memory bank file ${type}: ${err instanceof Error ? err.message : String(err)}`,
			);
			throw err;
		}
	}

	getAllFiles(): MemoryBankFile[] {
		this.logger.info("getAllFiles called.");
		return Array.from(this.files.values());
	}

	getFilesWithFilenames(): string {
		this.logger.info("getFilesWithFilenames called.");
		return Array.from(this.files.values())
			.map((file) => `${file.type}:\nlast updated:${file.lastUpdated}\n\n${file.content}`)
			.join("\n\n");
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
		// Note: This does not update the this.files map which is keyed by MemoryBankFileType
		// For arbitrary paths, direct cache update and disk write is performed.
	}
}
