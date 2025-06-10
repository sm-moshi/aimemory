/**
 * @file src/core/memory-bank.ts
 * @description Core service for managing the AI Memory Bank.
 *
 * This file consolidates the logic from the legacy `src/core/memoryBankServiceCore.ts`
 * and acts as the central orchestrator for all memory bank operations, including
 * file I/O, validation, and state management.
 */

import * as crypto from "node:crypto";
import * as path from "node:path";
import matter from "gray-matter";
import type {
	AsyncResult,
	FileOperationContext,
	HealthCheckResult,
	Logger,
	MemoryBank,
	MemoryBankFile,
	MemoryBankFileStats,
} from "../lib/types/core";
import { isError, MemoryBankError, MemoryBankFileType, tryCatchAsync } from "../lib/types/core";
import { getSchemaForType } from "../lib/types/operations";
import { formatMarkdownContent } from "../lib/utils";
import { validateAndConstructKnownFilePath, validateMemoryBankDirectory } from "../lib/validation";

import type { FileOperationManager } from "./file-operations";
import type { StreamingManager } from "./streaming";

/**
 * Manages all operations related to the AI Memory Bank.
 *
 * This class is the central orchestrator for file I/O, validation,
 * and state management of the memory bank files. It implements the `MemoryBank`
 * interface and provides a robust, error-handled API for interacting with
 * the memory bank on the file system.
 */
export class MemoryBankManager implements MemoryBank {
	private readonly memoryBankFolder: string;
	private readonly logger: Logger;

	// Service dependencies
	private readonly streamingManager: StreamingManager;
	public readonly fileOperationManager: FileOperationManager;

	// Public state
	public files: Map<MemoryBankFileType, MemoryBankFile> = new Map();

	constructor(
		memoryBankPath: string,
		logger: Logger,
		streamingManager: StreamingManager,
		fileOperationManager: FileOperationManager,
	) {
		this.memoryBankFolder = memoryBankPath;
		this.logger = logger;
		this.streamingManager = streamingManager;
		this.fileOperationManager = fileOperationManager;
	}

	async initializeFolders(): AsyncResult<void, MemoryBankError> {
		this.logger.info("Initialising memory bank folders...");
		const result = await tryCatchAsync(async () => {
			const context = this.createContext();
			await this.ensureMemoryBankFoldersExist(context);
		});

		if (isError(result)) {
			return {
				success: false,
				error: new MemoryBankError(
					`Failed to initialise memory bank folders: ${result.error.message}`,
					"INIT_FOLDERS_ERROR",
					{ originalError: result.error },
				),
			};
		}
		this.logger.info("Memory bank folders initialised successfully.");
		return { success: true, data: undefined };
	}

	async loadFiles(): AsyncResult<MemoryBankFileType[], MemoryBankError> {
		const result = await tryCatchAsync(async () => {
			const context = this.createContext();
			return this.loadAllMemoryBankFiles(context);
		});

		if (isError(result)) {
			return {
				success: false,
				error: new MemoryBankError("Failed to load memory bank files", "LOAD_FILES_ERROR", {
					originalError: result.error,
				}),
			};
		}
		return result;
	}

	getFile(type: MemoryBankFileType): MemoryBankFile | undefined {
		return this.files.get(type);
	}

	getAllFiles(): MemoryBankFile[] {
		return Array.from(this.files.values());
	}

	async getAllFileStats(): AsyncResult<MemoryBankFileStats[], MemoryBankError> {
		const result = await tryCatchAsync<MemoryBankFileStats[]>(async () => {
			const statsPromises = Object.values(MemoryBankFileType).map(async fileType => {
				const filePath = validateAndConstructKnownFilePath(this.memoryBankFolder, fileType);
				const fileStats = await this.fileOperationManager.statWithRetry(filePath);

				if (!fileStats.success) {
					this.logger.warn(`Could not stat file: ${filePath}`);
					return null;
				}

				const content = await this.fileOperationManager.readFileWithRetry(filePath);
				if (!content.success) {
					this.logger.warn(`Could not read file for stats: ${filePath}`);
					return null;
				}

				const { data } = matter(content.data);

				return {
					fileType,
					size: fileStats.data.size,
					createdAt: data.created ? new Date(data.created) : fileStats.data.birthtime,
					updatedAt: fileStats.data.mtime,
				};
			});

			const allStats = await Promise.all(statsPromises);
			return allStats.filter((stat): stat is MemoryBankFileStats => stat !== null);
		});

		if (isError(result)) {
			return {
				success: false,
				error: new MemoryBankError("Failed to get file stats", "GET_STATS_ERROR", {
					originalError: result.error,
				}),
			};
		}
		return result;
	}

	async updateFile(type: MemoryBankFileType, content: string): AsyncResult<void, MemoryBankError> {
		const result = await tryCatchAsync(async () => {
			const context = this.createContext();
			await this.updateMemoryBankFile(type, content, context);
		});

		if (isError(result)) {
			const originalErrorCode =
				result.error instanceof MemoryBankError ? result.error.code : "UNKNOWN_UPDATE_ERROR";
			return {
				success: false,
				error: new MemoryBankError(
					`Failed to update file ${type}: ${result.error.message}`,
					originalErrorCode,
					{
						originalError: result.error,
					},
				),
			};
		}
		return { success: true, data: undefined };
	}

	async writeFileByPath(relativePath: string, content: string): AsyncResult<void, MemoryBankError> {
		const result = await tryCatchAsync(async () => {
			const finalContent = formatMarkdownContent(content);
			const fullPath = path.resolve(this.memoryBankFolder, relativePath);

			const dir = path.dirname(fullPath);
			const mkdirResult = await this.fileOperationManager.mkdirWithRetry(dir, {
				recursive: true,
			});
			if (!mkdirResult.success) {
				throw mkdirResult.error;
			}

			const writeResult = await this.fileOperationManager.writeFileWithRetry(fullPath, finalContent);
			if (!writeResult.success) {
				throw writeResult.error;
			}

			const statResult = await this.fileOperationManager.statWithRetry(fullPath);
			if (!statResult.success) {
				this.logger.warn(`Failed to stat file ${fullPath} after writing: ${statResult.error.message}`);
			} else {
				this.logger.debug(`File ${fullPath} written and stat successful`);
			}

			// Re-load the file into the cache after writing
			const fileType = Object.values(MemoryBankFileType).find(type => fullPath.endsWith(type));
			if (fileType) {
				const context = this.createContext();
				await this.loadFileWithTemplate(fileType, context);
			}
		});

		if (isError(result)) {
			return {
				success: false,
				error: new MemoryBankError(
					`Failed to write file ${relativePath}: ${result.error.message}`,
					"WRITE_FILE_ERROR",
					{
						originalError: result.error,
					},
				),
			};
		}
		return { success: true, data: undefined };
	}

	async checkHealth(): AsyncResult<string, MemoryBankError> {
		const result = await tryCatchAsync<string>(async () => {
			const context = this.createContext();
			const healthResult = await this.performHealthCheck(context);

			let message = "Health check completed.\n";
			if (healthResult.issues.length > 0) {
				message += `\nIssues found:\n- ${healthResult.issues.join("\n- ")}`;
			}

			if (healthResult.issues.length === 0) {
				message = "Memory bank is healthy. All files and folders are in place.";
			}

			return message;
		});

		if (isError(result)) {
			return {
				success: false,
				error: new MemoryBankError(
					`Health check failed: ${result.error.message}`,
					result.error instanceof MemoryBankError ? result.error.code : "HEALTH_CHECK_ERROR",
					{ originalError: result.error },
				),
			};
		}
		return result;
	}

	getFilesWithFilenames(): string {
		if (this.files.size === 0) {
			return "No files loaded in memory bank.";
		}
		const fileList = Array.from(this.files.values())
			.map(file => `${file.type}: ${file.filePath}`)
			.join("\n");
		return `Managed Files:\n${fileList}`;
	}

	dispose(): void {
		this.logger.info("Disposing MemoryBankManager resources.");
		this.files.clear();
	}

	async getIsMemoryBankInitialized(): AsyncResult<boolean, MemoryBankError> {
		const result = await tryCatchAsync<boolean>(async () => {
			const context = this.createContext();
			return await validateMemoryBankDirectory(context);
		});

		if (isError(result)) {
			return {
				success: false,
				error: new MemoryBankError("Failed to check memory bank initialization", "INITIALIZATION_CHECK_ERROR"),
			};
		}
		return result;
	}

	private async loadAllMemoryBankFiles(context: FileOperationContext): Promise<MemoryBankFileType[]> {
		const allFileTypes = Object.values(MemoryBankFileType);
		const createdFiles: MemoryBankFileType[] = [];
		const loadPromises = allFileTypes.map(async fileType => {
			try {
				const loadResult = await this.loadFileWithTemplate(fileType, context);
				if (loadResult.wasCreated) {
					createdFiles.push(fileType);
				}
				const filePath = validateAndConstructKnownFilePath(this.memoryBankFolder, fileType);
				const parsedData = this.parseAndValidateMetadata(loadResult.content, fileType, context);
				const fileEntry = this.createMemoryBankFileEntry(fileType, loadResult.stats, filePath, parsedData);
				this.files.set(fileType, fileEntry);
				this.logger.debug(`[MemoryBankManager] Loaded file: ${fileType}`);
			} catch (error) {
				this.logger.error(`[MemoryBankManager] Failed to load file ${fileType}: ${error}`);
				throw error;
			}
		});

		await Promise.all(loadPromises);

		if (createdFiles.length > 0) {
			this.logSuccessfulInitialization();
		} else {
			this.logFailedInitialization(createdFiles);
		}

		return createdFiles;
	}

	private async loadFileWithTemplate(
		fileType: MemoryBankFileType,
		context: FileOperationContext,
	): Promise<{
		content: string;
		stats: import("node:fs").Stats;
		wasCreated: boolean;
	}> {
		const filePath = validateAndConstructKnownFilePath(this.memoryBankFolder, fileType);
		const loadedFile = await this.loadFileFromDisk(filePath, context);

		if (loadedFile) {
			return { ...loadedFile, wasCreated: false };
		}

		this.logger.info(`[MemoryBankManager] File ${filePath} not found. Creating from template.`);
		const createdFile = await this.createFileFromTemplate(fileType, filePath, context);
		return { ...createdFile, wasCreated: true };
	}

	private async loadFileFromDisk(
		filePath: string,
		context: FileOperationContext,
	): Promise<{ content: string; stats: import("node:fs").Stats } | null> {
		const readFileResult = await context.fileOperationManager.readFileWithRetry(filePath);

		if (readFileResult.success) {
			const statResult = await context.fileOperationManager.statWithRetry(filePath);
			if (statResult.success) {
				return { content: readFileResult.data, stats: statResult.data };
			}
			this.logger.warn(`Could not stat file ${filePath} though read was successful.`, {
				error: statResult.error,
			});
		} else if (readFileResult.error.code !== "ENOENT") {
			throw new MemoryBankError(
				`Failed to read file ${filePath}: ${readFileResult.error.message}`,
				"READ_FILE_ERROR",
				{
					originalError: readFileResult.error.originalError,
				},
			);
		}
		return null;
	}

	private async createFileFromTemplate(
		fileType: MemoryBankFileType,
		filePath: string,
		context: FileOperationContext,
	): Promise<{ content: string; stats: import("node:fs").Stats }> {
		const template = getTemplateForFileType(fileType);
		const { content: templateContent } = matter(template);
		const frontmatter = {
			id: `urn:uuid:${crypto.randomUUID()}`,
			title: `Title for ${fileType}`,
			description: `Description for ${fileType}`,
			type: fileType,
			tags: ["autogenerated"],
			created: new Date().toISOString(),
			updated: new Date().toISOString(),
		};

		const contentWithFrontmatter = matter.stringify(templateContent, frontmatter);

		const writeResult = await context.fileOperationManager.writeFileWithRetry(filePath, contentWithFrontmatter);
		if (!writeResult.success) {
			throw new MemoryBankError(
				`Failed to create file from template: ${writeResult.error.message}`,
				"WRITE_FILE_ERROR",
				{
					originalError: writeResult.error.originalError,
				},
			);
		}

		const statResult = await context.fileOperationManager.statWithRetry(filePath);
		if (!statResult.success) {
			throw new MemoryBankError(
				`Failed to stat file after creating from template: ${statResult.error.message}`,
				"STAT_FILE_ERROR",
				{ originalError: statResult.error.originalError },
			);
		}

		return { content: contentWithFrontmatter, stats: statResult.data };
	}

	private async updateMemoryBankFile(
		fileType: MemoryBankFileType,
		content: string,
		context: FileOperationContext,
	): Promise<void> {
		const filePath = validateAndConstructKnownFilePath(this.memoryBankFolder, fileType);
		const formattedContent = formatMarkdownContent(content);

		const writeResult = await context.fileOperationManager.writeFileWithRetry(filePath, formattedContent);
		if (!writeResult.success) throw writeResult.error;

		const newStatResult = await context.fileOperationManager.statWithRetry(filePath);
		if (!newStatResult.success) throw newStatResult.error;

		const stats = newStatResult.data;
		const parsedData = this.parseAndValidateMetadata(formattedContent, fileType, context);
		const memoryBankFile = this.createMemoryBankFileEntry(fileType, stats, filePath, parsedData);
		this.files.set(fileType, memoryBankFile);

		context.logger.info(`Updated file: ${fileType}`);
	}

	private async performHealthCheck(context: FileOperationContext): Promise<HealthCheckResult> {
		const rootIssues = await this.checkRootFolder(context);
		const fileIssues = await Promise.all(
			Object.values(MemoryBankFileType).map(fileType => this.checkFileAndParentDir(fileType, context)),
		).then(results => results.flat());

		const issues = [...rootIssues, ...fileIssues];
		const isHealthy = issues.length === 0;
		const summary = isHealthy ? "Memory bank is healthy." : `Found ${issues.length} issues.`;

		this.logger.info(summary);

		return { isHealthy, issues, summary };
	}

	private async checkRootFolder(context: FileOperationContext): Promise<string[]> {
		const statResult = await this.fileOperationManager.statWithRetry(context.memoryBankFolder);
		if (!statResult.success) {
			return [`Root memory-bank folder not found at: ${context.memoryBankFolder}`];
		}
		if (!statResult.data.isDirectory()) {
			return [`Path is not a directory: ${context.memoryBankFolder}`];
		}
		return [];
	}

	private async checkFileAndParentDir(
		fileType: MemoryBankFileType,
		context: FileOperationContext,
	): Promise<string[]> {
		const issues: string[] = [];
		const filePath = validateAndConstructKnownFilePath(context.memoryBankFolder, fileType);
		const dirPath = path.dirname(filePath);

		const dirStat = await this.fileOperationManager.statWithRetry(dirPath);
		if (!dirStat.success) {
			issues.push(`Directory not found for ${fileType}: ${dirPath}`);
		} else if (!dirStat.data.isDirectory()) {
			issues.push(`Path is not a directory for ${fileType}: ${dirPath}`);
		}

		const fileStat = await this.fileOperationManager.statWithRetry(filePath);
		if (!fileStat.success) {
			issues.push(`File not found: ${fileType}`);
		}

		return issues;
	}

	private async ensureMemoryBankFoldersExist(context: FileOperationContext): Promise<void> {
		const requiredDirs = [
			...new Set(
				Object.values(MemoryBankFileType).map(p =>
					path.dirname(validateAndConstructKnownFilePath(context.memoryBankFolder, p)),
				),
			),
		];

		for (const dir of requiredDirs) {
			const mkdirResult = await this.fileOperationManager.mkdirWithRetry(dir, {
				recursive: true,
			});
			if (!mkdirResult.success) {
				throw new MemoryBankError(`Failed to create directory ${dir}`, "MKDIR_ERROR", {
					originalError: mkdirResult.error,
				});
			}
		}
	}

	private parseAndValidateMetadata(
		rawContent: string,
		fileType: MemoryBankFileType,
		context: FileOperationContext,
	): ReturnType<typeof matter> {
		try {
			// Use gray-matter to parse frontmatter
			const parsedData = matter(rawContent);
			const { data: metadata } = parsedData;
			const schema = getSchemaForType(fileType);
			if (!schema) {
				context.logger.debug(`No schema found for file type: ${fileType}. Skipping validation.`);
				return parsedData;
			}

			// Validate metadata against Zod schema
			const validationResult = schema.safeParse(metadata);
			if (!validationResult.success) {
				this.logger.warn(`Metadata validation failed for ${fileType}: ${validationResult.error.message}`);
				// TODO: Decide how to handle invalid metadata - store with error, or reject?
			}

			return parsedData;
		} catch (error) {
			this.logger.error(
				`Error parsing metadata for ${fileType}: ${error instanceof Error ? error.message : String(error)}`,
				{ fileType, operation: "parseAndValidateMetadata" },
			);
			// On parsing failure, return raw content with empty metadata
			return matter(rawContent || "");
		}
	}

	private createMemoryBankFileEntry(
		fileType: MemoryBankFileType,
		stats: import("node:fs").Stats,
		filePath: string,
		parsedData: ReturnType<typeof matter>,
	): MemoryBankFile {
		const { content, data: metadata } = parsedData;
		return {
			type: fileType,
			content,
			lastUpdated: stats.mtime,
			filePath,
			relativePath: path.relative(this.memoryBankFolder, filePath),
			metadata,
			created: metadata.created ? new Date(metadata.created) : stats.birthtime,
		};
	}

	private extractMetadataType(metadata: unknown): string | undefined {
		if (metadata && typeof metadata === "object" && "type" in metadata && typeof metadata.type === "string") {
			return metadata.type;
		}
		return undefined;
	}

	private createContext(): FileOperationContext {
		return {
			memoryBankFolder: this.memoryBankFolder,
			logger: this.logger,
			streamingManager: this.streamingManager,
			fileOperationManager: this.fileOperationManager,
			fileCache: new Map(),
			cacheStats: {
				hits: 0,
				misses: 0,
				totalFiles: 0,
				hitRate: 0,
				lastReset: new Date(),
				reloads: 0,
			},
		};
	}

	private logSuccessfulInitialization(): void {
		this.logger.info("Memory bank initialized and all files loaded.");
	}

	private logFailedInitialization(missingFiles: string[]): void {
		this.logger.warn(`Memory bank initialized with missing files: ${missingFiles.join(", ")}`);
	}
}

// TODO: Create a separate templates file
function getTemplateForFileType(fileType: MemoryBankFileType): string {
	switch (fileType) {
		case MemoryBankFileType.ProjectBrief:
			return "# Project Brief\n\n- **Project:** AI Memory\n- **Goal:** Create a VS Code extension that acts as a persistent, context-aware memory for AI assistants like Cursor.";
		default:
			return `# ${fileType}\n\nThis file is auto-generated.`;
	}
}
