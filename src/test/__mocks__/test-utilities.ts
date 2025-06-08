import type { Stats } from "node:fs";
import { expect, vi } from "vitest";
import type { ExtensionContext } from "vscode";
import type { FileOperationManager } from "../../core/FileOperationManager";
import type {
	CursorMCPConfig,
	CursorMCPServerConfig,
	FileError,
	FileMetrics,
	Logger,
	MemoryBankFile,
	MemoryBankFileType,
	Result,
} from "../../types/index";

// =============================================================================
// CORE TEST UTILITIES - Essential functions used across multiple test files
// =============================================================================

/**
 * Standard beforeEach setup for all tests
 */
export function standardBeforeEach(): void {
	vi.clearAllMocks();
}

/**
 * Standard afterEach cleanup for all tests
 */
export function standardAfterEach(): void {
	vi.resetAllMocks();
}

// =============================================================================
// MOCK FACTORIES - Centralized mock creation functions
// =============================================================================

/**
 * Create a mock logger with all required methods
 */
export function createMockLogger(): Logger {
	return {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
		trace: vi.fn(),
		setLevel: vi.fn(),
	};
}

/**
 * Create a mock security-focused logger for security tests
 */
export function createSecurityMockLogger(): Logger {
	return createMockLogger();
}

/**
 * Create a mock FileOperationManager
 */
export function createMockFileOperationManager(): Partial<FileOperationManager> {
	return {
		readFileWithRetry: vi.fn().mockResolvedValue({ success: true, data: "mock content" }),
		writeFileWithRetry: vi.fn().mockResolvedValue({ success: true, data: undefined }),
		statWithRetry: vi.fn().mockResolvedValue({ success: true, data: {} as Stats }),
		mkdirWithRetry: vi.fn().mockResolvedValue({ success: true, data: undefined }),
		accessWithRetry: vi.fn().mockResolvedValue({ success: true, data: undefined }),
	};
}

/**
 * Create a mock cache manager
 */
export function createMockCacheManager(): any {
	return {
		get: vi.fn(),
		set: vi.fn(),
		delete: vi.fn(),
		clear: vi.fn(),
		has: vi.fn(),
		invalidateCache: vi.fn(),
		getStats: vi.fn().mockReturnValue({
			hits: 0,
			misses: 0,
			totalFiles: 0,
			hitRate: 0,
			lastReset: new Date(),
			reloads: 0,
		}),
		resetStats: vi.fn(),
	};
}

/**
 * Create a mock VS Code extension context
 */
export function createMockExtensionContext(): Partial<ExtensionContext> {
	return {
		subscriptions: [],
		extensionPath: "/mock/extension/path",
		globalState: {
			get: vi.fn(),
			update: vi.fn(),
			setKeysForSync: vi.fn(),
		} as any,
		workspaceState: {
			get: vi.fn(),
			update: vi.fn(),
		} as any,
		asAbsolutePath: vi.fn((relativePath: string) => `/mock/extension/path/${relativePath}`),
		storageUri: undefined,
		globalStorageUri: { fsPath: "/mock/global/storage" } as any,
		logUri: { fsPath: "/mock/logs" } as any,
		extensionUri: { fsPath: "/mock/extension/path" } as any,
		environmentVariableCollection: {} as any,
		extensionMode: 3, // Test mode
		secrets: {} as any,
		extension: {} as any,
		languageModelAccessInformation: {} as any,
	};
}

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

/**
 * Create a mock MemoryBankFile for testing
 */
export function createMockMemoryBankFile(
	filePath: string,
	content = "Test content",
	metadata: Partial<MemoryBankFile["metadata"]> = {},
): MemoryBankFile {
	return {
		type: "core/projectBrief.md" as MemoryBankFileType,
		content,
		lastUpdated: new Date(),
		filePath,
		relativePath: filePath.replace("/test/memory-bank/", ""),
		metadata: {
			title: "Test File",
			description: "A test file",
			...metadata,
		},
		created: new Date(),
	};
}

/**
 * Create test file metrics
 */
export function createFileMetrics(sizeBytes: number, lineCount: number): FileMetrics {
	return {
		sizeBytes,
		sizeFormatted: `${(sizeBytes / 1024).toFixed(1)} KB`,
		lineCount,
		contentLineCount: Math.max(0, lineCount - 5), // Assume 5 lines of frontmatter
		wordCount: Math.floor(sizeBytes / 5), // Rough estimate
		characterCount: sizeBytes,
	};
}

/**
 * Create mock file stats for Node.js fs operations
 */
export function createMockFileStats(): Stats {
	return {
		isFile: vi.fn().mockReturnValue(true),
		isDirectory: vi.fn().mockReturnValue(false),
		isBlockDevice: vi.fn().mockReturnValue(false),
		isCharacterDevice: vi.fn().mockReturnValue(false),
		isSymbolicLink: vi.fn().mockReturnValue(false),
		isFIFO: vi.fn().mockReturnValue(false),
		isSocket: vi.fn().mockReturnValue(false),
		dev: 1,
		ino: 1,
		mode: 33188,
		nlink: 1,
		uid: 1000,
		gid: 1000,
		rdev: 0,
		size: 1024,
		blksize: 4096,
		blocks: 8,
		atimeMs: Date.now(),
		mtimeMs: Date.now(),
		ctimeMs: Date.now(),
		birthtimeMs: Date.now(),
		atime: new Date(),
		mtime: new Date(),
		ctime: new Date(),
		birthtime: new Date(),
	} as Stats;
}

// =============================================================================
// ASSERTION HELPERS
// =============================================================================

/**
 * Assert that a Result is successful with expected data
 */
export function expectAsyncSuccess<T>(result: Result<T, unknown>, expectedData?: T): void {
	if (!result.success) {
		throw new Error(`Expected success but got error: ${result.error}`);
	}
	if (expectedData !== undefined) {
		expect(result.data).toEqual(expectedData as any);
	}
}

/**
 * Assert that a Result is an error with expected message
 */
export function expectAsyncFailure<T>(result: Result<T, unknown>, errorMessage?: string): void {
	if (result.success) {
		throw new Error(`Expected error but got success: ${result.data}`);
	}
	if (errorMessage) {
		expect(String(result.error)).toContain(errorMessage);
	}
}

/**
 * Assert security validation failure with specific error code
 */
export function expectSecurityValidationFailure(
	result: Result<unknown, FileError>,
	expectedCode = "PATH_VALIDATION_ERROR",
): void {
	if (result.success) {
		throw new Error("Expected validation failure but operation succeeded");
	}
	expect(result.error.code).toBe(expectedCode);
}

// =============================================================================
// PATH AND CONFIGURATION HELPERS
// =============================================================================

/**
 * Get a test workspace path
 */
export async function getPath(subPath = ""): Promise<string> {
	return `/mock/workspace/${subPath}`.replace(/\/+/g, "/");
}

/**
 * Create test file path within memory bank
 */
export function createTestFilePath(subPath = "", basePath = "/test/memory-bank"): string {
	return `${basePath}/${subPath}`.replace(/\/+/g, "/");
}

/**
 * Create test rules file path
 */
export function createTestRulesFilePath(filename: string, workspace = "/mock/workspace"): string {
	return `${workspace}/.cursor/rules/${filename}`;
}

/**
 * Create AI Memory server config for testing
 */
export function createAIMemoryServerConfig(workspacePath: string): CursorMCPServerConfig {
	return {
		name: "AI Memory",
		command: "node",
		args: [`${workspacePath}/dist/mcp-server.js`, "--workspace", workspacePath],
		cwd: workspacePath,
	};
}

/**
 * Create test Cursor MCP config
 */
export function createTestCursorMCPConfig(workspacePath: string): CursorMCPConfig {
	return {
		mcpServers: {
			"AI Memory": createAIMemoryServerConfig(workspacePath),
		},
	};
}

// =============================================================================
// TEST ENVIRONMENT HELPERS
// =============================================================================

/**
 * Create mock directory listing for VS Code workspace
 */
export function createMockDirectoryListing(): [string, number][] {
	return [
		["rule1.mdc", 1], // File
		["rule2.mdc", 1], // File
		["folder1", 2], // Directory
		["other.txt", 1], // File (non-.mdc)
	];
}

/**
 * Create standard Node.js errno exceptions for testing
 */
export function createEnoentError(message = "ENOENT: no such file or directory"): NodeJS.ErrnoException {
	const error = new Error(message) as NodeJS.ErrnoException;
	error.code = "ENOENT";
	error.errno = -2;
	error.syscall = "open";
	return error;
}

export function createEaccesError(message = "EACCES: permission denied"): NodeJS.ErrnoException {
	const error = new Error(message) as NodeJS.ErrnoException;
	error.code = "EACCES";
	error.errno = -13;
	error.syscall = "open";
	return error;
}
