/**
 * Tests for File Operation Helpers
 * Verifies functionality of shared file operation utilities
 */

import type { PathLike, Stats } from "node:fs";
import fs from "node:fs/promises";
import { dirname } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadFileWithTemplate, performHealthCheck } from "../../core/memory-bank-file-helpers.js";
import {
	validateMemoryBankDirectory,
	validateSingleFile,
} from "../../services/validation/file-validation.js";
import type { FileCache, FileOperationContext } from "../../types/index.js";
import { MemoryBankFileType } from "../../types/index.js";
import { validateAndConstructFilePath } from "../../utils/files/path-validation.js";

// Helper function for the 'healthy' fs.stat mock implementation
async function healthyStatMockImplementation(
	pathToStat: PathLike,
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

// Helper function for the 'folder missing' fs.stat mock implementation
async function folderMissingStatMockImplementation(
	pathToStat: PathLike,
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

// Helper function for the 'files missing' fs.stat mock implementation
async function filesMissingStatMockImplementation(
	pathToStat: PathLike,
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

// Helper function for healthy file operation manager mock
function createHealthyFileOperationManagerMock(memoryBankFolder: string) {
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

// Helper function for folder missing file operation manager mock
function createFolderMissingFileOperationManagerMock(memoryBankFolder: string) {
	return async (pathToStat: string) => {
		if (pathToStat.toString() === memoryBankFolder) {
			const error = new Error("ENOENT: No such file or directory") as NodeJS.ErrnoException;
			error.code = "ENOENT";
			return { success: false, error };
		}
		// For other files, also return error as they can't be accessed
		const error = new Error("ENOENT: Path inside missing root") as NodeJS.ErrnoException;
		error.code = "ENOENT";
		return { success: false, error };
	};
}

// Helper function for files missing file operation manager mock
function createFilesMissingFileOperationManagerMock(memoryBankFolder: string) {
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
		// Default for unexpected paths in this mock during a test
		const error = new Error(
			"Unknown path in mock for filesMissing scenario",
		) as NodeJS.ErrnoException;
		error.code = "ENOENT"; // Or some other appropriate error
		return { success: false, error };
	};
}

// Helper function for cache test file operation manager mock
function createCacheTestFileOperationManagerMock(expectedFilePath: string, cachedMtimeMs: number) {
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
		// Fallback for directory checks etc.
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

// Helper function for stale cache test file operation manager mock
function createStaleCacheTestFileOperationManagerMock(
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

// Helper function for file creation test file operation manager mock
function createFileCreationTestFileOperationManagerMock(
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
			// After creation, stat succeeds
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
		// For directory checks (e.g. by mkdirWithRetry)
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

// Mock file system operations
vi.mock("node:fs/promises", () => ({
	default: {
		stat: vi.fn(),
		readFile: vi.fn(),
		writeFile: vi.fn(),
		mkdir: vi.fn(),
		access: vi.fn(),
	},
}));

// Mock templates
vi.mock("../../services/templates/memory-bank-templates.js", () => ({
	getTemplateForFileType: vi.fn((fileType: string) => `Template for ${fileType}`),
}));

describe("File Operation Helpers", () => {
	let mockContext: FileOperationContext;
	let mockFileCache: Map<string, FileCache>;
	let mockLogger: any;
	let mockStreamingManager: any;
	let mockFileOperationManager: any;

	const MOCK_MEMORY_BANK_FOLDER = "/test/memory-bank";

	beforeEach(() => {
		vi.clearAllMocks();

		mockFileCache = new Map();
		mockLogger = {
			info: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
			debug: vi.fn(),
		};
		mockStreamingManager = {
			readFile: vi.fn().mockResolvedValue({
				success: true,
				data: { content: "default mock stream content", wasStreamed: true },
			}),
		};
		mockFileOperationManager = {
			mkdirWithRetry: vi.fn().mockResolvedValue({ success: true }),
			statWithRetry: vi.fn().mockResolvedValue({
				success: true,
				data: {
					isFile: () => true,
					isDirectory: () => false,
					mtimeMs: Date.now(),
					mtime: new Date(),
				} as Stats,
			}),
			writeFileWithRetry: vi.fn().mockResolvedValue({ success: true }),
			readFileWithRetry: vi
				.fn()
				.mockResolvedValue({ success: true, data: "default mock file content" }),
			accessWithRetry: vi.fn().mockResolvedValue({ success: true }),
		};

		mockContext = {
			memoryBankFolder: MOCK_MEMORY_BANK_FOLDER,
			logger: mockLogger,
			fileCache: mockFileCache,
			cacheStats: {
				hits: 0,
				misses: 0,
				totalFiles: 0,
				hitRate: 0,
				lastReset: new Date(),
				reloads: 0,
			},
			streamingManager: mockStreamingManager,
			fileOperationManager: mockFileOperationManager,
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("validateMemoryBankDirectory", () => {
		it("should return true for valid directory", async () => {
			vi.mocked(fs.stat).mockResolvedValue({
				isDirectory: () => true,
			} as any);

			const result = await validateMemoryBankDirectory(mockContext);

			expect(result).toBe(true);
			expect(fs.stat).toHaveBeenCalledWith("/test/memory-bank");
		});

		it("should return false for non-directory", async () => {
			vi.mocked(fs.stat).mockResolvedValue({
				isDirectory: () => false,
			} as any);

			const result = await validateMemoryBankDirectory(mockContext);

			expect(result).toBe(false);
			expect(mockLogger.error).toHaveBeenCalledWith("Memory bank folder does not exist.");
		});

		it("should return false for missing directory", async () => {
			vi.mocked(fs.stat).mockRejectedValue(new Error("ENOENT"));

			const result = await validateMemoryBankDirectory(mockContext);

			expect(result).toBe(false);
			expect(mockLogger.error).toHaveBeenCalledWith("Memory bank folder does not exist.");
		});
	});

	describe("validateSingleFile", () => {
		const fileType = MemoryBankFileType.ProjectBrief;

		it("should return valid result for existing file", async () => {
			vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true } as any);

			const result = await validateSingleFile(fileType, mockContext);

			expect(result.isValid).toBe(true);
			expect(result.fileType).toBe(fileType);
			expect(result.filePath).toBe("/test/memory-bank/core/projectBrief.md");
		});

		it("should return invalid result for non-file", async () => {
			vi.mocked(fs.stat).mockResolvedValue({ isFile: () => false } as any);

			const result = await validateSingleFile(fileType, mockContext);

			expect(result.isValid).toBe(false);
			expect(result.error).toBe("Not a file");
		});

		it("should return invalid result for missing file", async () => {
			vi.mocked(fs.stat).mockRejectedValue(new Error("ENOENT"));

			const result = await validateSingleFile(fileType, mockContext);

			expect(result.isValid).toBe(false);
			expect(result.error).toBe("ENOENT");
		});
	});

	describe("loadFileWithTemplate", () => {
		const fileType = MemoryBankFileType.ProjectBrief;
		const expectedFilePath = validateAndConstructFilePath(MOCK_MEMORY_BANK_FOLDER, fileType);

		beforeEach(() => {
			mockFileOperationManager.statWithRetry.mockReset().mockResolvedValue({
				// Reset and set a default
				success: true,
				data: {
					isFile: () => true,
					isDirectory: () => false,
					mtimeMs: Date.now(),
					mtime: new Date(),
				} as Stats,
			});
			mockFileOperationManager.writeFileWithRetry
				.mockReset()
				.mockResolvedValue({ success: true });
			mockFileOperationManager.mkdirWithRetry
				.mockReset()
				.mockResolvedValue({ success: true });
			mockStreamingManager.readFile.mockReset().mockResolvedValue({
				success: true,
				data: { content: "default mock stream content", wasStreamed: true },
			});
			mockFileCache.clear(); // Clear cache before each test
		});

		it("should load existing file from cache", async () => {
			const cachedMtimeMs = 123456;

			// Set up cache first
			mockFileCache.set(expectedFilePath, {
				content: "cached content",
				mtimeMs: cachedMtimeMs,
			});

			// Mock mkdir to succeed for directory creation
			mockFileOperationManager.mkdirWithRetry.mockResolvedValue({ success: true });

			// Mock stat to return the same mtime as cached
			mockFileOperationManager.statWithRetry.mockImplementation(
				createCacheTestFileOperationManagerMock(expectedFilePath, cachedMtimeMs),
			);

			const result = await loadFileWithTemplate(fileType, mockContext);

			expect(result.content).toBe("cached content");
			expect(result.wasCreated).toBe(false);
			expect(mockStreamingManager.readFile).not.toHaveBeenCalled();
			expect(mockFileOperationManager.statWithRetry).toHaveBeenCalledWith(expectedFilePath);
		});

		it("should read existing file from disk when cache is stale or missing", async () => {
			const diskMtimeMs = 789012;
			// Cache is empty or has old mtimeMs
			mockFileCache.set(expectedFilePath, {
				content: "stale cached content",
				mtimeMs: 111111, // Older than diskMtimeMs
			});

			// Mock mkdir to succeed for directory creation
			mockFileOperationManager.mkdirWithRetry.mockResolvedValue({ success: true });

			mockFileOperationManager.statWithRetry.mockImplementation(
				createStaleCacheTestFileOperationManagerMock(expectedFilePath, diskMtimeMs),
			);

			mockStreamingManager.readFile.mockResolvedValue({
				success: true,
				data: { content: "file content", wasStreamed: false },
			});

			const result = await loadFileWithTemplate(fileType, mockContext);

			expect(result.content).toBe("file content");
			expect(result.wasCreated).toBe(false);
			expect(mockStreamingManager.readFile).toHaveBeenCalledWith(expectedFilePath);
			expect(mockFileOperationManager.statWithRetry).toHaveBeenCalledWith(expectedFilePath);
			// Check cache update
			const cachedEntry = mockFileCache.get(expectedFilePath);
			expect(cachedEntry).toBeDefined();
			expect(cachedEntry?.content).toBe("file content");
			expect(cachedEntry?.mtimeMs).toBe(diskMtimeMs);
		});

		it("should create file from template when missing", async () => {
			const { getTemplateForFileType } = await import(
				"../../services/templates/memory-bank-templates.js"
			);
			const creationMtimeMs = 999999;

			const fileExistsRef = { value: false };
			mockFileOperationManager.statWithRetry.mockImplementation(
				createFileCreationTestFileOperationManagerMock(
					expectedFilePath,
					creationMtimeMs,
					fileExistsRef,
				),
			);

			mockFileOperationManager.writeFileWithRetry.mockImplementation(async () => {
				fileExistsRef.value = true; // Simulate file creation
				return { success: true };
			});
			mockFileOperationManager.mkdirWithRetry.mockResolvedValue({ success: true });

			vi.mocked(getTemplateForFileType).mockReturnValue("template content");

			const result = await loadFileWithTemplate(fileType, mockContext);

			expect(result.content).toBe("template content");
			expect(result.wasCreated).toBe(true);
			expect(mockFileOperationManager.mkdirWithRetry).toHaveBeenCalledWith(
				dirname(expectedFilePath),
				{ recursive: true },
			);
			expect(mockFileOperationManager.writeFileWithRetry).toHaveBeenCalledWith(
				expectedFilePath,
				"template content",
			);
			// Check cache update
			const cachedEntry = mockFileCache.get(expectedFilePath);
			expect(cachedEntry).toBeDefined();
			expect(cachedEntry?.content).toBe("template content");
			// The mtimeMs in cache should come from the stat call *after* creation.
			// If writeFileWithRetry doesn't internally stat and update mtime, this might be tricky.
			// For now, let's assume the subsequent stat call in loadFileWithTemplate handles it.
			// If statWithRetry is not called again after writeFileWithRetry by loadFileWithTemplate,
			// this part of the test might need adjustment based on implementation details.
		});
	});

	describe("performHealthCheck", () => {
		it("should return healthy result when all files exist", async () => {
			const memoryBankFolder = mockContext.memoryBankFolder;
			mockFileOperationManager.statWithRetry.mockImplementation(
				createHealthyFileOperationManagerMock(memoryBankFolder),
			);

			const result = await performHealthCheck(mockContext);

			expect(result.isHealthy).toBe(true);
			expect(result.issues).toHaveLength(0);
			expect(result.summary).toContain("✅");
		});

		it("should return unhealthy result when folder is missing", async () => {
			const memoryBankFolder = mockContext.memoryBankFolder;
			mockFileOperationManager.statWithRetry.mockImplementation(
				createFolderMissingFileOperationManagerMock(memoryBankFolder),
			);

			const result = await performHealthCheck(mockContext);

			expect(result.isHealthy).toBe(false);
			// Updated assertion to match actual error message structure
			expect(result.issues[0]).toBe(
				"Error accessing root memory bank folder: ENOENT: No such file or directory",
			);
			for (const fileType of Object.values(MemoryBankFileType)) {
				expect(result.issues).toContain(
					`Missing or unreadable file ${fileType}: ENOENT: Path inside missing root`,
				);
			}
			expect(result.summary).toContain("❌");
		});

		it("should return unhealthy result when files are missing", async () => {
			const memoryBankFolder = mockContext.memoryBankFolder;
			mockFileOperationManager.statWithRetry.mockImplementation(
				createFilesMissingFileOperationManagerMock(memoryBankFolder),
			);

			const result = await performHealthCheck(mockContext);

			expect(result.isHealthy).toBe(false);
			expect(result.issues).toContain(
				`Missing or unreadable file ${MemoryBankFileType.ProjectBrief}: ENOENT`,
			);
			expect(result.issues).toContain(
				`Missing or unreadable file ${MemoryBankFileType.ProgressCurrent}: ENOENT`,
			);
			// Check that ActiveContext (which should exist based on the mock) is not listed as an issue
			expect(result.issues).not.toContain(
				`Missing or unreadable file ${MemoryBankFileType.ActiveContext}: ENOENT`,
			);
			expect(result.summary).toContain("❌");
		});
	});
});
