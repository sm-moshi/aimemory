import * as path from "node:path";
import { expect } from "vitest";
import type { CursorMCPConfig, MCPServerConfig } from "../../types/config.js";
import { MemoryBankFileType } from "../../types/core.js";
import type { FileMetrics, MemoryBankFile } from "../../types/core.js";
import type { Result } from "../../types/errorHandling.js";
import { isSuccess } from "../../types/errorHandling.js";

// =============================================================================
// GENERAL TEST UTILITIES
// =============================================================================

// Moved getPath to be accessible by multiple test files
export const getPath = async (subPath = "") => {
	return path.posix.join("/mock/workspace", ".aimemory", "memory-bank", subPath);
};

// =============================================================================
// ASSERTION HELPERS
// =============================================================================

/**
 * Asserts that a Result is successful and optionally checks the data
 */
export function expectSuccess(result: Result<unknown, unknown>, expectedData?: unknown): void {
	expect(isSuccess(result)).toBe(true);
	if (expectedData !== undefined && isSuccess(result)) {
		expect(result.data).toEqual(expectedData);
	}
}

/**
 * Asserts that a Result is a failure and optionally checks the error message
 */
export function expectFailure(result: Result<unknown, unknown>, errorMessage?: string): void {
	expect(isSuccess(result)).toBe(false);
	if (errorMessage && !isSuccess(result)) {
		const error = result.error as { message?: string };
		expect(error.message).toContain(errorMessage);
	}
}

/**
 * Asserts that a build result has expected counts
 */
export function expectBuildResult(
	result: { filesProcessed: number; filesIndexed: number; filesErrored: number },
	expected: { processed: number; indexed: number; errored: number },
): void {
	expect(result.filesProcessed).toBe(expected.processed);
	expect(result.filesIndexed).toBe(expected.indexed);
	expect(result.filesErrored).toBe(expected.errored);
}

/**
 * Asserts that a constructor throws with expected message
 */
export function expectConstructorError(constructorFn: () => void, expectedMessage: string): void {
	expect(constructorFn).toThrow(expectedMessage);
}

/**
 * Asserts that a validation result is successful
 */
export function expectValidationSuccess(result: { success: boolean; error?: unknown }): void {
	expect(result.success).toBe(true);
	expect(result.error).toBeUndefined();
}

/**
 * Asserts that a validation result is a failure
 */
export function expectValidationFailure(
	result: { success: boolean; error?: { code?: string } },
	errorCode?: string,
): void {
	expect(result.success).toBe(false);
	expect(result.error).toBeDefined();
	if (errorCode && result.error) {
		expect(result.error.code).toBe(errorCode);
	}
}

// Legacy aliases for backward compatibility
export { expectSuccess as expectAsyncSuccess };
export { expectFailure as expectAsyncFailure };

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

/**
 * Creates a standard MemoryBankFile for testing
 */
export function createMockMemoryBankFile(
	filePath: string,
	content = "Test content",
	metadata: Partial<MemoryBankFile["metadata"]> = {},
): MemoryBankFile {
	const now = new Date();
	const relativePath = path.basename(filePath);

	return {
		filePath,
		relativePath,
		type: MemoryBankFileType.ActiveContext,
		content,
		metadata: {
			title: `Title for ${relativePath}`,
			type: "documentation",
			created: now.toISOString(),
			updated: now.toISOString(),
			tags: ["test"],
			...metadata,
		},
		lastUpdated: now,
		created: now,
		validationStatus: "valid",
		actualSchemaUsed: "default",
	};
}

/**
 * Creates a test file path with proper structure
 */
export function createTestFilePath(subPath = "", basePath = "/test/memory-bank"): string {
	return `${basePath}/${subPath}`;
}

/**
 * Creates a test rules file path
 */
export function createTestRulesFilePath(filename: string, workspace = "/mock/workspace"): string {
	return path.join(workspace, ".cursor/rules", filename);
}

/**
 * Creates an AI Memory server config for testing
 */
export function createAIMemoryServerConfig(workspacePath: string): MCPServerConfig {
	return {
		name: "AI Memory",
		command: "node",
		args: [`${workspacePath}/dist/mcp-server.js`, "--workspace", workspacePath],
		cwd: workspacePath,
	};
}

/**
 * Creates a test Cursor MCP config
 */
export function createTestCursorMCPConfig(workspacePath: string): CursorMCPConfig {
	return {
		mcpServers: {
			"AI Memory": createAIMemoryServerConfig(workspacePath),
		},
	};
}

/**
 * Creates a mock directory listing for filesystem tests
 */
export function createMockDirectoryListing(): Array<[string, number]> {
	return [
		["rule1.mdc", 1], // FileType.File
		["rule2.mdc", 1],
		["other.txt", 1],
		["subdir", 2], // FileType.Directory
	];
}

/**
 * Creates an ENOENT error for testing
 */
export function createEnoentError(
	message = "ENOENT: no such file or directory",
): NodeJS.ErrnoException {
	const error = new Error(message) as NodeJS.ErrnoException;
	error.code = "ENOENT";
	return error;
}

// =============================================================================
// METADATA TEST UTILITIES
// =============================================================================

/**
 * Creates a complete FileMetrics object for testing
 * Consolidated from MetadataSearchEngine.test.ts
 */
export function createFileMetrics(sizeBytes: number, lineCount: number): FileMetrics {
	return {
		sizeBytes,
		lineCount,
		sizeFormatted: sizeBytes < 1024 ? `${sizeBytes} B` : `${(sizeBytes / 1024).toFixed(1)} KB`,
		contentLineCount: Math.max(0, lineCount - 5), // Assume 5 lines for frontmatter
		wordCount: Math.floor(sizeBytes / 5), // Rough estimate
		characterCount: sizeBytes,
	};
}

// =============================================================================
// TEMP DIRECTORY MANAGEMENT
// =============================================================================

/**
 * Creates a temporary directory for testing and returns cleanup function
 * Consolidated pattern from MetadataIndexManager.test.ts and StreamingManager.test.ts
 */
export async function createTempDirectory(
	prefix = "test-temp-",
	basePath?: string,
): Promise<{ tempDir: string; cleanup: () => Promise<void> }> {
	const fs = await import("node:fs/promises");
	const os = await import("node:os");

	const baseDir = basePath ?? (await import("node:path")).resolve(os.tmpdir());
	const tempDir = await fs.mkdtemp(`${baseDir}/${prefix}`);

	const cleanup = async () => {
		try {
			await fs.rm(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	};

	return { tempDir, cleanup };
}
