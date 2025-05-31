/**
 * Memory Bank File Operation Helpers
 *
 * Domain-specific file operations for memory bank management.
 * Handles template loading, health checks, and file synchronization.
 */

import type { Stats } from "node:fs";
import { dirname } from "node:path";
import { getTemplateForFileType } from "../services/templates/memory-bank-templates.js";
import type { FileOperationContext, HealthCheckResult, MemoryBankFile } from "../types/core.js";
import { MemoryBankFileType } from "../types/core.js";
import { validateAndConstructFilePath } from "../utils/files/path-validation.js";

/**
 * Creates a file from a template, writes it to disk, and updates the cache.
 */
async function _createFileFromTemplateAndCache(
	fileType: MemoryBankFileType,
	filePath: string, // Pass filePath directly
	context: FileOperationContext,
): Promise<{ content: string; stats: Stats }> {
	const content = getTemplateForFileType(fileType);
	const writeResult = await context.fileOperationManager.writeFileWithRetry(filePath, content);
	if (!writeResult.success) throw writeResult.error;

	const newStatResult = await context.fileOperationManager.statWithRetry(filePath);
	if (!newStatResult.success) throw newStatResult.error;
	const stats = newStatResult.data;

	// Update cache
	context.fileCache.set(filePath, { content, mtimeMs: stats.mtimeMs });
	context.logger.info(`Created missing file from template: ${fileType}`);
	return { content, stats };
}

/**
 * Attempts to load a file from disk or cache.
 * Returns null if the file doesn't exist or an error occurs during stat/read.
 */
async function _loadFileFromDiskOrCache(
	filePath: string,
	fileType: MemoryBankFileType, // Added fileType for logging
	context: FileOperationContext,
): Promise<{ content: string; stats: Stats } | null> {
	try {
		const statResult = await context.fileOperationManager.statWithRetry(filePath);
		if (!statResult.success) {
			// If stat fails (e.g., file not found), return null to indicate it needs creation.
			context.logger.debug(`Stat failed for ${filePath}: ${statResult.error.message}`);
			return null;
		}
		const stats = statResult.data;

		const cached = context.fileCache.get(filePath);
		if (cached && cached.mtimeMs === stats.mtimeMs) {
			context.cacheStats.hits++;
			context.logger.info(`Loaded file from cache: ${fileType}`);
			return { content: cached.content, stats };
		}

		const streamingResult = await context.streamingManager.readFile(filePath);
		if (!streamingResult.success) {
			// If read fails, return null to indicate it needs creation or is unreadable.
			context.logger.warn(`Read failed for ${filePath}: ${streamingResult.error.message}`);
			return null;
		}
		const content = streamingResult.data.content;

		context.fileCache.set(filePath, { content, mtimeMs: stats.mtimeMs });
		context.cacheStats.misses++;
		context.logger.info(
			`Loaded file: ${fileType} (${streamingResult.data.wasStreamed ? "streamed" : "normal"} read)`,
		);
		return { content, stats };
	} catch (error) {
		// Catch any other unexpected errors during the process
		context.logger.error(
			`Unexpected error in _loadFileFromDiskOrCache for ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
		);
		return null;
	}
}

/**
 * Loads a single file with template fallback and caching
 * Reduces file loading complexity from ~8-10 branches to ~3
 */
export async function loadFileWithTemplate(
	fileType: MemoryBankFileType,
	context: FileOperationContext,
): Promise<{ content: string; stats: Stats; wasCreated: boolean }> {
	const filePath = validateAndConstructFilePath(context.memoryBankFolder, fileType);

	// Ensure directory exists
	const mkdirResult = await context.fileOperationManager.mkdirWithRetry(dirname(filePath), {
		recursive: true,
	});
	if (!mkdirResult.success) {
		throw mkdirResult.error;
	}

	const loadedFile = await _loadFileFromDiskOrCache(filePath, fileType, context);

	if (loadedFile) {
		return { ...loadedFile, wasCreated: false };
	}

	// If loadedFile is null, it means the file needs to be created from a template.
	context.logger.warn(
		`File ${filePath} for ${fileType} not found or unreadable, attempting to create from template.`,
	);
	const { content, stats } = await _createFileFromTemplateAndCache(fileType, filePath, context);
	return { content, stats, wasCreated: true };
}

/**
 * Checks the root memory bank folder.
 * @returns An array of issue strings if any problems are found.
 */
async function checkRootFolder(context: FileOperationContext): Promise<string[]> {
	const issues: string[] = [];
	try {
		const rootStatResult = await context.fileOperationManager.statWithRetry(
			context.memoryBankFolder,
		);
		if (!rootStatResult.success) {
			issues.push(`Error accessing root memory bank folder: ${rootStatResult.error.message}`);
		} else if (!rootStatResult.data.isDirectory()) {
			issues.push(`Root memory bank path is not a directory: ${context.memoryBankFolder}`);
		}
	} catch (e) {
		issues.push(
			`Unexpected error checking root memory bank folder: ${e instanceof Error ? e.message : String(e)}`,
		);
	}
	return issues;
}

/**
 * Checks a specific file type and its parent directory.
 * @returns An array of issue strings if any problems are found.
 */
async function checkFileAndParentDir(
	fileType: MemoryBankFileType,
	context: FileOperationContext,
): Promise<string[]> {
	const issues: string[] = [];
	try {
		const filePath = validateAndConstructFilePath(context.memoryBankFolder, fileType);
		const parentDir = dirname(filePath);

		// Check parent directory first if it's not the root memory bank folder itself
		if (parentDir !== context.memoryBankFolder) {
			try {
				const dirStatResult = await context.fileOperationManager.statWithRetry(parentDir);
				if (!dirStatResult.success) {
					issues.push(
						`Error accessing parent directory ${parentDir} for ${fileType}: ${dirStatResult.error.message}`,
					);
				} else if (!dirStatResult.data.isDirectory()) {
					issues.push(
						`Required parent path is not a directory: ${parentDir} for ${fileType}`,
					);
				}
			} catch (dirError) {
				issues.push(
					`Missing or unreadable parent directory: ${parentDir} for ${fileType} (Error: ${dirError instanceof Error ? dirError.message : String(dirError)})`,
				);
			}
		}

		// Check the file itself
		const fileStatResult = await context.fileOperationManager.statWithRetry(filePath);
		if (!fileStatResult.success) {
			issues.push(`Missing or unreadable file ${fileType}: ${fileStatResult.error.message}`);
		} else if (!fileStatResult.data.isFile()) {
			issues.push(`Path for ${fileType} exists but is not a file: ${filePath}`);
		}
	} catch (fileError) {
		issues.push(
			`Unexpected error checking file ${fileType}: ${fileError instanceof Error ? fileError.message : String(fileError)}`,
		);
	}
	return issues;
}

/**
 * Performs comprehensive health check of memory bank
 * Reduces health check complexity from ~4-5 branches to ~2
 */
export async function performHealthCheck(
	context: FileOperationContext,
): Promise<HealthCheckResult> {
	let issues: string[] = [];

	// Check root folder
	issues = issues.concat(await checkRootFolder(context));

	// Check all required files and their parent directories
	for (const fileType of Object.values(MemoryBankFileType)) {
		issues = issues.concat(await checkFileAndParentDir(fileType, context));
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

	try {
		for (const fileType of Object.values(MemoryBankFileType)) {
			const { content, stats, wasCreated } = await loadFileWithTemplate(fileType, context);

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

	const writeResult = await context.fileOperationManager.writeFileWithRetry(filePath, content);
	if (!writeResult.success) throw writeResult.error;

	const statResult = await context.fileOperationManager.statWithRetry(filePath);
	if (!statResult.success) throw statResult.error;
	const stats = statResult.data;

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
