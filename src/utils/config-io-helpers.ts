/**
 * Generic Config File I/O Helpers
 *
 * Utilities for reading, writing, and ensuring directories for configuration files.
 */

import type { Logger } from "@/types/logging.js";
import type { FileOperationManager } from "../core/FileOperationManager.js";

/**
 * Ensures a directory exists at the given path.
 * If successful, returns the path to the directory.
 * If an unexpected error occurs during directory creation (other than it already existing),
 * the error is logged and rethrown.
 */
export async function ensureDirectory(
	directoryPath: string,
	fileOperationManager: FileOperationManager,
	logger: Logger,
): Promise<string> {
	const mkdirResult = await fileOperationManager.mkdirWithRetry(directoryPath, {
		recursive: true,
	});

	if (!mkdirResult.success) {
		const error = mkdirResult.error;
		if (error.code === "EEXIST") {
			logger.debug?.(`${directoryPath} directory already exists.`);
			return directoryPath;
		}

		const errorMessage = `Failed to create directory ${directoryPath}: ${error.message}`;
		logger.error(errorMessage);
		throw new Error(errorMessage);
	}

	return directoryPath;
}

/**
 * Reads and parses a JSON configuration file.
 * Returns defaultConfig if the file doesn't exist or cannot be parsed.
 */
export async function readJsonFile<T>(
	filePath: string,
	fileOperationManager: FileOperationManager,
	logger: Logger,
	defaultConfig: T,
): Promise<T> {
	const readResult = await fileOperationManager.readFileWithRetry(filePath);

	if (!readResult.success) {
		const error = readResult.error;
		if (error.code === "ENOENT") {
			logger.info?.(`Config file ${filePath} doesn't exist, using default.`);
		} else {
			logger.error(
				`Config file ${filePath} couldn't be read or parsed (${error.message}), using default.`,
			);
		}
		return defaultConfig;
	}

	try {
		return JSON.parse(readResult.data) as T;
	} catch (parseError) {
		logger.error(
			`Config file ${filePath} couldn't be parsed (${parseError instanceof Error ? parseError.message : String(parseError)}), using default.`,
		);
		return defaultConfig;
	}
}

/**
 * Writes data to a JSON configuration file with standardized formatting.
 */
export async function writeJsonFile(
	filePath: string,
	data: unknown,
	fileOperationManager: FileOperationManager,
): Promise<void> {
	const writeResult = await fileOperationManager.writeFileWithRetry(
		filePath,
		JSON.stringify(data, null, 2),
	);

	if (!writeResult.success) {
		throw new Error(`Failed to write config file ${filePath}: ${writeResult.error.message}`);
	}
}
