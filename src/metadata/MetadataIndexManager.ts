/**
 * Metadata Index Manager
 *
 * Manages a centralized index of metadata for all memory bank files.
 * Provides efficient querying and updating capabilities.
 */

import * as path from "node:path";
import type { FileOperationManager } from "../core/FileOperationManager.js";
import type { MemoryBankServiceCore } from "../core/memoryBankServiceCore.js";
import type {
	IndexChangeEvent,
	IndexChangeListener,
	IndexRebuildResult,
	IndexStats,
	Logger,
	MetadataIndexConfig,
	MetadataIndexEntry,
} from "../types/index.js";
import { calculateFileMetrics, debounce, deepClone, inferFileType } from "./indexUtils.js";

// Constants for metadata property names
const METADATA_PROPS = {
	ID: "id",
	TYPE: "type",
	TITLE: "title",
	DESCRIPTION: "description",
	TAGS: "tags",
	CREATED: "created",
	UPDATED: "updated",
} as const;

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<MetadataIndexConfig> = {
	memoryBankPath: "",
	indexFilePath: ".index/metadata.json",
	autoRebuild: true,
	rebuildDebounceMs: 1000,
	maxIndexAge: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Manages metadata index for efficient querying of memory bank files
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
		private readonly logger: Logger,
		private readonly fileOperationManager: FileOperationManager,
		config: MetadataIndexConfig,
	) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.indexPath = path.join(this.config.memoryBankPath, this.config.indexFilePath);

		// Set up debounced rebuild if auto-rebuild is enabled
		if (this.config.autoRebuild) {
			this.debouncedRebuild = debounce(
				() =>
					this.buildIndex().catch(error =>
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
					const statResult = await this.fileOperationManager.statWithRetry(fullPath);

					if (!statResult.success) {
						throw new Error(`Failed to stat file: ${statResult.error.message}`);
					}

					const fileStats = statResult.data;

					// Read full file content
					const readResult = await this.fileOperationManager.readFileWithRetry(fullPath);

					if (!readResult.success) {
						throw new Error(`Failed to read file: ${readResult.error.message}`);
					}

					const fullContent = readResult.data;

					// Parse frontmatter if present
					const matter = await import("gray-matter");
					const { data: metadata, content } = matter.default(fullContent);

					// Calculate file metrics
					const fileMetrics = calculateFileMetrics(fullContent, content, fileStats.size);

					// Create index entry
					const indexEntry: MetadataIndexEntry = {
						relativePath,
						created:
							(metadata[METADATA_PROPS.CREATED] as string) ??
							fileStats.birthtime?.toISOString() ??
							new Date().toISOString(),
						updated:
							(metadata[METADATA_PROPS.UPDATED] as string) ??
							fileStats.mtime.toISOString(),
						fileMetrics,
						validationStatus: "unchecked", // Will be validated later if needed
						lastIndexed: new Date().toISOString(),
					};

					// Conditionally add optional properties
					const id = metadata[METADATA_PROPS.ID] as string | undefined;
					if (id) {
						indexEntry.id = id;
					}

					const type =
						(metadata[METADATA_PROPS.TYPE] as string | undefined) ??
						inferFileType(relativePath);
					if (type) {
						indexEntry.type = type;
					}

					const title = metadata[METADATA_PROPS.TITLE] as string | undefined;
					if (title) {
						indexEntry.title = title;
					}

					const description = metadata[METADATA_PROPS.DESCRIPTION] as string | undefined;
					if (description) {
						indexEntry.description = description;
					}

					const tags = Array.isArray(metadata[METADATA_PROPS.TAGS])
						? (metadata[METADATA_PROPS.TAGS] as string[])
						: undefined;
					if (tags) {
						indexEntry.tags = tags;
					}

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
		return this.index.find(entry => entry.relativePath === relativePath);
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
			const accessResult = await this.fileOperationManager.accessWithRetry(fullPath);

			if (!accessResult.success) {
				// File doesn't exist - throw error for explicit update calls
				throw new Error(`File not found: ${relativePath}`);
			}

			// Get file stats and content for metrics
			const statResult = await this.fileOperationManager.statWithRetry(fullPath);

			if (!statResult.success) {
				throw new Error(`Failed to stat file: ${statResult.error.message}`);
			}

			const fileStats = statResult.data;

			const readResult = await this.fileOperationManager.readFileWithRetry(fullPath);

			if (!readResult.success) {
				throw new Error(`Failed to read file: ${readResult.error.message}`);
			}

			const fullContent = readResult.data;

			// Parse frontmatter if present
			const matter = await import("gray-matter");
			const { data: metadata, content } = matter.default(fullContent);

			// Calculate file metrics
			const fileMetrics = calculateFileMetrics(fullContent, content, fileStats.size);

			// Create updated index entry
			const updatedEntry: MetadataIndexEntry = {
				relativePath,
				created:
					(metadata[METADATA_PROPS.CREATED] as string) ??
					fileStats.birthtime?.toISOString() ??
					new Date().toISOString(),
				updated:
					(metadata[METADATA_PROPS.UPDATED] as string) ?? fileStats.mtime.toISOString(),
				fileMetrics,
				validationStatus: "unchecked",
				lastIndexed: new Date().toISOString(),
			};

			// Conditionally add optional properties only if they have values
			const id = metadata[METADATA_PROPS.ID] as string | undefined;
			if (id) {
				updatedEntry.id = id;
			}

			const type =
				(metadata[METADATA_PROPS.TYPE] as string | undefined) ??
				inferFileType(relativePath);
			if (type) {
				updatedEntry.type = type;
			}

			const title = metadata[METADATA_PROPS.TITLE] as string | undefined;
			if (title) {
				updatedEntry.title = title;
			}

			const description = metadata[METADATA_PROPS.DESCRIPTION] as string | undefined;
			if (description) {
				updatedEntry.description = description;
			}

			const tags = Array.isArray(metadata[METADATA_PROPS.TAGS])
				? (metadata[METADATA_PROPS.TAGS] as string[])
				: undefined;
			if (tags) {
				updatedEntry.tags = tags;
			}

			// Find existing entry and update or add new
			const existingIndex = this.index.findIndex(
				entry => entry.relativePath === relativePath,
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

		const index = this.index.findIndex(entry => entry.relativePath === relativePath);
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
			fileTypeCounts[type] = (fileTypeCounts[type] ?? 0) + 1;

			// Count tags
			if (entry.tags) {
				for (const tag of entry.tags) {
					tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
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

		const statResult = await this.fileOperationManager.statWithRetry(this.indexPath);
		if (statResult.success) {
			lastBuildTime = statResult.data.mtime.toISOString();
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
		const readResult = await this.fileOperationManager.readFileWithRetry(this.indexPath);

		if (!readResult.success) {
			if (readResult.error.code === "ENOENT") {
				this.logger.debug("No existing index file found");
				this.index = [];
				return;
			}
			throw new Error(`Failed to load index: ${readResult.error.message}`);
		}

		try {
			this.index = JSON.parse(readResult.data) as MetadataIndexEntry[];
			this.logger.debug(`Loaded metadata index from disk - entries: ${this.index.length}`);
		} catch (parseError) {
			throw new Error(
				`Failed to parse index file: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
			);
		}
	}

	/**
	 * Save index to disk
	 */
	private async saveIndex(): Promise<void> {
		await this.ensureIndexDirectory();
		const indexData = JSON.stringify(this.index, null, 2);

		const writeResult = await this.fileOperationManager.writeFileWithRetry(
			this.indexPath,
			indexData,
		);

		if (!writeResult.success) {
			throw new Error(`Failed to save index: ${writeResult.error.message}`);
		}

		this.logger.debug(
			`Saved metadata index to disk - entries: ${this.index.length}, path: ${this.indexPath}`,
		);
	}

	/**
	 * Ensure the index directory exists
	 */
	private async ensureIndexDirectory(): Promise<void> {
		const indexDir = path.dirname(this.indexPath);
		const mkdirResult = await this.fileOperationManager.mkdirWithRetry(indexDir, {
			recursive: true,
		});

		if (!mkdirResult.success) {
			throw new Error(`Failed to create index directory: ${mkdirResult.error.message}`);
		}
	}

	/**
	 * Scan the memory bank directory for all .md files
	 */
	private async scanForMarkdownFiles(): Promise<string[]> {
		const markdownFiles: string[] = [];

		const scanDirectory = async (dirPath: string, relativePath = ""): Promise<void> => {
			try {
				// Use streaming manager for reading directory contents if available
				// For now, we'll use direct readdir but this could be improved
				const _matter = await import("gray-matter");
				const fs = await import("node:fs/promises");
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
