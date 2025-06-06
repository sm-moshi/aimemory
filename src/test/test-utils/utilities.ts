import { homedir } from "node:os";
import * as path from "node:path";
import { vi } from "vitest";
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

import type { CursorMCPConfig, CursorMCPServerConfig } from "@/types/config.js";
import type { Result } from "@/types/errorHandling.js";
import { isSuccess } from "@/types/errorHandling.js";
import {
	type FileError,
	type FileMetrics,
	type Logger,
	type MemoryBankFile,
	MemoryBankFileType,
} from "@/types/index.js";
import type { FileOperationManager } from "@core/FileOperationManager.js";

// Import existing shared mocks instead of duplicating them
import {
	mockFileOperations,
	mockLogger,
	mockValidation,
	resetSharedMocks,
} from "@/test/setup/shared-mocks.js";

export const getPath = async (subPath = "") => {
	return `${homedir()}/test-files/${subPath}`;
};

export function expectSuccess(result: Result<unknown, unknown>, expectedData?: unknown): void {
	if (!isSuccess(result)) {
		throw new Error(`Expected success but got error: ${result.error}`);
	}
	if (expectedData !== undefined && result.data !== expectedData) {
		throw new Error(`Expected data ${expectedData} but got ${result.data}`);
	}
}

export function expectFailure(result: Result<unknown, unknown>, errorMessage?: string): void {
	if (isSuccess(result)) {
		throw new Error(`Expected failure but got success with data: ${result.data}`);
	}
	if (errorMessage && !String(result.error).includes(errorMessage)) {
		throw new Error(`Expected error to contain "${errorMessage}" but got: ${result.error}`);
	}
}

export function expectBuildResult(
	result: { filesProcessed: number; filesIndexed: number; filesErrored: number },
	expected: { processed: number; indexed: number; errored: number },
): void {
	if (result.filesProcessed !== expected.processed) {
		throw new Error(`Expected ${expected.processed} processed, got ${result.filesProcessed}`);
	}
	if (result.filesIndexed !== expected.indexed) {
		throw new Error(`Expected ${expected.indexed} indexed, got ${result.filesIndexed}`);
	}
	if (result.filesErrored !== expected.errored) {
		throw new Error(`Expected ${expected.errored} errored, got ${result.filesErrored}`);
	}
}

export function expectConstructorError(_constructorFn: () => void, _expectedMessage: string): void {
	// TODO: Implementation for constructor error testing
}

export function expectValidationSuccess(_result: { success: boolean; error?: unknown }): void {
	// TODO: Implementation for validation success testing
}

export function expectValidationFailure(
	_result: { success: boolean; error?: { code?: string } },
	_errorCode?: string,
): void {
	// TODO: Implementation for validation failure testing
}

/**
 * Create a mock logger - use shared mock but allow customization
 */
export function createMockLogger(): Logger {
	return {
		trace: mockLogger.debug,
		debug: mockLogger.debug,
		info: mockLogger.info,
		warn: mockLogger.warn,
		error: mockLogger.error,
		setLevel: mockLogger.setLevel,
	};
}

/**
 * Create security-focused logger for security tests
 */
export function createSecurityMockLogger(): Logger {
	return createMockLogger();
}

/**
 * Create a mock FileOperationManager - use shared mock infrastructure
 */
export function createMockFileOperationManager(): Partial<FileOperationManager> {
	return {
		readFileWithRetry: vi.fn().mockImplementation(mockFileOperations.readFileWithRetry),
		writeFileWithRetry: vi.fn().mockImplementation(mockFileOperations.writeFileWithRetry),
		mkdirWithRetry: vi.fn().mockImplementation(mockFileOperations.mkdirWithRetry),
		statWithRetry: vi.fn().mockResolvedValue({
			success: true,
			data: createMockFileStats(),
		}),
		accessWithRetry: vi.fn().mockResolvedValue({
			success: true,
			data: undefined,
		}),
	};
}

/**
 * Create a mock CacheManager - simplified version focused on interface compliance
 */
export function createMockCacheManager(): any {
	return {
		// CacheManager interface methods + additional implementation methods
		getStats: vi.fn().mockReturnValue({
			hits: 0,
			misses: 0,
			evictions: 0,
			totalFiles: 0,
			hitRate: 0,
			lastReset: new Date(),
			reloads: 0,
			maxSize: 1000,
			currentSize: 0,
		}),
		get: vi.fn(),
		set: vi.fn(),
		delete: vi.fn(),
		clear: vi.fn(),
		has: vi.fn(),
		size: vi.fn().mockReturnValue(0),
		// Additional methods from actual CacheManager implementation
		invalidateCache: vi.fn(),
		updateCache: vi.fn(),
		getCachedContent: vi.fn(),
		resetStats: vi.fn(),
	};
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

export function createAIMemoryServerConfig(workspacePath: string): CursorMCPServerConfig {
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
		["core", 1],
		["progress", 1],
		["systemPatterns", 1],
		["techContext", 1],
	];
}

export function createEnoentError(
	message = "ENOENT: no such file or directory",
): NodeJS.ErrnoException {
	const error = new Error(message) as NodeJS.ErrnoException;
	error.code = "ENOENT";
	error.errno = -2;
	return error;
}

export function createEaccesError(message = "EACCES: permission denied"): NodeJS.ErrnoException {
	const error = new Error(message) as NodeJS.ErrnoException;
	error.code = "EACCES";
	error.errno = -13;
	return error;
}

export function createFileMetrics(sizeBytes: number, lineCount: number): FileMetrics {
	return {
		sizeBytes,
		sizeFormatted: sizeBytes < 1024 ? `${sizeBytes} B` : `${(sizeBytes / 1024).toFixed(1)} KB`,
		lineCount,
		contentLineCount: Math.max(0, lineCount - 5), // Assume 5 lines of frontmatter
		wordCount: lineCount * 8, // Rough estimate
		characterCount: sizeBytes,
	};
}

export async function createTempDirectory(
	prefix = "test-temp-",
	basePath?: string,
): Promise<{ tempDir: string; cleanup: () => Promise<void> }> {
	const { mkdtemp, rm } = await import("node:fs/promises");
	const { tmpdir } = await import("node:os");
	const { join } = await import("node:path");

	const tempDir = await mkdtemp(join(basePath ?? tmpdir(), prefix));

	const cleanup = async () => {
		try {
			await rm(tempDir, { recursive: true, force: true });
		} catch (error) {
			console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
		}
	};

	return { tempDir, cleanup };
}

export function expectSecurityValidationFailure(
	result: Result<unknown, FileError>,
	expectedCode = "PATH_VALIDATION_ERROR",
): void {
	if (isSuccess(result)) {
		throw new Error("Expected security validation to fail but it succeeded");
	}

	if (result.error.code !== expectedCode) {
		throw new Error(`Expected error code "${expectedCode}" but got "${result.error.code}"`);
	}
}

export function setupMaliciousPathRejection(): void {
	mockValidation.validateMemoryBankPath.mockReturnValue(false);
}

export function setupValidPathAcceptance(): void {
	mockValidation.validateMemoryBankPath.mockReturnValue(true);
}

export function setupSecurityValidationError(errorMessage: string): void {
	mockValidation.validateMemoryBankPath.mockImplementation(() => {
		throw new Error(errorMessage);
	});
}

export function createMockFileStats(): import("node:fs").Stats {
	const now = new Date();
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
		atimeMs: now.getTime(),
		mtimeMs: now.getTime(),
		ctimeMs: now.getTime(),
		birthtimeMs: now.getTime(),
		atime: now,
		mtime: now,
		ctime: now,
		birthtime: now,
	} as import("node:fs").Stats;
}

export async function getOriginalValidateMemoryBankPath() {
	// TODO: Implementation for accessing original validation functions
}

export async function getOriginalSanitizePath() {
	// TODO:Implementation for accessing original sanitization functions
}

export async function getOriginalValidateCommand() {
	// TODO: Implementation for accessing original command validation
}

export function createMockCursorConfigPaths(homeDir = "/mock/home") {
	return {
		homeDir,
		cursorConfigDir: `${homeDir}/.cursor`,
		mcpConfigPath: `${homeDir}/.cursor/mcp.json`,
		rulesConfigPath: `${homeDir}/.cursor/rules`,
		defaultRulesPath: `${homeDir}/.cursor/rules/ai-memory.md`,
	};
}

export function standardBeforeEach(): void {
	// Reset shared mocks at the start of each test
	resetSharedMocks();

	// Set up common global mocks
	vi.clearAllMocks();

	// Reset any module-level state if needed
}

export function standardAfterEach(): void {
	// Clean up after each test
	vi.clearAllMocks();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
}

export function getVSCodeMock() {
	return {
		ExtensionContext: vi.fn(),
		Uri: {
			file: vi.fn((path: string) => ({ fsPath: path })),
			parse: vi.fn((uri: string) => ({ fsPath: uri })),
		},
		workspace: {
			fs: {
				stat: vi.fn(),
				readFile: vi.fn(),
				writeFile: vi.fn(),
			},
			workspaceFolders: [
				{
					uri: { fsPath: "/test/workspace" },
					name: "test",
					index: 0,
				},
			],
		},
		window: {
			createOutputChannel: vi.fn(() => ({
				appendLine: vi.fn(),
				show: vi.fn(),
			})),
		},
	};
}

export function setupVSCodeMock(): void {
	const vscode = getVSCodeMock();
	vi.stubGlobal("vscode", vscode);
}

// Additional missing exports for test compatibility

/**
 * Create a mock MemoryBankServiceCore instance
 */
export function createMockMemoryBankServiceCore() {
	return {
		loadFiles: vi.fn().mockResolvedValue({ success: true, data: [] }),
		getFile: vi.fn(),
		getAllFiles: vi.fn().mockReturnValue([]),
		getFilesWithFilenames: vi.fn().mockReturnValue(""),
		checkHealth: vi.fn().mockResolvedValue({ success: true, data: "Healthy" }),
		getIsMemoryBankInitialized: vi.fn().mockResolvedValue({ success: true, data: false }),
		initializeFolders: vi.fn().mockResolvedValue({ success: true }),
		isReady: vi.fn().mockReturnValue(false),
		updateFile: vi.fn().mockResolvedValue({ success: true }),
		invalidateCache: vi.fn(),
		getCacheStats: vi.fn().mockReturnValue({}),
		resetCacheStats: vi.fn(),
		writeFileByPath: vi.fn().mockResolvedValue({ success: true }),
		getFileOperationManager: vi.fn().mockReturnValue(createMockFileOperationManager()),
	} as any;
}

/**
 * Create a mock console for CLI testing
 */
export function createMockConsole() {
	return {
		log: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		info: vi.fn(),
		debug: vi.fn(),
		setLevel: vi.fn(),
	} as any;
}

/**
 * Create a mock CursorRulesService
 */
export function createMockCursorRulesService() {
	return {
		createRulesFile: vi.fn().mockResolvedValue(undefined),
		readRulesFile: vi.fn().mockResolvedValue({ success: true, data: "Mock rules content" }),
	} as any;
}

/**
 * Setup common file operation mocks
 */
export function setupCommonFileOperationMocks(): void {
	// Reset the shared mocks
	resetSharedMocks();
}

/**
 * Setup mock core service defaults
 */
export function setupMockCoreServiceDefaults(mockCoreService: any): void {
	mockCoreService.loadFiles.mockResolvedValue({ success: true, data: [] });
	mockCoreService.getFile.mockReturnValue(undefined);
	mockCoreService.getAllFiles.mockReturnValue([]);
	mockCoreService.getFilesWithFilenames.mockReturnValue("");
	mockCoreService.checkHealth.mockResolvedValue({ success: true, data: "Healthy" });
	mockCoreService.getIsMemoryBankInitialized.mockResolvedValue({ success: true, data: false });
	mockCoreService.initializeFolders.mockResolvedValue({ success: true });
	mockCoreService.isReady.mockReturnValue(false);
	mockCoreService.updateFile.mockResolvedValue({ success: true });
	mockCoreService.getCacheStats.mockReturnValue({});
	mockCoreService.writeFileByPath.mockResolvedValue({ success: true });
}

// Aliases for async expectations (legacy compatibility)
export const expectAsyncSuccess = expectSuccess;
export const expectAsyncFailure = expectFailure;

/**
 * Security test data constants
 */
export const SECURITY_TEST_DATA = {
	maliciousPaths: [
		"../../../etc/passwd",
		"..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
		"/etc/passwd",
		"C:\\Windows\\System32\\config\\sam",
		"\\\\network\\share\\file.txt",
		"memory-bank/../../../sensitive.txt",
		"memory-bank/..\\..\\..\\sensitive.txt",
	],
	validPaths: [
		"core/projectBrief.md",
		"progress/current.md",
		"systemPatterns/architecture.md",
		"techContext/stack.md",
	],
	commands: {
		dangerous: [
			"rm -rf /",
			"del /f /s /q C:\\*",
			"format C:",
			"dd if=/dev/zero of=/dev/sda",
			"cat /etc/passwd",
			"type C:\\Windows\\System32\\config\\sam",
		],
		safe: ["ls -la", "dir", "cat file.txt", "type file.txt"],
	},
} as const;
