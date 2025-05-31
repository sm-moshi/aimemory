import type { PathLike, Stats } from "node:fs";
import type { Mock } from "vitest";
import { vi } from "vitest";

// Helper functions to reduce nesting in mock implementations
export const createMockStats = (isDirectory: boolean, isFile = !isDirectory, size = 100): Stats =>
	({
		isDirectory: () => isDirectory,
		isFile: () => isFile,
		mtime: new Date(),
		size,
	}) as Stats;

export const createDirectoryStats = (): Stats => createMockStats(true, false, 0);
export const createFileStats = (size = 100): Stats => createMockStats(false, true, size);

export const createStatMockHandler = (
	mainMbPath: string,
	coreDirectoryPath: string,
	enoentError: NodeJS.ErrnoException,
) => {
	return async (p: PathLike) => {
		const pStr = p.toString();
		if (pStr === mainMbPath) {
			return createDirectoryStats();
		}
		if (pStr === coreDirectoryPath) {
			throw enoentError;
		}
		// If the path is within the core directory that doesn't exist, also fail
		if (pStr.startsWith(`${coreDirectoryPath}/`)) {
			const coreFileError = new Error(
				"ENOENT: core file missing because core dir missing",
			) as NodeJS.ErrnoException;
			coreFileError.code = "ENOENT";
			throw coreFileError;
		}
		// Fallback: For other paths not in core, make them seem like existing files
		return createFileStats();
	};
};

export const createLoadFilesStatMockHandler = (
	getPath: (subPath?: string) => Promise<string>,
	projectBriefPath: string,
) => {
	return async (path: PathLike) => {
		const pStr = path.toString();
		// For directory checks, assume they exist or are created by ensureMemoryBankFolders
		const directoryPaths = [
			await getPath(),
			await getPath("core"),
			await getPath("systemPatterns"),
		];

		if (directoryPaths.includes(pStr)) {
			return createDirectoryStats();
		}

		// If stat is called for a file *before* it's written by template, throw ENOENT
		const err = new Error(
			`ENOENT: File ${pStr} not yet written by template`,
		) as NodeJS.ErrnoException;
		err.code = "ENOENT";
		throw err;
	};
};

export const createAdvancedStatMockHandler = (
	getPath: (subPath?: string) => Promise<string>,
	projectBriefPath: string,
	activeContextPath: string,
	mockedWriteFile: Mock,
) => {
	return async (path: PathLike) => {
		const pStr = path.toString();
		// For directory checks, assume they exist or are created by ensureMemoryBankFolders
		const directoryPaths = [
			await getPath(),
			await getPath("core"),
			await getPath("systemPatterns"),
		];

		if (directoryPaths.includes(pStr)) {
			return createDirectoryStats();
		}

		// For file paths, if writeFile was called for them, they "exist".
		const wasWritten = mockedWriteFile.mock.calls.some((call) => call[0] === pStr);
		const isExpectedFile = [projectBriefPath, activeContextPath].includes(pStr);

		if (wasWritten || isExpectedFile) {
			// If it's a path we expect to be written, or was written
			if (mockedWriteFile.mock.calls.some((call) => call[0] === pStr)) {
				return createFileStats();
			}
		}

		// If stat is called for a file *before* it's written by template, throw ENOENT
		const err = new Error(
			`ENOENT: File ${pStr} not yet written by template`,
		) as NodeJS.ErrnoException;
		err.code = "ENOENT";
		throw err;
	};
};

export const configureFsStatBehavior = (
	behavior: Array<{
		path: string;
		isDirectory?: boolean;
		isFile?: boolean;
		error?: NodeJS.ErrnoException;
		size?: number;
	}>,
) => {
	const fs = require("node:fs/promises"); // Use require for mocked import

	vi.mocked(fs.stat).mockImplementation(async (path: PathLike) => {
		const pathStr = path.toString();
		const specificBehavior = behavior.find((b) => b.path === pathStr);

		if (specificBehavior) {
			if (specificBehavior.error) {
				throw specificBehavior.error;
			}
			return createMockStats(
				specificBehavior.isDirectory ?? false,
				specificBehavior.isFile ?? !(specificBehavior.isDirectory ?? false),
				specificBehavior.size,
			);
		}

		// Default behavior: assume file exists
		return createFileStats();
	});
};

export const configureFsAccessBehavior = (
	behavior: Array<{ path: string; error?: NodeJS.ErrnoException }>,
) => {
	const fs = require("node:fs/promises"); // Use require for mocked import

	vi.mocked(fs.access).mockImplementation(async (path: PathLike) => {
		const pathStr = path.toString();
		const specificBehavior = behavior.find((b) => b.path === pathStr);

		if (specificBehavior?.error) {
			throw specificBehavior.error;
		}
		// Default behavior: assume file is accessible
		return undefined;
	});
};
