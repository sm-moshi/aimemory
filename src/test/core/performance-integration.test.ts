import { StreamingManager } from "@/performance/StreamingManager.js";
import type { Logger } from "@/types/index.js";
import { CacheManager } from "@core/Cache.js";
import { FileOperationManager } from "@core/FileOperationManager.js";
import { MemoryBankServiceCore } from "@core/memoryBankServiceCore.js";
import {
	createMockLogger,
	mockFileOperations,
	mockNodeFs,
	standardAfterEach,
	standardBeforeEach,
} from "@test-utils/index.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Performance Layer Integration", () => {
	let memoryBankService: MemoryBankServiceCore;
	let cacheManager: CacheManager;
	let fileOperationManager: FileOperationManager;
	let streamingManager: StreamingManager;
	let logger: Logger;

	const mockMemoryBankPath = "/mock/memory-bank";

	beforeEach(async () => {
		standardBeforeEach();

		// Configure mocks for successful operations
		mockNodeFs.mkdir.mockResolvedValue(undefined);
		mockNodeFs.writeFile.mockResolvedValue(undefined);
		mockNodeFs.stat.mockResolvedValue({
			size: 1024,
			isDirectory: () => false,
			isFile: () => true,
		} as any);
		mockNodeFs.access.mockResolvedValue(undefined);

		// Ensure file operations return success
		mockFileOperations.mkdirWithRetry.mockResolvedValue({ success: true, data: undefined });
		mockFileOperations.writeFileWithRetry.mockResolvedValue({ success: true, data: undefined });
		mockFileOperations.readFileWithRetry.mockResolvedValue({
			success: true,
			data: "mock content",
		});

		// Initialize components with mock path
		logger = createMockLogger();
		cacheManager = new CacheManager(logger);
		fileOperationManager = new FileOperationManager(logger, mockMemoryBankPath);
		streamingManager = new StreamingManager(logger, fileOperationManager, mockMemoryBankPath);

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

	describe("Error Handling", () => {
		it("should properly handle error cases", async () => {
			// Configure mocks to simulate path validation failure
			const originalMkdir = mockFileOperations.mkdirWithRetry;
			mockFileOperations.mkdirWithRetry.mockResolvedValueOnce({
				success: false,
				error: { code: "PATH_VALIDATION_ERROR", message: "Invalid path" },
			});

			// Test with invalid path - should fail gracefully
			const result = await memoryBankService.writeFileByPath("../invalid", "content");
			expect(result.success).toBe(false);

			// Restore original mock
			mockFileOperations.mkdirWithRetry.mockImplementation(originalMkdir);
		});
	});
});
