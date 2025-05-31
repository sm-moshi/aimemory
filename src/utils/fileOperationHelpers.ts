/**
 * Shared File Operation Helpers
 *
 * Utilities to reduce complexity in MemoryBankService classes by extracting
 * common patterns for file operations, cache management, and validation.
 */

import type { Stats } from "node:fs";
import fs from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { getTemplateForFileType } from "../lib/memoryBankTemplates.js";
import type {
	CacheStats,
	FileCache,
	FileOperationContext,
	FileValidationResult,
	HealthCheckResult,
	MemoryBankFile,
} from "../types/types.js";
import { MemoryBankFileType } from "../types/types.js";

/**
 * Validates and constructs a safe file path within the memory bank directory
 * Prevents path traversal attacks by ensuring the resolved path stays within the root folder
 */
export function validateAndConstructFilePath(memoryBankFolder: string, fileType: string): string {
	// First validate that the fileType is a known enum value
	const validFileTypes = Object.values(MemoryBankFileType) as string[];
	if (!validFileTypes.includes(fileType)) {
		throw new Error(
			`Invalid file type: ${fileType}. Must be one of: ${validFileTypes.join(", ")}`,
		);
	}

	// Normalize the memory bank folder path
	const normalizedRoot = resolve(memoryBankFolder);

	// Construct the file path and normalize it to resolve any ".." segments
	const constructedPath = join(normalizedRoot, fileType);
	const normalizedPath = resolve(constructedPath);

	// Ensure the normalized path is still within the memory bank directory
	if (!normalizedPath.startsWith(`${normalizedRoot}/`) && normalizedPath !== normalizedRoot) {
		throw new Error(`Invalid file path: ${fileType} resolves outside memory bank directory`);
	}

	return normalizedPath;
}

/**
 * Validates and constructs a safe arbitrary file path within the memory bank directory
 * Similar to validateAndConstructFilePath but allows any relative path (not just enum values)
 * Used for writeFileByPath operations with user-provided paths
 */
export function validateAndConstructArbitraryFilePath(
	memoryBankFolder: string,
	relativePath: string,
): string {
	// Validate input - reject dangerous sequences
	if (
		relativePath.includes("..") ||
		relativePath.startsWith("/") ||
		relativePath.includes("\0")
	) {
		throw new Error(`Invalid relative path: ${relativePath} contains dangerous sequences`);
	}

	// Normalize the memory bank folder path
	const normalizedRoot = resolve(memoryBankFolder);

	// Construct the file path and normalize it to resolve any ".." segments
	const constructedPath = join(normalizedRoot, relativePath);
	const normalizedPath = resolve(constructedPath);

	// Ensure the normalized path is still within the memory bank directory
	if (!normalizedPath.startsWith(`${normalizedRoot}/`) && normalizedPath !== normalizedRoot) {
		throw new Error(
			`Invalid file path: ${relativePath} resolves outside memory bank directory`,
		);
	}

	return normalizedPath;
}

/**
 * Cache Manager Class
 * Centralizes all cache operations to eliminate duplication between services
 */
export class CacheManager {
	constructor(
		private readonly fileCache: Map<string, FileCache>,
		private readonly cacheStats: CacheStats,
	) {}

	/**
	 * Gets cached content if available and up-to-date
	 */
	getCachedContent(filePath: string, stats: Stats): string | null {
		const cached = this.fileCache.get(filePath);
		if (cached && cached.mtimeMs === stats.mtimeMs) {
			this.cacheStats.hits++;
			return cached.content;
		}
		return null;
	}

	/**
	 * Updates cache with new content
	 */
	updateCache(filePath: string, content: string, stats: Stats): void {
		const cached = this.fileCache.get(filePath);
		this.fileCache.set(filePath, {
			content,
			mtimeMs: stats.mtimeMs,
		});

		if (cached) {
			this.cacheStats.reloads++;
		} else {
			this.cacheStats.misses++;
		}
	}

	/**
	 * Invalidates cache for specific file or all files
	 */
	invalidateCache(filePath?: string): void {
		if (filePath) {
			this.fileCache.delete(filePath);
		} else {
			this.fileCache.clear();
		}
	}

	/**
	 * Gets current cache statistics
	 */
	getStats(): CacheStats {
		return { ...this.cacheStats };
	}

	/**
	 * Resets cache statistics
	 */
	resetStats(): void {
		this.cacheStats.hits = 0;
		this.cacheStats.misses = 0;
		this.cacheStats.reloads = 0;
	}
}

/**
 * Validates that the memory bank directory exists
 * Reduces directory validation complexity from ~4-5 branches to ~1
 */
export async function validateMemoryBankDirectory(context: FileOperationContext): Promise<boolean> {
	try {
		const stats = await fs.stat(context.memoryBankFolder);
		const isValid = stats.isDirectory();

		if (!isValid) {
			context.logger.error("Memory bank folder does not exist.");
		}

		return isValid;
	} catch {
		context.logger.error("Memory bank folder does not exist.");
		return false;
	}
}

/**
 * Validates a single memory bank file
 * Standardizes file validation logic across services
 */
export async function validateSingleFile(
	fileType: MemoryBankFileType,
	context: FileOperationContext,
): Promise<FileValidationResult> {
	const filePath = validateAndConstructFilePath(context.memoryBankFolder, fileType);

	try {
		const stats = await fs.stat(filePath);

		if (!stats.isFile()) {
			context.logger.info(`Checked file: ${fileType} - Exists: false (not a file)`);
			return {
				isValid: false,
				filePath,
				fileType,
				error: "Not a file",
			};
		}

		context.logger.info(`Checked file: ${fileType} - Exists: true`);
		return {
			isValid: true,
			filePath,
			fileType,
		};
	} catch (error) {
		context.logger.info(`Checked file: ${fileType} - Exists: false`);
		return {
			isValid: false,
			filePath,
			fileType,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Validates all memory bank files
 * Reduces multi-file validation complexity from ~6-8 branches to ~2
 */
export async function validateAllMemoryBankFiles(context: FileOperationContext): Promise<{
	missingFiles: MemoryBankFileType[];
	filesToInvalidate: string[];
	validationResults: FileValidationResult[];
}> {
	const missingFiles: MemoryBankFileType[] = [];
	const filesToInvalidate: string[] = [];
	const validationResults: FileValidationResult[] = [];

	for (const fileType of Object.values(MemoryBankFileType)) {
		if (fileType.includes("/")) {
			const result = await validateSingleFile(fileType, context);
			validationResults.push(result);

			if (!result.isValid) {
				missingFiles.push(fileType);
				filesToInvalidate.push(result.filePath);
			}
		}
	}

	return { missingFiles, filesToInvalidate, validationResults };
}

/**
 * Loads a single file with template fallback and caching
 * Reduces file loading complexity from ~8-10 branches to ~3
 */
export async function loadFileWithTemplate(
	fileType: MemoryBankFileType,
	context: FileOperationContext,
	cacheManager: CacheManager,
): Promise<{ content: string; stats: Stats; wasCreated: boolean }> {
	const filePath = validateAndConstructFilePath(context.memoryBankFolder, fileType);

	// Ensure directory exists
	await fs.mkdir(dirname(filePath), { recursive: true });

	try {
		// Try to load existing file
		const stats = await fs.stat(filePath);

		// Check cache first
		const cachedContent = cacheManager.getCachedContent(filePath, stats);
		if (cachedContent) {
			context.logger.info(`Loaded file from cache: ${fileType}`);
			return { content: cachedContent, stats, wasCreated: false };
		}

		// Read from disk and update cache
		const content = await fs.readFile(filePath, "utf-8");
		cacheManager.updateCache(filePath, content, stats);
		context.logger.info(`Loaded file: ${fileType}`);

		return { content, stats, wasCreated: false };
	} catch {
		// Create from template
		const content = getTemplateForFileType(fileType);
		await fs.writeFile(filePath, content);
		const stats = await fs.stat(filePath);

		cacheManager.updateCache(filePath, content, stats);
		context.logger.info(`Created missing file from template: ${fileType}`);

		return { content, stats, wasCreated: true };
	}
}

/**
 * Performs comprehensive health check of memory bank
 * Reduces health check complexity from ~4-5 branches to ~2
 */
export async function performHealthCheck(
	context: FileOperationContext,
): Promise<HealthCheckResult> {
	const issues: string[] = [];

	// Check root folder
	try {
		await fs.stat(context.memoryBankFolder);
	} catch {
		issues.push(`Missing folder: ${context.memoryBankFolder}`);
	}

	// Check all required files
	for (const fileType of Object.values(MemoryBankFileType)) {
		if (fileType.includes("/")) {
			try {
				const filePath = validateAndConstructFilePath(context.memoryBankFolder, fileType);
				await fs.access(filePath);
			} catch {
				issues.push(`Missing or unreadable: ${fileType}`);
			}
		}
	}

	const isHealthy = issues.length === 0;
	const summary = isHealthy
		? "Memory Bank Health: ✅ All files and folders are present and readable."
		: `Memory Bank Health: ❌ Issues found:\n${issues.join("\n")}`;

	return { isHealthy, issues, summary };
}

/**
 * High-level orchestrator for loading all memory bank files
 * Reduces loadFiles() complexity from ~8-10 to ~4-5 complexity points
 */
export async function loadAllMemoryBankFiles(
	context: FileOperationContext,
	filesMap: Map<MemoryBankFileType, MemoryBankFile>,
): Promise<MemoryBankFileType[]> {
	filesMap.clear();
	context.logger.info("Loading all memory bank files...");

	const createdFiles: MemoryBankFileType[] = [];
	const cacheManager = new CacheManager(context.fileCache, context.cacheStats);

	try {
		for (const fileType of Object.values(MemoryBankFileType)) {
			const { content, stats, wasCreated } = await loadFileWithTemplate(
				fileType,
				context,
				cacheManager,
			);

			if (wasCreated) {
				createdFiles.push(fileType);
			}

			filesMap.set(fileType, {
				type: fileType,
				content,
				lastUpdated: stats.mtime,
			});
		}

		if (createdFiles.length > 0) {
			const msg = `Self-healing: Created missing files: ${createdFiles.join(", ")}`;
			context.logger.info(msg);
		}

		context.logger.info("Memory bank initialised successfully.");
		return createdFiles;
	} catch (error) {
		context.logger.error(
			`Error loading memory bank files: ${error instanceof Error ? error.message : String(error)}`,
		);
		throw error;
	}
}

/**
 * Ensures all required memory bank subfolders exist
 * Standardizes folder initialization across services
 */
export async function ensureMemoryBankFolders(memoryBankFolder: string): Promise<void> {
	const subfolders = [
		"", // root for legacy files
		"core",
		"systemPatterns",
		"techContext",
		"progress",
	];

	for (const subfolder of subfolders) {
		const folderPath = join(memoryBankFolder, subfolder);
		console.log(`[ensureMemoryBankFolders] Attempting to create: ${folderPath}`);
		await fs.mkdir(folderPath, { recursive: true });
	}
}

/**
 * Updates a file with cache synchronization
 * Standardizes file update operations across services
 */
export async function updateMemoryBankFile(
	fileType: MemoryBankFileType,
	content: string,
	context: FileOperationContext,
	filesMap: Map<MemoryBankFileType, MemoryBankFile>,
): Promise<void> {
	const filePath = validateAndConstructFilePath(context.memoryBankFolder, fileType);

	await fs.writeFile(filePath, content);
	const stats = await fs.stat(filePath);

	// Update files map
	filesMap.set(fileType, {
		type: fileType,
		content,
		lastUpdated: stats.mtime,
	});

	// Update cache
	context.fileCache.set(filePath, { content, mtimeMs: stats.mtimeMs });
	context.logger.info(`Updated file: ${fileType}`);
}
