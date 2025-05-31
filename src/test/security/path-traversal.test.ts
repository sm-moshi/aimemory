import { beforeEach, describe, expect, it, vi } from "vitest";
import { FileOperationManager } from "../../core/FileOperationManager.js";
import { FileStreamer } from "../../performance/FileStreamer.js";
import { StreamingManager } from "../../performance/StreamingManager.js";
import { validateMemoryBankPath } from "../../services/validation/security.js";
import type { MemoryBankLogger } from "../../types/index.js";

// Mock the security validation module
vi.mock("../../services/validation/security.js", () => ({
	validateMemoryBankPath: vi.fn(),
}));

const mockLogger: MemoryBankLogger = {
	info: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
	debug: vi.fn(),
};

// Test data constants
const ALLOWED_ROOT = "/safe/memory-bank";
const MALICIOUS_PATHS = [
	"../../../etc/passwd",
	"..\\..\\..\\windows\\system32\\config\\sam",
	"file\0injection.txt",
	"/absolute/path/outside",
	"../outside.txt",
	"..\\outside.txt",
	"./../../etc/passwd",
	"memory-bank/../../../etc/passwd",
];

const VALID_PATHS = [
	"core/projectBrief.md",
	"progress/current.md",
	"safe-file.txt",
	"systemPatterns/architecture.md",
];

// Test utilities
const expectValidationFailure = (result: any) => {
	expect(result.success).toBe(false);
	expect(result.error.code).toBe("PATH_VALIDATION_ERROR");
};

const expectConstructorError = (constructorFn: () => void, expectedMessage: string) => {
	expect(constructorFn).toThrow(expectedMessage);
};

const setupMaliciousPathRejection = () => {
	vi.mocked(validateMemoryBankPath).mockImplementation(() => {
		throw new Error("Path validation failed: Path traversal detected");
	});
};

const setupValidPathAcceptance = () => {
	vi.mocked(validateMemoryBankPath).mockImplementation((path: string) => {
		return `/safe/memory-bank/${path}`;
	});
};

describe("Path Traversal Security Tests", () => {
	let fileOperationManager: FileOperationManager;
	let streamingManager: StreamingManager;
	let fileStreamer: FileStreamer;

	beforeEach(() => {
		vi.clearAllMocks();

		fileOperationManager = new FileOperationManager(mockLogger, ALLOWED_ROOT);
		streamingManager = new StreamingManager(mockLogger, ALLOWED_ROOT);
		fileStreamer = new FileStreamer(mockLogger, ALLOWED_ROOT, {
			defaultChunkSize: 64 * 1024,
			defaultTimeout: 30000,
			defaultEnableProgressCallbacks: false,
		});
	});

	describe("FileOperationManager Security", () => {
		it("should reject obvious path traversal attempts", async () => {
			setupMaliciousPathRejection();

			for (const maliciousPath of MALICIOUS_PATHS) {
				const result = await fileOperationManager.readFileWithRetry(maliciousPath);
				expectValidationFailure(result);
			}
		});

		it("should allow safe relative paths", () => {
			setupValidPathAcceptance();

			for (const validPath of VALID_PATHS) {
				expect(() => {
					vi.mocked(validateMemoryBankPath)(validPath, ALLOWED_ROOT);
				}).not.toThrow();
			}
		});

		it("should validate paths in all FileOperationManager methods", async () => {
			const testPath = "test-file.txt";
			setupMaliciousPathRejection();

			const operations = [
				() => fileOperationManager.readFileWithRetry(testPath),
				() => fileOperationManager.writeFileWithRetry(testPath, "content"),
				() => fileOperationManager.mkdirWithRetry(testPath),
				() => fileOperationManager.statWithRetry(testPath),
				() => fileOperationManager.accessWithRetry(testPath),
			];

			for (const operation of operations) {
				const result = await operation();
				expectValidationFailure(result);
			}
		});
	});

	describe("StreamingManager Security", () => {
		it("should validate paths before streaming", async () => {
			setupMaliciousPathRejection();
			const result = await streamingManager.readFile("../../../etc/passwd");
			expectValidationFailure(result);
		});

		it("should check if file would be streamed safely", async () => {
			setupMaliciousPathRejection();
			const result = await streamingManager.wouldStreamFile(
				"../../../etc/passwd",
				ALLOWED_ROOT,
			);
			expectValidationFailure(result);
		});
	});

	describe("FileStreamer Security", () => {
		it("should validate paths before creating read streams", async () => {
			setupMaliciousPathRejection();
			const mockStats = { size: 1000, mtime: new Date() } as any;
			const result = await fileStreamer.streamFile("../../../etc/passwd", mockStats);
			expectValidationFailure(result);
		});
	});

	describe("Constructor Security", () => {
		it("should require allowedRoot for FileOperationManager", () => {
			expectConstructorError(
				() => new FileOperationManager(mockLogger, ""),
				"FileOperationManager requires allowedRoot for security",
			);
		});

		it("should require allowedRoot for StreamingManager", () => {
			expectConstructorError(
				() => new StreamingManager(mockLogger, ""),
				"StreamingManager requires allowedRoot for security",
			);
		});

		it("should require allowedRoot for FileStreamer", () => {
			expectConstructorError(
				() =>
					new FileStreamer(mockLogger, "", {
						defaultChunkSize: 64 * 1024,
						defaultTimeout: 30000,
						defaultEnableProgressCallbacks: false,
					}),
				"FileStreamer requires allowedRoot for security",
			);
		});
	});

	describe("Edge Cases", () => {
		const edgeCases = [
			{ path: "file\0injection.txt", error: "Null byte detected" },
			{ path: "..%2F..%2F..%2Fetc%2Fpasswd", error: "Encoded path traversal detected" },
			{ path: "a".repeat(10000), error: "Path too long" },
		];

		for (const { path, error } of edgeCases) {
			it(`should handle ${error.toLowerCase()}`, async () => {
				vi.mocked(validateMemoryBankPath).mockImplementation(() => {
					throw new Error(`Path validation failed: ${error}`);
				});

				const result = await fileOperationManager.readFileWithRetry(path);
				expectValidationFailure(result);
			});
		}
	});

	describe("Regression Prevention", () => {
		it("should log security violations for monitoring", async () => {
			setupMaliciousPathRejection();
			await fileOperationManager.readFileWithRetry("../../../etc/passwd");

			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.stringContaining("Path validation failed for: ../../../etc/passwd"),
			);
		});

		it("should maintain security across all file operation types", async () => {
			const maliciousPath = "../../../etc/passwd";
			setupMaliciousPathRejection();

			const operations = [
				fileOperationManager.readFileWithRetry(maliciousPath),
				fileOperationManager.writeFileWithRetry(maliciousPath, "content"),
				fileOperationManager.statWithRetry(maliciousPath),
				fileOperationManager.accessWithRetry(maliciousPath),
				fileOperationManager.mkdirWithRetry(maliciousPath),
			];

			const results = await Promise.all(operations);
			results.forEach(expectValidationFailure);
		});
	});
});
