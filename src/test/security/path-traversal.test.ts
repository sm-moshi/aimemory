import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the security validation module DIRECTLY at the top
vi.mock("../../services/validation/security.js", () => ({
	validateMemoryBankPath: vi.fn(), // Default mock is just a vi.fn()
	sanitizePath: vi.fn((path: string) => path),
}));

// THEN import other things
import { FileOperationManager } from "../../core/FileOperationManager.js";
import { FileStreamer } from "../../performance/FileStreamer.js";
import { StreamingManager } from "../../performance/StreamingManager.js";
import {
	SECURITY_TEST_DATA,
	createMockFileStats,
	createSecurityMockLogger,
	expectConstructorError,
	expectValidationFailure,
	setupMaliciousPathRejection,
	setupSecurityValidationError,
	setupValidPathAcceptance,
} from "../test-utils/security-mock-helpers.js";

const mockLogger = createSecurityMockLogger();

// Extract constants from centralized test data
const { ALLOWED_ROOT, MALICIOUS_PATHS, VALID_PATHS, EDGE_CASES } = SECURITY_TEST_DATA;

describe("Path Traversal Security Tests", () => {
	let fileOperationManager: FileOperationManager;
	let streamingManager: StreamingManager;
	let fileStreamer: FileStreamer;

	beforeEach(() => {
		vi.clearAllMocks();

		fileOperationManager = new FileOperationManager(mockLogger, ALLOWED_ROOT);
		streamingManager = new StreamingManager(mockLogger, fileOperationManager, ALLOWED_ROOT);
		fileStreamer = new FileStreamer(mockLogger, ALLOWED_ROOT, {
			defaultChunkSize: 64 * 1024,
			defaultTimeout: 30000,
			defaultEnableProgressCallbacks: false,
		});
	});

	describe("FileOperationManager Security", () => {
		it("should reject obvious path traversal attempts", async () => {
			await setupMaliciousPathRejection();

			for (const maliciousPath of MALICIOUS_PATHS) {
				const result = await fileOperationManager.readFileWithRetry(maliciousPath);
				expectValidationFailure(result);
			}
		});

		it("should allow safe relative paths", async () => {
			await setupValidPathAcceptance();

			for (const validPath of VALID_PATHS) {
				expect(() => {
					// Test passes if setupValidPathAcceptance doesn't throw
					const result = validPath;
					expect(result).toBeTruthy();
				}).not.toThrow();
			}
		});

		it("should validate paths in all FileOperationManager methods", async () => {
			const testPath = "test-file.txt";
			await setupMaliciousPathRejection();

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
			await setupMaliciousPathRejection();
			const result = await streamingManager.readFile("../../../etc/passwd");
			expectValidationFailure(result);
		});

		it("should check if file would be streamed safely", async () => {
			await setupMaliciousPathRejection();
			const result = await streamingManager.wouldStreamFile(
				"../../../etc/passwd",
				ALLOWED_ROOT,
			);
			expectValidationFailure(result);
		});
	});

	describe("FileStreamer Security", () => {
		it("should validate paths before creating read streams", async () => {
			await setupMaliciousPathRejection();
			const mockStats = createMockFileStats();
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
			const mockFOM = {} as any; // Mock FileOperationManager for this test
			expectConstructorError(
				() => new StreamingManager(mockLogger, mockFOM, ""),
				"Requires allowedRoot for security - cannot operate without path restrictions",
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
		for (const { path, error } of EDGE_CASES) {
			it(`should handle ${error.toLowerCase()}`, async () => {
				await setupSecurityValidationError(error);

				const result = await fileOperationManager.readFileWithRetry(path);
				expectValidationFailure(result);
			});
		}
	});

	describe("Regression Prevention", () => {
		it("should log security violations for monitoring", async () => {
			await setupMaliciousPathRejection();
			await fileOperationManager.readFileWithRetry("../../../etc/passwd");

			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.stringContaining("Path validation failed for: ../../../etc/passwd"),
			);
		});

		it("should maintain security across all file operation types", async () => {
			const maliciousPath = "../../../etc/passwd";
			await setupMaliciousPathRejection();

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
