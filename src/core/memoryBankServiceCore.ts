import type { Stats } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { getTemplateForFileType } from "../lib/memoryBankTemplates.js";
import type { MemoryBank, MemoryBankFile } from "../types/types.js";
import { MemoryBankFileType } from "../types/types.js";

// A simple logger that writes all levels to stderr
const createStderrLogger = (): Console => {
	const writer = (level: string, ...args: unknown[]) => {
		process.stderr.write(`[${level.toUpperCase()}] ${args.map(String).join(" ")}\n`);
	};
	return {
		log: (...args: unknown[]) => writer("log", ...args),
		info: (...args: unknown[]) => writer("info", ...args),
		warn: (...args: unknown[]) => writer("warn", ...args),
		error: (...args: unknown[]) => writer("error", ...args),
		debug: (...args: unknown[]) => writer("debug", ...args),
		table: (tabularData: unknown, properties?: string[]) =>
			process.stderr.write(`${JSON.stringify(tabularData, properties, 2)}\n`),
		time: (label?: string) => console.time(label),
		timeEnd: (label?: string) => console.timeEnd(label),
		timeLog: (label?: string, ...data: unknown[]) => console.timeLog(label, ...data),
		assert: (condition?: boolean, ...data: unknown[]) => {
			if (!condition) {
				writer("assert", ...data);
			}
		},
		clear: () => {},
		count: (label?: string) => console.count(label),
		countReset: (label?: string) => console.countReset(label),
		dir: (item: unknown, options?: unknown) =>
			process.stderr.write(`${JSON.stringify(item, null, 2)}\n`),
		dirxml: (...data: unknown[]) => writer("dirxml", ...data),
		group: (...label: unknown[]) => console.group(...label),
		groupCollapsed: (...label: unknown[]) => console.groupCollapsed(...label),
		groupEnd: () => console.groupEnd(),
		profile: (label?: string) => console.profile(label),
		profileEnd: (label?: string) => console.profileEnd(label),
		timeStamp: (label?: string) => console.timeStamp(label),
		trace: (...data: unknown[]) => writer("trace", ...data),
		Console: console.Console,
	} as Console;
};

export class MemoryBankServiceCore implements MemoryBank {
	private _memoryBankFolder: string;
	files: Map<MemoryBankFileType, MemoryBankFile> = new Map();
	private ready = false;
	private logger: Console;

	// In-memory cache: key is file path, value is { content, mtimeMs }
	private _fileCache: Map<string, { content: string; mtimeMs: number }> = new Map();
	private _cacheStats = { hits: 0, misses: 0, reloads: 0 };

	constructor(memoryBankPath: string, logger?: Console) {
		this._memoryBankFolder = memoryBankPath;
		this.logger = logger || createStderrLogger(); // Use custom stderr logger if none provided
	}

	async getIsMemoryBankInitialized(): Promise<boolean> {
		try {
			this.logger.info("Checking if memory bank is initialised...");
			const isDirectoryExists = await fs
				.stat(this._memoryBankFolder)
				.then((stat) => stat.isDirectory())
				.catch(() => false);
			if (!isDirectoryExists) {
				this.logger.error("Memory bank folder does not exist.");
				return false;
			}
			for (const fileType of Object.values(MemoryBankFileType)) {
				if (fileType.includes("/")) {
					const filePath = path.join(this._memoryBankFolder, fileType);
					const exists = await fs
						.stat(filePath)
						.then((stat) => stat.isFile())
						.catch(() => false);
					this.logger.error(`Checked file: ${fileType} - Exists: ${exists}`);
					if (!exists) {
						return false;
					}
				}
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
		const subfolders = ["", "core", "systemPatterns", "techContext", "progress"];
		for (const subfolder of subfolders) {
			const folderPath = path.join(this._memoryBankFolder, subfolder);
			await fs.mkdir(folderPath, { recursive: true });
		}
	}

	async loadFiles(): Promise<MemoryBankFileType[]> {
		this.files.clear();
		this.logger.info("Loading all memory bank files...");
		const createdFiles: MemoryBankFileType[] = [];
		try {
			for (const fileType of Object.values(MemoryBankFileType)) {
				const filePath = path.join(this._memoryBankFolder, fileType);
				await fs.mkdir(path.dirname(filePath), { recursive: true });
				let content: string;
				let stats: Stats;
				// --- Caching logic start ---
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
					this.logger.info(`Loaded file: ${fileType}`);
				} catch {
					content = getTemplateForFileType(fileType as MemoryBankFileType);
					await fs.writeFile(filePath, content);
					stats = await fs.stat(filePath);
					this._fileCache.set(filePath, { content, mtimeMs: stats.mtimeMs });
					createdFiles.push(fileType as MemoryBankFileType);
					this.logger.info(`Created missing file from template: ${fileType}`);
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
				this.logger.info(msg);
			}
			this.logger.info("Memory bank initialised successfully.");
			return createdFiles;
		} catch (err) {
			this.ready = false;
			this.logger.error(
				`Error loading memory bank files: ${err instanceof Error ? err.message : String(err)}`,
			);
			throw err;
		}
	}

	isReady(): boolean {
		return this.ready;
	}

	getFile(type: MemoryBankFileType): MemoryBankFile | undefined {
		this.logger.info(`getFile called for: ${type}`);
		return this.files.get(type);
	}

	async updateFile(type: MemoryBankFileType, content: string): Promise<void> {
		const filePath = path.join(this._memoryBankFolder, type);
		await fs.writeFile(filePath, content);
		const stats = await fs.stat(filePath);
		this.files.set(type as MemoryBankFileType, {
			type: type as MemoryBankFileType,
			content,
			lastUpdated: stats.mtime,
		});
		// Update cache after write
		this._fileCache.set(filePath, { content, mtimeMs: stats.mtimeMs });
		this.logger.info(`Updated file: ${type}`);
	}

	async writeFileByPath(relativePath: string, content: string): Promise<void> {
		const fullPath = path.join(this._memoryBankFolder, relativePath);
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
