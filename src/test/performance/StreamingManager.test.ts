import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FileOperationManager } from "../../core/FileOperationManager";
import { StreamingManager } from "../../performance/StreamingManager";
import {
	createMockFileOperationManager,
	createMockLogger,
	standardAfterEach,
	standardBeforeEach,
} from "../test-utils/index";

// Mock the actual fs module that StreamingManager uses
vi.mock("node:fs/promises", () => ({
	stat: vi.fn(),
}));

// Mock sanitizePath directly, as it's a clean dependency of the SUT.
vi.mock("../../utils/security", () => ({
	sanitizePath: vi.fn((inputPath, root) => {
		const resolvedRoot = path.resolve(root ?? "/test/memory-bank");
		if (inputPath.includes("..")) {
			throw new Error("Path traversal attempt");
		}
		return path.resolve(resolvedRoot, inputPath);
	}),
}));

// Mock FileStreamer to intercept the streaming call.
const mockSharedStreamFile = vi.fn();
vi.mock("../../performance/FileStreamer", () => ({
	FileStreamer: vi.fn().mockImplementation(() => ({
		streamFile: mockSharedStreamFile,
	})),
}));

const TEST_DIR = "/test/memory-bank";
const SMALL_FILE_SIZE = 50;
const LARGE_FILE_SIZE = 200;
const THRESHOLD = 100;
const SMALL_CONTENT = "Small file content";
const LARGE_CONTENT = "A".repeat(LARGE_FILE_SIZE);

describe("StreamingManager", () => {
	let streamingManager: StreamingManager;
	let mockFileOperationManager: FileOperationManager;
	const mockLogger = createMockLogger();

	beforeEach(async () => {
		standardBeforeEach();

		// Get the mocked fs module
		const fs = await import("node:fs/promises");
		const mockFs = vi.mocked(fs);

		mockFileOperationManager = createMockFileOperationManager() as FileOperationManager;
		streamingManager = new StreamingManager(mockLogger, mockFileOperationManager, TEST_DIR, {
			sizeThreshold: THRESHOLD,
			chunkSize: 10,
			timeout: 1000,
		});

		// Reset all mocks
		vi.clearAllMocks();
	});

	afterEach(() => {
		standardAfterEach();
	});

	it("should use normal read for small files", async () => {
		// Get the mocked fs module
		const fs = await import("node:fs/promises");
		const mockFs = vi.mocked(fs);

		// ARRANGE - Configure centralized mocks
		mockFs.stat.mockResolvedValue({ size: SMALL_FILE_SIZE } as any);
		const mockRead = vi
			.mocked(mockFileOperationManager.readFileWithRetry)
			.mockResolvedValue({ success: true, data: SMALL_CONTENT });

		// ACT
		const result = await streamingManager.readFile("small.txt");

		// ASSERT
		expect(mockRead).toHaveBeenCalledTimes(1);
		expect(mockSharedStreamFile).not.toHaveBeenCalled();
		expect(result.success).toBe(true);
	});

	it("should use streaming for large files", async () => {
		// Get the mocked fs module
		const fs = await import("node:fs/promises");
		const mockFs = vi.mocked(fs);

		// ARRANGE - Configure centralized mocks
		mockFs.stat.mockResolvedValue({ size: LARGE_FILE_SIZE } as any);
		mockSharedStreamFile.mockResolvedValue({
			success: true,
			data: { content: LARGE_CONTENT, wasStreamed: true },
		});

		// ACT
		const result = await streamingManager.readFile("large.txt");

		// DEBUG - Log the result to understand what's happening
		console.log("Result:", result);
		if (!result.success) {
			console.log("Error:", result.error);
		}

		// ASSERT
		expect(mockSharedStreamFile).toHaveBeenCalledTimes(1);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.wasStreamed).toBe(true);
		}
	});

	it("should handle streaming failures", async () => {
		// Get the mocked fs module
		const fs = await import("node:fs/promises");
		const mockFs = vi.mocked(fs);

		// ARRANGE - Configure centralized mocks
		mockFs.stat.mockResolvedValue({ size: LARGE_FILE_SIZE } as any);
		mockSharedStreamFile.mockResolvedValue({
			success: false,
			error: { code: "STREAMING_FAILURE", message: "test" },
		});

		// ACT
		const result = await streamingManager.readFile("large-fail.txt");

		// ASSERT
		expect(mockSharedStreamFile).toHaveBeenCalledTimes(1);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.code).toBe("STREAMING_FAILURE");
		}
	});

	it("should track mixed operations in stats", async () => {
		// Get the mocked fs module
		const fs = await import("node:fs/promises");
		const mockFs = vi.mocked(fs);

		// ARRANGE & ACT (Small File)
		mockFs.stat.mockResolvedValueOnce({ size: SMALL_FILE_SIZE } as any);
		vi.mocked(mockFileOperationManager.readFileWithRetry).mockResolvedValueOnce({
			success: true,
			data: SMALL_CONTENT,
		});
		await streamingManager.readFile("small.txt");

		// ARRANGE & ACT (Large File)
		mockFs.stat.mockResolvedValueOnce({ size: LARGE_FILE_SIZE } as any);
		mockSharedStreamFile.mockResolvedValueOnce({
			success: true,
			data: { content: LARGE_CONTENT, wasStreamed: true },
		});
		await streamingManager.readFile("large.txt");

		// ASSERT
		const stats = streamingManager.getStats();
		expect(stats.totalOperations).toBe(2);
		expect(stats.streamedOperations).toBe(1);
		expect(stats.totalBytesRead).toBe(SMALL_FILE_SIZE + LARGE_FILE_SIZE);
	});
});
