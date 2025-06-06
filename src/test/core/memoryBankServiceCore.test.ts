import type { Stats } from "node:fs";
import * as nodePath from "node:path";
import {
	createMockCacheManager,
	createMockFileOperationManager,
	createMockLogger,
	getPath as getSharedPath,
	setupCommonFileOperationMocks,
	standardAfterEach,
	standardBeforeEach,
} from "@test-utils/index.js";
import { afterEach, beforeEach, describe, expect, it, test, vi } from "vitest";
import type { CacheManager } from "../../core/CacheManager.js";
import type { FileOperationManager } from "../../core/FileOperationManager.js";
import { MemoryBankServiceCore } from "../../core/memoryBankServiceCore.js";
import { StreamingManager } from "../../performance/StreamingManager.js";
import type { MemoryBankLogger, StreamingManagerConfig } from "../../types/index.js";

// Helper functions to reduce nesting in mock implementations
const createMockStats = (isDirectory: boolean, isFile = !isDirectory, size = 100) =>
	({
		isDirectory: () => isDirectory,
		isFile: () => isFile,
		mtime: new Date(),
		size,
	}) as Stats;

const _createDirectoryStats = () => createMockStats(true, false, 0);
const _createFileStats = (size = 100) => createMockStats(false, true, size);

// Use vi.hoisted() to ensure these are available for the vi.mock() calls
const mockHelperFunctions = vi.hoisted(() => ({
	mockValidateMemoryBankDirectory: vi.fn(),
	mockValidateAllMemoryBankFiles: vi.fn(),
	mockLoadAllMemoryBankFiles: vi.fn(),
	mockPerformHealthCheck: vi.fn(),
	mockEnsureMemoryBankFolders: vi.fn(),
	mockUpdateMemoryBankFileHelper: vi.fn(),
}));

vi.mock("../../utils/log.js", () => ({
	logger: {
		getInstance: () => createMockLogger(),
	},
	logLevel: { info: 2, error: 4, warn: 3, debug: 1, trace: 0, off: 5 },
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
	for (const mockFn of Object.values(mockHelperFunctions)) {
		mockFn.mockReset();
	}
};

const createBasicDependencies = async (mockAllowedRoot: string) => {
	const logger = createMockLogger();
	const mockFom = createMockFileOperationManager();
	setupCommonFileOperationMocks(mockFom);

	const mockCacheManager = createMockCacheManager();

	const streamingManager = new StreamingManager(
		logger,
		mockFom as unknown as FileOperationManager,
		mockAllowedRoot,
		{
			sizeThreshold: 50,
		} as StreamingManagerConfig,
	);
	return {
		logger,
		fileOperationManager: mockFom,
		cacheManager: mockCacheManager,
		streamingManager,
	};
};

describe("MemoryBankServiceCore", () => {
	let logger: MemoryBankLogger;
	let mockFileOperationManager: ReturnType<typeof createMockFileOperationManager>;
	let mockCacheManager: ReturnType<typeof createMockCacheManager>;
	let streamingManager: StreamingManager;
	let memoryBankService: MemoryBankServiceCore;
	let mockAllowedRoot: string;

	beforeEach(async () => {
		standardBeforeEach();
		setupMockResets();
		mockAllowedRoot = await getSharedPath(); // This is workspace root, e.g. /mock/workspace

		const dependencies = await createBasicDependencies(mockAllowedRoot);
		logger = dependencies.logger;
		mockFileOperationManager = dependencies.fileOperationManager;
		mockCacheManager = dependencies.cacheManager;
		streamingManager = dependencies.streamingManager;

		// MemoryBankServiceCore's _memoryBankFolder will be mockAllowedRoot itself
		memoryBankService = new MemoryBankServiceCore(
			mockAllowedRoot,
			logger,
			mockCacheManager as unknown as CacheManager,
			streamingManager,
			mockFileOperationManager as unknown as FileOperationManager,
		);
	});

	afterEach(() => {
		standardAfterEach();
	});

	it("should initialize correctly", () => {
		expect(memoryBankService).toBeDefined();
	});

	test("invalidateCache calls cacheManager.invalidateCache without path to clear all", () => {
		const service = new MemoryBankServiceCore(
			mockAllowedRoot,
			logger,
			mockCacheManager as unknown as CacheManager,
			streamingManager,
			mockFileOperationManager as unknown as FileOperationManager,
		);
		service.invalidateCache();
		// If the spy is called with no arguments, it's often reported as being called with `undefined` for the first arg.
		expect(mockCacheManager.invalidateCache).toHaveBeenCalledWith(undefined);
		expect(mockCacheManager.invalidateCache).toHaveBeenCalledTimes(1);
	});

	test("invalidateCache calls cacheManager.invalidateCache with path to clear specific", () => {
		const relativeFilePath = "core/someFile.md";
		// MemoryBankServiceCore resolves this path against its _memoryBankFolder
		const expectedAbsolutePath = nodePath.resolve(mockAllowedRoot, relativeFilePath);

		const service = new MemoryBankServiceCore(
			mockAllowedRoot,
			logger,
			mockCacheManager as unknown as CacheManager,
			streamingManager,
			mockFileOperationManager as unknown as FileOperationManager,
		);
		service.invalidateCache(relativeFilePath);
		expect(mockCacheManager.invalidateCache).toHaveBeenCalledWith(expectedAbsolutePath);
		expect(mockCacheManager.invalidateCache).toHaveBeenCalledTimes(1);
	});

	it("should be a valid test suite", () => {
		expect(true).toBe(true);
	});
});
