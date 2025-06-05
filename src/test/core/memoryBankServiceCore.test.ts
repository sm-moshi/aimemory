import type { PathLike, Stats } from "node:fs";
import { type Mock, afterEach, beforeEach, describe, expect, it, test, vi } from "vitest";
import { CacheManager } from "../../core/CacheManager.js";
import { FileOperationManager } from "../../core/FileOperationManager.js";
import { MemoryBankServiceCore } from "../../core/memoryBankServiceCore.js";
import { StreamingManager } from "../../performance/StreamingManager.js";
import type {
	FileError as FileErrorType,
	MemoryBankLogger,
	Result,
	StreamingManagerConfig,
} from "../../types/index.js";
import { createMockLogger, standardAfterEach, standardBeforeEach } from "../test-utils/index.js";

// This will hold the globally mocked fs.stat function instance
let globalFsStatMock: Mock;
let globalFsAccessMock: Mock;

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
	globalFsStatMock.mockImplementation(async (path: PathLike) => {
		const pathStr = path.toString();
		const specificBehavior = behavior.find((b) => b.path === pathStr);
		if (specificBehavior) {
			if (specificBehavior.error) throw specificBehavior.error;
			return createMockStats(
				specificBehavior.isDirectory ?? false,
				specificBehavior.isFile ?? !(specificBehavior.isDirectory ?? false),
				specificBehavior.size,
			);
		}
		return createFileStats();
	});
};

const configureFsAccessBehavior = (
	behavior: Array<{ path: string; error?: NodeJS.ErrnoException }>,
) => {
	globalFsAccessMock.mockImplementation(async (path: PathLike) => {
		const pathStr = path.toString();
		const specificBehavior = behavior.find((b) => b.path === pathStr);
		if (specificBehavior?.error) throw specificBehavior.error;
		return undefined;
	});
};

// Moved getPath to be accessible by multiple describe blocks
const getPath = async (subPath = "") =>
	`/mock/workspace/.aimemory/memory-bank/${subPath}`.replace(/\/$/, "");

// Use vi.hoisted() to ensure these are available for the vi.mock() calls
const mockFunctions = vi.hoisted(() => ({
	mockStat: vi.fn(),
	mockMkdir: vi.fn(),
	mockReadFile: vi.fn(),
	mockWriteFile: vi.fn(),
	mockAccess: vi.fn(),
}));

const mockHelperFunctions = vi.hoisted(() => ({
	mockValidateMemoryBankDirectory: vi.fn(),
	mockValidateAllMemoryBankFiles: vi.fn(),
	mockLoadAllMemoryBankFiles: vi.fn(),
	mockPerformHealthCheck: vi.fn(),
	mockEnsureMemoryBankFolders: vi.fn(),
	mockUpdateMemoryBankFileHelper: vi.fn(),
}));

// Mocks for external dependencies used by MemoryBankServiceCore
vi.mock("node:fs", () => ({
	promises: mockFunctions,
	...mockFunctions,
}));
vi.mock("node:fs/promises", () => ({ default: mockFunctions, ...mockFunctions }));

vi.mock("node:path", async () => {
	const actualPath = await vi.importActual<typeof import("node:path")>("node:path");
	return {
		...actualPath,
		join: actualPath.posix.join,
		resolve: actualPath.posix.resolve,
		dirname: actualPath.posix.dirname,
		isAbsolute: actualPath.posix.isAbsolute,
	};
});

vi.mock("../../utils/log.js", () => ({
	Logger: {
		getInstance: () => createMockLogger(),
	},
	LogLevel: { Info: 2, Error: 4, Warn: 3, Debug: 1, Trace: 0, Off: 5 },
}));

vi.mock("../../lib/memoryBankTemplates.js", () => ({
	getTemplateForFileType: vi.fn().mockReturnValue("mock template content"),
}));

vi.mock("../../core/memory-bank-file-helpers.js", () => ({
	validateMemoryBankDirectory: mockHelperFunctions.mockValidateMemoryBankDirectory,
	validateAllMemoryBankFiles: mockHelperFunctions.mockValidateAllMemoryBankFiles,
	loadAllMemoryBankFiles: mockHelperFunctions.mockLoadAllMemoryBankFiles,
	performHealthCheck: mockHelperFunctions.mockPerformHealthCheck,
	ensureMemoryBankFolders: mockHelperFunctions.mockEnsureMemoryBankFolders,
	updateMemoryBankFile: mockHelperFunctions.mockUpdateMemoryBankFileHelper,
}));

vi.mock("../../services/validation/file-validation.js", () => ({
	validateMemoryBankDirectory: vi.fn().mockResolvedValue(true),
	validateAllMemoryBankFiles: vi.fn().mockResolvedValue({ isValid: true, errors: [] }),
}));

// Test setup helpers
const setupMockResets = () => {
	mockFunctions.mockStat.mockReset();
	mockFunctions.mockMkdir.mockReset();
	mockFunctions.mockReadFile.mockReset();
	mockFunctions.mockWriteFile.mockReset();
	mockFunctions.mockAccess.mockReset();

	mockHelperFunctions.mockValidateMemoryBankDirectory.mockReset();
	mockHelperFunctions.mockValidateAllMemoryBankFiles.mockReset();
	mockHelperFunctions.mockLoadAllMemoryBankFiles.mockReset();
	mockHelperFunctions.mockPerformHealthCheck.mockReset();
	mockHelperFunctions.mockEnsureMemoryBankFolders.mockReset();
	mockHelperFunctions.mockUpdateMemoryBankFileHelper.mockReset();
};

const createBasicDependencies = async (mockAllowedRoot: string) => {
	const logger = createMockLogger();
	const fileOperationManager = new FileOperationManager(logger, mockAllowedRoot, {
		retryConfig: { maxRetries: 1, baseDelay: 10, maxDelay: 100, backoffFactor: 2 },
		timeout: 1000,
	});
	const cacheManager = new CacheManager(logger, { maxSize: 10, maxAge: 60000 });
	const streamingManager = new StreamingManager(logger, fileOperationManager, mockAllowedRoot, {
		sizeThreshold: 50,
	} as StreamingManagerConfig);
	return { logger, fileOperationManager, cacheManager, streamingManager };
};

// This function sets up spies on the FileOperationManager instance's methods
// and makes them delegate to the hoisted fs mocks.
const setupDefaultMockImplementations = (fom: FileOperationManager) => {
	for (const key of Object.keys(mockFunctions)) {
		if (typeof (fom as any)[key] === "function") {
			vi.spyOn(fom, key as keyof FileOperationManager).mockImplementation(
				(mockFunctions as any)[key],
			);
		}
	}
};

const setupDefaultFileSystemBehavior = async (mockAllowedRootStr: string) => {
	// Default behavior for fs mocks
	mockFunctions.mockMkdir.mockResolvedValue({ success: true });
	mockFunctions.mockWriteFile.mockResolvedValue({ success: true } as Result<void, FileErrorType>);
	mockFunctions.mockReadFile.mockResolvedValue({
		success: true,
		data: "default file content",
	} as Result<string, FileErrorType>);
	mockFunctions.mockAccess.mockResolvedValue({ success: true } as Result<void, FileErrorType>);

	// Default stat: directories exist, files exist.
	mockFunctions.mockStat.mockImplementation(async (p: PathLike) => {
		const pathStr = p.toString();
		// Simple heuristic: if it doesn't have an extension, assume it's a directory for mock purposes
		if (!pathStr.includes(".")) {
			return { success: true, data: createDirectoryStats() } as Result<Stats, FileErrorType>;
		}
		return { success: true, data: createFileStats() } as Result<Stats, FileErrorType>;
	});
	// Specific default for memory bank root to exist as a directory
	mockFunctions.mockStat.mockImplementation(async (p: PathLike) => {
		if (p.toString() === mockAllowedRootStr) {
			return { success: true, data: createDirectoryStats() } as Result<Stats, FileErrorType>;
		}
		// Fallback for other paths as files
		return { success: true, data: createFileStats() } as Result<Stats, FileErrorType>;
	});
};

describe("MemoryBankServiceCore", () => {
	let logger: MemoryBankLogger;
	let fileOperationManager: FileOperationManager;
	let cacheManager: CacheManager;
	let streamingManager: StreamingManager;
	let memoryBankService: MemoryBankServiceCore;
	let mockAllowedRoot: string;

	beforeEach(async () => {
		standardBeforeEach();
		setupMockResets();
		mockAllowedRoot = await getPath();

		const dependencies = await createBasicDependencies(mockAllowedRoot);
		logger = dependencies.logger;
		fileOperationManager = dependencies.fileOperationManager;
		cacheManager = dependencies.cacheManager;
		streamingManager = dependencies.streamingManager;

		// Setup FileOperationManager's methods to use the hoisted fs mocks
		setupDefaultMockImplementations(fileOperationManager);
		// Setup the hoisted fs mocks with default behavior
		await setupDefaultFileSystemBehavior(mockAllowedRoot);

		memoryBankService = new MemoryBankServiceCore(
			mockAllowedRoot,
			logger,
			cacheManager,
			streamingManager,
			fileOperationManager,
		);

		// Assign to global mocks AFTER they've been reset and re-configured by helpers if needed
		globalFsStatMock = mockFunctions.mockStat;
		globalFsAccessMock = mockFunctions.mockAccess;
	});

	afterEach(() => {
		standardAfterEach();
	});

	it("should initialize correctly", () => {
		expect(memoryBankService).toBeDefined();
	});

	test("invalidateCache calls cacheManager.invalidateCache without path to clear all", () => {
		const invalidateSpy = vi.spyOn(cacheManager, "invalidateCache");
		const service = new MemoryBankServiceCore(
			mockAllowedRoot,
			logger,
			cacheManager,
			streamingManager,
			fileOperationManager,
		);
		service.invalidateCache();
		expect(invalidateSpy).toHaveBeenCalledWith(undefined);
	});

	describe("Service with local dependencies", () => {
		it("should allow local FOM instances and test writeFileByPath", async () => {
			const localLogger = createMockLogger();
			const localAllowedRoot = "/test/local/root";
			const localFom = new FileOperationManager(localLogger, localAllowedRoot);
			const localCacheManager = new CacheManager(localLogger);
			const localStreamingManager = new StreamingManager(
				localLogger,
				localFom,
				localAllowedRoot,
			);

			// CORRECTED: Spy on the methods that MemoryBankServiceCore.writeFileByPath will call internally
			const mkdirWithRetrySpy = vi
				.spyOn(localFom, "mkdirWithRetry")
				.mockResolvedValue({ success: true } as Result<void, FileErrorType>);
			const writeFileWithRetrySpy = vi
				.spyOn(localFom, "writeFileWithRetry")
				.mockResolvedValue({ success: true } as Result<void, FileErrorType>);
			const statWithRetrySpy = vi
				.spyOn(localFom, "statWithRetry")
				.mockResolvedValue({ success: true, data: createFileStats() } as Result<
					Stats,
					FileErrorType
				>);

			const service = new MemoryBankServiceCore(
				localAllowedRoot,
				localLogger,
				localCacheManager,
				localStreamingManager,
				localFom,
			);
			const result = await service.writeFileByPath("test.md", "content");
			if (!result.success) {
				// eslint-disable-next-line no-console
				console.error(
					"writeFileByPath failed in test (memoryBankServiceCore.test.ts):",
					JSON.stringify(result.error, null, 2),
				);
			}
			expect(result.success).toBe(true);
			// CORRECTED: Use template literal for path construction
			expect(writeFileWithRetrySpy).toHaveBeenCalledWith(
				`${localAllowedRoot}/test.md`,
				"content",
			);
		});
	});

	it("should be a valid test suite", () => {
		expect(true).toBe(true);
	});
});
