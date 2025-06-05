import { EventEmitter } from "node:events";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FileOperationManager } from "../../core/FileOperationManager.js";
import { StreamingManager } from "../../performance/StreamingManager.js";
import { sanitizePath, validateMemoryBankPath } from "../../services/validation/security.js";
import {
	MockReadStream,
	createMockFileOperationManager,
	createMockLogger,
	standardAfterEach,
	standardBeforeEach,
} from "../test-utils/index.js";

// Mock modules
vi.mock("../../services/validation/security.js");
vi.mock("node:fs/promises");
vi.mock("node:fs", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs")>();
	return { ...actual, createReadStream: vi.fn() };
});

// Mock FileStreamer
vi.mock("../../performance/FileStreamer.js", () => ({
	FileStreamer: vi.fn().mockImplementation(() => ({
		streamFile: vi.fn(),
	})),
}));

// Test constants
const TEST_DIR = "/test/memory-bank";
const SMALL_FILE_SIZE = 50; // < 100 threshold
const LARGE_FILE_SIZE = 200; // > 100 threshold
const SMALL_CONTENT = "Small file content";
const LARGE_CONTENT = "A".repeat(200);

describe("StreamingManager", () => {
	let streamingManager: StreamingManager;

	// Get mocked functions
	const mockSanitizePath = vi.mocked(sanitizePath);
	const mockValidateMemoryBankPath = vi.mocked(validateMemoryBankPath);
	const mockFsPromises = vi.mocked(fs);

	// Create mock instances using consolidated utilities
	const mockLogger = createMockLogger();
	const mockFileOperationManager = createMockFileOperationManager() as FileOperationManager;
	const mockReadFileWithRetry = vi.mocked(mockFileOperationManager.readFileWithRetry);

	beforeEach(async () => {
		standardBeforeEach();

		// Simple, predictable mocks
		mockSanitizePath.mockImplementation((inputPath) => path.normalize(inputPath));
		mockValidateMemoryBankPath.mockImplementation((relativePath, root) =>
			path.resolve(root, relativePath),
		);

		// Default fs mocks
		mockFsPromises.mkdir.mockResolvedValue(undefined);
		mockFsPromises.stat.mockResolvedValue({ size: SMALL_FILE_SIZE } as any);
		mockReadFileWithRetry.mockResolvedValue({ success: true, data: SMALL_CONTENT });

		// Create StreamingManager with low threshold for testing
		streamingManager = new StreamingManager(mockLogger, mockFileOperationManager, TEST_DIR, {
			sizeThreshold: 100, // Files ≥100 bytes will be streamed
			chunkSize: 10,
			timeout: 1000,
			enableProgressCallbacks: true,
		});

		// Mock the FileStreamer instance created by StreamingManager
		const mockFileStreamer = (streamingManager as any).fileStreamer;
		if (mockFileStreamer?.streamFile) {
			vi.mocked(mockFileStreamer.streamFile).mockImplementation(async () => ({
				success: true,
				data: {
					content: LARGE_CONTENT,
					wasStreamed: true,
					duration: 100,
					bytesRead: LARGE_FILE_SIZE,
					chunksProcessed: 1,
				},
			}));
		}
	});

	afterEach(() => {
		standardAfterEach();
	});

	describe("Configuration", () => {
		it("should initialize with default configuration", () => {
			const manager = new StreamingManager(mockLogger, mockFileOperationManager, TEST_DIR);
			const config = manager.getConfig();

			expect(config).toMatchObject({
				sizeThreshold: 1024 * 1024,
				chunkSize: 64 * 1024,
				timeout: 30000,
				enableProgressCallbacks: true,
			});
		});

		it("should initialize with custom configuration", () => {
			const customConfig = {
				sizeThreshold: 500,
				chunkSize: 50,
				timeout: 10000,
				enableProgressCallbacks: false,
			};

			const manager = new StreamingManager(
				mockLogger,
				mockFileOperationManager,
				TEST_DIR,
				customConfig,
			);
			expect(manager.getConfig()).toMatchObject(customConfig);
		});
	});

	describe("Small File Reading", () => {
		it("should read small files using normal strategy", async () => {
			const testFile = "small.txt";

			// Setup: small file (50 bytes < 100 threshold)
			mockFsPromises.stat.mockResolvedValueOnce({ size: SMALL_FILE_SIZE } as any);
			mockReadFileWithRetry.mockResolvedValueOnce({ success: true, data: SMALL_CONTENT });

			const result = await streamingManager.readFile(testFile);

			expect(result.success).toBe(true);
			expect((result as any).data.content).toBe(SMALL_CONTENT);
			expect((result as any).data.wasStreamed).toBe(false);
		});

		it("should update statistics for normal reads", async () => {
			const testFile = "small.txt";

			mockFsPromises.stat.mockResolvedValueOnce({ size: SMALL_FILE_SIZE } as any);
			mockReadFileWithRetry.mockResolvedValueOnce({ success: true, data: SMALL_CONTENT });

			await streamingManager.readFile(testFile);
			const stats = streamingManager.getStats();

			expect(stats.totalOperations).toBe(1);
			expect(stats.streamedOperations).toBe(0);
			expect(stats.totalBytesRead).toBe(SMALL_FILE_SIZE);
		});
	});

	describe("Large File Streaming", () => {
		it("should read large files using streaming strategy", async () => {
			const testFile = "large.txt";

			// Setup: large file (200 bytes > 100 threshold)
			mockFsPromises.stat.mockResolvedValueOnce({ size: LARGE_FILE_SIZE } as any);

			// Mock createReadStream
			const { createReadStream } = await import("node:fs");
			vi.mocked(createReadStream).mockReturnValueOnce(
				new MockReadStream(LARGE_CONTENT) as any,
			);

			const result = await streamingManager.readFile(testFile);

			expect(result.success).toBe(true);
			expect((result as any).data.content).toBe(LARGE_CONTENT);
			expect((result as any).data.wasStreamed).toBe(true);
		});

		it("should update statistics for streamed reads", async () => {
			const testFile = "large.txt";

			mockFsPromises.stat.mockResolvedValueOnce({ size: LARGE_FILE_SIZE } as any);

			const { createReadStream } = await import("node:fs");
			vi.mocked(createReadStream).mockReturnValueOnce(
				new MockReadStream(LARGE_CONTENT) as any,
			);

			await streamingManager.readFile(testFile);
			const stats = streamingManager.getStats();

			expect(stats.totalOperations).toBe(1);
			expect(stats.streamedOperations).toBe(1);
			expect(stats.totalBytesRead).toBe(LARGE_FILE_SIZE);
		});
	});

	describe("Strategy Selection", () => {
		it("should predict streaming correctly based on file size", async () => {
			// Test small file
			mockFsPromises.stat.mockResolvedValueOnce({ size: 50 } as any);
			const smallResult = await streamingManager.wouldStreamFile("small.txt");

			// Test large file
			mockFsPromises.stat.mockResolvedValueOnce({ size: 200 } as any);
			const largeResult = await streamingManager.wouldStreamFile("large.txt");

			expect(smallResult.success).toBe(true);
			expect((smallResult as any).data).toBe(false); // 50 < 100 threshold

			expect(largeResult.success).toBe(true);
			expect((largeResult as any).data).toBe(true); // 200 > 100 threshold
		});
	});

	describe("Error Handling", () => {
		it("should handle non-existent files", async () => {
			const testFile = "does-not-exist.txt";

			const enoentError = new Error(
				"ENOENT: no such file or directory",
			) as NodeJS.ErrnoException;
			enoentError.code = "ENOENT";
			mockFsPromises.stat.mockRejectedValueOnce(enoentError);

			const result = await streamingManager.readFile(testFile);

			expect(result.success).toBe(false);
			expect((result as any).error.code).toBe("STREAMING_READ_ERROR");
		});

		it("should handle path validation errors", async () => {
			const maliciousPath = "../../../etc/passwd";

			mockSanitizePath.mockImplementationOnce(() => {
				throw new Error("Path validation failed: Path traversal detected");
			});

			const result = await streamingManager.readFile(maliciousPath);

			expect(result.success).toBe(false);
			expect((result as any).error.code).toBe("PATH_VALIDATION_ERROR");
		});

		it("should handle streaming timeout", async () => {
			// Use a filename that implies timeout for the global MockReadStream
			const testFile = "streaming_timeout_test_file.txt";

			mockFsPromises.stat.mockResolvedValueOnce({ size: LARGE_FILE_SIZE } as any);

			// Spy on MockReadStream.prototype.destroy to ensure it's called
			// MockReadStream needs to be imported from ../test-utils
			const mockReadStreamDestroySpy = vi.spyOn(MockReadStream.prototype, "destroy");

			// No need to mock createReadStream locally; the global mock in mocks.ts
			// will use MockReadStream, which is configured to simulate a timeout
			// if "timeout" (or part of this filename) is in the path.

			const result = await streamingManager.readFile(testFile, { timeout: 50 }); // Use a short timeout for the test

			expect(result.success).toBe(false);
			if (result.success) return; // Type guard

			expect(result.error.code).toBe("STREAMING_TIMEOUT");

			// Check if any MockReadStream instance had its destroy method called.
			// This confirms that FileStreamer attempted to clean up the stream.
			expect(mockReadStreamDestroySpy).toHaveBeenCalled();

			// Clean up the spy
			mockReadStreamDestroySpy.mockRestore();
		});
	});

	describe("Statistics", () => {
		it("should track mixed operations correctly", async () => {
			// Small file
			mockFsPromises.stat.mockResolvedValueOnce({ size: 50 } as any);
			mockReadFileWithRetry.mockResolvedValueOnce({ success: true, data: SMALL_CONTENT });
			await streamingManager.readFile("small.txt");

			// Large file
			mockFsPromises.stat.mockResolvedValueOnce({ size: 200 } as any);
			const { createReadStream } = await import("node:fs");
			vi.mocked(createReadStream).mockReturnValueOnce(
				new MockReadStream(LARGE_CONTENT) as any,
			);
			await streamingManager.readFile("large.txt");

			const stats = streamingManager.getStats();
			expect(stats.totalOperations).toBe(2);
			expect(stats.streamedOperations).toBe(1);
			expect(stats.totalBytesRead).toBe(250); // 50 + 200
		});

		it("should reset statistics", async () => {
			mockFsPromises.stat.mockResolvedValueOnce({ size: 50 } as any);
			mockReadFileWithRetry.mockResolvedValueOnce({ success: true, data: SMALL_CONTENT });
			await streamingManager.readFile("test.txt");

			expect(streamingManager.getStats().totalOperations).toBe(1);

			streamingManager.resetStats();
			expect(streamingManager.getStats().totalOperations).toBe(0);
		});
	});

	describe("Validation Edge Cases", () => {
		it("should handle strategy prediction for non-existent files", async () => {
			const enoentError = new Error(
				"ENOENT: no such file or directory",
			) as NodeJS.ErrnoException;
			enoentError.code = "ENOENT";
			mockFsPromises.stat.mockRejectedValueOnce(enoentError);

			const result = await streamingManager.wouldStreamFile("does-not-exist.txt");

			expect(result.success).toBe(false);
			expect((result as any).error.code).toBe("STAT_ERROR");
		});
	});
});
