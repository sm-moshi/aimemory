import type { Stats } from "node:fs";
import { dirname } from "node:path";
import { MemoryBankFileType } from "../../types/index.js";
import { validateAndConstructFilePath } from "../../utils/files/path-validation.js";

/**
 * Helper function for the 'healthy' fs.stat mock implementation
 */
export async function healthyStatMockImplementation(
	pathToStat: string,
	memoryBankFolder: string,
): Promise<Stats> {
	const pathStr = pathToStat.toString();
	if (pathStr === memoryBankFolder) {
		return { isDirectory: () => true, isFile: () => false } as Stats;
	}
	const isAParentDir = Object.values(MemoryBankFileType).some((ft) => {
		const expectedFilePath = validateAndConstructFilePath(memoryBankFolder, ft);
		return dirname(expectedFilePath) === pathStr;
	});
	if (isAParentDir) {
		return { isDirectory: () => true, isFile: () => false } as Stats;
	}
	return { isDirectory: () => false, isFile: () => true } as Stats;
}

/**
 * Helper function for the 'folder missing' fs.stat mock implementation
 */
export async function folderMissingStatMockImplementation(
	pathToStat: string,
	memoryBankFolder: string,
): Promise<Stats> {
	if (pathToStat.toString() === memoryBankFolder) {
		const error = new Error("ENOENT: No such file or directory") as NodeJS.ErrnoException;
		error.code = "ENOENT";
		throw error;
	}
	const error = new Error("ENOENT: Path inside missing root") as NodeJS.ErrnoException;
	error.code = "ENOENT";
	throw error;
}

/**
 * Helper function for the 'files missing' fs.stat mock implementation
 */
export async function filesMissingStatMockImplementation(
	pathToStat: string,
	memoryBankFolder: string,
): Promise<Stats> {
	if (pathToStat.toString() === memoryBankFolder) {
		return { isDirectory: () => true, isFile: () => false } as Stats;
	}
	const filePathStr = pathToStat.toString();
	if (
		filePathStr.endsWith("core/projectBrief.md") ||
		filePathStr.endsWith("progress/current.md")
	) {
		const error = new Error("ENOENT") as NodeJS.ErrnoException;
		error.code = "ENOENT";
		throw error;
	}
	if (
		Object.values(MemoryBankFileType).some(
			(ft) =>
				filePathStr.endsWith(ft) &&
				!filePathStr.endsWith("core/projectBrief.md") &&
				!filePathStr.endsWith("progress/current.md"),
		)
	) {
		return { isDirectory: () => false, isFile: () => true } as Stats;
	}
	return { isDirectory: () => true, isFile: () => false } as Stats;
}

/**
 * Helper function for healthy file operation manager mock
 */
export function createHealthyFileOperationManagerMock(memoryBankFolder: string) {
	return async (pathToStat: string) => {
		if (pathToStat.toString() === memoryBankFolder) {
			return {
				success: true,
				data: {
					isDirectory: () => true,
					isFile: () => false,
					mtimeMs: Date.now(),
				} as Stats,
			};
		}
		const isAParentDir = Object.values(MemoryBankFileType).some((ft) => {
			const expectedFilePath = validateAndConstructFilePath(memoryBankFolder, ft);
			return dirname(expectedFilePath) === pathToStat.toString();
		});
		if (isAParentDir) {
			return {
				success: true,
				data: {
					isDirectory: () => true,
					isFile: () => false,
					mtimeMs: Date.now(),
				} as Stats,
			};
		}
		return {
			success: true,
			data: {
				isDirectory: () => false,
				isFile: () => true,
				mtimeMs: Date.now(),
			} as Stats,
		};
	};
}

/**
 * Helper function for folder missing file operation manager mock
 */
export function createFolderMissingFileOperationManagerMock(memoryBankFolder: string) {
	return async (pathToStat: string) => {
		if (pathToStat.toString() === memoryBankFolder) {
			const error = new Error("ENOENT: No such file or directory") as NodeJS.ErrnoException;
			error.code = "ENOENT";
			return { success: false, error };
		}
		const error = new Error("ENOENT: Path inside missing root") as NodeJS.ErrnoException;
		error.code = "ENOENT";
		return { success: false, error };
	};
}

/**
 * Helper function for files missing file operation manager mock
 */
export function createFilesMissingFileOperationManagerMock(memoryBankFolder: string) {
	return async (pathToStat: string) => {
		const pathStr = pathToStat.toString();
		if (pathStr === memoryBankFolder) {
			return {
				success: true,
				data: {
					isDirectory: () => true,
					isFile: () => false,
					mtimeMs: Date.now(),
				} as Stats,
			};
		}

		const isCoreProjectBrief =
			validateAndConstructFilePath(memoryBankFolder, MemoryBankFileType.ProjectBrief) ===
			pathStr;
		const isProgressCurrent =
			validateAndConstructFilePath(memoryBankFolder, MemoryBankFileType.ProgressCurrent) ===
			pathStr;

		if (isCoreProjectBrief || isProgressCurrent) {
			const error = new Error("ENOENT") as NodeJS.ErrnoException;
			error.code = "ENOENT";
			return { success: false, error };
		}

		if (
			Object.values(MemoryBankFileType).some(
				(ft) => validateAndConstructFilePath(memoryBankFolder, ft) === pathStr,
			)
		) {
			return {
				success: true,
				data: {
					isDirectory: () => false,
					isFile: () => true,
					mtimeMs: Date.now(),
				} as Stats,
			};
		}
		if (
			Object.values(MemoryBankFileType).some(
				(ft) => dirname(validateAndConstructFilePath(memoryBankFolder, ft)) === pathStr,
			)
		) {
			return {
				success: true,
				data: {
					isDirectory: () => true,
					isFile: () => false,
					mtimeMs: Date.now(),
				} as Stats,
			};
		}
		const error = new Error(
			"Unknown path in mock for filesMissing scenario",
		) as NodeJS.ErrnoException;
		error.code = "ENOENT";
		return { success: false, error };
	};
}

/**
 * Helper function for cache test file operation manager mock
 */
export function createCacheTestFileOperationManagerMock(
	expectedFilePath: string,
	cachedMtimeMs: number,
) {
	return async (pathArg: string) => {
		if (pathArg === expectedFilePath) {
			return {
				success: true,
				data: {
					mtimeMs: cachedMtimeMs,
					isFile: () => true,
					isDirectory: () => false,
					mtime: new Date(cachedMtimeMs),
				} as Stats,
			};
		}
		return {
			success: true,
			data: {
				isFile: () => false,
				isDirectory: () => true,
				mtimeMs: Date.now(),
			} as Stats,
		};
	};
}

/**
 * Helper function for stale cache test file operation manager mock
 */
export function createStaleCacheTestFileOperationManagerMock(
	expectedFilePath: string,
	diskMtimeMs: number,
) {
	return async (pathArg: string) => {
		if (pathArg === expectedFilePath) {
			return {
				success: true,
				data: {
					mtimeMs: diskMtimeMs,
					isFile: () => true,
					isDirectory: () => false,
					mtime: new Date(diskMtimeMs),
				} as Stats,
			};
		}
		return {
			success: true,
			data: {
				isFile: () => false,
				isDirectory: () => true,
				mtimeMs: Date.now(),
			} as Stats,
		};
	};
}

/**
 * Helper function for file creation test file operation manager mock
 */
export function createFileCreationTestFileOperationManagerMock(
	expectedFilePath: string,
	creationMtimeMs: number,
	fileExistsRef: { value: boolean },
) {
	return async (pathArg: string) => {
		if (pathArg === expectedFilePath) {
			if (!fileExistsRef.value) {
				const error = new Error("ENOENT file missing") as NodeJS.ErrnoException;
				error.code = "ENOENT";
				return { success: false, error };
			}
			return {
				success: true,
				data: {
					mtimeMs: creationMtimeMs,
					isFile: () => true,
					isDirectory: () => false,
					mtime: new Date(creationMtimeMs),
				} as Stats,
			};
		}
		return {
			success: true,
			data: {
				isDirectory: () => true,
				isFile: () => false,
				mtimeMs: Date.now(),
			} as Stats,
		};
	};
}
