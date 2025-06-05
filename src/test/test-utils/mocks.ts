import { EventEmitter } from "node:events";
import * as path from "node:path";
import { vi } from "vitest";
import type { Mock } from "vitest";
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
import type { FileOperationManager } from "../../core/FileOperationManager.js";
import type { MemoryBankLogger } from "../../types/index.js";

// Helper type for mock file system entries
type MockFsDirent = {
	name: string;
	isFile: () => boolean;
	isDirectory: () => boolean;
	isSymbolicLink: () => boolean;
};

// Define a more realistic mock file system structure
// Paths should be absolute or match what readdir will receive from tests
const MOCK_FILE_SYSTEM: Record<string, MockFsDirent[]> = {
	// Root of the memory bank, matches MEMORY_BANK_ROOT_PATH_ABS in tests
	"/test/workspace/.aimemory/memory-bank": [
		{ name: "core", isFile: () => false, isDirectory: () => true, isSymbolicLink: () => false },
		{
			name: "noFrontmatter.md",
			isFile: () => true,
			isDirectory: () => false,
			isSymbolicLink: () => false,
		},
		{
			name: "invalid.txt",
			isFile: () => true,
			isDirectory: () => false,
			isSymbolicLink: () => false,
		},
		{
			name: "emptyDir",
			isFile: () => false,
			isDirectory: () => true,
			isSymbolicLink: () => false,
		},
		{
			name: "fileWithBadFrontmatter.md",
			isFile: () => true,
			isDirectory: () => false,
			isSymbolicLink: () => false,
		},
		{
			name: "fileForRemoval.md",
			isFile: () => true,
			isDirectory: () => false,
			isSymbolicLink: () => false,
		},
		{
			name: "fileForUpdate.md",
			isFile: () => true,
			isDirectory: () => false,
			isSymbolicLink: () => false,
		},
	],
	"/test/workspace/.aimemory/memory-bank/core": [
		{
			name: "file1.md",
			isFile: () => true,
			isDirectory: () => false,
			isSymbolicLink: () => false,
		}, // Corresponds to mockFiles.coreFile1 in tests
		{
			name: "subDir",
			isFile: () => false,
			isDirectory: () => true,
			isSymbolicLink: () => false,
		}, // Corresponds to mockFiles.coreSubDir
		{
			name: "entry1.md",
			isFile: () => true,
			isDirectory: () => false,
			isSymbolicLink: () => false,
		}, // For getIndex tests
		{
			name: "entry2.md",
			isFile: () => true,
			isDirectory: () => false,
			isSymbolicLink: () => false,
		}, // For getIndex tests
		{
			name: "remove-test.md",
			isFile: () => true,
			isDirectory: () => false,
			isSymbolicLink: () => false,
		}, // For removeEntry test
	],
	"/test/workspace/.aimemory/memory-bank/core/subDir": [
		{
			name: "subFile.md",
			isFile: () => true,
			isDirectory: () => false,
			isSymbolicLink: () => false,
		}, // Corresponds to mockFiles.coreSubFile
	],
	"/test/workspace/.aimemory/memory-bank/emptyDir": [],
	// Path for testing ensureIndexDirectory in MetadataIndexManager
	"/test/workspace/.aimemory/memory-bank/.index": [],
	// For cursorConfigHelpers.test.ts
	"/mock/home/.cursor/context": [
		{
			name: "custom-tool.json",
			isFile: () => true,
			isDirectory: () => false,
			isSymbolicLink: () => false,
		},
		{
			name: "another-tool.json",
			isFile: () => true,
			isDirectory: () => false,
			isSymbolicLink: () => false,
		},
	],
	"/mock/home/.cursor/mcp_server_configs": [
		{
			name: "server1.json",
			isFile: () => true,
			isDirectory: () => false,
			isSymbolicLink: () => false,
		},
	],
	// For general VSCode FS mocks if needed by other tests
	"/mock/workspace": [
		{
			name: ".aimemory",
			isFile: () => false,
			isDirectory: () => true,
			isSymbolicLink: () => false,
		},
		{
			name: "someOtherFile.txt",
			isFile: () => true,
			isDirectory: () => false,
			isSymbolicLink: () => false,
		},
	],
	"/mock/workspace/.aimemory": [
		{
			name: "memory-bank",
			isFile: () => false,
			isDirectory: () => true,
			isSymbolicLink: () => false,
		},
	],
};

// Define mock file contents for specific paths used in readFile mock
const MOCK_FILE_CONTENTS: Record<string, string> = {
	"/test/workspace/.aimemory/memory-bank/core/file1.md":
		"---\\ntitle: Core File 1\\nid: core-file-1\\ntags: [core, test]\\n---\\nContent of core file 1.",
	"/test/workspace/.aimemory/memory-bank/core/subDir/subFile.md":
		"---\\ntitle: Subfile in Core SubDir\\nid: subfile-core-subdir\\ntags: [core, subdir]\\n---\\nContent of subFile.md.",
	"/test/workspace/.aimemory/memory-bank/noFrontmatter.md": "This file has no frontmatter.",
	"/test/workspace/.aimemory/memory-bank/fileWithBadFrontmatter.md":
		"---\\ntitle: Bad Frontmatter\\nid: bad-fm\\ntags: [test, error]\n---\nContent with malformed frontmatter content part.", // Example, gray-matter might still parse this
	// Add other specific contents as needed by tests
};

// =============================================================================
// BASIC MOCK FACTORIES
// =============================================================================

/**
 * Creates a mock logger with all required methods
 */
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
 * Creates a mock FileOperationManager with standard successful defaults
 */
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

/**
 * Creates a mock VS Code ExtensionContext
 */
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

/**
 * Creates a mock MemoryBankServiceCore with standard methods
 */
export function createMockMemoryBankServiceCore(): Record<string, unknown> {
	const mockFOM = createMockFileOperationManager();
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
		getFileOperationManager: vi.fn().mockReturnValue(mockFOM),
	};
}

/**
 * Creates a mock Console object for MCP server testing
 */
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

/**
 * Creates a mock CursorRulesService
 */
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

/**
 * Sets up standard defaults for a mock MemoryBankServiceCore
 */
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

// =============================================================================
// VS CODE MOCKS
// =============================================================================

/**
 * Standard VS Code workspace mock configuration
 */
export function createVSCodeWorkspaceMock() {
	return {
		workspaceFolders: [
			{
				uri: { fsPath: "/mock/workspace" },
				name: "Mock Workspace",
				index: 0,
			},
		],
		getConfiguration: vi.fn(() => ({
			get: vi.fn((key: string) => {
				if (key === "aiMemory.memoryBankPath") return ".aimemory/memory-bank";
				if (key === "aiMemory.logLevel") return "info";
				return undefined;
			}),
			update: vi.fn(),
		})),
		onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
		fs: {
			stat: vi.fn(),
			readFile: vi.fn(),
			writeFile: vi.fn(),
			delete: vi.fn(),
			createDirectory: vi.fn(),
			readDirectory: vi.fn(),
		},
	};
}

/**
 * Standard VS Code window mock configuration
 */
export function createVSCodeWindowMock() {
	return {
		showInformationMessage: vi.fn(),
		showErrorMessage: vi.fn(),
		showWarningMessage: vi.fn(),
		showQuickPick: vi.fn(),
		createWebviewPanel: vi.fn(),
	};
}

/**
 * Standard VS Code commands mock configuration
 */
export function createVSCodeCommandsMock() {
	return {
		registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
		registerTextEditorCommand: vi.fn(() => ({ dispose: vi.fn() })),
		executeCommand: vi.fn(),
	};
}

/**
 * Standard VS Code Uri mock configuration
 */
export function createVSCodeUriMock() {
	return {
		file: vi.fn((path: string) => ({ fsPath: path })),
		parse: vi.fn((uri: string) => ({ fsPath: uri })),
		joinPath: vi.fn((base: { fsPath: string }, ...parts: string[]) => ({
			fsPath: `${base.fsPath}/${parts.join("/")}`,
		})),
	};
}

/**
 * Complete VS Code API mock - combines all common VS Code mocks
 */
export function createCompleteVSCodeMock() {
	return {
		workspace: createVSCodeWorkspaceMock(),
		window: createVSCodeWindowMock(),
		commands: createVSCodeCommandsMock(),
		Uri: createVSCodeUriMock(),
		FileType: {
			File: 1,
			Directory: 2,
			SymbolicLink: 64,
			Unknown: 0,
		},
		ExtensionMode: {
			Production: 1,
			Development: 2,
			Test: 3,
		},
		ConfigurationTarget: {
			Global: 1,
			Workspace: 2,
			WorkspaceFolder: 3,
		},
		StatusBarAlignment: {
			Left: 1,
			Right: 2,
		},
		TreeItemCollapsibleState: {
			None: 0,
			Collapsed: 1,
			Expanded: 2,
		},
	};
}

/**
 * Sets up the complete VS Code mock using vi.mock()
 * Call this in your test files instead of manually mocking vscode
 */
export function setupVSCodeMock() {
	vi.mock("vscode", () => createCompleteVSCodeMock());
}

// =============================================================================
// FILESYSTEM MOCKS
// =============================================================================

/**
 * Helper function to determine if a path is a file or directory in the mock FS.
 */
function determineMockFileTypeInfo(
	checkPath: string,
	mockFileSystem: Record<string, MockFsDirent[]>,
): { isFile: boolean; isDirectory: boolean } {
	let isFile = false;
	let isDirectory = false;

	if (mockFileSystem[checkPath]) {
		// Path is a directory key in MOCK_FILE_SYSTEM
		isDirectory = true;
	} else {
		const dirname = path.dirname(checkPath);
		const basename = path.basename(checkPath);
		if (mockFileSystem[dirname]) {
			const parentDirEntries = mockFileSystem[dirname];
			const foundEntry = parentDirEntries.find((e) => e.name === basename);
			if (foundEntry) {
				isFile = foundEntry.isFile();
				isDirectory = foundEntry.isDirectory();
			} else {
				// Default assumption if not found: if path ends with '/', it's a directory
				// or if 'dir' is in the name (common test pattern), otherwise a file.
				// This part is heuristic and depends on test naming conventions.
				isDirectory = checkPath.endsWith("/") || checkPath.includes("dir");
				isFile = !isDirectory;
			}
		} else {
			// Path's directory not found, apply similar heuristic as above.
			// This handles cases where the path might not be fully represented in MOCK_FILE_SYSTEM
			// but tests rely on certain naming conventions (e.g., 'dir' in path means directory).
			isDirectory = checkPath.endsWith("/") || checkPath.includes("dir");
			isFile = !isDirectory;
		}
	}
	return { isFile, isDirectory };
}

/**
 * Helper function to determine the output for the mock fs.promises.readFile.
 */
function getMockReadFilePromiseOutput(
	readPath: string,
	mockFileContents: Record<string, string>,
): Buffer {
	if (typeof readPath !== "string") {
		throw new TypeError("Path must be a string.");
	}
	if (readPath.includes("error_readfile")) {
		throw new Error("Mock readFile error");
	}
	if (readPath.includes("enoent_readfile")) {
		const err = new Error(
			`ENOENT: no such file or directory, open '${readPath}'`,
		) as NodeJS.ErrnoException;
		err.code = "ENOENT";
		throw err;
	}

	if (readPath.includes("empty")) return Buffer.from("");

	const specificContent = mockFileContents[readPath];
	if (specificContent !== undefined) return Buffer.from(specificContent);

	if (readPath.endsWith(".md")) {
		return Buffer.from(
			`---\ntitle: Mocked Title for ${path.basename(readPath)}\nid: mock-id-${path.basename(readPath, ".md")}\ntags:\n  - mock\n---\n# Content for ${readPath}\nThis is mock content.`,
		);
	}
	return Buffer.from(`mock file content for ${readPath}`);
}

/**
 * Helper function to handle logic for the mock fs.promises.mkdir.
 */
function handleMockMkdirPromiseLogic(
	mkdirPath: string,
	options: { recursive?: boolean; mode?: number } | number | string | null | undefined,
	mockFileSystem: Record<string, MockFsDirent[]>,
): void {
	if (mkdirPath.includes("error_mkdir")) {
		throw new Error("Mock mkdir error");
	}

	if (mockFileSystem[mkdirPath]) {
		const isRecursive = typeof options === "object" && options?.recursive;
		if (!isRecursive) {
			const err = new Error(
				`EEXIST: file already exists, mkdir '${mkdirPath}'`,
			) as NodeJS.ErrnoException;
			err.code = "EEXIST";
			throw err;
		}
		// If recursive and already exists, it's a no-op, so return undefined
		return;
	}
	mockFileSystem[mkdirPath] = []; // Create the directory in the mock FS
}

/**
 * Helper function to determine the output for the mock fs.readFileSync.
 */
function getMockReadFileSyncOutput(
	readPath: string,
	mockFileContents: Record<string, string>,
): Buffer {
	if (typeof readPath !== "string") {
		throw new TypeError("Path must be a string for readFileSync mock.");
	}
	if (readPath.includes("error_readfilesync")) {
		throw new Error("Mock readFileSync error");
	}
	if (readPath.includes("enoent_readfilesync")) {
		const err = new Error(
			`ENOENT: no such file or directory, open '${readPath}'`,
		) as NodeJS.ErrnoException;
		err.code = "ENOENT";
		throw err;
	}
	if (readPath.includes("empty")) return Buffer.from("");

	const specificContent = mockFileContents[readPath];
	if (specificContent !== undefined) return Buffer.from(specificContent);

	if (readPath.endsWith(".md")) {
		return Buffer.from(
			`---\ntitle: Mocked Sync Title for ${path.basename(readPath)}\nid: sync-mock-id-${path.basename(readPath, ".md")}\ntags:\n  - mock\n  - sync\n---\n# Sync Content for ${readPath}\nThis is mock sync content.`,
		);
	}
	return Buffer.from(`mock sync file content for ${readPath}`);
}

/**
 * Helper function to handle logic for the mock fs.mkdirSync.
 */
function handleMockMkdirSyncLogic(
	mkdirPath: string,
	options: { recursive?: boolean; mode?: number } | number | string | null | undefined,
	mockFileSystem: Record<string, MockFsDirent[]>,
): void {
	if (mkdirPath.includes("error_mkdirsync")) {
		throw new Error("Mock mkdirSync error");
	}

	if (mockFileSystem[mkdirPath]) {
		const isRecursive = typeof options === "object" && options?.recursive;
		if (!isRecursive) {
			const err = new Error(
				`EEXIST: file already exists, mkdir '${mkdirPath}'`,
			) as NodeJS.ErrnoException;
			err.code = "EEXIST";
			throw err;
		}
		return; // Recursive and already exists, no-op
	}
	mockFileSystem[mkdirPath] = []; // Create directory
}

/**
 * Helper function to create and configure a MockReadStream instance based on path.
 */
function getMockReadStreamInstance(pathValue: string | Buffer | URL): MockReadStream {
	let streamContent = "mock stream data"; // Default content
	let simulateTimeout = false;
	let simulateDestroyError = false;

	if (typeof pathValue === "string") {
		if (pathValue.includes("error_createreadstream")) {
			streamContent = "mock error stream data";
		} else {
			streamContent = `mock stream data for ${pathValue}`;
		}

		if (pathValue.includes("timeout_createreadstream")) {
			simulateTimeout = true;
		}
		if (pathValue.includes("destroy_error_createreadstream")) {
			simulateDestroyError = true;
		}
	}

	const stream = new MockReadStream(streamContent, simulateTimeout);
	if (simulateDestroyError) {
		stream.destroy = () => {
			throw new Error("Mock destroy error");
		};
	}
	return stream;
}

/**
 * Simple mock stream for testing streaming operations.
 * Needs to be defined before FS mocks that might use it (e.g., createReadStream mock).
 */
export class MockReadStream extends EventEmitter {
	public readable: boolean;
	private logger?: MemoryBankLogger;

	constructor(
		private readonly content: string,
		private readonly shouldTimeout = false,
	) {
		super();
		this.readable = true;

		setImmediate(() => {
			if (!this.readable) return;

			if (this.shouldTimeout) {
				// Don't emit anything to simulate timeout
				return;
			}
			this.emit("data", Buffer.from(this.content));
			this.emit("end");
			this.readable = false;
		});
	}

	destroy() {
		if (this.readable) {
			this.readable = false;
			this.emit("close");
			this.logger?.debug?.("[MockReadStream] destroy() called, emitted close.");
		} else {
			this.logger?.debug?.("[MockReadStream] destroy() called, but already not readable.");
		}
	}

	pipe(destination: NodeJS.WritableStream): NodeJS.WritableStream {
		if (typeof destination.write === "function" && typeof destination.end === "function") {
			(destination.write as (chunk: string | Buffer) => boolean)(this.content);
			(destination.end as () => void)();
		}
		return destination;
	}

	pause(): this {
		this.logger?.debug?.("[MockReadStream] pause() called.");
		return this;
	}

	resume(): this {
		this.logger?.debug?.("[MockReadStream] resume() called.");
		return this;
	}

	public setLogger(logger: MemoryBankLogger) {
		this.logger = logger;
	}
}

/**
 * Creates a mock for Node.js fs/promises module.
 */
export function createNodeFsPromisesMockInstance() {
	return {
		readFile: vi
			.fn()
			.mockImplementation(
				async (
					readPath: string,
					options?: { encoding?: string | null; flag?: string } | string | null,
				) => {
					// Delegate logic to the new helper function
					return getMockReadFilePromiseOutput(readPath, MOCK_FILE_CONTENTS);
				},
			),
		writeFile: vi
			.fn()
			.mockImplementation(
				async (
					writePath: string,
					data: string | Buffer | Uint8Array /* more specific type */,
					options?: object | string | null,
				) => {
					if (writePath.includes("error_writefile")) {
						throw new Error("Mock writeFile error");
					}
					return undefined; // Simulates successful write
				},
			),
		mkdir: vi
			.fn()
			.mockImplementation(
				async (
					mkdirPath: string,
					options?: { recursive?: boolean; mode?: number } | number | string | null,
				) => {
					handleMockMkdirPromiseLogic(mkdirPath, options, MOCK_FILE_SYSTEM);
					return undefined;
				},
			),
		access: vi.fn().mockResolvedValue(undefined),

		readdir: vi
			.fn()
			.mockImplementation(
				async (
					dirPath: string,
					options?: { encoding?: string | null; withFileTypes?: boolean } | string | null,
				) => {
					if (typeof dirPath !== "string") {
						throw new TypeError("Path must be a string.");
					}
					if (dirPath.includes("error_readdir")) {
						throw new Error("Mock readdir error");
					}

					const entries = MOCK_FILE_SYSTEM[dirPath] || [];
					const withFileTypes = typeof options === "object" && options?.withFileTypes;

					if (withFileTypes) {
						return entries.map((entry) => ({
							name: entry.name,
							isFile: entry.isFile,
							isDirectory: entry.isDirectory,
							isSymbolicLink: entry.isSymbolicLink,
						}));
					}
					return entries.map((entry) => entry.name);
				},
			),

		stat: vi.fn().mockImplementation(async (statPath: string) => {
			if (typeof statPath !== "string") throw new TypeError("Path must be a string.");
			if (statPath.includes("error_stat")) throw new Error("Mock stat error");
			if (statPath.includes("enoent_stat")) {
				const err = new Error(
					`ENOENT: no such file or directory, stat '${statPath}'`,
				) as NodeJS.ErrnoException;
				err.code = "ENOENT";
				throw err;
			}

			// Use the helper function to determine file type
			const { isFile, isDirectory } = determineMockFileTypeInfo(statPath, MOCK_FILE_SYSTEM);

			// The original check for pathExistsInMock and related conditional logic
			// can be simplified if tests needing ENOENT specifically use "enoent_stat".
			// For other non-existent paths, this mock will return a default stat object
			// which is often the desired behavior in tests not specifically testing ENOENT.

			return {
				isFile: () => isFile,
				isDirectory: () => isDirectory,
				isSymbolicLink: () => false,
				size: isFile ? 100 : 0,
				mtime: new Date(),
				ctime: new Date(),
				birthtime: new Date(),
				mtimeMs: Date.now(),
				ctimeMs: Date.now(),
				birthtimeMs: Date.now(),
				dev: 0,
				ino: 0,
				mode: isFile ? 33188 : 16877, // Default modes for file/directory
				nlink: 1,
				uid: 1000,
				gid: 1000,
				rdev: 0,
				blksize: 4096,
				blocks: 1,
				atime: new Date(),
				atimeMs: Date.now(),
			};
		}),
	};
}

/**
 * Creates a comprehensive mock for Node.js fs module (sync and async via promises).
 */
export function createNodeFsGlobalMockInstance(
	promisesMockInstance: ReturnType<typeof createNodeFsPromisesMockInstance>,
) {
	// Prepare a default mock for createReadStream that can be spied on/mocked further in tests
	// It needs to return something that has an .on method and .destroy, like MockReadStream
	const mockReadStreamSingleton = new MockReadStream("default stream data for global mock");

	return {
		promises: promisesMockInstance,
		// Spread promisesMockInstance for direct fs.readFile usage if that pattern is used (though fs.promises.readFile is more typical)
		...promisesMockInstance,

		// Synchronous FS functions
		createReadStream: vi
			.fn()
			.mockImplementation((pathValue: string | Buffer | URL, options?: object | string) => {
				return getMockReadStreamInstance(pathValue);
			}),

		readFileSync: vi
			.fn()
			.mockImplementation(
				(
					readPath: string,
					options?: { encoding?: string | null; flag?: string } | string | null,
				) => {
					return getMockReadFileSyncOutput(readPath, MOCK_FILE_CONTENTS);
				},
			),

		writeFileSync: vi
			.fn()
			.mockImplementation(
				(
					writePath: string,
					data: string | Buffer | Uint8Array,
					options?: object | string | null,
				) => {
					if (writePath.includes("error_writefilesync")) {
						throw new Error("Mock writeFileSync error");
					}
					return undefined;
				},
			),

		mkdirSync: vi
			.fn()
			.mockImplementation(
				(
					mkdirPath: string,
					options?: { recursive?: boolean; mode?: number } | number | string | null,
				) => {
					handleMockMkdirSyncLogic(mkdirPath, options, MOCK_FILE_SYSTEM);
					return undefined;
				},
			),

		readdirSync: vi
			.fn()
			.mockImplementation(
				(
					dirPath: string,
					options?: { encoding?: string | null; withFileTypes?: boolean } | string | null,
				) => {
					if (typeof dirPath !== "string") {
						throw new TypeError("Path must be a string for readdirSync mock.");
					}
					if (dirPath.includes("error_readdirsync")) {
						throw new Error("Mock readdirSync error");
					}

					const entries = MOCK_FILE_SYSTEM[dirPath] || [];
					const withFileTypes = typeof options === "object" && options?.withFileTypes;

					if (withFileTypes) {
						return entries.map((entry) => ({
							name: entry.name,
							isFile: entry.isFile,
							isDirectory: entry.isDirectory,
							isSymbolicLink: entry.isSymbolicLink,
						}));
					}
					return entries.map((entry) => entry.name);
				},
			),

		statSync: vi.fn().mockImplementation((statPath: string) => {
			if (typeof statPath !== "string")
				throw new TypeError("Path must be a string for statSync mock.");
			if (statPath.includes("error_statsync")) throw new Error("Mock statSync error");
			if (statPath.includes("enoent_statsync")) {
				const err = new Error(
					`ENOENT: no such file or directory, stat '${statPath}'`,
				) as NodeJS.ErrnoException;
				err.code = "ENOENT";
				throw err;
			}

			const { isFile, isDirectory } = determineMockFileTypeInfo(statPath, MOCK_FILE_SYSTEM);

			return {
				isFile: () => isFile,
				isDirectory: () => isDirectory,
				isSymbolicLink: () => false,
				size: isFile ? 100 : 0,
				mtime: new Date(),
				ctime: new Date(),
				birthtime: new Date(),
				mtimeMs: Date.now(),
				ctimeMs: Date.now(),
				birthtimeMs: Date.now(),
				dev: 0,
				ino: 0,
				mode: isFile ? 33188 : 16877,
				nlink: 1,
				uid: 1000,
				gid: 1000,
				rdev: 0,
				blksize: 4096,
				blocks: 1,
				atime: new Date(),
				atimeMs: Date.now(),
			};
		}),
		// Add any other fs. statSync, etc. if needed by application and not covered by promises spread.
		// Note: Some fs sync methods (like existsSync) are often separate from fs.promises.
		existsSync: vi.fn().mockImplementation((checkPath: string) => {
			if (typeof checkPath !== "string") return false;
			if (MOCK_FILE_SYSTEM[checkPath]) return true; // It's a directory key
			const dirname = path.dirname(checkPath);
			const basename = path.basename(checkPath);
			if (MOCK_FILE_SYSTEM[dirname]) {
				return MOCK_FILE_SYSTEM[dirname].some((e) => e.name === basename);
			}
			return false;
		}),
		rmSync: vi
			.fn()
			.mockImplementation(
				(rmPath: string, options?: { recursive?: boolean; force?: boolean }) => {
					if (rmPath.includes("error_rmsync")) throw new Error("Mock rmSync error");
					// Naive implementation: just "removes" from MOCK_FILE_SYSTEM if it's a key (dir)
					// or from a directory's list if it's a file.
					// console.log(`[MockFS-Sync] rmSync called for: ${rmPath}`);
					if (MOCK_FILE_SYSTEM[rmPath] && options?.recursive) {
						delete MOCK_FILE_SYSTEM[rmPath];
						return;
					}
					const dirname = path.dirname(rmPath);
					const basename = path.basename(rmPath);
					if (MOCK_FILE_SYSTEM[dirname]) {
						MOCK_FILE_SYSTEM[dirname] = MOCK_FILE_SYSTEM[dirname].filter(
							(e) => e.name !== basename,
						);
					}
					// For non-recursive directory removal, or if file not found, do nothing or throw if not options.force
				},
			),

		// Ensure all relevant synchronous methods used by the codebase are mocked here.
	};
}

// --- Top-Level Singleton Filesystem Mocks ---
const nodeFsPromisesMockSingleton = createNodeFsPromisesMockInstance();
// MockReadStream class needs to be defined before createNodeFsGlobalMockInstance is called if it's used internally.
// Assuming MockReadStream is defined later in this file or imported, ensure its definition is hoisted or available.
const nodeFsGlobalMockSingleton = createNodeFsGlobalMockInstance(nodeFsPromisesMockSingleton);

// Apply mocks globally
vi.mock("node:fs/promises", () => ({
	default: nodeFsPromisesMockSingleton,
	...nodeFsPromisesMockSingleton,
}));

vi.mock("node:fs", () => ({
	default: nodeFsGlobalMockSingleton, // For `import fs from 'fs'`
	...nodeFsGlobalMockSingleton, // For `import { createReadStream } from 'fs'`
}));

/**
 * Accessor for the singleton instances of Node.js filesystem mocks.
 */
export function getNodeFsMockInstances() {
	return {
		promises: nodeFsPromisesMockSingleton,
		syncAndAsync: nodeFsGlobalMockSingleton, // Represents the global 'fs' mock
	};
}

/**
 * Creates a permission error for testing access denied scenarios
 */
export function createEaccesError(message = "EACCES: permission denied"): NodeJS.ErrnoException {
	const error = new Error(message) as NodeJS.ErrnoException;
	error.code = "EACCES";
	return error;
}

// =============================================================================
// MCP MOCKS
// =============================================================================

/**
 * Creates a mock MCP Server instance
 */
export function createMockMcpServerInstance() {
	return {
		registerTool: vi.fn(),
		registerResource: vi.fn(),
		start: vi.fn(),
		stop: vi.fn(),
		connect: vi.fn().mockResolvedValue(undefined),
	};
}

/**
 * Creates a mock MCP ResourceTemplate class/function
 */
export function createMockResourceTemplateStatic() {
	const mockInstance = {
		// define instance methods if any are used
	};
	return vi.fn().mockImplementation(() => mockInstance);
}

/**
 * Creates a mock STDIO transport class/function
 */
export function createMockStdioTransportStatic() {
	const mockInstance = {
		start: vi.fn(),
		close: vi.fn(),
		on: vi.fn(),
		send: vi.fn(),
	};
	return vi.fn().mockImplementation(() => mockInstance);
}

// =============================================================================
// TOP-LEVEL MCP SDK MOCKS
// These mocks will be applied globally when this mocks.ts file is imported.
// =============================================================================

const mockMcpServerSingleton = createMockMcpServerInstance();
const MockResourceTemplateSingleton = createMockResourceTemplateStatic();
const MockStdioTransportSingleton = createMockStdioTransportStatic();

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
	McpServer: vi.fn(() => mockMcpServerSingleton),
	ResourceTemplate: MockResourceTemplateSingleton,
}));

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
	StdioServerTransport: MockStdioTransportSingleton,
}));

// =============================================================================
// MCP SDK MOCK ACCESSOR (formerly setupMcpSdkMocks)
// =============================================================================

/**
 * Returns the singleton instances of the MCP SDK mocks.
 * Useful if tests need to access these mocks directly (e.g., for assertions).
 */
export function getMcpSdkMockInstances() {
	return {
		mockMcpServer: mockMcpServerSingleton,
		MockResourceTemplate: MockResourceTemplateSingleton,
		MockStdioTransport: MockStdioTransportSingleton,
	};
}

/**
 * Creates a mock memory bank service for MCP testing
 */
export function createMockMemoryBankServiceForMcp() {
	return {
		getIsMemoryBankInitialized: vi.fn().mockResolvedValue({ success: true, data: true }),
		initializeFolders: vi.fn().mockResolvedValue({ success: true }),
		loadFiles: vi.fn().mockResolvedValue({ success: true, data: [] }),
		getAllFiles: vi.fn().mockReturnValue([]),
		getFilesWithFilenames: vi.fn().mockReturnValue(""),
		updateFile: vi.fn().mockResolvedValue({ success: true }),
		checkHealth: vi.fn().mockResolvedValue({ success: true, data: "Healthy" }),
		getFile: vi.fn().mockReturnValue(undefined),
		isReady: vi.fn().mockReturnValue(true),
	};
}

/**
 * Creates a mock MCP server adapter for testing
 */
export function createMockMcpAdapter() {
	const mockMemoryBank = createMockMemoryBankServiceForMcp();

	return {
		getMemoryBank: () => mockMemoryBank,
		updateMemoryBankFile: vi.fn().mockResolvedValue(undefined),
		getPort: vi.fn().mockReturnValue(7331),
		isServerRunning: vi.fn().mockReturnValue(false),
		start: vi.fn().mockResolvedValue(undefined),
		stop: vi.fn().mockResolvedValue(undefined),
		handleCommand: vi.fn().mockResolvedValue("Command handled"),
		setExternalServerRunning: vi.fn(),
		mockMemoryBank,
	};
}

// =============================================================================
// CURSOR-SPECIFIC MOCKS
// =============================================================================

/**
 * Creates mock implementations for OS and path operations used in cursor configuration testing
 */
export function createCursorOSMockImplementations(mockHomeDir = "/mock/home") {
	const mockConfigPath = `${mockHomeDir}/.cursor/mcp.json`;
	const mockCursorDir = `${mockHomeDir}/.cursor`;

	return {
		mockHomeDir,
		mockConfigPath,
		mockCursorDir,
		homedirMock: vi.fn().mockReturnValue(mockHomeDir),
		pathJoinMock: vi.fn().mockImplementation((...args: string[]): string => {
			if (
				args.length === 3 &&
				args[0] === mockHomeDir &&
				args[1] === ".cursor" &&
				args[2] === "mcp.json"
			) {
				return mockConfigPath;
			}
			if (args.length === 2 && args[0] === mockHomeDir && args[1] === ".cursor") {
				return mockCursorDir;
			}
			// For workspace paths - avoid circular reference by using simple string joining
			return args.join("/");
		}),
		pathResolveMock: vi.fn().mockImplementation((...args: string[]) => args.join("/")),
	};
}

/**
 * Sets up VS Code workspace fs mocks specific to cursor rules operations
 */
export function setupCursorVSCodeWorkspaceFsMocks() {
	const mockWorkspaceFs = {
		stat: vi.fn(),
		readFile: vi.fn(),
		writeFile: vi.fn(),
		delete: vi.fn(),
		createDirectory: vi.fn(),
		readDirectory: vi.fn(),
	};

	const completeMock = {
		workspace: {
			workspaceFolders: [{ uri: { fsPath: "/mock/workspace" } }],
			getConfiguration: vi.fn(() => ({
				get: vi.fn((key: string) => {
					if (key === "aiMemory.memoryBankPath") return ".aimemory/memory-bank";
					if (key === "aiMemory.logLevel") return "info";
					return undefined;
				}),
			})),
			fs: mockWorkspaceFs,
		},
		window: {
			showErrorMessage: vi.fn(),
			showWarningMessage: vi.fn(),
			showInformationMessage: vi.fn(),
		},
		Uri: {
			joinPath: vi.fn((base: { fsPath: string }, ...parts: string[]) => ({
				fsPath: path.join(base.fsPath, ...parts),
			})),
			file: vi.fn((p: string) => ({ fsPath: p })),
		},
		FileType: {
			File: 1,
			Directory: 2,
			SymbolicLink: 64,
			Unknown: 0,
		},
		ExtensionMode: {
			Production: 1,
			Development: 2,
			Test: 3,
		},
	};

	return { mockWorkspaceFs, completeMock };
}

/**
 * Helper for setting up cursor rules file operations
 */
export function setupMockCursorRulesFileOperations(
	mockWorkspaceFs: ReturnType<typeof setupCursorVSCodeWorkspaceFsMocks>["mockWorkspaceFs"],
	fileExists = false,
	userChoice?: string,
) {
	mockWorkspaceFs.createDirectory.mockResolvedValue(undefined);

	if (fileExists) {
		mockWorkspaceFs.stat.mockResolvedValue({ type: 1 }); // FileType.File
		if (userChoice) {
			// Note: This assumes vscode.window.showWarningMessage is available in scope
			// The calling test will need to cast appropriately
		}
	} else {
		mockWorkspaceFs.stat.mockRejectedValue(new Error("File not found"));
	}

	mockWorkspaceFs.writeFile.mockResolvedValue(undefined);
}

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

/**
 * Sets up file operation manager with cursor-specific defaults
 */
export function setupCursorFileOperationManagerDefaults(mockFOM: Partial<FileOperationManager>) {
	(mockFOM.mkdirWithRetry as Mock).mockResolvedValue({ success: true });
	(mockFOM.readFileWithRetry as Mock).mockResolvedValue({
		success: true,
		data: '{"mcpServers": {}}',
	});
	(mockFOM.writeFileWithRetry as Mock).mockResolvedValue({ success: true });

	return mockFOM;
}
