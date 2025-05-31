/**
 * Path Validation Utilities
 *
 * Pure utilities for validating and constructing safe file paths.
 * Prevents path traversal attacks and ensures paths stay within allowed directories.
 */

import { join, resolve } from "node:path";
import { MemoryBankFileType } from "../../types/types.js";

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
