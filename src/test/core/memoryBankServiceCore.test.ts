import * as nodePath from "node:path";
import { StreamingManager } from "@/performance/StreamingManager.js";
import type { Logger, StreamingManagerConfig } from "@/types/index.js";
import type { CacheManager } from "@core/Cache.js";
import type { FileOperationManager } from "@core/FileOperationManager.js";
import { MemoryBankServiceCore } from "@core/memoryBankServiceCore.js";
import {
	createMockCacheManager,
	createMockFileOperationManager,
	createMockLogger,
	getPath as getSharedPath,
	standardAfterEach,
	standardBeforeEach,
} from "@test-utils/index.js";
import { afterEach, beforeEach, describe, expect, it, test } from "vitest";

const createBasicDependencies = async (mockAllowedRoot: string) => {
	const logger = createMockLogger();
	const mockFom = createMockFileOperationManager();
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
	let logger: Logger;
	let mockFileOperationManager: ReturnType<typeof createMockFileOperationManager>;
	let mockCacheManager: ReturnType<typeof createMockCacheManager>;
	let streamingManager: StreamingManager;
	let memoryBankService: MemoryBankServiceCore;
	let mockAllowedRoot: string;

	beforeEach(async () => {
		standardBeforeEach();
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
