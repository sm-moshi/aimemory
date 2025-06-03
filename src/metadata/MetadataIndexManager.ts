/**
 * Metadata Index Manager
 *
 * Manages the centralized metadata index for memory bank files.
 * Provides functionality to build, maintain, and query file metadata efficiently.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import type { MemoryBankServiceCore } from "../core/memoryBankServiceCore.js";
import type {
	IndexChangeEvent,
	IndexChangeListener,
	IndexRebuildResult,
	IndexStats,
	MetadataIndexConfig,
	MetadataIndexEntry,
} from "../types/core.js";
import type { MemoryBankLogger } from "../types/index.js";

import { calculateFileMetrics, debounce, deepClone, inferFileType } from "./indexUtils.js";

/**
 * Default configuration for metadata indexing
 */
const DEFAULT_CONFIG: Required<Omit<MetadataIndexConfig, "memoryBankPath">> = {
	indexFilePath: ".index/metadata.json",
	autoRebuild: true,
	rebuildDebounceMs: 1000,
	maxIndexAge: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Centralized metadata index manager for memory bank files
 */
export class MetadataIndexManager {
	private readonly config: Required<MetadataIndexConfig>;
	private readonly indexPath: string;
	private index: MetadataIndexEntry[] = [];
	private indexLoaded = false;
	private isBuilding = false;
	private readonly listeners: IndexChangeListener[] = [];
	private readonly debouncedRebuild: (() => void) | null = null;

	constructor(
		private readonly memoryBankService: MemoryBankServiceCore,
		private readonly logger: MemoryBankLogger,
		config: MetadataIndexConfig,
	) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.indexPath = path.join(this.config.memoryBankPath, this.config.indexFilePath);

		// Set up debounced rebuild if auto-rebuild is enabled
		if (this.config.autoRebuild) {
			this.debouncedRebuild = debounce(
				() =>
					this.buildIndex().catch((error) =>
						this.logger.error(
							`Auto-rebuild failed: ${error instanceof Error ? error.message : String(error)}`,
						),
					),
				this.config.rebuildDebounceMs,
			);
		}
	}

	/**
	 * Load existing index from disk or create a new one
	 */
	async initialize(): Promise<void> {
		// Always ensure the index directory exists
		await this.ensureIndexDirectory();

		try {
			await this.loadIndex();
			this.indexLoaded = true;

			// Check if index is stale and needs rebuilding
			const stats = await this.getIndexStats();
			const indexAge = Date.now() - new Date(stats.lastBuildTime).getTime();

			if (indexAge > this.config.maxIndexAge) {
				this.logger.info(
					`Index is stale, rebuilding - age: ${Math.round(indexAge / (60 * 60 * 1000))} hours`,
				);
				await this.buildIndex();
			}
		} catch (error) {
			this.logger.warn(
				`Failed to load existing index, creating new one: ${error instanceof Error ? error.message : String(error)}`,
			);
			await this.buildIndex();
			this.indexLoaded = true;
		}
	}

	/**
	 * Build the complete metadata index by scanning all memory bank files
	 */
	async buildIndex(): Promise<IndexRebuildResult> {
		if (this.isBuilding) {
			throw new Error("Index build already in progress");
		}

		this.isBuilding = true;
		const startTime = Date.now();
		const errors: Array<{ relativePath: string; error: string }> = [];

		try {
			this.logger.info("Starting metadata index build");

			// Ensure index directory exists
			await this.ensureIndexDirectory();

			// Clear existing index
			this.index = [];

			// Scan for all .md files in memory bank directory
			const markdownFiles = await this.scanForMarkdownFiles();
			let filesProcessed = 0;
			let filesIndexed = 0;

			for (const relativePath of markdownFiles) {
				filesProcessed++;

				try {
					// Get file stats for metrics
					const fullPath = path.join(this.config.memoryBankPath, relativePath);
					const fileStats = await fs.stat(fullPath);

					// Read full file content
					const fullContent = await fs.readFile(fullPath, "utf-8");

					// Parse frontmatter if present
					const matter = await import("gray-matter");
					const { data: metadata, content } = matter.default(fullContent);

					// Calculate file metrics
					const fileMetrics = calculateFileMetrics(fullContent, content, fileStats.size);

					// Create index entry
					const indexEntry: MetadataIndexEntry = {
						relativePath,
						id: metadata.id as string | undefined,
						type: (metadata.type as string | undefined) ?? inferFileType(relativePath),
						title: metadata.title as string | undefined,
						description: metadata.description as string | undefined,
						tags: Array.isArray(metadata.tags)
							? (metadata.tags as string[])
							: undefined,
						created:
							(metadata.created as string) ??
							fileStats.birthtime.toISOString() ??
							new Date().toISOString(),
						updated: (metadata.updated as string) ?? fileStats.mtime.toISOString(),
						fileMetrics,
						validationStatus: "unchecked", // Will be validated later if needed
						lastIndexed: new Date().toISOString(),
					};

					this.index.push(indexEntry);
					filesIndexed++;

					this.logger.debug(
						`Indexed file: ${relativePath} - ${fileMetrics.sizeFormatted}, ${fileMetrics.lineCount} lines, type: ${indexEntry.type}`,
					);
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					errors.push({
						relativePath,
						error: errorMessage,
					});
					this.logger.warn(`Failed to index file: ${relativePath} - ${errorMessage}`);
				}
			}

			// Save index to disk
			await this.saveIndex();

			const duration = Date.now() - startTime;
			const stats = await this.getIndexStats();

			this.logger.info(
				`Metadata index build completed - processed: ${filesProcessed}, indexed: ${filesIndexed}, errors: ${errors.length}, duration: ${duration}ms`,
			);

			// Notify listeners
			this.emitEvent({
				type: "index_rebuilt",
				stats,
			});

			return {
				filesProcessed,
				filesIndexed,
				filesErrored: errors.length,
				duration,
				errors,
				stats,
			};
		} finally {
			this.isBuilding = false;
		}
	}

	/**
	 * Get all entries from the index
	 */
	getIndex(): MetadataIndexEntry[] {
		if (!this.indexLoaded) {
			throw new Error("Index not loaded. Call initialize() first.");
		}
		return deepClone(this.index);
	}

	/**
	 * Get a specific entry by relative path
	 */
	getEntry(relativePath: string): MetadataIndexEntry | undefined {
		if (!this.indexLoaded) {
			throw new Error("Index not loaded. Call initialize() first.");
		}
		return this.index.find((entry) => entry.relativePath === relativePath);
	}

	/**
	 * Add or update an entry in the index
	 */
	async updateEntry(relativePath: string): Promise<void> {
		if (!this.indexLoaded) {
			throw new Error("Index not loaded. Call initialize() first.");
		}

		try {
			// Check if file exists
			const fullPath = path.join(this.config.memoryBankPath, relativePath);
			try {
				await fs.access(fullPath);
			} catch {
				// File doesn't exist - throw error for explicit update calls
				throw new Error(`File not found: ${relativePath}`);
			}

			// Get file stats and content for metrics
			const fileStats = await fs.stat(fullPath);
			const fullContent = await fs.readFile(fullPath, "utf-8");

			// Parse frontmatter if present
			const matter = await import("gray-matter");
			const { data: metadata, content } = matter.default(fullContent);

			// Calculate file metrics
			const fileMetrics = calculateFileMetrics(fullContent, content, fileStats.size);

			// Create updated index entry
			const updatedEntry: MetadataIndexEntry = {
				relativePath,
				id: metadata.id as string | undefined,
				type: (metadata.type as string | undefined) ?? inferFileType(relativePath),
				title: metadata.title as string | undefined,
				description: metadata.description as string | undefined,
				tags: Array.isArray(metadata.tags) ? (metadata.tags as string[]) : undefined,
				created:
					(metadata.created as string) ??
					fileStats.birthtime.toISOString() ??
					new Date().toISOString(),
				updated: (metadata.updated as string) ?? fileStats.mtime.toISOString(),
				fileMetrics,
				validationStatus: "unchecked",
				lastIndexed: new Date().toISOString(),
			};

			// Find existing entry and update or add new
			const existingIndex = this.index.findIndex(
				(entry) => entry.relativePath === relativePath,
			);
			const isUpdate = existingIndex !== -1;

			if (isUpdate) {
				this.index[existingIndex] = updatedEntry;
			} else {
				this.index.push(updatedEntry);
			}

			// Save updated index
			await this.saveIndex();

			this.logger.debug(`${isUpdate ? "Updated" : "Added"} index entry: ${relativePath}`);

			// Notify listeners
			this.emitEvent({
				type: isUpdate ? "entry_updated" : "entry_added",
				entry: updatedEntry,
			});
		} catch (error) {
			this.logger.error(
				`Failed to update index entry: ${relativePath} - ${error instanceof Error ? error.message : String(error)}`,
			);
			this.emitEvent({
				type: "index_error",
				error: `Failed to update entry: ${error instanceof Error ? error.message : String(error)}`,
			});
			// Re-throw the error so tests can catch it
			throw error;
		}
	}

	/**
	 * Remove an entry from the index
	 */
	async removeEntry(relativePath: string): Promise<void> {
		if (!this.indexLoaded) {
			throw new Error("Index not loaded. Call initialize() first.");
		}

		const index = this.index.findIndex((entry) => entry.relativePath === relativePath);
		if (index !== -1) {
			this.index.splice(index, 1);
			await this.saveIndex();

			this.logger.debug(`Removed index entry: ${relativePath}`);

			// Notify listeners
			this.emitEvent({
				type: "entry_removed",
				relativePath,
			});
		}
	}

	/**
	 * Get index statistics
	 */
	async getIndexStats(): Promise<IndexStats> {
		if (!this.indexLoaded) {
			throw new Error("Index not loaded. Call initialize() first.");
		}

		const fileTypeCounts: Record<string, number> = {};
		const tagCounts: Record<string, number> = {};
		let totalSizeBytes = 0;
		let totalLineCount = 0;
		let validFiles = 0;
		let invalidFiles = 0;
		let uncheckedFiles = 0;

		for (const entry of this.index) {
			// Count file types
			const type = entry.type ?? "unknown";
			fileTypeCounts[type] = (fileTypeCounts[type] || 0) + 1;

			// Count tags
			if (entry.tags) {
				for (const tag of entry.tags) {
					tagCounts[tag] = (tagCounts[tag] || 0) + 1;
				}
			}

			// Accumulate metrics
			totalSizeBytes += entry.fileMetrics.sizeBytes;
			totalLineCount += entry.fileMetrics.lineCount;

			// Count validation statuses
			switch (entry.validationStatus) {
				case "valid":
					validFiles++;
					break;
				case "invalid":
					invalidFiles++;
					break;
				default:
					uncheckedFiles++;
					break;
			}
		}

		// Get index file stats for build time
		let lastBuildTime = new Date().toISOString();
		const lastBuildDuration = 0;

		try {
			const indexStats = await fs.stat(this.indexPath);
			lastBuildTime = indexStats.mtime.toISOString();
		} catch {
			// Index file doesn't exist or can't be read
		}

		return {
			totalFiles: this.index.length,
			validFiles,
			invalidFiles,
			uncheckedFiles,
			totalSizeBytes,
			totalLineCount,
			lastBuildTime,
			lastBuildDuration,
			fileTypeCounts,
			tagCounts,
		};
	}

	/**
	 * Trigger an auto-rebuild if enabled
	 */
	triggerAutoRebuild(): void {
		if (this.config.autoRebuild && this.debouncedRebuild) {
			this.debouncedRebuild();
		}
	}

	/**
	 * Add a listener for index change events
	 */
	addEventListener(listener: IndexChangeListener): void {
		this.listeners.push(listener);
	}

	/**
	 * Remove a listener for index change events
	 */
	removeEventListener(listener: IndexChangeListener): void {
		const index = this.listeners.indexOf(listener);
		if (index !== -1) {
			this.listeners.splice(index, 1);
		}
	}

	/**
	 * Load index from disk
	 */
	private async loadIndex(): Promise<void> {
		try {
			const indexData = await fs.readFile(this.indexPath, "utf-8");
			this.index = JSON.parse(indexData) as MetadataIndexEntry[];
			this.logger.debug(`Loaded metadata index from disk - entries: ${this.index.length}`);
		} catch (error) {
			if ((error as { code?: string }).code === "ENOENT") {
				this.logger.debug("No existing index file found");
				this.index = [];
			} else {
				throw error;
			}
		}
	}

	/**
	 * Save index to disk
	 */
	private async saveIndex(): Promise<void> {
		await this.ensureIndexDirectory();
		const indexData = JSON.stringify(this.index, null, 2);
		await fs.writeFile(this.indexPath, indexData, "utf-8");
		this.logger.debug(
			`Saved metadata index to disk - entries: ${this.index.length}, path: ${this.indexPath}`,
		);
	}

	/**
	 * Ensure the index directory exists
	 */
	private async ensureIndexDirectory(): Promise<void> {
		const indexDir = path.dirname(this.indexPath);
		await fs.mkdir(indexDir, { recursive: true });
	}

	/**
	 * Scan the memory bank directory for all .md files
	 */
	private async scanForMarkdownFiles(): Promise<string[]> {
		const markdownFiles: string[] = [];

		const scanDirectory = async (dirPath: string, relativePath = ""): Promise<void> => {
			try {
				const items = await fs.readdir(dirPath, { withFileTypes: true });

				for (const item of items) {
					const itemRelativePath = relativePath
						? path.join(relativePath, item.name)
						: item.name;
					const itemFullPath = path.join(dirPath, item.name);

					if (item.isDirectory()) {
						// Skip hidden directories and node_modules
						if (!item.name.startsWith(".") && item.name !== "node_modules") {
							await scanDirectory(itemFullPath, itemRelativePath);
						}
					} else if (item.isFile() && item.name.endsWith(".md")) {
						markdownFiles.push(itemRelativePath);
					}
				}
			} catch (error) {
				this.logger.warn(
					`Failed to scan directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		};

		await scanDirectory(this.config.memoryBankPath);
		return markdownFiles;
	}

	/**
	 * Emit an event to all listeners
	 */
	private emitEvent(event: IndexChangeEvent): void {
		for (const listener of this.listeners) {
			try {
				listener(event);
			} catch (error) {
				this.logger.error(
					`Error in index change listener: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
	}
}
