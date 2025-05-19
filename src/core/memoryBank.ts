import * as vscode from "vscode";
import * as fs from "node:fs/promises";
import type { Stats } from "node:fs";
import * as path from "node:path";
import type { MemoryBank, MemoryBankFile } from "../types/types.js";
import { MemoryBankFileType } from "../types/types.js";
import { CursorRulesService } from "../lib/cursor-rules-service.js";
import {
  CURSOR_MEMORY_BANK_FILENAME,
  CURSOR_MEMORY_BANK_RULES_FILE,
} from "../lib/cursor-rules.js";
import { Logger, LogLevel } from '../utils/log.js';
import { getTemplateForFileType } from "../lib/memoryBankTemplates.js";

export class MemoryBankService implements MemoryBank {
		private _memoryBankFolder: string;
		files: Map<MemoryBankFileType, MemoryBankFile> = new Map();
		private cursorRulesService: CursorRulesService;
		private ready = false;

		// In-memory cache: key is file path, value is { content, mtimeMs }
		private _fileCache: Map<string, { content: string; mtimeMs: number }> =
			new Map();
		private _cacheStats = { hits: 0, misses: 0, reloads: 0 };

		constructor(private context: vscode.ExtensionContext) {
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (!workspaceFolders) {
				throw new Error("No workspace folder found");
			}
			this._memoryBankFolder = path.join(
				workspaceFolders[0].uri.fsPath,
				"memory-bank",
			);
			this.cursorRulesService = new CursorRulesService(this.context);
		}

		async createMemoryBankRulesIfNotExists(): Promise<void> {
			await this.cursorRulesService.createRulesFile(
				CURSOR_MEMORY_BANK_FILENAME,
				CURSOR_MEMORY_BANK_RULES_FILE,
			);
		}

		async getIsMemoryBankInitialized(): Promise<boolean> {
			try {
				Logger.getInstance().info("Checking if memory bank is initialised...");
				const isDirectoryExists = await fs
					.stat(this._memoryBankFolder)
					.then((stat) => stat.isDirectory())
					.catch(() => false);
				if (!isDirectoryExists) {
					Logger.getInstance().info("Memory bank folder does not exist.");
					return false;
				}

				const missingOrInvalidFiles: string[] = [];
				const filesToInvalidate: string[] = [];

				for (const fileType of Object.values(MemoryBankFileType)) {
					if (fileType.includes("/")) {
						const filePath = path.join(this._memoryBankFolder, fileType);
						let stats: Stats | undefined;
						try {
							stats = await fs.stat(filePath);
							if (!stats.isFile()) {
								missingOrInvalidFiles.push(fileType);
								filesToInvalidate.push(filePath);
								Logger.getInstance().info(
									`Checked file: ${fileType} - Exists: false (not a file)`,
								);
								this._cacheStats.misses++;
							} else {
								const cached = this._fileCache.get(filePath);
								if (cached && cached.mtimeMs === stats.mtimeMs) {
									this._cacheStats.hits++;
								} else {
									this._cacheStats.misses++;
								}
								Logger.getInstance().info(
									`Checked file: ${fileType} - Exists: true`,
								);
							}
						} catch {
							missingOrInvalidFiles.push(fileType);
							filesToInvalidate.push(filePath);
							Logger.getInstance().info(
								`Checked file: ${fileType} - Exists: false`,
							);
							this._cacheStats.misses++;
						}
					}
				}

				// Invalidate cache for missing/invalid files only
				for (const filePath of filesToInvalidate) {
					if (this._fileCache.has(filePath)) {
						this._fileCache.delete(filePath);
						Logger.getInstance().info(
							`Cache invalidated for missing/invalid file: ${filePath}`,
						);
					}
				}

				if (missingOrInvalidFiles.length > 0) {
					Logger.getInstance().info(
						`Memory bank is NOT initialised. Missing/invalid files: ${missingOrInvalidFiles.join(", ")}`,
					);
					return false;
				}

				Logger.getInstance().info("Memory bank is initialised.");
				return true;
			} catch (err) {
				Logger.getInstance().info(
					`Error checking memory bank initialisation: ${err instanceof Error ? err.message : String(err)}`,
				);
				return false;
			}
		}

		async initializeFolders(): Promise<void> {
			// Ensure all required subfolders exist
			const subfolders = [
				"", // root for legacy files
				"core",
				"systemPatterns",
				"techContext",
				"progress",
			];
			for (const subfolder of subfolders) {
				const folderPath = path.join(this._memoryBankFolder, subfolder);
				await fs.mkdir(folderPath, { recursive: true });
			}
		}

		/**
		 * Loads all memory bank files asynchronously, creating them from template if missing.
		 * Sets the ready state accordingly.
		 * Returns an array of created file types if self-healing occurred.
		 */
		async loadFiles(): Promise<MemoryBankFileType[]> {
			this.files.clear();
			Logger.getInstance().info("Loading all memory bank files...");
			const createdFiles: MemoryBankFileType[] = [];
			try {
				for (const fileType of Object.values(MemoryBankFileType)) {
					const filePath = path.join(this._memoryBankFolder, fileType);
					await fs.mkdir(path.dirname(filePath), { recursive: true });
					let content: string;
					let stats: Stats;
					const cached = this._fileCache.get(filePath);
					try {
						stats = await fs.stat(filePath);
						if (cached && cached.mtimeMs === stats.mtimeMs) {
							content = cached.content;
							this._cacheStats.hits++;
						} else {
							content = await fs.readFile(filePath, "utf-8");
							this._fileCache.set(filePath, {
								content,
								mtimeMs: stats.mtimeMs,
							});
							if (cached) {
								this._cacheStats.reloads++;
							} else {
								this._cacheStats.misses++;
							}
						}
						Logger.getInstance().info(`Loaded file: ${fileType}`);
					} catch {
						content = getTemplateForFileType(fileType as MemoryBankFileType);
						await fs.writeFile(filePath, content);
						stats = await fs.stat(filePath);
						this._fileCache.set(filePath, { content, mtimeMs: stats.mtimeMs });
						createdFiles.push(fileType as MemoryBankFileType);
						Logger.getInstance().info(
							`Created missing file from template: ${fileType}`,
						);
					}
					this.files.set(fileType as MemoryBankFileType, {
						type: fileType as MemoryBankFileType,
						content,
						lastUpdated: stats.mtime,
					});
				}
				this.ready = true;
				if (createdFiles.length > 0) {
					const msg = `Self-healing: Created missing files: ${createdFiles.join(", ")}`;
					Logger.getInstance().info(msg);
					vscode.window.showInformationMessage(
						`Memory Bank repaired: ${createdFiles.length} file(s) created.`,
						{ modal: false },
					);
				}
				Logger.getInstance().info("Memory bank initialised successfully.");
				return createdFiles;
			} catch (err) {
				this.ready = false;
				Logger.getInstance().info(
					`Error loading memory bank files: ${err instanceof Error ? err.message : String(err)}`,
				);
				throw err;
			}
		}

		/**
		 * Returns true if the memory bank is ready (all files loaded and available).
		 */
		isReady(): boolean {
			return this.ready;
		}

		getFile(type: MemoryBankFileType): MemoryBankFile | undefined {
			Logger.getInstance().info(`getFile called for: ${type}`);
			return this.files.get(type);
		}

		async updateFile(type: MemoryBankFileType, content: string): Promise<void> {
			const filePath = path.join(this._memoryBankFolder, type);
			try {
				Logger.getInstance().info(`Updating file: ${type}`);
				await fs.writeFile(filePath, content);
				const stats = await fs.stat(filePath);
				this.files.set(type, {
					type,
					content,
					lastUpdated: stats.mtime,
				});
				// Update cache after write
				this._fileCache.set(filePath, { content, mtimeMs: stats.mtimeMs });
				Logger.getInstance().info(`File updated: ${type}`);
			} catch (err) {
				Logger.getInstance().info(
					`Error updating memory bank file ${type}: ${err instanceof Error ? err.message : String(err)}`,
				);
				throw err;
			}
		}

		getAllFiles(): MemoryBankFile[] {
			Logger.getInstance().info("getAllFiles called.");
			return Array.from(this.files.values());
		}

		getFilesWithFilenames(): string {
			Logger.getInstance().info("getFilesWithFilenames called.");
			return Array.from(this.files.values())
				.map(
					(file) =>
						`${file.type}:\nlast updated:${file.lastUpdated}\n\n${file.content}`,
				)
				.join("\n\n");
		}

		async checkHealth(): Promise<string> {
			const issues: string[] = [];
			// Check root folder
			try {
				await fs.stat(this._memoryBankFolder);
			} catch {
				issues.push(`Missing folder: ${this._memoryBankFolder}`);
			}
			// Check all required files
			for (const fileType of Object.values(MemoryBankFileType)) {
				if (fileType.includes("/")) {
					const filePath = path.join(this._memoryBankFolder, fileType);
					try {
						await fs.access(filePath);
					} catch {
						issues.push(`Missing or unreadable: ${fileType}`);
					}
				}
			}
			if (issues.length === 0) {
				return "Memory Bank Health: ✅ All files and folders are present and readable.";
			}
			return `Memory Bank Health: ❌ Issues found:
${issues.join("\n")}`;
		}

		// Invalidate cache for a specific file or all files
		invalidateCache(filePath?: string) {
			if (filePath) {
				this._fileCache.delete(path.resolve(filePath));
			} else {
				this._fileCache.clear();
			}
		}

		// Get current cache stats
		getCacheStats() {
			return { ...this._cacheStats };
		}

		// Reset cache stats
		resetCacheStats() {
			this._cacheStats = { hits: 0, misses: 0, reloads: 0 };
		}
	}
