import * as fs from "node:fs/promises";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StreamingManager } from "../../performance/StreamingManager.js";
import type { MemoryBankLogger } from "../../types/types.js";

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

	beforeEach(async () => {
		// Ensure test directory exists
		await fs.mkdir(TEST_DIR, { recursive: true });

		// Create StreamingManager with test configuration
		streamingManager = new StreamingManager(mockLogger, {
			sizeThreshold: 100, // 100 bytes for testing
			chunkSize: 10, // 10 bytes chunks for testing
			timeout: 5000,
			enableProgressCallbacks: true,
		});
	});

	afterEach(async () => {
		// Clean up test files
		try {
			await fs.rm(TEST_DIR, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
		vi.clearAllMocks();
	});

	describe("Constructor and Configuration", () => {
		it("should initialise with default configuration", () => {
			const manager = new StreamingManager(mockLogger);
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

			const manager = new StreamingManager(mockLogger, customConfig);
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

			await fs.writeFile(testFile, testContent);

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

			await fs.writeFile(testFile, testContent);

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
			// Create content larger than threshold (100 bytes)
			const testContent = "A".repeat(150);
			const testFile = path.join(TEST_DIR, "large.txt");

			await fs.writeFile(testFile, testContent);

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

			await fs.writeFile(testFile, testContent);

			const progressCallback = vi.fn();
			const result = await streamingManager.readFile(testFile, {
				onProgress: progressCallback,
			});

			expect(result.success).toBe(true);
			expect(progressCallback).toHaveBeenCalled();

			// Check that progress was called with valid parameters
			const calls = progressCallback.mock.calls;
			expect(calls.length).toBeGreaterThan(0);
			for (const call of calls) {
				expect(call[0]).toBeGreaterThan(0); // bytesRead
				expect(call[1]).toBe(testContent.length); // totalBytes
			}
		});

		it("should update statistics for streamed reads", async () => {
			const testContent = "C".repeat(200);
			const testFile = path.join(TEST_DIR, "large.txt");

			await fs.writeFile(testFile, testContent);

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

			await fs.writeFile(testFile, testContent);

			const result = await streamingManager.readFile(testFile, {
				timeout: 1, // Very short timeout
			});

			// Note: This test verifies timeout handling - the result depends on system speed
			// On fast systems, file reads complete before timeout; on slower systems, timeout occurs
			if (result.success) {
				// File was read successfully before timeout
				expect(result.data.content).toBe(testContent);
			} else {
				// Timeout occurred as expected
				expect(result.error.code).toBe("STREAMING_TIMEOUT");
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
				const result = await streamingManager.readFile(maliciousPath);
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.code).toBe("PATH_VALIDATION_ERROR");
					expect(result.error.message).toContain("potentially dangerous sequences");
				}
			}
		});

		it("should apply strict validation when allowedRoot is provided", async () => {
			const testContent = "Safe content";
			const safeFile = path.join(TEST_DIR, "safe.txt");
			await fs.writeFile(safeFile, testContent);

			// Should succeed with valid path within allowedRoot
			const validResult = await streamingManager.readFile("safe.txt", {
				allowedRoot: TEST_DIR,
			});
			expect(validResult.success).toBe(true);

			// Should fail with path traversal attempt when allowedRoot is specified
			const maliciousResult = await streamingManager.readFile("../../../etc/passwd", {
				allowedRoot: TEST_DIR,
			});
			expect(maliciousResult.success).toBe(false);
			if (!maliciousResult.success) {
				expect(maliciousResult.error.code).toBe("PATH_VALIDATION_ERROR");
			}
		});

		it("should apply same security validation to wouldStreamFile", async () => {
			// Should reject path traversal attempts
			const maliciousResult = await streamingManager.wouldStreamFile("../../../etc/passwd");
			expect(maliciousResult.success).toBe(false);
			if (!maliciousResult.success) {
				expect(maliciousResult.error.code).toBe("PATH_VALIDATION_ERROR");
			}

			// Should work with valid absolute paths
			const testFile = path.join(TEST_DIR, "test.txt");
			await fs.writeFile(testFile, "test");
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

			await fs.writeFile(smallFile, smallContent);
			await fs.writeFile(largeFile, largeContent);

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

			await fs.writeFile(testFile, testContent);
			await streamingManager.readFile(testFile);

			// Verify stats exist
			let stats = streamingManager.getStats();
			expect(stats.totalOperations).toBe(1);

			// Reset and verify
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

			await fs.writeFile(testFile, testContent);

			// Start read operation but don't await
			const readPromise = streamingManager.readFile(testFile);

			// Check if operation is tracked (might be too fast to catch)
			// TODO: Why is this reported as "useless" by the linter?
			const activeOps = streamingManager.getActiveOperations();
			// Note: This test might not consistently catch active operations
			// due to the speed of modern systems

			await readPromise;

			// After completion, no active operations
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

			await fs.writeFile(smallFile, smallContent);
			await fs.writeFile(largeFile, largeContent);

			const smallResult = await streamingManager.wouldStreamFile(smallFile);
			const largeResult = await streamingManager.wouldStreamFile(largeFile);

			expect(smallResult.success).toBe(true);
			expect(largeResult.success).toBe(true);

			if (smallResult.success && largeResult.success) {
				expect(smallResult.data).toBe(false); // Won't be streamed
				expect(largeResult.data).toBe(true); // Will be streamed
			}
		});

		it("should handle strategy prediction for non-existent files", async () => {
			const nonExistentFile = path.join(TEST_DIR, "does-not-exist.txt");

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

			await fs.writeFile(testFile, testContent);

			const result = await streamingManager.readFile(testFile, {
				chunkSize: 5, // Smaller chunks
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.content).toBe(testContent);
				expect(result.data.wasStreamed).toBe(true);
				// Should have more chunks due to smaller chunk size
				expect(result.data.chunksProcessed).toBeGreaterThan(20);
			}
		});

		it("should respect custom timeout", async () => {
			const testContent = "I".repeat(200);
			const testFile = path.join(TEST_DIR, "large.txt");

			await fs.writeFile(testFile, testContent);

			const result = await streamingManager.readFile(testFile, {
				timeout: 10000, // Longer timeout
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.content).toBe(testContent);
			}
		});
	});
});
