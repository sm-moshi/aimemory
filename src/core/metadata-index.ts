/**
 * @file src/core/metadata-index.ts
 * @description Manages the creation, maintenance, and persistence of the metadata index.
 *
 * This file contains the logic for the "write" side of the metadata system.
 * It scans files, parses frontmatter, builds index entries, and saves the
 * index to disk.
 */

import * as path from "node:path";
import { countLines, countWords, debounce, deepClone, formatFileSize } from "../lib/helpers";

import type { Logger, MemoryBank } from "../lib/types/core";
import type {
	FileMetrics,
	IndexChangeEvent,
	IndexChangeListener,
	IndexRebuildResult,
	IndexStats,
	MetadataIndexConfig,
	MetadataIndexEntry,
} from "../lib/types/system";
import type { FileOperationManager } from "./file-operations";

// =================================================================
// Section: Index-Building Utilities
// =================================================================

/**
 * Calculate comprehensive file metrics from content and file stats.
 */
function calculateFileMetrics(fullContent: string, contentOnly: string, fileSizeBytes: number): FileMetrics {
	return {
		sizeBytes: fileSizeBytes,
		sizeFormatted: formatFileSize(fileSizeBytes),
		lineCount: countLines(fullContent),
		contentLineCount: countLines(contentOnly),
		wordCount: countWords(contentOnly),
		characterCount: contentOnly.length,
	};
}

/**
 * Generate file type from file path if not provided in metadata.
 */
function inferFileType(relativePath: string): string {
	const fileName = relativePath.split("/").pop() ?? "";
	const extension = fileName.split(".").pop()?.toLowerCase();

	if (fileName.toLowerCase().includes("brief")) return "projectBrief";
	if (fileName.toLowerCase().includes("readme")) return "documentation";
	if (fileName.toLowerCase().includes("todo")) return "taskList";
	if (fileName.toLowerCase().includes("note")) return "note";
	if (fileName.toLowerCase().includes("research")) return "researchNote";

	switch (extension) {
		case "md":
		case "markdown":
			return "documentation";
		case "txt":
			return "note";
		case "json":
			return "configuration";
		default:
			return "unknown";
	}
}

// =================================================================
// Section: MetadataIndexManager Class
// =================================================================

const METADATA_PROPS = {
	id: "id",
	type: "type",
	title: "title",
	description: "description",
	tags: "tags",
	created: "created",
	updated: "updated",
} as const;

const DEFAULT_CONFIG: Required<MetadataIndexConfig> = {
	memoryBankPath: "",
	indexFilePath: ".index/metadata.json",
	autoRebuild: true,
	rebuildDebounceMs: 1000,
	maxIndexAge: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Manages metadata index for efficient querying of memory bank files.
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
		private readonly memoryBankService: MemoryBank,
		private readonly logger: Logger,
		private readonly fileOperationManager: FileOperationManager,
		config: MetadataIndexConfig,
	) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.indexPath = path.join(this.config.memoryBankPath, this.config.indexFilePath);

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

	async initialize(): Promise<void> {
		await this.ensureIndexDirectory();

		try {
			await this.loadIndex();
			this.indexLoaded = true;

			const stats = await this.getIndexStats();
			const indexAge = Date.now() - new Date(stats.lastBuildTime).getTime();

			if (indexAge > this.config.maxIndexAge) {
				this.logger.info(`Index is stale, rebuilding - age: ${Math.round(indexAge / (60 * 60 * 1000))} hours`);
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

	async buildIndex(): Promise<IndexRebuildResult> {
		if (this.isBuilding) {
			throw new Error("Index build already in progress");
		}

		this.isBuilding = true;
		const startTime = Date.now();
		const errors: Array<{ relativePath: string; error: string }> = [];

		try {
			this.logger.info("Starting metadata index build");
			await this.ensureIndexDirectory();
			this.index = [];

			const markdownFiles = await this.scanForMarkdownFiles();
			let filesProcessed = 0;
			let filesIndexed = 0;

			for (const relativePath of markdownFiles) {
				filesProcessed++;
				try {
					const newEntry = await this._createIndexEntryFromFile(relativePath);
					this.index.push(newEntry);
					filesIndexed++;
					this.logger.debug(
						`Indexed file: ${relativePath} - ${newEntry.fileMetrics.sizeFormatted}, ${newEntry.fileMetrics.lineCount} lines, type: ${newEntry.type}`,
					);
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					errors.push({ relativePath, error: errorMessage });
					this.logger.warn(`Failed to index file: ${relativePath} - ${errorMessage}`);
				}
			}

			await this.saveIndex();
			const duration = Date.now() - startTime;
			const stats = await this.getIndexStats();
			this.logger.info(
				`Metadata index build completed - processed: ${filesProcessed}, indexed: ${filesIndexed}, errors: ${errors.length}, duration: ${duration}ms`,
			);

			this.emitEvent({ type: "index_rebuilt", stats });

			return { filesProcessed, filesIndexed, filesErrored: errors.length, duration, errors, stats };
		} finally {
			this.isBuilding = false;
		}
	}

	getIndex(): MetadataIndexEntry[] {
		if (!this.indexLoaded) throw new Error("Index not loaded. Call initialize() first.");
		return deepClone(this.index);
	}

	getEntry(relativePath: string): MetadataIndexEntry | undefined {
		if (!this.indexLoaded) throw new Error("Index not loaded. Call initialize() first.");
		return this.index.find(entry => entry.relativePath === relativePath);
	}

	async updateEntry(relativePath: string): Promise<void> {
		if (!this.indexLoaded) throw new Error("Index not loaded. Call initialize() first.");

		try {
			const updatedEntry = await this._createIndexEntryFromFile(relativePath);

			const existingIndex = this.index.findIndex(entry => entry.relativePath === relativePath);
			const isUpdate = existingIndex !== -1;

			if (isUpdate) {
				this.index[existingIndex] = updatedEntry;
			} else {
				this.index.push(updatedEntry);
			}

			await this.saveIndex();
			this.logger.debug(`${isUpdate ? "Updated" : "Added"} index entry: ${relativePath}`);
			this.emitEvent({ type: isUpdate ? "entry_updated" : "entry_added", entry: updatedEntry });
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.logger.error(`Failed to update index entry: ${relativePath} - ${errorMessage}`);
			this.emitEvent({ type: "index_error", error: `Failed to update entry: ${errorMessage}` });
			throw error;
		}
	}

	async removeEntry(relativePath: string): Promise<void> {
		if (!this.indexLoaded) throw new Error("Index not loaded. Call initialize() first.");

		const index = this.index.findIndex(entry => entry.relativePath === relativePath);
		if (index !== -1) {
			this.index.splice(index, 1);
			await this.saveIndex();
			this.logger.debug(`Removed index entry: ${relativePath}`);
			this.emitEvent({ type: "entry_removed", relativePath });
		}
	}

	async getIndexStats(): Promise<IndexStats> {
		if (!this.indexLoaded) throw new Error("Index not loaded. Call initialize() first.");

		const fileTypeCounts: Record<string, number> = {};
		const tagCounts: Record<string, number> = {};
		let totalSizeBytes = 0;
		let totalLineCount = 0;
		let validFiles = 0;
		let invalidFiles = 0;
		let uncheckedFiles = 0;

		for (const entry of this.index) {
			const type = entry.type ?? "unknown";
			fileTypeCounts[type] = (fileTypeCounts[type] ?? 0) + 1;

			if (entry.tags) {
				for (const tag of entry.tags) {
					tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
				}
			}

			totalSizeBytes += entry.fileMetrics.sizeBytes;
			totalLineCount += entry.fileMetrics.lineCount;

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

		let lastBuildTime = new Date().toISOString();
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
			lastBuildDuration: 0,
			fileTypeCounts,
			tagCounts,
		};
	}

	triggerAutoRebuild(): void {
		if (this.config.autoRebuild && this.debouncedRebuild) {
			this.debouncedRebuild();
		}
	}

	addEventListener(listener: IndexChangeListener): void {
		this.listeners.push(listener);
	}

	removeEventListener(listener: IndexChangeListener): void {
		const index = this.listeners.indexOf(listener);
		if (index !== -1) {
			this.listeners.splice(index, 1);
		}
	}

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

	private async saveIndex(): Promise<void> {
		await this.ensureIndexDirectory();
		const indexData = JSON.stringify(this.index, null, 2);
		const writeResult = await this.fileOperationManager.writeFileWithRetry(this.indexPath, indexData);
		if (!writeResult.success) throw new Error(`Failed to save index: ${writeResult.error.message}`);
		this.logger.debug(`Saved metadata index to disk - entries: ${this.index.length}, path: ${this.indexPath}`);
	}

	private async ensureIndexDirectory(): Promise<void> {
		const indexDir = path.dirname(this.indexPath);
		const mkdirResult = await this.fileOperationManager.mkdirWithRetry(indexDir, { recursive: true });
		if (!mkdirResult.success) throw new Error(`Failed to create index directory: ${mkdirResult.error.message}`);
	}

	private async scanForMarkdownFiles(): Promise<string[]> {
		const markdownFiles: string[] = [];
		const scanDirectory = async (dirPath: string, relativePath = ""): Promise<void> => {
			try {
				const fs = await import("node:fs/promises");
				const items = await fs.readdir(dirPath, { withFileTypes: true });

				for (const item of items) {
					const itemRelativePath = relativePath ? path.join(relativePath, item.name) : item.name;
					const itemFullPath = path.join(dirPath, item.name);

					if (item.isDirectory()) {
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

	private async _createIndexEntryFromFile(relativePath: string): Promise<MetadataIndexEntry> {
		const fullPath = path.join(this.config.memoryBankPath, relativePath);

		const statResult = await this.fileOperationManager.statWithRetry(fullPath);
		if (!statResult.success) throw new Error(`Failed to stat file: ${statResult.error.message}`);
		const fileStats = statResult.data;

		const readResult = await this.fileOperationManager.readFileWithRetry(fullPath);
		if (!readResult.success) throw new Error(`Failed to read file: ${readResult.error.message}`);
		const fullContent = readResult.data;

		const matter = await import("gray-matter");
		const { data: metadata, content } = matter.default(fullContent);

		const fileMetrics = calculateFileMetrics(fullContent, content, fileStats.size);

		const indexEntry: MetadataIndexEntry = {
			relativePath,
			created:
				(metadata[METADATA_PROPS.created] as string) ??
				fileStats.birthtime?.toISOString() ??
				new Date().toISOString(),
			updated: (metadata[METADATA_PROPS.updated] as string) ?? fileStats.mtime.toISOString(),
			fileMetrics,
			validationStatus: "unchecked",
			lastIndexed: new Date().toISOString(),
		};

		const id = metadata[METADATA_PROPS.id] as string | undefined;
		if (id) indexEntry.id = id;

		const type = (metadata[METADATA_PROPS.type] as string | undefined) ?? inferFileType(relativePath);
		if (type) indexEntry.type = type;

		const title = metadata[METADATA_PROPS.title] as string | undefined;
		if (title) indexEntry.title = title;

		const description = metadata[METADATA_PROPS.description] as string | undefined;
		if (description) indexEntry.description = description;

		const tags = Array.isArray(metadata[METADATA_PROPS.tags])
			? (metadata[METADATA_PROPS.tags] as string[])
			: undefined;
		if (tags) indexEntry.tags = tags;

		return indexEntry;
	}
}
