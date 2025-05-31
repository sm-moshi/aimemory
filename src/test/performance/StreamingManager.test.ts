import { EventEmitter } from "node:events";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StreamingManager } from "../../performance/StreamingManager.js";
import { sanitizePath, validateMemoryBankPath } from "../../services/validation/security.js";
import type { MemoryBankLogger } from "../../types/index.js";

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

// Simplified mock classes
class MockReadStream extends EventEmitter {
	constructor(
		private readonly content = "",
		options: { highWaterMark?: number } = {},
	) {
		super();
		const chunkSize = options.highWaterMark ?? 10;
		setImmediate(() => {
			let currentIndex = 0;
			while (currentIndex < this.content.length) {
				const chunk = this.content.slice(currentIndex, currentIndex + chunkSize);
				this.emit("data", Buffer.from(chunk));
				currentIndex += chunkSize;
			}
			this.emit("end");
		});
	}
	destroy() {
		this.emit("close");
	}
	pause() {
		/* no-op */
	}
	resume() {
		/* no-op */
	}
}

class MockStream extends EventEmitter {
	constructor(timeoutMs = 5) {
		super();
		setTimeout(() => {
			// Intentionally don't emit data/end to simulate hanging
		}, timeoutMs);
	}
	destroy() {
		this.emit("close");
	}
	pause() {
		/* no-op */
	}
	resume() {
		/* no-op */
	}
}

// Mock node:fs globally for createReadStream
vi.mock("node:fs", async () => ({
	createReadStream: vi.fn((filePath, options) => new MockReadStream("", options)),
}));

// Test constants and types
const TEST_DIR = path.join(__dirname, "__temp__");
const mockLogger: MemoryBankLogger = {
	info: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
	debug: vi.fn(),
};

type TestResult = { success: true; data: any } | { success: false; error: any };

// Test constants and helpers
const SMALL_CONTENT = "This is a small test file.";
const LARGE_CONTENT = "A".repeat(150);

const isValidPath = (filePath: string): boolean => {
	return (
		filePath.startsWith(TEST_DIR) ||
		filePath.includes("__temp__") ||
		(!filePath.includes("../") &&
			!filePath.includes("..\\") &&
			!filePath.includes("\0") &&
			!filePath.startsWith("/"))
	);
};

const getFileSize = (filePath: string): number => {
	if (filePath.includes("small.txt")) return SMALL_CONTENT.length;
	if (filePath.includes("large.txt")) return 150;
	if (filePath.includes("does-not-exist.txt")) {
		const error = new Error("ENOENT: no such file or directory") as NodeJS.ErrnoException;
		error.code = "ENOENT";
		throw error;
	}
	return 100;
};

const expectSuccess = (result: TestResult, expectedContent: string, wasStreamed: boolean) => {
	expect(result.success).toBe(true);
	const data = (result as any).data;
	expect(data.content).toBe(expectedContent);
	expect(data.wasStreamed).toBe(wasStreamed);
	expect(data.bytesRead).toBe(expectedContent.length);
	expect(data.duration).toBeGreaterThan(0);
};

const expectFailure = (result: TestResult, expectedErrorCode: string) => {
	expect(result.success).toBe(false);
	expect((result as any).error.code).toBe(expectedErrorCode);
};

const expectValidationFailure = (result: TestResult) => {
	expectFailure(result, "PATH_VALIDATION_ERROR");
};

const setupValidPath = (path: string) => {
	vi.mocked(sanitizePath).mockImplementationOnce(() => path);
	vi.mocked(validateMemoryBankPath).mockImplementationOnce(() => path);
};

const setupInvalidPath = () => {
	vi.mocked(sanitizePath).mockImplementationOnce(() => {
		throw new Error("Path validation failed: Path traversal detected");
	});
};

// Mock setup helpers
let mockFs: {
	readFile: ReturnType<typeof vi.fn>;
	writeFile: ReturnType<typeof vi.fn>;
	stat: ReturnType<typeof vi.fn>;
	mkdir: ReturnType<typeof vi.fn>;
	rm: ReturnType<typeof vi.fn>;
};
let mockCreateReadStream: ReturnType<typeof vi.fn>;

const initMocks = async () => {
	mockFs = {
		readFile: vi.mocked(fs.readFile),
		writeFile: vi.mocked(fs.writeFile),
		stat: vi.mocked(fs.stat),
		mkdir: vi.mocked(fs.mkdir),
		rm: vi.mocked(fs.rm),
	};
	mockCreateReadStream = vi.mocked((await import("node:fs")).createReadStream);

	// Set up default implementations
	mockFs.mkdir.mockResolvedValue(undefined);
	mockFs.rm.mockResolvedValue(undefined);
	mockFs.readFile.mockResolvedValue("mock file content");
	mockFs.writeFile.mockResolvedValue(undefined);
	mockFs.stat.mockImplementation(async (filePath: string) => ({
		size: getFileSize(filePath),
	}));

	// Set up security mocks
	vi.mocked(sanitizePath).mockImplementation((filePath: string) => {
		return isValidPath(filePath)
			? filePath
			: (() => {
					throw new Error("Path validation failed: Path traversal detected");
				})();
	});

	vi.mocked(validateMemoryBankPath).mockImplementation((filePath: string) => {
		return isValidPath(filePath)
			? filePath
			: (() => {
					throw new Error("Path validation failed: Path traversal detected");
				})();
	});
};

const setupNormalRead = (content: string) => {
	mockFs.readFile.mockResolvedValueOnce(content);
	mockFs.stat.mockResolvedValueOnce({ size: content.length } as any);
};

const setupStreamRead = (content: string) => {
	mockFs.stat.mockResolvedValueOnce({ size: content.length } as any);
	mockCreateReadStream.mockImplementationOnce(() => new MockReadStream(content));
};

const setupTimeoutStream = (size: number) => {
	mockFs.stat.mockResolvedValueOnce({ size } as any);
	mockCreateReadStream.mockImplementationOnce(() => new MockStream(100));
};

describe("StreamingManager", () => {
	let streamingManager: StreamingManager;

	beforeEach(async () => {
		vi.clearAllMocks();
		await initMocks();
		await mockFs.mkdir(TEST_DIR, { recursive: true });

		streamingManager = new StreamingManager(mockLogger, TEST_DIR, {
			sizeThreshold: 100,
			chunkSize: 10,
			timeout: 5000,
			enableProgressCallbacks: true,
		});
	});

	afterEach(async () => {
		try {
			await mockFs.rm(TEST_DIR, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
		vi.clearAllMocks();
	});

	describe("Constructor and Configuration", () => {
		it("should initialise with default configuration", () => {
			const manager = new StreamingManager(mockLogger, TEST_DIR);
			const config = manager.getConfig();

			expect(config).toMatchObject({
				sizeThreshold: 1024 * 1024,
				chunkSize: 64 * 1024,
				timeout: 30000,
				enableProgressCallbacks: true,
			});
		});

		it("should initialise with custom configuration", () => {
			const customConfig = {
				sizeThreshold: 500,
				chunkSize: 50,
				timeout: 10000,
				enableProgressCallbacks: false,
			};

			const manager = new StreamingManager(mockLogger, TEST_DIR, customConfig);
			expect(manager.getConfig()).toMatchObject(customConfig);
		});
	});

	describe("Normal File Reading (Small Files)", () => {
		it("should read small files using normal strategy", async () => {
			const testFile = path.join(TEST_DIR, "small.txt");
			setupNormalRead(SMALL_CONTENT);

			const result = await streamingManager.readFile(testFile);
			expectSuccess(result, SMALL_CONTENT, false);
		});

		it("should update statistics for normal reads", async () => {
			const testFile = path.join(TEST_DIR, "small.txt");
			setupNormalRead(SMALL_CONTENT);

			await streamingManager.readFile(testFile);
			const stats = streamingManager.getStats();

			expect(stats.totalOperations).toBe(1);
			expect(stats.streamedOperations).toBe(0);
			expect(stats.totalBytesRead).toBe(SMALL_CONTENT.length);
			expect(stats.avgNormalReadTime).toBeGreaterThan(0);
		});
	});

	describe("Streaming File Reading (Large Files)", () => {
		it("should read large files using streaming strategy", async () => {
			const testFile = path.join(TEST_DIR, "large.txt");
			setupStreamRead(LARGE_CONTENT);

			const result = await streamingManager.readFile(testFile);
			expectSuccess(result, LARGE_CONTENT, true);
		});

		it("should call progress callback during streaming", async () => {
			const testContent = "B".repeat(200);
			const testFile = path.join(TEST_DIR, "large.txt");
			const progressCallback = vi.fn();

			setupStreamRead(testContent);
			const result = await streamingManager.readFile(testFile, {
				onProgress: progressCallback,
			});

			expect(result.success).toBe(true);
			expect(progressCallback).toHaveBeenCalled();
		});

		it("should update statistics for streamed reads", async () => {
			const testFile = path.join(TEST_DIR, "large.txt");
			setupStreamRead(LARGE_CONTENT);

			await streamingManager.readFile(testFile);
			const stats = streamingManager.getStats();

			expect(stats.totalOperations).toBe(1);
			expect(stats.streamedOperations).toBe(1);
			expect(stats.avgStreamingTime).toBeGreaterThan(0);
		});
	});

	describe("Error Handling", () => {
		it("should handle non-existent files", async () => {
			const nonExistentFile = path.join(TEST_DIR, "does-not-exist.txt");
			setupValidPath(nonExistentFile);
			mockFs.stat.mockRejectedValueOnce({ code: "ENOENT" });

			const result = await streamingManager.readFile(nonExistentFile);
			expectFailure(result, "STREAMING_READ_ERROR");
		});

		it("should handle streaming timeout", async () => {
			const testFile = path.join(TEST_DIR, "large.txt");
			setupValidPath(testFile);
			setupTimeoutStream(200);

			const result = await streamingManager.readFile(testFile, { timeout: 10 });
			expectFailure(result, "STREAMING_TIMEOUT");
		});
	});

	describe("Security Validation", () => {
		const maliciousPaths = [
			"../../../etc/passwd",
			"..\\..\\..\\windows\\system32\\config\\sam",
			"file\0injection.txt",
			"../outside.txt",
		];

		it("should reject path traversal attempts", async () => {
			for (const maliciousPath of maliciousPaths) {
				setupInvalidPath();
				const result = await streamingManager.readFile(maliciousPath);
				expectValidationFailure(result);
			}
		});

		it("should apply strict validation when allowedRoot is provided", async () => {
			setupNormalRead("Safe content");
			const validResult = await streamingManager.readFile("safe.txt", {
				allowedRoot: TEST_DIR,
			});
			expect(validResult.success).toBe(true);

			setupInvalidPath();
			const maliciousResult = await streamingManager.readFile("../../../etc/passwd", {
				allowedRoot: TEST_DIR,
			});
			expectValidationFailure(maliciousResult);
		});

		it("should apply same security validation to wouldStreamFile", async () => {
			setupInvalidPath();
			const maliciousResult = await streamingManager.wouldStreamFile("../../../etc/passwd");
			expectValidationFailure(maliciousResult);

			const testFile = path.join(TEST_DIR, "test.txt");
			setupValidPath(testFile);
			mockFs.stat.mockResolvedValueOnce({ size: 10 } as any);
			const validResult = await streamingManager.wouldStreamFile(testFile);
			expect(validResult.success).toBe(true);
		});
	});

	describe("Statistics and Monitoring", () => {
		it("should provide accurate statistics", async () => {
			const smallFile = path.join(TEST_DIR, "small.txt");
			const largeFile = path.join(TEST_DIR, "large.txt");

			setupNormalRead(SMALL_CONTENT);
			await streamingManager.readFile(smallFile);

			setupStreamRead(LARGE_CONTENT);
			await streamingManager.readFile(largeFile);

			const stats = streamingManager.getStats();
			expect(stats.totalOperations).toBe(2);
			expect(stats.streamedOperations).toBe(1);
		});

		it("should reset statistics", async () => {
			const testFile = path.join(TEST_DIR, "test.txt");
			setupNormalRead("Test content");
			await streamingManager.readFile(testFile);

			expect(streamingManager.getStats().totalOperations).toBe(1);
			streamingManager.resetStats();
			expect(streamingManager.getStats().totalOperations).toBe(0);
		});

		it("should track active operations", async () => {
			const testFile = path.join(TEST_DIR, "large.txt");
			setupStreamRead(LARGE_CONTENT);

			await streamingManager.readFile(testFile);
			expect(streamingManager.getActiveOperations()).toHaveLength(0);
		});
	});

	describe("Strategy Selection", () => {
		it("should predict streaming strategy correctly", async () => {
			const smallFile = path.join(TEST_DIR, "small.txt");
			const largeFile = path.join(TEST_DIR, "large.txt");

			mockFs.stat.mockResolvedValueOnce({
				size: SMALL_CONTENT.length,
			} as any);
			mockFs.stat.mockResolvedValueOnce({ size: 150 } as any);

			const [smallResult, largeResult] = await Promise.all([
				streamingManager.wouldStreamFile(smallFile),
				streamingManager.wouldStreamFile(largeFile),
			]);

			expect(smallResult.success && largeResult.success).toBe(true);
			expect((smallResult as any).data).toBe(false);
			expect((largeResult as any).data).toBe(true);
		});

		it("should handle strategy prediction for non-existent files", async () => {
			const nonExistentFile = path.join(TEST_DIR, "does-not-exist.txt");
			setupValidPath(nonExistentFile);
			mockFs.stat.mockRejectedValueOnce({ code: "ENOENT" });

			const result = await streamingManager.wouldStreamFile(nonExistentFile);
			expectFailure(result, "STAT_ERROR");
		});
	});

	describe("Custom Options", () => {
		it("should respect custom chunk size", async () => {
			const testContent = "H".repeat(200);
			const testFile = path.join(TEST_DIR, "large.txt");

			mockFs.stat.mockResolvedValueOnce({ size: testContent.length } as any);
			mockCreateReadStream.mockImplementationOnce(
				(_filePath, options) => new MockReadStream(testContent, options),
			);

			const result = await streamingManager.readFile(testFile, { chunkSize: 5 });
			expectSuccess(result, testContent, true);
		});

		it("should respect custom timeout", async () => {
			const testFile = path.join(TEST_DIR, "large.txt");
			setupValidPath(testFile);
			setupTimeoutStream(200);

			const startTime = Date.now();
			const result = await streamingManager.readFile(testFile, { timeout: 50 });
			const duration = Date.now() - startTime;

			expect(duration).toBeLessThan(200);
			expectFailure(result, "STREAMING_TIMEOUT");
		});
	});
});
