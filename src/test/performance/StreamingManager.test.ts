import { EventEmitter } from "node:events"; // Import EventEmitter explicitly
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StreamingManager } from "../../performance/StreamingManager.js";
import { sanitizePath, validateMemoryBankPath } from "../../services/validation/security.js"; // Import for mocking
import type { MemoryBankLogger } from "../../types/types.js";

// Mock the security validation module
vi.mock("../../services/validation/security.js", () => ({
	sanitizePath: vi.fn(),
	validateMemoryBankPath: vi.fn(),
}));

// Mock node:fs/promises globally for this test file
vi.mock("node:fs/promises", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs/promises")>();
	return {
		...actual,
		readFile: vi.fn(),
		writeFile: vi.fn(),
		stat: vi.fn(),
		mkdir: vi.fn(),
		rm: vi.fn(),
	};
});

// Define MockReadStream and MockStream outside of vi.mock to make them accessible
class MockReadStream extends EventEmitter {
	private readonly content: string;
	private readonly chunkSize: number;
	private currentIndex: number;

	constructor(content = "", options: { highWaterMark?: number } = {}) {
		super();
		this.content = content;
		this.chunkSize = options.highWaterMark ?? 10; // Default chunk size
		this.currentIndex = 0;
		setImmediate(() => this._simulateRead());
	}

	_simulateRead() {
		while (this.currentIndex < this.content.length) {
			const chunk = this.content.slice(this.currentIndex, this.currentIndex + this.chunkSize);
			this.emit("data", Buffer.from(chunk));
			this.currentIndex += this.chunkSize;
		}
		this.emit("end");
	}

	destroy() {
		this.emit("close");
	}

	// Mock implementations - these methods exist on real streams but are no-ops in our test mock
	pause() {
		/* Mock implementation - no action needed for tests */
	}
	resume() {
		/* Mock implementation - no action needed for tests */
	}
}

class MockStream extends EventEmitter {
	private readonly timeoutMs: number;

	constructor(timeoutMs = 5) {
		super();
		this.timeoutMs = timeoutMs;

		// Delay to ensure proper setup
		setTimeout(() => {
			// For timeout tests, we want to trigger timeout, not error
			// Intentionally don't emit any data or end events to simulate hanging
		}, this.timeoutMs);
	}

	destroy() {
		this.emit("close");
	}

	// Mock implementations - these methods exist on real streams but are no-ops in our test mock
	pause() {
		/* Mock implementation - no action needed for tests */
	}
	resume() {
		/* Mock implementation - no action needed for tests */
	}
}

// Mock node:fs globally for createReadStream
vi.mock("node:fs", async () => {
	const createReadStream = vi.fn((filePath, options) => {
		// Default mock stream - content will be set by individual tests
		return new MockReadStream("", options);
	});
	return {
		createReadStream,
	};
});

// Test setup
const TEST_DIR = path.join(__dirname, "__temp__");
const mockLogger: MemoryBankLogger = {
	info: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
	debug: vi.fn(),
};

describe("StreamingManager", () => {
	let streamingManager: StreamingManager;
	let mockedFsReadFile: ReturnType<typeof vi.fn>;
	let mockedFsWriteFile: ReturnType<typeof vi.fn>;
	let mockedFsStat: ReturnType<typeof vi.fn>;
	let mockedFsMkdir: ReturnType<typeof vi.fn>;
	let mockedFsRm: ReturnType<typeof vi.fn>;
	let mockedCreateReadStream: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Get references to the mocked fs functions
		mockedFsReadFile = vi.mocked(fs.readFile);
		mockedFsWriteFile = vi.mocked(fs.writeFile);
		mockedFsStat = vi.mocked(fs.stat);
		mockedFsMkdir = vi.mocked(fs.mkdir);
		mockedFsRm = vi.mocked(fs.rm);
		// Assign the mocked createReadStream from the mocked 'node:fs' module
		mockedCreateReadStream = vi.mocked((await import("node:fs")).createReadStream);

		// Default mock implementations for fs functions
		mockedFsMkdir.mockResolvedValue(undefined);
		mockedFsRm.mockResolvedValue(undefined);
		mockedFsReadFile.mockResolvedValue("mock file content");
		mockedFsWriteFile.mockResolvedValue(undefined);
		mockedFsStat.mockImplementation(async (filePath: string) => {
			if (filePath.includes("small.txt")) {
				return { size: "This is a small test file.".length } as any;
			}
			if (filePath.includes("large.txt")) {
				return { size: 150 } as any; // Larger than threshold
			}
			if (filePath.includes("does-not-exist.txt")) {
				const error = new Error(
					"ENOENT: no such file or directory",
				) as NodeJS.ErrnoException;
				error.code = "ENOENT";
				throw error;
			}
			return { size: 100 } as any; // Default size for other files
		});

		// Clear all mocks first to prevent contamination
		vi.mocked(sanitizePath).mockClear();
		vi.mocked(validateMemoryBankPath).mockClear();
		mockedCreateReadStream.mockClear();

		// Mock sanitizePath - used by StreamingManager
		vi.mocked(sanitizePath).mockImplementation((filePath: string, allowedRoot?: string) => {
			// Simulate successful validation for paths within the TEST_DIR or relative safe paths
			if (
				filePath.startsWith(TEST_DIR) ||
				filePath.includes("__temp__") ||
				(!filePath.includes("../") &&
					!filePath.includes("..\\") &&
					!filePath.includes("\0") &&
					!filePath.startsWith("/"))
			) {
				return filePath;
			}
			// For malicious paths, throw an error
			throw new Error("Path validation failed: Path traversal detected");
		});

		// Mock validateMemoryBankPath - used by FileStreamer
		vi.mocked(validateMemoryBankPath).mockImplementation(
			(filePath: string, allowedRoot: string) => {
				// Simulate successful validation for paths within the TEST_DIR or relative safe paths
				if (
					filePath.startsWith(TEST_DIR) ||
					filePath.includes("__temp__") ||
					(!filePath.includes("../") &&
						!filePath.includes("..\\") &&
						!filePath.includes("\0") &&
						!filePath.startsWith("/"))
				) {
					return filePath;
				}
				// For malicious paths, throw an error
				throw new Error("Path validation failed: Path traversal detected");
			},
		);

		// Ensure test directory exists
		await mockedFsMkdir(TEST_DIR, { recursive: true });

		// Create StreamingManager with test configuration
		streamingManager = new StreamingManager(mockLogger, TEST_DIR, {
			sizeThreshold: 100, // 100 bytes for testing
			chunkSize: 10, // 10 bytes chunks for testing
			timeout: 5000,
			enableProgressCallbacks: true,
		});
	});

	afterEach(async () => {
		// Clean up test files
		try {
			await mockedFsRm(TEST_DIR, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
		vi.clearAllMocks();
	});

	describe("Constructor and Configuration", () => {
		it("should initialise with default configuration", () => {
			const manager = new StreamingManager(mockLogger, TEST_DIR);
			const config = manager.getConfig();

			expect(config.sizeThreshold).toBe(1024 * 1024); // 1MB
			expect(config.chunkSize).toBe(64 * 1024); // 64KB
			expect(config.timeout).toBe(30000); // 30s
			expect(config.enableProgressCallbacks).toBe(true);
		});

		it("should initialise with custom configuration", () => {
			const customConfig = {
				sizeThreshold: 500,
				chunkSize: 50,
				timeout: 10000,
				enableProgressCallbacks: false,
			};

			const manager = new StreamingManager(mockLogger, TEST_DIR, customConfig);
			const config = manager.getConfig();

			expect(config.sizeThreshold).toBe(500);
			expect(config.chunkSize).toBe(50);
			expect(config.timeout).toBe(10000);
			expect(config.enableProgressCallbacks).toBe(false);
		});
	});

	describe("Normal File Reading (Small Files)", () => {
		it("should read small files using normal strategy", async () => {
			const testContent = "This is a small test file.";
			const testFile = path.join(TEST_DIR, "small.txt");

			mockedFsReadFile.mockResolvedValueOnce(testContent);
			mockedFsStat.mockResolvedValueOnce({ size: testContent.length } as any);

			const result = await streamingManager.readFile(testFile);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.content).toBe(testContent);
				expect(result.data.wasStreamed).toBe(false);
				expect(result.data.bytesRead).toBe(testContent.length);
				expect(result.data.chunksProcessed).toBe(1);
				expect(result.data.duration).toBeGreaterThan(0);
			}
		});

		it("should update statistics for normal reads", async () => {
			const testContent = "Small file content";
			const testFile = path.join(TEST_DIR, "small.txt");

			mockedFsReadFile.mockResolvedValueOnce(testContent);
			mockedFsStat.mockResolvedValueOnce({ size: testContent.length } as any);

			await streamingManager.readFile(testFile);
			const stats = streamingManager.getStats();

			expect(stats.totalOperations).toBe(1);
			expect(stats.streamedOperations).toBe(0);
			expect(stats.totalBytesRead).toBe(testContent.length);
			expect(stats.avgNormalReadTime).toBeGreaterThan(0);
			expect(stats.avgStreamingTime).toBe(0);
		});
	});

	describe("Streaming File Reading (Large Files)", () => {
		it("should read large files using streaming strategy", async () => {
			const testContent = "A".repeat(150);
			const testFile = path.join(TEST_DIR, "large.txt");

			mockedFsStat.mockResolvedValueOnce({ size: testContent.length } as any);
			mockedCreateReadStream.mockImplementationOnce((filePath, options) => {
				// Return a MockReadStream with the actual content and chunk size
				return new MockReadStream(testContent, options);
			});

			const result = await streamingManager.readFile(testFile);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.content).toBe(testContent);
				expect(result.data.wasStreamed).toBe(true);
				expect(result.data.bytesRead).toBe(testContent.length);
				expect(result.data.chunksProcessed).toBeGreaterThan(1);
				expect(result.data.duration).toBeGreaterThan(0);
			}
		});

		it("should call progress callback during streaming", async () => {
			const testContent = "B".repeat(200);
			const testFile = path.join(TEST_DIR, "large.txt");

			mockedFsStat.mockResolvedValueOnce({ size: testContent.length } as any);

			mockedCreateReadStream.mockImplementationOnce((filePath, options) => {
				return new MockReadStream(testContent, options);
			});

			const progressCallback = vi.fn();
			const result = await streamingManager.readFile(testFile, {
				onProgress: progressCallback,
			});

			expect(result.success).toBe(true);
			expect(progressCallback).toHaveBeenCalled();

			const calls = progressCallback.mock.calls;
			expect(calls.length).toBeGreaterThan(0);
			for (const call of calls) {
				expect(call[0]).toBeGreaterThan(0);
				expect(call[1]).toBe(testContent.length);
			}
		});

		it("should update statistics for streamed reads", async () => {
			const testContent = "C".repeat(200);
			const testFile = path.join(TEST_DIR, "large.txt");

			mockedFsStat.mockResolvedValueOnce({ size: testContent.length } as any);
			mockedCreateReadStream.mockImplementationOnce((filePath, options) => {
				return new MockReadStream(testContent, options);
			});

			await streamingManager.readFile(testFile);
			const stats = streamingManager.getStats();

			expect(stats.totalOperations).toBe(1);
			expect(stats.streamedOperations).toBe(1);
			expect(stats.totalBytesRead).toBe(testContent.length);
			expect(stats.avgStreamingTime).toBeGreaterThan(0);
			expect(stats.largestFileStreamed).toBe(testContent.length);
		});
	});

	describe("Error Handling", () => {
		it("should handle non-existent files", async () => {
			const nonExistentFile = path.join(TEST_DIR, "does-not-exist.txt");

			// For this test, we need to override the validation to allow the path through
			// but have fs.stat fail, not path validation
			vi.mocked(sanitizePath).mockImplementationOnce(() => nonExistentFile);
			mockedFsStat.mockRejectedValueOnce({ code: "ENOENT" });

			const result = await streamingManager.readFile(nonExistentFile);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("STREAMING_READ_ERROR");
				expect(result.error.path).toBe(nonExistentFile);
				expect(result.error.message).toContain("Failed to read file");
			}
		});

		it("should handle streaming timeout", async () => {
			const testContent = "D".repeat(200);
			const testFile = path.join(TEST_DIR, "large.txt");

			mockedFsStat.mockResolvedValueOnce({ size: testContent.length } as any);

			// Both sanitizePath and validateMemoryBankPath need to pass for streaming
			vi.mocked(sanitizePath).mockImplementationOnce(() => testFile);
			vi.mocked(validateMemoryBankPath).mockImplementationOnce(() => testFile);

			mockedCreateReadStream.mockImplementationOnce((filePath, options) => {
				// Create a stream that hangs and will be timed out
				return new MockStream(100); // Don't emit data/end to trigger timeout
			});

			const result = await streamingManager.readFile(testFile, {
				timeout: 10, // Very short timeout
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				// Expecting timeout
				expect(result.error.code).toBe("STREAMING_TIMEOUT");
				expect(result.error.message).toContain("timed out");
			}
		});
	});

	describe("Security Validation", () => {
		it("should reject obvious path traversal attempts without allowedRoot", async () => {
			const maliciousPaths = [
				"../../../etc/passwd",
				"..\\..\\..\\windows\\system32\\config\\sam",
				"file\0injection.txt",
				"../outside.txt",
			];

			for (const maliciousPath of maliciousPaths) {
				// For each malicious path, override the validation to throw an error
				vi.mocked(sanitizePath).mockImplementationOnce(() => {
					throw new Error("Path validation failed: Path traversal detected");
				});

				const result = await streamingManager.readFile(maliciousPath);
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.code).toBe("PATH_VALIDATION_ERROR");
					expect(result.error.message).toContain("Path validation failed");
				}
			}
		});

		it("should apply strict validation when allowedRoot is provided", async () => {
			const testContent = "Safe content";
			mockedFsReadFile.mockResolvedValueOnce(testContent);
			mockedFsStat.mockResolvedValueOnce({ size: testContent.length } as any);

			// Mock the FileStreamer's internal createReadStream for the valid path
			mockedCreateReadStream.mockImplementationOnce((filePath, options) => {
				return new MockReadStream(testContent, options);
			});

			const validResult = await streamingManager.readFile("safe.txt", {
				allowedRoot: TEST_DIR,
			});
			expect(validResult.success).toBe(true);

			// Should fail with path traversal attempt when allowedRoot is specified
			vi.mocked(sanitizePath).mockImplementationOnce(() => {
				throw new Error("Path validation failed: Path traversal detected");
			});
			const maliciousResult = await streamingManager.readFile("../../../etc/passwd", {
				allowedRoot: TEST_DIR,
			});
			expect(maliciousResult.success).toBe(false);
			if (!maliciousResult.success) {
				expect(maliciousResult.error.code).toBe("PATH_VALIDATION_ERROR");
			}
		});

		it("should apply same security validation to wouldStreamFile", async () => {
			const maliciousPath = "../../../etc/passwd";

			// Should reject path traversal attempts
			vi.mocked(sanitizePath).mockImplementationOnce(() => {
				throw new Error("Path validation failed: Path traversal detected");
			});
			const maliciousResult = await streamingManager.wouldStreamFile(maliciousPath);
			expect(maliciousResult.success).toBe(false);
			if (!maliciousResult.success) {
				expect(maliciousResult.error.code).toBe("PATH_VALIDATION_ERROR");
			}

			// Should work with valid absolute paths - reset the mock to allow this path
			const testFile = path.join(TEST_DIR, "test.txt");
			vi.mocked(sanitizePath).mockImplementationOnce(() => testFile);
			mockedFsStat.mockResolvedValueOnce({ size: 10 } as any); // Small size, so not streamed
			const validResult = await streamingManager.wouldStreamFile(testFile);
			expect(validResult.success).toBe(true);
		});
	});

	describe("Statistics and Monitoring", () => {
		it("should provide accurate statistics", async () => {
			const smallContent = "Small";
			const largeContent = "E".repeat(150);

			const smallFile = path.join(TEST_DIR, "small.txt");
			const largeFile = path.join(TEST_DIR, "large.txt");

			mockedFsReadFile.mockResolvedValueOnce(smallContent);
			mockedFsStat.mockResolvedValueOnce({ size: smallContent.length } as any);

			mockedCreateReadStream.mockImplementationOnce((filePath, options) => {
				return new MockReadStream(largeContent, options);
			});

			mockedFsStat.mockResolvedValueOnce({ size: largeContent.length } as any);

			// Read both files
			await streamingManager.readFile(smallFile);
			await streamingManager.readFile(largeFile);

			const stats = streamingManager.getStats();

			expect(stats.totalOperations).toBe(2);
			expect(stats.streamedOperations).toBe(1);
			expect(stats.totalBytesRead).toBe(smallContent.length + largeContent.length);
			expect(stats.avgNormalReadTime).toBeGreaterThan(0);
			expect(stats.avgStreamingTime).toBeGreaterThan(0);
			expect(stats.largestFileStreamed).toBe(largeContent.length);
		});

		it("should reset statistics", async () => {
			const testContent = "Test content";
			const testFile = path.join(TEST_DIR, "test.txt");

			mockedFsReadFile.mockResolvedValueOnce(testContent);
			mockedFsStat.mockResolvedValueOnce({ size: testContent.length } as any);

			await streamingManager.readFile(testFile);

			let stats = streamingManager.getStats();
			expect(stats.totalOperations).toBe(1);

			streamingManager.resetStats();
			stats = streamingManager.getStats();

			expect(stats.totalOperations).toBe(0);
			expect(stats.streamedOperations).toBe(0);
			expect(stats.totalBytesRead).toBe(0);
			expect(stats.avgNormalReadTime).toBe(0);
			expect(stats.avgStreamingTime).toBe(0);
			expect(stats.largestFileStreamed).toBe(0);
		});

		it("should track active operations", async () => {
			const testContent = "F".repeat(200);
			const testFile = path.join(TEST_DIR, "large.txt");

			mockedFsStat.mockResolvedValueOnce({ size: testContent.length } as any);
			mockedCreateReadStream.mockImplementationOnce((filePath, options) => {
				return new MockReadStream(testContent, options);
			});

			const readPromise = streamingManager.readFile(testFile);
			await readPromise;

			const finalActiveOps = streamingManager.getActiveOperations();
			expect(finalActiveOps).toHaveLength(0);
		});
	});

	describe("Strategy Selection", () => {
		it("should predict streaming strategy correctly", async () => {
			const smallContent = "Small";
			const largeContent = "G".repeat(150);

			const smallFile = path.join(TEST_DIR, "small.txt");
			const largeFile = path.join(TEST_DIR, "large.txt");

			mockedFsStat.mockResolvedValueOnce({ size: smallContent.length } as any); // For small file
			mockedFsStat.mockResolvedValueOnce({ size: largeContent.length } as any); // For large file

			const smallResult = await streamingManager.wouldStreamFile(smallFile);
			const largeResult = await streamingManager.wouldStreamFile(largeFile);

			expect(smallResult.success).toBe(true);
			expect(largeResult.success).toBe(true);

			if (smallResult.success && largeResult.success) {
				expect(smallResult.data).toBe(false);
				expect(largeResult.data).toBe(true);
			}
		});

		it("should handle strategy prediction for non-existent files", async () => {
			const nonExistentFile = path.join(TEST_DIR, "does-not-exist.txt");

			// Allow the path to pass validation but make stat fail
			vi.mocked(sanitizePath).mockImplementationOnce(() => nonExistentFile);
			mockedFsStat.mockRejectedValueOnce({ code: "ENOENT" });

			const result = await streamingManager.wouldStreamFile(nonExistentFile);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("STAT_ERROR");
			}
		});
	});

	describe("Custom Options", () => {
		it("should respect custom chunk size", async () => {
			const testContent = "H".repeat(200);
			const testFile = path.join(TEST_DIR, "large.txt");

			// Reset the stat mock for this specific test
			mockedFsStat.mockResolvedValueOnce({ size: testContent.length } as any);

			// Clear the createReadStream mock and set up fresh mock for this test
			mockedCreateReadStream.mockReset();
			mockedCreateReadStream.mockImplementationOnce((filePath, options) => {
				return new MockReadStream(testContent, options);
			});

			const result = await streamingManager.readFile(testFile, {
				chunkSize: 5, // Smaller chunks
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.content).toBe(testContent);
				expect(result.data.wasStreamed).toBe(true);
				expect(result.data.chunksProcessed).toBeGreaterThan(20);
			}
		});

		it("should respect custom timeout", async () => {
			const testFile = path.join(TEST_DIR, "large.txt");

			// Set up stat to return a large file
			mockedFsStat.mockResolvedValueOnce({ size: 200 } as any);

			// Both sanitizePath and validateMemoryBankPath need to pass for streaming
			vi.mocked(sanitizePath).mockImplementationOnce(() => testFile);
			vi.mocked(validateMemoryBankPath).mockImplementationOnce(() => testFile);

			// Create a mock stream that never completes to trigger timeout
			let mockStream: MockStream;
			mockedCreateReadStream.mockImplementationOnce((filePath, options) => {
				mockStream = new MockStream(1000); // Long delay, but timeout will cut it short
				return mockStream;
			});

			const startTime = Date.now();
			const result = await streamingManager.readFile(testFile, {
				timeout: 50, // Very short timeout
			});
			const duration = Date.now() - startTime;

			// Should timeout within reasonable time
			expect(duration).toBeLessThan(200); // Should timeout well before MockStream's 1000ms delay
			expect(result.success).toBe(false);
			if (!result.success) {
				// Expecting timeout
				expect(result.error.code).toBe("STREAMING_TIMEOUT");
				expect(result.error.message).toContain("timed out");
			}
		});
	});
});
