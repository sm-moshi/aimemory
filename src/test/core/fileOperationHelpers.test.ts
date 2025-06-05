/**
 * Tests for File Operation Helpers
 * Verifies functionality of shared file operation utilities
 */

import type { Stats } from "node:fs";
import fs from "node:fs/promises";
import { dirname } from "node:path";
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileOperationManager } from "../../core/FileOperationManager.js";
import { loadFileWithTemplate, performHealthCheck } from "../../core/memory-bank-file-helpers.js";
import {
	validateMemoryBankDirectory,
	validateSingleFile,
} from "../../services/validation/file-validation.js";
import type {
	FileCache,
	FileError as FileErrorType,
	FileOperationContext,
	Result,
	RetryConfig,
} from "../../types/index.js";
import { MemoryBankFileType } from "../../types/index.js";
import { validateAndConstructFilePath } from "../../utils/files/path-validation.js";
import { createMockLogger, standardAfterEach, standardBeforeEach } from "../test-utils/index.js";

// Helper function for healthy file operation manager mock
function createHealthyFileOperationManagerMock(memoryBankFolder: string) {
	return async (pathToStat: string): Promise<Result<Stats, FileErrorType>> => {
		const genericStats: Stats = {
			isDirectory: () => false,
			isFile: () => false,
			isBlockDevice: () => false,
			isCharacterDevice: () => false,
			isSymbolicLink: () => false,
			isFIFO: () => false,
			isSocket: () => false,
			mtimeMs: Date.now(),
			mtime: new Date(),
			dev: 0,
			ino: 0,
			mode: 0,
			nlink: 0,
			uid: 0,
			gid: 0,
			rdev: 0,
			size: 0,
			blksize: 0,
			blocks: 0,
			atimeMs: 0,
			ctimeMs: 0,
			birthtimeMs: 0,
			atime: new Date(),
			ctime: new Date(),
			birthtime: new Date(),
		};

		if (pathToStat.toString() === memoryBankFolder) {
			return {
				success: true as const,
				data: { ...genericStats, isDirectory: () => true },
			};
		}
		const isAParentDir = Object.values(MemoryBankFileType).some((ft) => {
			const expectedFilePath = validateAndConstructFilePath(memoryBankFolder, ft);
			return dirname(expectedFilePath) === pathToStat.toString();
		});
		if (isAParentDir) {
			return {
				success: true as const,
				data: { ...genericStats, isDirectory: () => true },
			};
		}
		return {
			success: true as const,
			data: { ...genericStats, isFile: () => true },
		};
	};
}

// Helper function for folder missing file operation manager mock
function createFolderMissingFileOperationManagerMock(memoryBankFolder: string) {
	return async (pathToStat: string): Promise<Result<Stats, FileErrorType>> => {
		const originalError = new Error(
			pathToStat.toString() === memoryBankFolder
				? "ENOENT: No such file or directory"
				: "ENOENT: Path inside missing root",
		) as NodeJS.ErrnoException;
		originalError.code = "ENOENT";

		const fileError: FileErrorType = {
			code: "ENOENT",
			message: originalError.message,
			path: pathToStat.toString(),
			originalError,
		};
		return { success: false as const, error: fileError };
	};
}

// Helper function for files missing file operation manager mock
function createFilesMissingFileOperationManagerMock(memoryBankFolder: string) {
	return async (pathToStat: string): Promise<Result<Stats, FileErrorType>> => {
		const pathStr = pathToStat.toString();
		const genericStats: Stats = {
			isDirectory: () => false,
			isFile: () => false,
			isBlockDevice: () => false,
			isCharacterDevice: () => false,
			isSymbolicLink: () => false,
			isFIFO: () => false,
			isSocket: () => false,
			mtimeMs: Date.now(),
			mtime: new Date(),
			dev: 0,
			ino: 0,
			mode: 0,
			nlink: 0,
			uid: 0,
			gid: 0,
			rdev: 0,
			size: 0,
			blksize: 0,
			blocks: 0,
			atimeMs: 0,
			ctimeMs: 0,
			birthtimeMs: 0,
			atime: new Date(),
			ctime: new Date(),
			birthtime: new Date(),
		};

		if (pathStr === memoryBankFolder) {
			return {
				success: true as const,
				data: { ...genericStats, isDirectory: () => true },
			};
		}

		const isCoreProjectBrief =
			validateAndConstructFilePath(memoryBankFolder, MemoryBankFileType.ProjectBrief) ===
			pathStr;
		const isProgressCurrent =
			validateAndConstructFilePath(memoryBankFolder, MemoryBankFileType.ProgressCurrent) ===
			pathStr;

		if (isCoreProjectBrief || isProgressCurrent) {
			const originalError = new Error("ENOENT");
			Object.assign(originalError, { code: "ENOENT" });
			const fileError: FileErrorType = {
				code: (originalError as any).code as FileErrorType["code"],
				message: "ENOENT",
				path: pathStr,
				originalError,
			};
			return { success: false as const, error: fileError };
		}

		if (
			Object.values(MemoryBankFileType).some(
				(ft) => validateAndConstructFilePath(memoryBankFolder, ft) === pathStr,
			)
		) {
			return {
				success: true as const,
				data: { ...genericStats, isFile: () => true },
			};
		}
		if (
			Object.values(MemoryBankFileType).some(
				(ft) => dirname(validateAndConstructFilePath(memoryBankFolder, ft)) === pathStr,
			)
		) {
			return {
				success: true as const,
				data: { ...genericStats, isDirectory: () => true },
			};
		}

		const originalError = new Error("Unknown path in mock for filesMissing scenario");
		Object.assign(originalError, { code: "UNKNOWN_MOCK_PATH" });
		const fileError: FileErrorType = {
			code: (originalError as any).code as FileErrorType["code"],
			message: originalError.message,
			path: pathStr,
			originalError,
		};
		return { success: false as const, error: fileError };
	};
}

// Helper function for cache test file operation manager mock
function createCacheTestFileOperationManagerMock(expectedFilePath: string, cachedMtimeMs: number) {
	return async (pathArg: string): Promise<Result<Stats, FileErrorType>> => {
		if (pathArg === expectedFilePath) {
			return {
				success: true as const,
				data: {
					mtimeMs: cachedMtimeMs,
					isFile: () => true,
					isDirectory: () => false,
					mtime: new Date(cachedMtimeMs),
					dev: 0,
					ino: 0,
					mode: 0,
					nlink: 0,
					uid: 0,
					gid: 0,
					rdev: 0,
					size: 0,
					blksize: 0,
					blocks: 0,
					atimeMs: 0,
					ctimeMs: 0,
					birthtimeMs: 0,
					atime: new Date(),
					ctime: new Date(),
					birthtime: new Date(),
				} as Stats,
			};
		}
		return {
			success: true as const,
			data: {
				isFile: () => false,
				isDirectory: () => true,
				mtimeMs: Date.now(),
				dev: 0,
				ino: 0,
				mode: 0,
				nlink: 0,
				uid: 0,
				gid: 0,
				rdev: 0,
				size: 0,
				blksize: 0,
				blocks: 0,
				atimeMs: 0,
				ctimeMs: 0,
				birthtimeMs: 0,
				atime: new Date(),
				ctime: new Date(),
				birthtime: new Date(),
				mtime: new Date(),
			} as Stats,
		};
	};
}

// Helper function for stale cache test file operation manager mock
function createStaleCacheTestFileOperationManagerMock(
	expectedFilePath: string,
	diskMtimeMs: number,
) {
	return async (pathArg: string): Promise<Result<Stats, FileErrorType>> => {
		if (pathArg === expectedFilePath) {
			return {
				success: true as const,
				data: {
					mtimeMs: diskMtimeMs,
					isFile: () => true,
					isDirectory: () => false,
					mtime: new Date(diskMtimeMs),
					dev: 0,
					ino: 0,
					mode: 0,
					nlink: 0,
					uid: 0,
					gid: 0,
					rdev: 0,
					size: 0,
					blksize: 0,
					blocks: 0,
					atimeMs: 0,
					ctimeMs: 0,
					birthtimeMs: 0,
					atime: new Date(),
					ctime: new Date(),
					birthtime: new Date(),
				} as Stats,
			};
		}
		return {
			success: true as const,
			data: {
				isFile: () => false,
				isDirectory: () => true,
				mtimeMs: Date.now(),
				dev: 0,
				ino: 0,
				mode: 0,
				nlink: 0,
				uid: 0,
				gid: 0,
				rdev: 0,
				size: 0,
				blksize: 0,
				blocks: 0,
				atimeMs: 0,
				ctimeMs: 0,
				birthtimeMs: 0,
				atime: new Date(),
				ctime: new Date(),
				birthtime: new Date(),
				mtime: new Date(),
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
	return async (pathArg: string): Promise<Result<Stats, FileErrorType>> => {
		if (pathArg === expectedFilePath) {
			if (!fileExistsRef.value) {
				const error = new Error("ENOENT file missing");
				Object.assign(error, { code: "ENOENT" });
				const fileError: FileErrorType = {
					code: (error as any).code as FileErrorType["code"],
					message: "ENOENT file missing",
					path: pathArg,
					originalError: error,
				};
				return { success: false as const, error: fileError };
			}
			return {
				success: true as const,
				data: {
					mtimeMs: creationMtimeMs,
					isFile: () => true,
					isDirectory: () => false,
					mtime: new Date(creationMtimeMs),
					dev: 0,
					ino: 0,
					mode: 0,
					nlink: 0,
					uid: 0,
					gid: 0,
					rdev: 0,
					size: 0,
					blksize: 0,
					blocks: 0,
					atimeMs: 0,
					ctimeMs: 0,
					birthtimeMs: 0,
					atime: new Date(),
					ctime: new Date(),
					birthtime: new Date(),
				} as Stats,
			};
		}
		return {
			success: true as const,
			data: {
				isDirectory: () => true,
				isFile: () => false,
				mtimeMs: Date.now(),
				dev: 0,
				ino: 0,
				mode: 0,
				nlink: 0,
				uid: 0,
				gid: 0,
				rdev: 0,
				size: 0,
				blksize: 0,
				blocks: 0,
				atimeMs: 0,
				ctimeMs: 0,
				birthtimeMs: 0,
				atime: new Date(),
				ctime: new Date(),
				birthtime: new Date(),
				mtime: new Date(),
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
	let mockLogger: ReturnType<typeof createMockLogger>;
	let mockStreamingManager: any;
	let fomInstance: FileOperationManager; // To hold the actual instance

	// Spies on the public methods of fomInstance
	let mockMkdirWithRetry: MockInstance<
		(path: string, options?: { recursive?: boolean }) => Promise<Result<void, FileErrorType>>
	>;
	let mockStatWithRetry: MockInstance<(path: string) => Promise<Result<Stats, FileErrorType>>>;
	let mockWriteFileWithRetry: MockInstance<
		(path: string, content: string) => Promise<Result<void, FileErrorType>>
	>;

	const MOCK_MEMORY_BANK_FOLDER = "/test/memory-bank";
	const MOCK_RETRY_CONFIG: RetryConfig = {
		maxRetries: 3,
		baseDelay: 100,
		maxDelay: 5000,
		backoffFactor: 2,
	};
	const MOCK_TIMEOUT = 5000;

	beforeEach(() => {
		standardBeforeEach();

		mockFileCache = new Map();
		mockLogger = createMockLogger();

		mockStreamingManager = {
			readFile: vi.fn().mockResolvedValue({
				success: true,
				data: { content: "default mock stream content", wasStreamed: true },
			}),
		};

		// Create a real FileOperationManager instance
		fomInstance = new FileOperationManager(mockLogger, MOCK_MEMORY_BANK_FOLDER, {
			retryConfig: MOCK_RETRY_CONFIG,
			timeout: MOCK_TIMEOUT,
		});

		// Spy on its public methods
		mockMkdirWithRetry = vi
			.spyOn(fomInstance, "mkdirWithRetry")
			.mockResolvedValue({ success: true, data: undefined } as Result<void, FileErrorType>);
		mockStatWithRetry = vi.spyOn(fomInstance, "statWithRetry").mockResolvedValue({
			success: true,
			data: {
				isFile: () => true,
				isDirectory: () => false,
				mtimeMs: Date.now(),
				mtime: new Date(),
				dev: 0,
				ino: 0,
				mode: 0,
				nlink: 0,
				uid: 0,
				gid: 0,
				rdev: 0,
				size: 0,
				blksize: 0,
				blocks: 0,
				atimeMs: 0,
				ctimeMs: 0,
				birthtimeMs: 0,
				atime: new Date(),
				ctime: new Date(),
				birthtime: new Date(),
			} as Stats,
		} as Result<Stats, FileErrorType>);
		mockWriteFileWithRetry = vi
			.spyOn(fomInstance, "writeFileWithRetry")
			.mockResolvedValue({ success: true, data: undefined } as Result<void, FileErrorType>);
		vi.spyOn(fomInstance, "readFileWithRetry").mockResolvedValue({
			success: true,
			data: "default mock file content",
		} as Result<string, FileErrorType>);
		vi.spyOn(fomInstance, "accessWithRetry").mockResolvedValue({
			success: true,
			data: undefined,
		} as Result<void, FileErrorType>);

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
			fileOperationManager: fomInstance, // Use the spied-upon instance
		};
	});

	afterEach(() => {
		standardAfterEach();
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
			mockStatWithRetry.mockReset().mockResolvedValue({
				success: true,
				data: {
					isFile: () => true,
					isDirectory: () => false,
					mtimeMs: Date.now(),
					mtime: new Date(),
					dev: 0,
					ino: 0,
					mode: 0,
					nlink: 0,
					uid: 0,
					gid: 0,
					rdev: 0,
					size: 0,
					blksize: 0,
					blocks: 0,
					atimeMs: 0,
					ctimeMs: 0,
					birthtimeMs: 0,
					atime: new Date(),
					ctime: new Date(),
					birthtime: new Date(),
				} as Stats,
			});
			mockWriteFileWithRetry
				.mockReset()
				.mockResolvedValue({ success: true, data: undefined });
			mockMkdirWithRetry.mockReset().mockResolvedValue({ success: true, data: undefined });
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
			mockMkdirWithRetry.mockResolvedValue({ success: true, data: undefined });

			// Mock stat to return the same mtime as cached
			mockStatWithRetry.mockImplementation(
				createCacheTestFileOperationManagerMock(expectedFilePath, cachedMtimeMs),
			);

			const result = await loadFileWithTemplate(fileType, mockContext);

			expect(result.content).toBe("cached content");
			expect(result.wasCreated).toBe(false);
			expect(mockStreamingManager.readFile).not.toHaveBeenCalled();
			expect(mockStatWithRetry).toHaveBeenCalledWith(expectedFilePath);
		});

		it("should read existing file from disk when cache is stale or missing", async () => {
			const diskMtimeMs = 789012;
			// Cache is empty or has old mtimeMs
			mockFileCache.set(expectedFilePath, {
				content: "stale cached content",
				mtimeMs: 111111, // Older than diskMtimeMs
			});

			// Mock mkdir to succeed for directory creation
			mockMkdirWithRetry.mockResolvedValue({ success: true, data: undefined });

			mockStatWithRetry.mockImplementation(
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
			expect(mockStatWithRetry).toHaveBeenCalledWith(expectedFilePath);
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
			mockStatWithRetry.mockImplementation(
				createFileCreationTestFileOperationManagerMock(
					expectedFilePath,
					creationMtimeMs,
					fileExistsRef,
				),
			);

			mockWriteFileWithRetry.mockImplementation(async () => {
				fileExistsRef.value = true; // Simulate file creation
				return { success: true, data: undefined };
			});
			mockMkdirWithRetry.mockResolvedValue({ success: true, data: undefined });

			vi.mocked(getTemplateForFileType).mockReturnValue("template content");

			const result = await loadFileWithTemplate(fileType, mockContext);

			expect(result.content).toBe("template content");
			expect(result.wasCreated).toBe(true);
			expect(mockMkdirWithRetry).toHaveBeenCalledWith(dirname(expectedFilePath), {
				recursive: true,
			});
			expect(mockWriteFileWithRetry).toHaveBeenCalledWith(
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
			mockStatWithRetry.mockImplementation(
				createHealthyFileOperationManagerMock(memoryBankFolder),
			);

			const result = await performHealthCheck(mockContext);

			expect(result.isHealthy).toBe(true);
			expect(result.issues).toHaveLength(0);
			expect(result.summary).toContain("✅");
		});

		it("should return unhealthy result when folder is missing", async () => {
			const memoryBankFolder = mockContext.memoryBankFolder;
			mockStatWithRetry.mockImplementation(
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
			mockStatWithRetry.mockImplementation(
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
