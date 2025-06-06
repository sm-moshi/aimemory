import { MemoryBankServiceCore } from "@/core/memoryBankServiceCore.js";
import { StreamingManager } from "@/performance/StreamingManager.js";
import { createMockLogger, standardAfterEach, standardBeforeEach } from "@test-utils/index.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CacheManager } from "../../core/CacheManager.js";
import { FileOperationManager } from "../../core/FileOperationManager.js";
import type { MemoryBankLogger } from "../../types/index.js";

// Mock the path validation to avoid filesystem validation issues
vi.mock("@utils/security-helpers.js", () => ({
	validateMemoryBankPath: vi.fn((path: string) => `/mock/memory-bank/${path}`),
	sanitizePath: vi.fn((path: string) => path),
}));

// Mock core file helpers to avoid filesystem dependencies
vi.mock("../../core/memory-bank-file-helpers.js", () => ({
	ensureMemoryBankFolders: vi.fn().mockResolvedValue(undefined),
}));

describe("Performance Layer Integration", () => {
	let memoryBankService: MemoryBankServiceCore;
	let cacheManager: CacheManager;
	let fileOperationManager: FileOperationManager;
	let streamingManager: StreamingManager;
	let logger: MemoryBankLogger;

	const mockMemoryBankPath = "/mock/memory-bank";

	beforeEach(async () => {
		standardBeforeEach();

		// Reset the validateMemoryBankPath mock to its default behavior
		const { validateMemoryBankPath } = await import("@utils/security-helpers.js");
		vi.mocked(validateMemoryBankPath).mockImplementation(
			(path: string) => `/mock/memory-bank/${path}`,
		);

		// Initialize components with mock path
		logger = createMockLogger();
		cacheManager = new CacheManager(logger);
		fileOperationManager = new FileOperationManager(logger, mockMemoryBankPath);
		streamingManager = new StreamingManager(logger, fileOperationManager, mockMemoryBankPath);

		// Mock FileOperationManager methods to return successful results
		vi.spyOn(fileOperationManager, "mkdirWithRetry").mockResolvedValue({
			success: true,
			data: undefined,
		});
		vi.spyOn(fileOperationManager, "writeFileWithRetry").mockResolvedValue({
			success: true,
			data: undefined,
		});
		vi.spyOn(fileOperationManager, "statWithRetry").mockResolvedValue({
			success: true,
			data: {
				isDirectory: () => false,
				isFile: () => true,
				mtimeMs: Date.now(),
			} as any,
		});
		vi.spyOn(fileOperationManager, "readFileWithRetry").mockResolvedValue({
			success: true,
			data: "mock content",
		});
		vi.spyOn(fileOperationManager, "accessWithRetry").mockResolvedValue({
			success: true,
			data: undefined,
		});

		// Initialize core service
		memoryBankService = new MemoryBankServiceCore(
			mockMemoryBankPath,
			logger,
			cacheManager,
			streamingManager,
			fileOperationManager,
		);
	});

	afterEach(() => {
		standardAfterEach();
	});

	describe("Basic Functionality", () => {
		it("should successfully initialize folders using the performance layer", async () => {
			const result = await memoryBankService.initializeFolders();
			expect(result.success).toBe(true);
		});

		it("should successfully write files using the performance layer", async () => {
			// Write a test file
			const result = await memoryBankService.writeFileByPath("test.md", "# Test Content");
			expect(result.success).toBe(true);
		});

		it("should handle large and small files appropriately", async () => {
			// Test with large content
			const largeContent = `# Large File\n\n${"Lorem ipsum ".repeat(200)}`;
			expect(largeContent.length).toBeGreaterThan(1024);

			const largeResult = await memoryBankService.writeFileByPath("large.md", largeContent);
			expect(largeResult.success).toBe(true);

			// Test with small content
			const smallContent = "# Small File\n\nBrief content.";
			expect(smallContent.length).toBeLessThan(1024);

			const smallResult = await memoryBankService.writeFileByPath("small.md", smallContent);
			expect(smallResult.success).toBe(true);
		});
	});

	describe("Cache Management", () => {
		it("should maintain cache functionality through adapters", async () => {
			// Test cache stats functionality
			const initialStats = memoryBankService.getCacheStats();
			expect(initialStats).toBeDefined();
			expect(typeof initialStats.hits).toBe("number");
			expect(typeof initialStats.misses).toBe("number");

			// Test cache invalidation
			memoryBankService.invalidateCache("test.md");
			const afterInvalidation = memoryBankService.getCacheStats();
			expect(afterInvalidation).toBeDefined();

			// Test cache reset
			memoryBankService.resetCacheStats();
			const afterReset = memoryBankService.getCacheStats();
			expect(afterReset.hits).toBe(0);
			expect(afterReset.misses).toBe(0);
		});
	});

	describe("Concurrent Operations", () => {
		it("should handle concurrent operations safely", async () => {
			// Create multiple concurrent write operations
			const concurrentWrites = Array.from({ length: 5 }, (_, i) =>
				memoryBankService.writeFileByPath(
					`concurrent-${i}.md`,
					`# File ${i}\n\nContent for file ${i}.`,
				),
			);

			// All operations should succeed
			const results = await Promise.all(concurrentWrites);
			for (const result of results) {
				expect(result.success).toBe(true);
			}

			// Cache should still be functional
			const stats = memoryBankService.getCacheStats();
			expect(stats).toBeDefined();
		});
	});

	describe("Complete Integration", () => {
		it("should integrate all performance components successfully", async () => {
			// Test the complete integration workflow

			// 1. Initialize folders
			const initResult = await memoryBankService.initializeFolders();
			expect(initResult.success).toBe(true);

			// 2. Write multiple files
			const files = [
				{ name: "file1.md", content: "Content 1" },
				{ name: "file2.md", content: "Content 2" },
				{ name: "file3.md", content: "Content 3" },
			];

			for (const file of files) {
				const result = await memoryBankService.writeFileByPath(file.name, file.content);
				expect(result.success).toBe(true);
			}

			// 3. Verify cache functionality
			const stats = memoryBankService.getCacheStats();
			expect(stats).toBeDefined();
			expect(stats.totalFiles).toBeGreaterThanOrEqual(0);

			// 4. Test cache operations
			memoryBankService.invalidateCache("file1.md");
			memoryBankService.resetCacheStats();

			const finalStats = memoryBankService.getCacheStats();
			expect(finalStats.hits).toBe(0);
			expect(finalStats.misses).toBe(0);
		});
	});

	describe("Error Handling (Isolated)", () => {
		it("should properly handle error cases", async () => {
			// Create a fresh service instance for error testing to avoid mock contamination
			const errorLogger = createMockLogger();
			const errorCacheManager = new CacheManager(errorLogger);
			const errorFileOperationManager = new FileOperationManager(
				errorLogger,
				mockMemoryBankPath,
			);
			const errorStreamingManager = new StreamingManager(
				errorLogger,
				errorFileOperationManager,
				mockMemoryBankPath,
			);

			// Test with invalid path by mocking validation failure temporarily
			const { validateMemoryBankPath: validateMemoryBankPathErrorTest } = await import(
				"@utils/security-helpers.js"
			);

			// Mock implementation that throws error only for this specific test
			vi.mocked(validateMemoryBankPathErrorTest).mockImplementationOnce(() => {
				throw new Error("Path validation failed");
			});

			const errorService = new MemoryBankServiceCore(
				mockMemoryBankPath,
				errorLogger,
				errorCacheManager,
				errorStreamingManager,
				errorFileOperationManager,
			);

			const result = await errorService.writeFileByPath("../invalid", "content");
			expect(result.success).toBe(false);
		});
	});
});
