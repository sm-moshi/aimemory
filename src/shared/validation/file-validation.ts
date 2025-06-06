/**
 * File Validation Services
 *
 * Domain-specific validation logic for memory bank files.
 * Handles validation of file existence, structure, and integrity.
 */

import fs from "node:fs/promises";
import type { SchemaValidationResult } from "@/types/config.js";
import type { FileOperationContext } from "@/types/core.js";
import { MemoryBankFileType } from "@/types/core.js";
import { validateAndConstructFilePath } from "@utils/index.js";

const _MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1MB

/**
 * Validates that the memory bank directory exists
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
): Promise<SchemaValidationResult> {
	const filePath = validateAndConstructFilePath(context.memoryBankFolder, fileType);

	try {
		const stats = await fs.stat(filePath);

		if (!stats.isFile()) {
			context.logger.info(`Checked file: ${fileType} - Exists: false (not a file)`);
			return {
				isValid: false,
				errors: ["Not a file"],
				context: {
					filePath,
					fileType,
				},
			};
		}

		context.logger.info(`Checked file: ${fileType} - Exists: true`);
		return {
			isValid: true,
			errors: [],
			context: {
				filePath,
				fileType,
			},
		};
	} catch (error) {
		context.logger.info(`Checked file: ${fileType} - Exists: false`);
		return {
			isValid: false,
			errors: [error instanceof Error ? error.message : String(error)],
			context: {
				filePath,
				fileType,
			},
		};
	}
}

/**
 * Validates all memory bank files
 * Returns missing files, files to invalidate, and validation results
 */
export async function validateAllMemoryBankFiles(context: FileOperationContext): Promise<{
	missingFiles: MemoryBankFileType[];
	filesToInvalidate: string[];
	validationResults: SchemaValidationResult[];
}> {
	const allFileTypes = Object.values(MemoryBankFileType);
	const validationResults: SchemaValidationResult[] = [];
	const missingFiles: MemoryBankFileType[] = [];
	const filesToInvalidate: string[] = [];

	for (const fileType of allFileTypes) {
		const result = await validateSingleFile(fileType, context);
		validationResults.push(result);

		if (!result.isValid) {
			missingFiles.push(fileType);
			if (result.context?.filePath) {
				filesToInvalidate.push(result.context.filePath);
			}
		}
	}

	return { missingFiles, filesToInvalidate, validationResults };
}
