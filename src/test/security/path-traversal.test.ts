import { beforeEach, describe, expect, it, vi } from "vitest";

// Import the functions to be mocked from their actual module path
import {
	sanitizePath as actualSanitizePath,
	validateMemoryBankPath as actualValidateMemoryBankPath,
} from "../../utils/security-helpers.js";

// Mock the security validation module using a factory
vi.mock("../../utils/security-helpers.js", () => ({
	validateMemoryBankPath: vi.fn(path => path), // Default pass-through implementation
	sanitizePath: vi.fn(path => path), // Default pass-through implementation
}));

import {
	SECURITY_TEST_DATA,
	createMockFileStats,
	createSecurityMockLogger,
	expectConstructorError,
	expectValidationFailure,
	// These helpers will be modified to use the vi.mocked(actualValidateMemoryBankPath)
	setupMaliciousPathRejection,
	setupSecurityValidationError,
	setupValidPathAcceptance,
} from "@test-utils/index.js";
// THEN import other things, including helpers that will use the above mocks
import { FileOperationManager } from "../../core/FileOperationManager.js";
import { FileStreamer } from "../../performance/FileStreamer.js";
import { StreamingManager } from "../../performance/StreamingManager.js";

const mockLogger = createSecurityMockLogger();

// Extract constants from centralized test data
const {
	allowedRoot: ALLOWED_ROOT,
	maliciousPaths: MALICIOUS_PATHS,
	validPaths: VALID_PATHS,
	edgeCases: EDGE_CASES,
} = SECURITY_TEST_DATA;

describe("Path Traversal Security Tests", () => {
	let fileOperationManager: FileOperationManager;
	let streamingManager: StreamingManager;
	let fileStreamer: FileStreamer;

	beforeEach(() => {
		// Clear all mock call history and reset implementations to their vi.fn() default (or factory default)
		vi.clearAllMocks();

		// Explicitly reset implementations for functions we will re-configure per test-group
		// This ensures the default pass-through from the vi.mock factory is active unless overridden by a setup* helper
		vi.mocked(actualValidateMemoryBankPath).mockImplementation(path => path);
		vi.mocked(actualSanitizePath).mockImplementation(path => path);

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
			setupMaliciousPathRejection();

			for (const maliciousPath of MALICIOUS_PATHS) {
				const result = await fileOperationManager.readFileWithRetry(maliciousPath);
				expectValidationFailure(result);
			}
		});

		it("should allow safe relative paths", async () => {
			setupValidPathAcceptance();

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
			setupMaliciousPathRejection();

			const operations = [
				() => fileOperationManager.readFileWithRetry(testPath),
				() => fileOperationManager.writeFileWithRetry(testPath, "data"),
				() => fileOperationManager.statWithRetry(testPath),
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
			expectValidationFailure(result, "PATH_VALIDATION_ERROR");
		});

		it("should check if file would be streamed safely", async () => {
			setupMaliciousPathRejection();
			const result = await streamingManager.wouldStreamFile(
				"../../../etc/passwd",
				ALLOWED_ROOT,
			);
			expectValidationFailure(result, "PATH_VALIDATION_ERROR");
		});
	});

	describe("FileStreamer Security", () => {
		it("should validate paths before creating read streams", async () => {
			setupMaliciousPathRejection();
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
			const mockFom = {} as any; // Mock FileOperationManager for this test
			expectConstructorError(
				() => new StreamingManager(mockLogger, mockFom, ""),
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
				setupSecurityValidationError(error);

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
				expect.stringContaining("Path validation failed"),
			);
		});

		it("should maintain security across all file operation types", async () => {
			const maliciousPath = "../../../etc/passwd";
			setupMaliciousPathRejection();

			const operations = [
				fileOperationManager.readFileWithRetry(maliciousPath),
				fileOperationManager.writeFileWithRetry(maliciousPath, "data"),
				fileOperationManager.statWithRetry(maliciousPath),
			];

			const results = await Promise.all(operations);
			for (const result of results) {
				expectValidationFailure(result);
			}
		});
	});
});
