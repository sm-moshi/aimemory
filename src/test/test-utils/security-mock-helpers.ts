import type { Stats } from "node:fs";
import { expect, vi } from "vitest";
import type { FileError, MemoryBankLogger, Result } from "../../types/index.js";

/**
 * Standard mock logger instance for security tests
 */
export const createSecurityMockLogger = (): MemoryBankLogger => ({
	info: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
	debug: vi.fn(),
	trace: vi.fn(),
});

/**
 * Test data constants for security tests
 */
export const SECURITY_TEST_DATA = {
	ALLOWED_ROOT: "/safe/memory-bank",
	MALICIOUS_PATHS: [
		"../../../etc/passwd",
		"..\\..\\..\\windows\\system32\\config\\sam",
		"file\0injection.txt",
		"/absolute/path/outside",
		"../outside.txt",
		"..\\outside.txt",
		"./../../etc/passwd",
		"memory-bank/../../../etc/passwd",
	],
	VALID_PATHS: [
		"core/projectBrief.md",
		"progress/current.md",
		"safe-file.txt",
		"systemPatterns/architecture.md",
	],
	EDGE_CASES: [
		{ path: "file\0injection.txt", error: "Null byte detected" },
		{ path: "..%2F..%2F..%2Fetc%2Fpasswd", error: "Encoded path traversal detected" },
		{ path: "a".repeat(10000), error: "Path too long" },
	],
} as const;

/**
 * Security validation expectation helpers
 */
export const expectValidationFailure = (result: Result<unknown, FileError>): void => {
	expect(result.success).toBe(false);
	if (!result.success) {
		expect(result.error.code).toBe("PATH_VALIDATION_ERROR");
	}
};

export const expectConstructorError = (
	constructorFn: () => void,
	expectedMessage: string,
): void => {
	expect(constructorFn).toThrow(expectedMessage);
};

/**
 * Security validation mock setup helpers
 */
export const setupMaliciousPathRejection = async (): Promise<void> => {
	const securityModule = await import("../../services/validation/security.js");
	vi.mocked(securityModule.validateMemoryBankPath).mockImplementation(() => {
		throw new Error("Path validation failed: Path traversal detected");
	});
};

export const setupValidPathAcceptance = async (): Promise<void> => {
	const securityModule = await import("../../services/validation/security.js");
	vi.mocked(securityModule.validateMemoryBankPath).mockImplementation((path: string) => {
		return `/safe/memory-bank/${path}`;
	});
};

/**
 * Creates a security validation mock with custom error
 */
export const setupSecurityValidationError = async (errorMessage: string): Promise<void> => {
	const securityModule = await import("../../services/validation/security.js");
	vi.mocked(securityModule.validateMemoryBankPath).mockImplementation(() => {
		throw new Error(`Path validation failed: ${errorMessage}`);
	});
};

/**
 * Default mock file stats for security tests
 */
export const createMockFileStats = (): Stats =>
	({
		size: 1000,
		mtime: new Date(),
		isFile: () => true,
		isDirectory: () => false,
		isBlockDevice: () => false,
		isCharacterDevice: () => false,
		isSymbolicLink: () => false,
		isFIFO: () => false,
		isSocket: () => false,
	}) as Stats;
