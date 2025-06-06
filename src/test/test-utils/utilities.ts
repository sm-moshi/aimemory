import * as path from "node:path";
import { expect, vi } from "vitest";
import type {
	Extension,
	ExtensionContext,
	ExtensionMode,
	GlobalEnvironmentVariableCollection,
	LanguageModelAccessInformation,
	Memento,
	SecretStorage,
	Uri,
} from "vscode";
import type { CacheManager } from "../../core/CacheManager.js";
import type { FileOperationManager } from "../../core/FileOperationManager.js";
import type { CursorMCPConfig, MCPServerConfig } from "../../types/config.js";
import type { Result } from "../../types/errorHandling.js";
import { isSuccess } from "../../types/errorHandling.js";
import {
	type FileError,
	type FileMetrics,
	type MemoryBankFile,
	MemoryBankFileType,
	type MemoryBankLogger,
} from "../../types/index.js";

// =============================================================================
// GENERAL TEST UTILITIES
// =============================================================================

// Moved getPath to be accessible by multiple test files
export const getPath = async (subPath = "") => {
	return path.posix.join("/mock/workspace", ".aimemory", "memory-bank", subPath);
};

// =============================================================================
// ASSERTION HELPERS (Consolidated from deleted assertions.ts)
// =============================================================================

export function expectSuccess(result: Result<unknown, unknown>, expectedData?: unknown): void {
	expect(isSuccess(result)).toBe(true);
	if (expectedData !== undefined && isSuccess(result)) {
		expect(result.data).toEqual(expectedData);
	}
}

export function expectFailure(result: Result<unknown, unknown>, errorMessage?: string): void {
	expect(isSuccess(result)).toBe(false);
	if (errorMessage && !isSuccess(result)) {
		const error = result.error as { message?: string };
		expect(error.message).toContain(errorMessage);
	}
}

export function expectBuildResult(
	result: { filesProcessed: number; filesIndexed: number; filesErrored: number },
	expected: { processed: number; indexed: number; errored: number },
): void {
	expect(result.filesProcessed).toBe(expected.processed);
	expect(result.filesIndexed).toBe(expected.indexed);
	expect(result.filesErrored).toBe(expected.errored);
}

export function expectConstructorError(constructorFn: () => void, expectedMessage: string): void {
	expect(constructorFn).toThrow(expectedMessage);
}

export function expectValidationSuccess(result: { success: boolean; error?: unknown }): void {
	expect(result.success).toBe(true);
	expect(result.error).toBeUndefined();
}

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

// Legacy aliases
export { expectSuccess as expectAsyncSuccess };
export { expectFailure as expectAsyncFailure };

// =============================================================================
// MOCK FACTORIES (Consolidated from deleted factories.ts)
// =============================================================================

export function createMockLogger(): MemoryBankLogger {
	return {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
		trace: vi.fn(),
	};
}

/**
 * Creates a mock logger specifically for security tests
 * (Currently an alias for createMockLogger but can be specialized later)
 */
export function createSecurityMockLogger(): MemoryBankLogger {
	return createMockLogger();
}

export function createMockFileOperationManager(): Partial<FileOperationManager> {
	return {
		readFileWithRetry: vi.fn().mockResolvedValue({
			success: true,
			data: "mock file content",
		}),
		writeFileWithRetry: vi.fn().mockResolvedValue({ success: true, data: undefined }),
		mkdirWithRetry: vi.fn().mockResolvedValue({ success: true, data: undefined }),
		statWithRetry: vi.fn().mockResolvedValue({
			success: true,
			data: {
				isFile: () => true,
				isDirectory: () => false,
				size: 100,
				mtime: new Date(),
				ctime: new Date(),
			},
		}),
		accessWithRetry: vi.fn().mockResolvedValue({ success: true, data: undefined }),
	};
}

export function createMockCacheManager(): Partial<CacheManager> {
	return {
		getCachedContent: vi.fn(),
		updateCache: vi.fn(),
		invalidateCache: vi.fn(),
		getStats: vi.fn().mockReturnValue({
			hits: 0,
			misses: 0,
			evictions: 0,
			totalFiles: 0,
			hitRate: 0,
			lastReset: new Date(),
			reloads: 0,
			maxSize: 0,
			currentSize: 0,
		}),
		resetStats: vi.fn(),
		cleanupExpiredEntries: vi.fn().mockReturnValue(0),
		getCacheUsage: vi.fn().mockReturnValue({
			size: 0,
			maxSize: 100,
			utilizationPercent: 0,
			memoryEstimate: "0 Bytes",
		}),
	};
}

/**
 * Sets up common mock implementations for FileOperationManager
 * that are used across multiple test files
 */
export function setupCommonFileOperationMocks(mockFom: Partial<FileOperationManager>): void {
	const mockFomTyped = mockFom as Record<string, ReturnType<typeof vi.fn>>;

	// Ensure all required methods exist and have default implementations
	if (mockFomTyped.readFileWithRetry) {
		mockFomTyped.readFileWithRetry.mockResolvedValue({
			success: true,
			data: "mock file content",
		});
	}

	if (mockFomTyped.writeFileWithRetry) {
		mockFomTyped.writeFileWithRetry.mockResolvedValue({
			success: true,
			data: undefined,
		});
	}

	if (mockFomTyped.mkdirWithRetry) {
		mockFomTyped.mkdirWithRetry.mockResolvedValue({
			success: true,
			data: undefined,
		});
	}

	if (mockFomTyped.statWithRetry) {
		mockFomTyped.statWithRetry.mockResolvedValue({
			success: true,
			data: {
				isFile: () => true,
				isDirectory: () => false,
				size: 100,
				mtime: new Date(),
				ctime: new Date(),
			},
		});
	}

	if (mockFomTyped.accessWithRetry) {
		mockFomTyped.accessWithRetry.mockResolvedValue({
			success: true,
			data: undefined,
		});
	}
}

export function createMockExtensionContext(): ExtensionContext {
	const mockMemento = {
		get: vi.fn(),
		update: vi.fn(),
		keys: vi.fn().mockReturnValue([]),
		setKeysForSync: vi.fn(),
	} as Memento & { setKeysForSync: (keys: readonly string[]) => void };

	const mockSecrets: SecretStorage = {
		get: vi.fn(),
		store: vi.fn(),
		delete: vi.fn(),
		onDidChange: vi.fn(),
	};

	const mockEnvironmentVariableCollection = {
		getScoped: vi.fn(),
	} as unknown as GlobalEnvironmentVariableCollection;

	const mockLanguageModelAccessInformation = {} as LanguageModelAccessInformation;

	return {
		subscriptions: [],
		workspaceState: mockMemento,
		globalState: mockMemento,
		secrets: mockSecrets,
		extensionUri: { fsPath: "/mock/extension" } as Uri,
		extensionPath: "/mock/extension",
		environmentVariableCollection: mockEnvironmentVariableCollection,
		storageUri: { fsPath: "/mock/storage" } as Uri,
		storagePath: "/mock/storage",
		globalStorageUri: { fsPath: "/mock/globalStorage" } as Uri,
		globalStoragePath: "/mock/globalStorage",
		logUri: { fsPath: "/mock/log" } as Uri,
		logPath: "/mock/log",
		asAbsolutePath: (relativePath: string) => `/mock/extension/${relativePath}`,
		extensionMode: {} as ExtensionMode,
		extension: {} as Extension<unknown>,
		languageModelAccessInformation: mockLanguageModelAccessInformation,
	} as ExtensionContext;
}

export function createMockMemoryBankServiceCore(): Record<string, unknown> {
	const mockFom = createMockFileOperationManager();
	return {
		loadFiles: vi.fn().mockResolvedValue({ success: true, data: [] }),
		getFile: vi.fn().mockReturnValue(undefined),
		getAllFiles: vi.fn().mockReturnValue([]),
		getFilesWithFilenames: vi.fn().mockReturnValue(""),
		checkHealth: vi.fn().mockResolvedValue({ success: true, data: "Healthy" }),
		getIsMemoryBankInitialized: vi.fn().mockResolvedValue({ success: true, data: true }),
		initializeFolders: vi.fn().mockResolvedValue({ success: true }),
		isReady: vi.fn().mockReturnValue(true),
		updateFile: vi.fn().mockResolvedValue({ success: true }),
		invalidateCache: vi.fn(),
		getCacheStats: vi.fn().mockReturnValue({}),
		resetCacheStats: vi.fn(),
		writeFileByPath: vi.fn().mockResolvedValue({ success: true }),
		getFileOperationManager: vi.fn().mockReturnValue(mockFom),
	};
}

export function createMockConsole(): Console {
	return {
		assert: vi.fn(),
		clear: vi.fn(),
		count: vi.fn(),
		countReset: vi.fn(),
		debug: vi.fn(),
		dir: vi.fn(),
		dirxml: vi.fn(),
		error: vi.fn(),
		group: vi.fn(),
		groupCollapsed: vi.fn(),
		groupEnd: vi.fn(),
		info: vi.fn(),
		log: vi.fn(),
		table: vi.fn(),
		time: vi.fn(),
		timeEnd: vi.fn(),
		timeLog: vi.fn(),
		trace: vi.fn(),
		warn: vi.fn(),
		profile: vi.fn(),
		profileEnd: vi.fn(),
		timeStamp: vi.fn(),
		Console: {} as Console["Console"],
	};
}

export function createMockCursorRulesService(): Record<string, unknown> {
	return {
		createRulesFile: vi.fn().mockResolvedValue(undefined),
		readRulesFile: vi.fn().mockResolvedValue({
			success: true,
			data: "mock rules content",
		}),
		deleteRulesFile: vi.fn().mockResolvedValue(undefined),
		listAllRulesFilesInfo: vi.fn().mockResolvedValue([]),
	};
}

export function setupMockCoreServiceDefaults(mockCoreService: Record<string, unknown>): void {
	const service = mockCoreService as Record<string, ReturnType<typeof vi.fn>>;
	service.loadFiles.mockResolvedValue({ success: true, data: [] });
	service.getFile.mockReturnValue(undefined);
	service.getAllFiles.mockReturnValue([]);
	service.getFilesWithFilenames.mockReturnValue("");
	service.checkHealth.mockResolvedValue({ success: true, data: "Healthy" });
	service.getIsMemoryBankInitialized.mockResolvedValue({ success: true, data: false });
	service.initializeFolders.mockResolvedValue({ success: true });
	service.isReady.mockReturnValue(false);
	service.updateFile.mockResolvedValue({ success: true });
	service.getCacheStats.mockReturnValue({});
	service.writeFileByPath.mockResolvedValue({ success: true });
}

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

export function createTestFilePath(subPath = "", basePath = "/test/memory-bank"): string {
	return `${basePath}/${subPath}`;
}

export function createTestRulesFilePath(filename: string, workspace = "/mock/workspace"): string {
	return path.join(workspace, ".cursor/rules", filename);
}

export function createAIMemoryServerConfig(workspacePath: string): MCPServerConfig {
	return {
		name: "AI Memory",
		command: "node",
		args: [`${workspacePath}/dist/mcp-server.js`, "--workspace", workspacePath],
		cwd: workspacePath,
	};
}

export function createTestCursorMCPConfig(workspacePath: string): CursorMCPConfig {
	return {
		mcpServers: {
			"AI Memory": createAIMemoryServerConfig(workspacePath),
		},
	};
}

export function createMockDirectoryListing(): [string, number][] {
	return [
		["rule1.mdc", 1], // FileType.File
		["rule2.mdc", 1],
		["other.txt", 1],
		["subdir", 2], // FileType.Directory
	];
}

export function createEnoentError(
	message = "ENOENT: no such file or directory",
): NodeJS.ErrnoException {
	const error = new Error(message) as NodeJS.ErrnoException;
	error.code = "ENOENT";
	return error;
}

export function createEaccesError(message = "EACCES: permission denied"): NodeJS.ErrnoException {
	const error = new Error(message) as NodeJS.ErrnoException;
	error.code = "EACCES";
	return error;
}

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

// =============================================================================
// SECURITY TESTING HELPERS (Consolidated from security-mock-helpers.ts)
// =============================================================================

import type { Stats } from "node:fs";
import { validateMemoryBankPath as actualValidateMemoryBankPath } from "@utils/security-helpers.js";

/**
 * Test data constants for security tests
 */
export const SECURITY_TEST_DATA = {
	allowedRoot: "/safe/memory-bank",
	maliciousPaths: [
		"../../../etc/passwd",
		"..\\..\\..\\windows\\system32\\config\\sam",
		"file\0injection.txt",
		"/absolute/path/outside",
		"../outside.txt",
		"..\\outside.txt",
		"./../../etc/passwd",
		"memory-bank/../../../etc/passwd",
	],
	validPaths: [
		"core/projectBrief.md",
		"progress/current.md",
		"safe-file.txt",
		"systemPatterns/architecture.md",
	],
	edgeCases: [
		{ path: "file\0injection.txt", error: "Null byte detected" },
		{ path: "..%2F..%2F..%2Fetc%2Fpasswd", error: "Encoded path traversal detected" },
		{ path: "a".repeat(10000), error: "Path too long" },
	],
} as const;

/**
 * Helper to assert that a result is a validation failure for security tests
 */
export function expectSecurityValidationFailure(
	result: Result<unknown, FileError>,
	expectedCode = "PATH_VALIDATION_ERROR",
): void {
	expect(result.success).toBe(false);
	if (!result.success) {
		expect(result.error.code).toBe(expectedCode);
	}
}

/**
 * Security validation mock setup helpers
 */
export function setupMaliciousPathRejection(): void {
	vi.mocked(actualValidateMemoryBankPath).mockImplementation(() => {
		throw new Error("Path validation failed: Path traversal detected");
	});
}

export function setupValidPathAcceptance(): void {
	vi.mocked(actualValidateMemoryBankPath).mockImplementation(path => path);
}

export function setupSecurityValidationError(errorMessage: string): void {
	vi.mocked(actualValidateMemoryBankPath).mockImplementation(() => {
		throw new Error(`Path validation failed: ${errorMessage}`);
	});
}

/**
 * Default mock file stats for security tests
 */
export function createMockFileStats(): Stats {
	return {
		dev: 0,
		ino: 0,
		mode: 0,
		nlink: 0,
		uid: 0,
		gid: 0,
		rdev: 0,
		size: 1000,
		blksize: 0,
		blocks: 0,
		atimeMs: Date.now(),
		mtimeMs: Date.now(),
		ctimeMs: Date.now(),
		birthtimeMs: Date.now(),
		atime: new Date(),
		mtime: new Date(),
		ctime: new Date(),
		birthtime: new Date(),
		isFile: () => true,
		isDirectory: () => false,
		isBlockDevice: () => false,
		isCharacterDevice: () => false,
		isSymbolicLink: () => false,
		isFIFO: () => false,
		isSocket: () => false,
	} as Stats;
}

export async function getOriginalValidateMemoryBankPath() {
	const securityModule = await import("@utils/security-helpers.js");
	return securityModule.validateMemoryBankPath;
}

export async function getOriginalSanitizePath() {
	const securityModule = await import("@utils/security-helpers.js");
	return securityModule.sanitizePath;
}

export async function getOriginalValidateCommand() {
	const securityModule = await import("@utils/security-helpers.js");
	return securityModule.validateCommand;
}

// =============================================================================
// CURSOR-SPECIFIC TESTING HELPERS (Simplified - OS mocking handled by __mocks__)
// =============================================================================

/**
 * Creates standardised cursor directory paths for testing
 */
export function createMockCursorConfigPaths(homeDir = "/mock/home") {
	return {
		homeDir,
		cursorDir: `${homeDir}/.cursor`,
		configPath: `${homeDir}/.cursor/mcp.json`,
		rulesDir: `${homeDir}/.cursor/rules`,
	};
}

// =============================================================================
// STANDARD TEST LIFECYCLE HELPERS
// =============================================================================

/**
 * Standard setup to run before each test
 * Clears all mocks and resets state
 */
export function standardBeforeEach(): void {
	vi.clearAllMocks();
	vi.resetAllMocks();
}

/**
 * Standard cleanup to run after each test
 * Restores all mocks and cleans up
 */
export function standardAfterEach(): void {
	vi.restoreAllMocks();
}

// Note: Node.js modules (fs, path, os) and vscode are globally mocked via __mocks__ directory
// Tests should use the global mocks directly or import specific mock utilities when needed

// =============================================================================
// VS CODE MOCKS
// =============================================================================

/**
 * Creates mock VS Code API objects for testing
 */
export function getVSCodeMock() {
	return {
		Uri: {
			file: (path: string) => ({ fsPath: path, path, scheme: "file" }),
			parse: (uri: string) => ({ fsPath: uri, path: uri, scheme: "file" }),
		},
		FileType: {
			File: 1,
			Directory: 2,
			SymbolicLink: 64,
		},
		workspace: {
			fs: {
				readFile: vi.fn(),
				writeFile: vi.fn(),
				delete: vi.fn(),
				stat: vi.fn(),
				readDirectory: vi.fn(),
				createDirectory: vi.fn(),
			},
		},
		window: {
			showInformationMessage: vi.fn(),
			showWarningMessage: vi.fn(),
			showErrorMessage: vi.fn(),
		},
	};
}

// Note: mockVscodeWorkspaceFs and mockVscodeWindow are re-exported from __mocks__/vscode.js above

/**
 * Sets up VS Code environment mocks
 */
export function setupVSCodeMock(): void {
	// Mock the vscode module globally for tests
	vi.mock("vscode", () => getVSCodeMock());
}
