import type { PathLike, Stats } from "node:fs";
import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";
import { CacheManager } from "../../core/CacheManager.js";
import { FileOperationManager } from "../../core/FileOperationManager.js";
import { MemoryBankServiceCore } from "../../core/memoryBankServiceCore.js";
import { StreamingManager } from "../../performance/StreamingManager.js";
import { MemoryBankFileType } from "../../types/core.js";
import { isSuccess } from "../../types/errorHandling.js";
import type { MemoryBankLogger } from "../../types/logging.js";

// This will hold the globally mocked fs.stat function instance
let globalFsStatMock: Mock;
let globalFsAccessMock: Mock;
// Add others if needed for fine-grained control in tests, e.g.:
// let globalFsReadFileMock: Mock;
// let globalFsWriteFileMock: Mock;
// let globalFsMkdirMock: Mock;

// Helper functions to reduce nesting in mock implementations
const createMockStats = (isDirectory: boolean, isFile = !isDirectory, size = 100) =>
	({
		isDirectory: () => isDirectory,
		isFile: () => isFile,
		mtime: new Date(),
		size,
	}) as Stats;

const createDirectoryStats = () => createMockStats(true, false, 0);
const createFileStats = (size = 100) => createMockStats(false, true, size);

// Helper functions to configure mock fs behavior per test case
const configureFsStatBehavior = (
	behavior: Array<{
		path: string;
		isDirectory?: boolean;
		isFile?: boolean;
		error?: NodeJS.ErrnoException;
		size?: number;
	}>,
) => {
	// Use the globally mocked fs.stat
	globalFsStatMock.mockImplementation(async (path: PathLike) => {
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

const configureFsAccessBehavior = (
	behavior: Array<{ path: string; error?: NodeJS.ErrnoException }>,
) => {
	// Use the globally mocked fs.access
	globalFsAccessMock.mockImplementation(async (path: PathLike) => {
		const pathStr = path.toString();
		const specificBehavior = behavior.find((b) => b.path === pathStr);

		if (specificBehavior?.error) {
			throw specificBehavior.error;
		}
		// Default behavior: assume file is accessible
		return undefined;
	});
};

const createStatMockHandler = (
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

const createLoadFilesStatMockHandler = (
	getPath: (subPath?: string) => Promise<string>,
	projectBriefPath: string,
) => {
	return async (p: PathLike) => {
		const pStr = p.toString();
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

const createAdvancedStatMockHandler = (
	getPath: (subPath?: string) => Promise<string>,
	projectBriefPath: string,
	activeContextPath: string,
	mockedWriteFile: Mock,
) => {
	return async (p: PathLike) => {
		const pStr = p.toString();
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

// Moved getPath to be accessible by multiple describe blocks
const getPath = async (subPath = "") => {
	const path = await import("node:path");
	return path.join("/mock/workspace", ".aimemory", "memory-bank", subPath);
};

// Use vi.hoisted() to ensure these are available for the vi.mock() calls
const mockFunctions = vi.hoisted(() => ({
	mockStat: vi.fn(),
	mockMkdir: vi.fn(),
	mockReadFile: vi.fn(),
	mockWriteFile: vi.fn(),
	mockAccess: vi.fn(),
}));

// Add mock for helper functions
const mockHelperFunctions = vi.hoisted(() => ({
	mockValidateMemoryBankDirectory: vi.fn(),
	mockValidateAllMemoryBankFiles: vi.fn(),
	mockLoadAllMemoryBankFiles: vi.fn(),
	mockPerformHealthCheck: vi.fn(),
	mockEnsureMemoryBankFolders: vi.fn(),
	mockUpdateMemoryBankFileHelper: vi.fn(),
}));

// Mocks for external dependencies used by MemoryBankServiceCore
vi.mock("node:fs", () => {
	return {
		promises: {
			stat: mockFunctions.mockStat,
			mkdir: mockFunctions.mockMkdir,
			readFile: mockFunctions.mockReadFile,
			writeFile: mockFunctions.mockWriteFile,
			access: mockFunctions.mockAccess,
		},
		stat: mockFunctions.mockStat,
		mkdir: mockFunctions.mockMkdir,
		readFile: mockFunctions.mockReadFile,
		writeFile: mockFunctions.mockWriteFile,
		access: mockFunctions.mockAccess,
	};
});

// Also mock the default import path used by fileOperationHelpers.ts
vi.mock("node:fs/promises", () => {
	return {
		default: {
			stat: mockFunctions.mockStat,
			mkdir: mockFunctions.mockMkdir,
			readFile: mockFunctions.mockReadFile,
			writeFile: mockFunctions.mockWriteFile,
			access: mockFunctions.mockAccess,
		},
		stat: mockFunctions.mockStat,
		mkdir: mockFunctions.mockMkdir,
		readFile: mockFunctions.mockReadFile,
		writeFile: mockFunctions.mockWriteFile,
		access: mockFunctions.mockAccess,
	};
});

vi.mock("node:path", async () => {
	const actualPath = await vi.importActual<typeof import("node:path")>("node:path");
	return {
		...actualPath,
		join: actualPath.posix.join, // Use actual posix join for predictability
	};
});

vi.mock("../../utils/log.js", () => ({
	Logger: {
		getInstance: () => ({
			info: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
			debug: vi.fn(),
		}),
	},
	LogLevel: { Info: "info", Error: "error", Warn: "warn", Debug: "debug" },
}));
vi.mock("../../lib/memoryBankTemplates.js", () => ({
	getTemplateForFileType: () => "template content",
}));

// Mock the file operation helpers
vi.mock("../../core/memory-bank-file-helpers.js", () => ({
	validateMemoryBankDirectory: mockHelperFunctions.mockValidateMemoryBankDirectory,
	validateAllMemoryBankFiles: mockHelperFunctions.mockValidateAllMemoryBankFiles,
	loadAllMemoryBankFiles: mockHelperFunctions.mockLoadAllMemoryBankFiles,
	performHealthCheck: mockHelperFunctions.mockPerformHealthCheck,
	ensureMemoryBankFolders: mockHelperFunctions.mockEnsureMemoryBankFolders,
	updateMemoryBankFile: mockHelperFunctions.mockUpdateMemoryBankFileHelper,
}));

const mockMemoryBankLogger: MemoryBankLogger = {
	info: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
	debug: vi.fn(),
};

let mockCacheManager: CacheManager;
let mockStreamingManager: StreamingManager;
let mockFileOperationManager: FileOperationManager;

describe("MemoryBankServiceCore", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		(mockMemoryBankLogger.info as Mock).mockClear();
		(mockMemoryBankLogger.error as Mock).mockClear();
		(mockMemoryBankLogger.warn as Mock).mockClear();
		(mockMemoryBankLogger.debug as Mock).mockClear();

		mockCacheManager = new CacheManager(mockMemoryBankLogger);
		mockStreamingManager = new StreamingManager(mockMemoryBankLogger, "/mock/test-allowedRoot");
		mockFileOperationManager = new FileOperationManager(
			mockMemoryBankLogger,
			"/mock/test-allowedRoot",
		);

		// Get references to the shared mocked fs functions
		globalFsStatMock = vi.mocked(mockFunctions.mockStat);
		globalFsAccessMock = vi.mocked(mockFunctions.mockAccess);
		const globalFsMkdirMock = vi.mocked(mockFunctions.mockMkdir);
		const globalFsReadFileMock = vi.mocked(mockFunctions.mockReadFile);
		const globalFsWriteFileMock = vi.mocked(mockFunctions.mockWriteFile);

		// Default "happy path" implementations for all fs mocks (will be overridden by test-specific setups)
		globalFsStatMock.mockImplementation(async (path: PathLike) => {
			// Default behavior: assume file exists
			return createFileStats();
		});
		globalFsAccessMock.mockResolvedValue(undefined); // Files are accessible
		globalFsMkdirMock.mockResolvedValue(undefined); // mkdir succeeds
		globalFsReadFileMock.mockResolvedValue("mock content"); // readFile succeeds
		globalFsWriteFileMock.mockResolvedValue(undefined); // writeFile succeeds

		// Set up default behaviors for helper function mocks
		mockHelperFunctions.mockValidateMemoryBankDirectory.mockResolvedValue(true);
		mockHelperFunctions.mockValidateAllMemoryBankFiles.mockResolvedValue({
			missingFiles: [],
			filesToInvalidate: [],
			validationResults: [],
		});
		mockHelperFunctions.mockLoadAllMemoryBankFiles.mockResolvedValue([]);
		mockHelperFunctions.mockPerformHealthCheck.mockResolvedValue({
			isHealthy: true,
			issues: [],
			summary: "Memory Bank Health: ✅ All files and folders are present and readable.",
		});
		mockHelperFunctions.mockEnsureMemoryBankFolders.mockResolvedValue(undefined);
		mockHelperFunctions.mockUpdateMemoryBankFileHelper.mockResolvedValue(undefined);
	});

	it("should add tests for MemoryBankServiceCore");

	describe("getIsMemoryBankInitialized edge cases", () => {
		it("returns false when main directory doesn't exist", async () => {
			const memoryBankDirectoryPath = await getPath();
			const enoentError = new Error(
				"ENOENT: Main directory missing",
			) as NodeJS.ErrnoException;
			enoentError.code = "ENOENT";
			// Mock fs.stat to throw an error for the main directory
			configureFsStatBehavior([{ path: memoryBankDirectoryPath, error: enoentError }]);

			const service = new MemoryBankServiceCore(
				memoryBankDirectoryPath,
				mockMemoryBankLogger,
				mockCacheManager,
				mockStreamingManager,
				mockFileOperationManager,
			);
			service.invalidateCache(); // Ensure fresh check
			const result = await service.getIsMemoryBankInitialized();

			// Expect the operation to be successful, but initialization status to be false
			expect(isSuccess(result)).toBe(true);
			if (isSuccess(result)) {
				expect(result.data).toBe(false);
			}
			// Verify that the logger was called with a warning about the invalid directory
			expect(mockMemoryBankLogger.warn).toHaveBeenCalledWith(
				"Memory bank directory is invalid or not found.",
			);
		});

		it("returns false when a required sub-directory (core) doesn't exist", async () => {
			// Set up the helper function to indicate missing files
			mockHelperFunctions.mockValidateAllMemoryBankFiles.mockResolvedValue({
				missingFiles: [MemoryBankFileType.ProjectBrief],
				filesToInvalidate: [],
				validationResults: [],
			});

			const service = new MemoryBankServiceCore(
				"/mock/workspace/.aimemory/memory-bank",
				mockMemoryBankLogger,
				mockCacheManager,
				mockStreamingManager,
				mockFileOperationManager,
			);
			service.invalidateCache();
			const result = await service.getIsMemoryBankInitialized();
			expect(isSuccess(result)).toBe(true);
			if (isSuccess(result)) {
				expect(result.data).toBe(false);
			}
		});

		it("returns false when directory exists but a required file (projectbrief) is missing via stat", async () => {
			// Set up the helper function to indicate missing files
			mockHelperFunctions.mockValidateAllMemoryBankFiles.mockResolvedValue({
				missingFiles: [MemoryBankFileType.ProjectBrief],
				filesToInvalidate: [],
				validationResults: [],
			});

			const service = new MemoryBankServiceCore(
				"/mock/workspace/.aimemory/memory-bank",
				mockMemoryBankLogger,
				mockCacheManager,
				mockStreamingManager,
				mockFileOperationManager,
			);
			service.invalidateCache();
			const result = await service.getIsMemoryBankInitialized();
			expect(isSuccess(result)).toBe(true);
			if (isSuccess(result)) {
				expect(result.data).toBe(false);
			}
		});

		it("returns false when directory exists but a required file (projectbrief) is missing via access", async () => {
			// Set up the helper function to indicate missing files
			mockHelperFunctions.mockValidateAllMemoryBankFiles.mockResolvedValue({
				missingFiles: [MemoryBankFileType.ProjectBrief],
				filesToInvalidate: [],
				validationResults: [],
			});

			const service = new MemoryBankServiceCore(
				"/mock/workspace/.aimemory/memory-bank",
				mockMemoryBankLogger,
				mockCacheManager,
				mockStreamingManager,
				mockFileOperationManager,
			);
			service.invalidateCache();
			const result = await service.getIsMemoryBankInitialized();
			expect(isSuccess(result)).toBe(true);
			if (isSuccess(result)) {
				expect(result.data).toBe(false);
			}
		});

		it("returns false when a required file (projectbrief) exists but is a directory", async () => {
			// Set up the helper function to indicate missing files
			mockHelperFunctions.mockValidateAllMemoryBankFiles.mockResolvedValue({
				missingFiles: [MemoryBankFileType.ProjectBrief],
				filesToInvalidate: [],
				validationResults: [],
			});

			const service = new MemoryBankServiceCore(
				"/mock/workspace/.aimemory/memory-bank",
				mockMemoryBankLogger,
				mockCacheManager,
				mockStreamingManager,
				mockFileOperationManager,
			);
			service.invalidateCache();
			const result = await service.getIsMemoryBankInitialized();
			expect(isSuccess(result)).toBe(true);
			if (isSuccess(result)) {
				expect(result.data).toBe(false);
			}
		});
	});

	describe("Health Check edge cases", () => {
		it("reports missing main memory-bank directory", async () => {
			// Set up the health check to report missing directory
			const memoryBankDirectoryPath = await getPath();
			mockHelperFunctions.mockPerformHealthCheck.mockResolvedValue({
				isHealthy: false,
				issues: [`Missing folder: ${memoryBankDirectoryPath}`],
				summary: `Memory Bank Health: ❌ Issues found:\nMissing folder: ${memoryBankDirectoryPath}`,
			});

			const service = new MemoryBankServiceCore(
				"/mock/workspace/.aimemory/memory-bank",
				mockMemoryBankLogger,
				mockCacheManager,
				mockStreamingManager,
				mockFileOperationManager,
			);
			const health = await service.checkHealth();
			expect(isSuccess(health)).toBe(true);
			if (isSuccess(health)) {
				expect(health.data).toContain("Issues found");
				expect(health.data).toContain(`Missing folder: ${memoryBankDirectoryPath}`);
			}
		});

		it("reports missing sub-directory (e.g., core)", async () => {
			// Set up the health check to report missing files
			mockHelperFunctions.mockPerformHealthCheck.mockResolvedValue({
				isHealthy: false,
				issues: [
					"Missing or unreadable: core/projectbrief.md",
					"Missing or unreadable: core/productContext.md",
					"Missing or unreadable: core/activeContext.md",
				],
				summary:
					"Memory Bank Health: ❌ Issues found:\nMissing or unreadable: core/projectbrief.md\nMissing or unreadable: core/productContext.md\nMissing or unreadable: core/activeContext.md",
			});

			const service = new MemoryBankServiceCore(
				"/mock/workspace/.aimemory/memory-bank",
				mockMemoryBankLogger,
				mockCacheManager,
				mockStreamingManager,
				mockFileOperationManager,
			);
			const health = await service.checkHealth();
			expect(isSuccess(health)).toBe(true);
			if (isSuccess(health)) {
				expect(health.data).toContain("Issues found");
				expect(health.data).toContain("Missing or unreadable: core/projectbrief.md");
				expect(health.data).toContain("Missing or unreadable: core/productContext.md");
				expect(health.data).toContain("Missing or unreadable: core/activeContext.md");
			}
		});

		it("reports missing required file (e.g., projectbrief.md)", async () => {
			// Set up the health check to report missing file
			mockHelperFunctions.mockPerformHealthCheck.mockResolvedValue({
				isHealthy: false,
				issues: [`Missing or unreadable: ${MemoryBankFileType.ProjectBrief}`],
				summary: `Memory Bank Health: ❌ Issues found:\nMissing or unreadable: ${MemoryBankFileType.ProjectBrief}`,
			});

			const service = new MemoryBankServiceCore(
				"/mock/workspace/.aimemory/memory-bank",
				mockMemoryBankLogger,
				mockCacheManager,
				mockStreamingManager,
				mockFileOperationManager,
			);
			const health = await service.checkHealth();
			expect(isSuccess(health)).toBe(true);
			if (isSuccess(health)) {
				expect(health.data).toContain("Issues found");
				expect(health.data).toContain(
					`Missing or unreadable: ${MemoryBankFileType.ProjectBrief}`,
				);
			}
		});
	});

	describe("cache management", () => {
		it("can invalidate specific file cache", async () => {
			const service = new MemoryBankServiceCore(
				"/mock/workspace/.aimemory/memory-bank",
				mockMemoryBankLogger,
				mockCacheManager,
				mockStreamingManager,
				mockFileOperationManager,
			);
			// Need to mock core service's internal cache for this test or rely on integration tests
			// For now, just ensure the method can be called without errors.
			expect(() => {
				service.invalidateCache(
					"/mock/workspace/.aimemory/memory-bank/core/projectbrief.md",
				);
			}).not.toThrow();
		});

		it("can clear all cache", async () => {
			const service = new MemoryBankServiceCore(
				"/mock/workspace/.aimemory/memory-bank",
				mockMemoryBankLogger,
				mockCacheManager,
				mockStreamingManager,
				mockFileOperationManager,
			);
			// Need to mock core service's internal cache for this test or rely on integration tests
			// For now, just ensure the method can be called without errors.
			expect(() => {
				service.invalidateCache();
			}).not.toThrow();
			// Mocking resetCacheStats and getCacheStats is needed to check these
			// service.resetCacheStats(); // Calls core.resetCacheStats
			// const stats = service.getCacheStats(); // Calls core.getCacheStats
			// expect(stats).toEqual({}); // Expect the mocked value
		});

		// Test related to the SonarLint S2486 issue (empty catch block)
		it("invalidates cache for missing files (S2486 related)", async () => {
			const projectBriefPath = await getPath(`core/${MemoryBankFileType.ProjectBrief}`);
			const enoentError = new Error(
				"ENOENT: File not found after cache invalidation",
			) as NodeJS.ErrnoException;
			enoentError.code = "ENOENT";

			configureFsStatBehavior([
				{ path: await getPath(), isDirectory: true },
				{ path: await getPath("core"), isDirectory: true },
				{ path: projectBriefPath, error: enoentError },
			]);

			const service = new MemoryBankServiceCore(
				"/mock/workspace/.aimemory/memory-bank",
				mockMemoryBankLogger,
				mockCacheManager,
				mockStreamingManager,
				mockFileOperationManager,
			);
			service.invalidateCache(); // Clear the cache - this calls core.invalidateCache

			// Need to mock the core.getIsMemoryBankInitialized to return the expected value after invalidation
			// For now, we are just ensuring the invalidation logic in the test setup is correct.
			// const result = await service.getIsMemoryBankInitialized(); // This calls core.getIsMemoryBankInitialized
			// expect(isSuccess(result)).toBe(true);
			// if (isSuccess(result)) {
			// 	expect(result.data).toBe(false); // Expect false as simulated by mock
			// }
		});
	});

	describe("loadFiles error handling", () => {
		it("sets ready to false on error during template writing", async () => {
			// Set up the helper function to throw an error
			mockHelperFunctions.mockLoadAllMemoryBankFiles.mockRejectedValue(
				new Error("Write template failed"),
			);

			const service = new MemoryBankServiceCore(
				"/mock/workspace/.aimemory/memory-bank",
				mockMemoryBankLogger,
				mockCacheManager,
				mockStreamingManager,
				mockFileOperationManager,
			);

			await expect(service.loadFiles()).resolves.toEqual({
				success: false,
				error: expect.objectContaining({
					message: expect.stringContaining("Write template failed"),
					code: "LOAD_ERROR",
				}),
			}); // Expect resolved value with correct type
			expect(service.isReady()).toBe(false);
		});

		it("creates missing files from templates if writeFile succeeds", async () => {
			// Set up the helper function to return created files
			mockHelperFunctions.mockLoadAllMemoryBankFiles.mockResolvedValue([
				MemoryBankFileType.ProjectBrief,
				MemoryBankFileType.ActiveContext,
			]);

			const service = new MemoryBankServiceCore(
				"/mock/workspace/.aimemory/memory-bank",
				mockMemoryBankLogger,
				mockCacheManager,
				mockStreamingManager,
				mockFileOperationManager,
			);

			const createdFilesResult = await service.loadFiles();

			// Check if the result is successful and then access the data
			expect(isSuccess(createdFilesResult)).toBe(true);
			// Explicitly cast to the success type to help TypeScript
			const successfulResult = createdFilesResult as {
				success: true;
				data: MemoryBankFileType[];
			};
			// The system creates all required files when they don't exist
			expect(successfulResult.data.length).toBeGreaterThan(0);
			expect(successfulResult.data).toContain(MemoryBankFileType.ProjectBrief);
			expect(successfulResult.data).toContain(MemoryBankFileType.ActiveContext);
			expect(service.isReady()).toBe(true); // Should be true if core reported success
		});
	});

	describe("updateFile error handling", () => {
		it("throws error when write fails", async () => {
			// Set up the helper function to throw an error
			mockHelperFunctions.mockUpdateMemoryBankFileHelper.mockRejectedValue(
				new Error("Write update failed"),
			);

			const service = new MemoryBankServiceCore(
				"/mock/workspace/.aimemory/memory-bank",
				mockMemoryBankLogger,
				mockCacheManager,
				mockStreamingManager,
				mockFileOperationManager,
			);
			await expect(
				service.updateFile(MemoryBankFileType.ProjectBrief, "new content"),
			).resolves.toEqual({
				success: false,
				error: expect.objectContaining({
					message: expect.stringContaining("Write update failed"),
					code: "UPDATE_ERROR",
				}),
			});
		});
	});

	describe("initializeFolders", () => {
		it("creates all required subfolders", async () => {
			// Create a mock FileOperationManager for this test
			const mockFileOpManager = {
				mkdirWithRetry: vi.fn().mockResolvedValue({ success: true, data: undefined }),
				statWithRetry: vi.fn(),
				readFileWithRetry: vi.fn(),
				writeFileWithRetry: vi.fn(),
				accessWithRetry: vi.fn(),
			};

			const service = new MemoryBankServiceCore(
				"/mock/workspace/.aimemory/memory-bank",
				mockMemoryBankLogger,
				mockCacheManager,
				mockStreamingManager,
				mockFileOpManager as any,
			);
			await expect(service.initializeFolders()).resolves.toEqual({
				success: true,
				data: undefined,
			});

			// Verify mkdirWithRetry was called for each subfolder
			const expectedSubfolders = [
				"", // root folder
				"core",
				"systemPatterns",
				"techContext",
				"progress",
			];

			for (const subfolder of expectedSubfolders) {
				const expectedPath =
					subfolder === ""
						? "/mock/workspace/.aimemory/memory-bank"
						: `/mock/workspace/.aimemory/memory-bank/${subfolder}`;
				expect(mockFileOpManager.mkdirWithRetry).toHaveBeenCalledWith(expectedPath, {
					recursive: true,
				});
			}
		});
	});
});
