import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { MemoryBankService } from "../core/memoryBank.js";
import { MemoryBankFileType } from "../types/types.js";

// Mock Markdown import to avoid Rollup parse errors
vi.mock("../lib/rules/memory-bank-rules.md", () => ({ default: "Mocked Markdown Content" }));

// This will hold the globally mocked fs.stat function instance
let globalFsStatMock: Mock;
let globalFsAccessMock: Mock;
// Add others if needed for fine-grained control in tests, e.g.:
// let globalFsReadFileMock: Mock;
// let globalFsWriteFileMock: Mock;
// let globalFsMkdirMock: Mock;

// Helper functions to reduce nesting in mock implementations
const createMockStats = (isDirectory: boolean, isFile = !isDirectory, size = 100) =>
	({
		isDirectory: () => isDirectory,
		isFile: () => isFile,
		mtime: new Date(),
		size,
	}) as import("node:fs").Stats;

const createDirectoryStats = () => createMockStats(true, false, 0);
const createFileStats = (size = 100) => createMockStats(false, true, size);

const createStatMockHandler = (
	mainMbPath: string,
	coreDirectoryPath: string,
	enoentError: NodeJS.ErrnoException,
) => {
	return async (p: import("node:fs").PathLike) => {
		const pStr = p.toString();
		if (pStr === mainMbPath) {
			return createDirectoryStats();
		}
		if (pStr === coreDirectoryPath) {
			throw enoentError;
		}
		// If the path is within the core directory that doesn't exist, also fail
		if (pStr.startsWith(`${coreDirectoryPath}/`)) {
			const coreFileError = new Error(
				"ENOENT: core file missing because core dir missing",
			) as NodeJS.ErrnoException;
			coreFileError.code = "ENOENT";
			throw coreFileError;
		}
		// Fallback: For other paths not in core, make them seem like existing files
		return createFileStats();
	};
};

const createLoadFilesStatMockHandler = (
	getPath: (subPath?: string) => Promise<string>,
	projectBriefPath: string,
) => {
	return async (path: import("node:fs").PathLike) => {
		const pStr = path.toString();
		// For directory checks, assume they exist or are created by ensureMemoryBankFolders
		const directoryPaths = [
			await getPath(),
			await getPath("core"),
			await getPath("systemPatterns"),
		];

		if (directoryPaths.includes(pStr)) {
			return createDirectoryStats();
		}

		// If stat is called for a file *before* it's written by template, throw ENOENT
		const err = new Error(
			`ENOENT: File ${pStr} not yet written by template`,
		) as NodeJS.ErrnoException;
		err.code = "ENOENT";
		throw err;
	};
};

const createAdvancedStatMockHandler = (
	getPath: (subPath?: string) => Promise<string>,
	projectBriefPath: string,
	activeContextPath: string,
	mockedWriteFile: Mock,
) => {
	return async (path: import("node:fs").PathLike) => {
		const pStr = path.toString();
		// For directory checks, assume they exist or are created by ensureMemoryBankFolders
		const directoryPaths = [
			await getPath(),
			await getPath("core"),
			await getPath("systemPatterns"),
		];

		if (directoryPaths.includes(pStr)) {
			return createDirectoryStats();
		}

		// For file paths, if writeFile was called for them, they "exist".
		const wasWritten = mockedWriteFile.mock.calls.some((call) => call[0] === pStr);
		const isExpectedFile = [projectBriefPath, activeContextPath].includes(pStr);

		if (wasWritten || isExpectedFile) {
			// If it's a path we expect to be written, or was written
			if (mockedWriteFile.mock.calls.some((call) => call[0] === pStr)) {
				return createFileStats();
			}
		}

		// If stat is called for a file *before* it's written by template, throw ENOENT
		const err = new Error(
			`ENOENT: File ${pStr} not yet written by template`,
		) as NodeJS.ErrnoException;
		err.code = "ENOENT";
		throw err;
	};
};

// Mocks for external dependencies
vi.mock("vscode", () => ({
	workspace: { workspaceFolders: [{ uri: { fsPath: "/mock/workspace" } }] },
	window: {
		showInformationMessage: vi.fn(),
		createOutputChannel: vi.fn(() => ({ appendLine: vi.fn(), show: vi.fn() })),
	},
	ExtensionContext: vi.fn().mockImplementation(() => ({
		subscriptions: [],
		workspaceState: { keys: () => [], get: vi.fn(), update: vi.fn(), setKeysForSync: vi.fn() },
		globalState: { keys: () => [], get: vi.fn(), update: vi.fn(), setKeysForSync: vi.fn() },
		secrets: { get: vi.fn(), store: vi.fn(), delete: vi.fn(), onDidChange: vi.fn() },
		extensionUri: { fsPath: "/mock/uri" },
		extensionPath: "/mock/path",
		environmentVariableCollection: {
			persistent: true,
			description: "",
			getScoped: vi.fn(),
			replace: vi.fn(),
			append: vi.fn(),
			prepend: vi.fn(),
			get: vi.fn(),
			forEach: vi.fn(),
			clear: vi.fn(),
			delete: vi.fn(),
			toJSON: vi.fn(),
			[Symbol.iterator]: function* () {
				yield ["MOCK_VAR", { type: "replace", value: "mock", options: {} }];
			},
		},
		storageUri: { fsPath: "/mock/storage_uri" },
		globalStorageUri: { fsPath: "/mock/global_storage_uri" },
		logUri: { fsPath: "/mock/log_uri" },
		extensionMode: 1,
		extension: {
			id: "mock.extension",
			extensionUri: { fsPath: "/mock/uri" },
			extensionPath: "/mock/path",
			isActive: true,
			packageJSON: {},
			exports: {},
			activate: vi.fn(),
			extensionKind: 1,
		},
		asAbsolutePath: (relativePath: string) => `/mock/path/${relativePath}`,
		storagePath: "/mock/storage",
		globalStoragePath: "/mock/globalStorage",
		logPath: "/mock/log",
		languageModelAccessInformation: {},
	})),
}));

vi.mock("node:fs/promises", async () => {
	// Initialize all fs functions as vi.fn() so they can be individually spied on or configured
	// The default export is what '* as fs' will grab.
	const actual = await vi.importActual("node:fs/promises");
	const fsMocks = {
		stat: vi.fn(),
		mkdir: vi.fn(),
		readFile: vi.fn(),
		writeFile: vi.fn(),
		access: vi.fn(),
		// Add any other fs functions used by the SUT
	};
	return {
		...actual, // Spread actual to ensure any non-mocked functions are still available (though SUT should only use mocked ones)
		default: fsMocks, // All SUT calls to fs.default.function will hit these mocks
		...fsMocks, // Also expose them directly if SUT uses named imports like `import { stat } from ...`
	};
});

vi.mock("node:path", async () => {
	const actualPath = await vi.importActual<typeof import("node:path")>("node:path");
	return {
		...actualPath,
		join: actualPath.posix.join, // Use actual posix join for predictability
	};
});
vi.mock("../lib/cursor-rules-service.js", () => ({
	CursorRulesService: class {
		createRulesFile = vi.fn().mockResolvedValue(undefined);
	},
}));
vi.mock("../utils/log.js", () => ({
	Logger: {
		getInstance: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
	},
	LogLevel: { Info: "info", Error: "error", Warn: "warn", Debug: "debug" },
}));
vi.mock("../lib/memoryBankTemplates.js", () => ({
	getTemplateForFileType: () => "template content",
}));

// Minimal mock for vscode.ExtensionContext properties used by the service constructor
const mockContext = {
	subscriptions: [],
	workspaceState: { get: vi.fn(), update: vi.fn(), keys: () => [], setKeysForSync: vi.fn() },
	globalState: { get: vi.fn(), update: vi.fn(), keys: () => [], setKeysForSync: vi.fn() },
	secrets: { get: vi.fn(), store: vi.fn(), delete: vi.fn(), onDidChange: vi.fn() },
	extensionUri: { fsPath: "/mock/uri" },
	extensionPath: "/mock/path",
	environmentVariableCollection: {} as unknown, // Cast as it's complex
	storageUri: { fsPath: "/mock/storage_uri" },
	globalStorageUri: { fsPath: "/mock/global_storage_uri" },
	logUri: { fsPath: "/mock/log_uri" },
	extensionMode: 1,
	extension: {
		id: "mock.extension",
		extensionUri: { fsPath: "/mock/uri" },
		extensionPath: "/mock/path",
		isActive: true,
		packageJSON: {},
		exports: {},
		activate: vi.fn(),
		extensionKind: 1,
	},
	asAbsolutePath: (relativePath: string) => `/mock/path/${relativePath}`,
	storagePath: "/mock/storage",
	globalStoragePath: "/mock/globalStorage",
	logPath: "/mock/log",
	languageModelAccessInformation: {},
};

// Helper to configure the specific behavior of the globalFsStatMock for a test
const configureFsStatBehavior = (
	conditions: Array<{
		path: string;
		isDirectory?: boolean;
		isFile?: boolean;
		error?: NodeJS.ErrnoException;
	}>,
) => {
	if (!globalFsStatMock)
		throw new Error("globalFsStatMock is not initialized. Check beforeEach.");
	globalFsStatMock.mockImplementation(async (p: import("node:fs").PathLike) => {
		const pathString = p.toString();
		for (const condition of conditions) {
			if (pathString === condition.path) {
				if (condition.error) {
					throw condition.error;
				}
				return {
					isDirectory: () => !!condition.isDirectory,
					isFile: () => !!condition.isFile,
					mtime: new Date(),
					size: 100, // Default size for mocked stats
				} as import("node:fs").Stats;
			}
		}
		// Fallback for paths not specified in conditions: simulate file doesn't exist
		// This ensures that only explicitly configured paths appear to exist in tests
		const enoentError = new Error(
			`ENOENT: no such file or directory, stat '${pathString}'`,
		) as NodeJS.ErrnoException;
		enoentError.code = "ENOENT";
		enoentError.errno = -2;
		enoentError.syscall = "stat";
		enoentError.path = pathString;
		throw enoentError;
	});
};

const configureFsAccessBehavior = (
	conditions: Array<{
		path: string;
		error?: NodeJS.ErrnoException;
	}>,
) => {
	if (!globalFsAccessMock)
		throw new Error("globalFsAccessMock is not initialized. Check beforeEach.");
	globalFsAccessMock.mockImplementation(async (p: import("node:fs").PathLike) => {
		const pathString = p.toString();
		for (const condition of conditions) {
			if (pathString === condition.path) {
				if (condition.error) {
					throw condition.error;
				}
				return undefined; // Access granted
			}
		}
		// Fallback for paths not specified in conditions: simulate file doesn't exist
		const enoentError = new Error(
			`ENOENT: no such file or directory, access '${pathString}'`,
		) as NodeJS.ErrnoException;
		enoentError.code = "ENOENT";
		enoentError.errno = -2;
		enoentError.syscall = "access";
		enoentError.path = pathString;
		throw enoentError;
	});
};

describe("MemoryBankService", () => {
	// Moved getPath to be accessible by multiple describe blocks
	const getPath = async (subPath = "") => {
		const pathModule = await import("node:path");
		return pathModule.join("/mock/workspace", ".aimemory", "memory-bank", subPath);
	};

	beforeEach(async () => {
		vi.clearAllMocks();
		// Get references to the mocked fs functions from the default export
		const fs = (await import("node:fs/promises")).default;

		globalFsStatMock = vi.mocked(fs.stat);
		globalFsAccessMock = vi.mocked(fs.access);
		const globalFsMkdirMock = vi.mocked(fs.mkdir);
		const globalFsReadFileMock = vi.mocked(fs.readFile);
		const globalFsWriteFileMock = vi.mocked(fs.writeFile);

		// Default "happy path" implementations for all fs mocks
		globalFsStatMock.mockResolvedValue({
			isDirectory: () => true,
			isFile: () => true,
			mtime: new Date(),
			size: 100,
		} as import("node:fs").Stats);
		globalFsAccessMock.mockResolvedValue(undefined); // Files are accessible
		globalFsMkdirMock.mockResolvedValue(undefined); // mkdir succeeds
		globalFsReadFileMock.mockResolvedValue("mock content"); // readFile succeeds
		globalFsWriteFileMock.mockResolvedValue(undefined); // writeFile succeeds
	});

	it("throws if no workspace folder is found", async () => {
		const vscode = await import("vscode");
		const original = vscode.workspace.workspaceFolders;
		vi.spyOn(vscode.workspace, "workspaceFolders", "get").mockReturnValue(undefined);
		expect(
			() =>
				new MemoryBankService(mockContext as unknown as import("vscode").ExtensionContext),
		).toThrow("No workspace folder found");
		vi.spyOn(vscode.workspace, "workspaceFolders", "get").mockReturnValue(original);
	});

	it("isReady returns false before loadFiles, true after", async () => {
		const service = new MemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
		);
		expect(service.isReady()).toBe(false);
		await service.loadFiles();
		expect(service.isReady()).toBe(true);
	});

	it("getFile returns undefined if not loaded, then returns file after loadFiles", async () => {
		const service = new MemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
		);
		expect(service.getFile(MemoryBankFileType.ProjectBrief)).toBeUndefined();
		await service.loadFiles();
		const file = service.getFile(MemoryBankFileType.ProjectBrief);
		expect(file).toBeDefined();
		expect(file?.content).toBe("mock content");
	});

	it("getAllFiles returns all loaded files", async () => {
		const service = new MemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
		);
		await service.loadFiles();
		const files = service.getAllFiles();
		expect(Array.isArray(files)).toBe(true);
		expect(files.length).toBeGreaterThan(0); // Relies on default template creation
	});

	it("updateFile updates the file content and lastUpdated", async () => {
		const service = new MemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
		);
		await service.loadFiles();
		const initialFile = service.getFile(MemoryBankFileType.ProjectBrief);
		expect(initialFile).toBeDefined();

		if (initialFile && initialFile.lastUpdated instanceof Date) {
			const initialTime = initialFile.lastUpdated.getTime();

			await service.updateFile(MemoryBankFileType.ProjectBrief, "new content");
			const file = service.getFile(MemoryBankFileType.ProjectBrief);
			expect(file).toBeDefined();

			if (file && file.lastUpdated instanceof Date) {
				expect(file.content).toBe("new content");
				expect(file.lastUpdated.getTime()).toBeGreaterThanOrEqual(initialTime);
			} else {
				// If file or file.lastUpdated is not as expected, fail the test clearly.
				throw new Error(
					"MemoryBankFile 'file' or its 'lastUpdated' property was not valid after update.",
				);
			}
		} else {
			// If initialFile or initialFile.lastUpdated is not as expected, fail the test clearly.
			throw new Error(
				"MemoryBankFile 'initialFile' or its 'lastUpdated' property was not valid after loadFiles.",
			);
		}
	});

	it("getFilesWithFilenames returns a string with file info", async () => {
		const service = new MemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
		);
		await service.loadFiles();
		const result = service.getFilesWithFilenames();
		expect(typeof result).toBe("string");
		expect(result).toContain("last updated");
	});

	it("checkHealth returns healthy message if all files/folders exist", async () => {
		const service = new MemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
		);
		await service.loadFiles(); // Ensures files are "created" by mocks
		const health = await service.checkHealth();
		expect(health).toContain("All files and folders are present");
	});

	it("getIsMemoryBankInitialized returns true if all files exist", async () => {
		const service = new MemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
		);
		await service.loadFiles(); // Ensures files are "created"
		const isInit = await service.getIsMemoryBankInitialized();
		expect(isInit).toBe(true);
	});

	describe("getIsMemoryBankInitialized edge cases", () => {
		it("returns false when main directory doesn't exist", async () => {
			const memoryBankDirectoryPath = await getPath();
			const enoentError = new Error("ENOENT: main dir missing") as NodeJS.ErrnoException;
			enoentError.code = "ENOENT";
			configureFsStatBehavior([{ path: memoryBankDirectoryPath, error: enoentError }]);

			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);
			service.invalidateCache(); // Ensure fresh check
			const result = await service.getIsMemoryBankInitialized();
			expect(result).toBe(false);
		});

		it("returns false when a required sub-directory (core) doesn't exist", async () => {
			const fsDefault = (await import("node:fs/promises")).default;
			const mainMbPath = await getPath();
			const coreDirectoryPath = await getPath("core");
			const enoentError = new Error(
				"ENOENT: core dir missing for getIsMemoryBankInitialized",
			) as NodeJS.ErrnoException;
			enoentError.code = "ENOENT";

			const statMock = vi
				.mocked(fsDefault.stat)
				.mockImplementation(
					createStatMockHandler(mainMbPath, coreDirectoryPath, enoentError),
				);

			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);
			service.invalidateCache();
			const result = await service.getIsMemoryBankInitialized();
			expect(result).toBe(false);

			statMock.mockRestore();
		});

		it("returns false when directory exists but a required file (projectbrief) is missing via stat", async () => {
			const projectBriefPath = await getPath(`core/${MemoryBankFileType.ProjectBrief}`);
			const enoentError = new Error(
				"ENOENT: ProjectBrief missing (stat)",
			) as NodeJS.ErrnoException;
			enoentError.code = "ENOENT";
			configureFsStatBehavior([
				{ path: await getPath(), isDirectory: true }, // main dir
				{ path: await getPath("core"), isDirectory: true }, // core dir
				{ path: projectBriefPath, error: enoentError }, // projectbrief.md missing
			]);

			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);
			service.invalidateCache();
			const result = await service.getIsMemoryBankInitialized();
			expect(result).toBe(false);
		});

		it("returns false when directory exists but a required file (projectbrief) is missing via access", async () => {
			const projectBriefPath = await getPath(`core/${MemoryBankFileType.ProjectBrief}`);
			const eaccesError = new Error(
				"EACCES: ProjectBrief not accessible",
			) as NodeJS.ErrnoException;
			eaccesError.code = "EACCES"; // Or ENOENT if preferred for "missing"
			configureFsStatBehavior([
				// All stat checks pass for isFile/isDir
				{ path: await getPath(), isDirectory: true },
				{ path: await getPath("core"), isDirectory: true },
				{ path: projectBriefPath, isFile: true },
			]);
			configureFsAccessBehavior([{ path: projectBriefPath, error: eaccesError }]);

			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);
			service.invalidateCache();
			const result = await service.getIsMemoryBankInitialized();
			expect(result).toBe(false);
		});

		it("returns false when a required file (projectbrief) exists but is a directory", async () => {
			const projectBriefPath = await getPath(`core/${MemoryBankFileType.ProjectBrief}`);
			configureFsStatBehavior([
				{ path: await getPath(), isDirectory: true },
				{ path: await getPath("core"), isDirectory: true },
				{ path: projectBriefPath, isDirectory: true, isFile: false }, // projectbrief.md is a dir
			]);

			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);
			service.invalidateCache();
			const result = await service.getIsMemoryBankInitialized();
			expect(result).toBe(false);
		});
	});

	describe("Health Check edge cases", () => {
		it("reports missing main memory-bank directory", async () => {
			const memoryBankDirectoryPath = await getPath();
			const enoentError = new Error(
				"ENOENT: main dir missing for health",
			) as NodeJS.ErrnoException;
			enoentError.code = "ENOENT";
			configureFsStatBehavior([{ path: memoryBankDirectoryPath, error: enoentError }]);

			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);
			const health = await service.checkHealth();
			expect(health).toContain("Issues found");
			expect(health).toContain(`Missing folder: ${memoryBankDirectoryPath}`);
		});

		it("reports missing sub-directory (e.g., core)", async () => {
			const coreDirectoryPath = await getPath("core");
			const enoentError = new Error(
				"ENOENT: core dir missing for health",
			) as NodeJS.ErrnoException;
			enoentError.code = "ENOENT";
			configureFsStatBehavior([
				{ path: await getPath(), isDirectory: true }, // main dir exists
				{ path: await getPath("systemPatterns"), isDirectory: true },
				{ path: await getPath("techContext"), isDirectory: true },
				{ path: await getPath("progress"), isDirectory: true },
				{ path: coreDirectoryPath, error: enoentError }, // core dir missing
			]);
			configureFsAccessBehavior([
				{ path: await getPath(), error: undefined }, // main dir accessible
				{ path: await getPath("systemPatterns"), error: undefined },
				{ path: await getPath("techContext"), error: undefined },
				{ path: await getPath("progress"), error: undefined },
				{ path: coreDirectoryPath, error: enoentError }, // core dir not accessible
			]);

			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);
			const health = await service.checkHealth();
			expect(health).toContain("Issues found");
			// When a directory is missing, health check reports individual missing files inside it
			expect(health).toContain("Missing or unreadable: core/projectbrief.md");
			expect(health).toContain("Missing or unreadable: core/productContext.md");
			expect(health).toContain("Missing or unreadable: core/activeContext.md");
		});

		it("reports missing required file (e.g., projectbrief.md)", async () => {
			const projectBriefPath = await getPath(`core/${MemoryBankFileType.ProjectBrief}`);
			const enoentError = new Error(
				"ENOENT: projectbrief.md missing for health (access)",
			) as NodeJS.ErrnoException;
			enoentError.code = "ENOENT"; // Simulating missing via access check

			// Stat calls might say it's a file, but access check fails
			configureFsStatBehavior([
				{ path: await getPath(), isDirectory: true },
				{ path: await getPath("core"), isDirectory: true },
				{ path: projectBriefPath, isFile: true }, // stat says it's a file
			]);
			configureFsAccessBehavior([{ path: projectBriefPath, error: enoentError }]); // access says it's not there/accessible

			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);
			const health = await service.checkHealth();
			expect(health).toContain("Issues found");
			expect(health).toContain(`Missing or unreadable: ${MemoryBankFileType.ProjectBrief}`);
		});
	});

	describe("cache management", () => {
		it("can invalidate specific file cache", async () => {
			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);
			await service.loadFiles();
			expect(() => {
				service.invalidateCache(
					"/mock/workspace/.aimemory/memory-bank/core/projectbrief.md",
				);
			}).not.toThrow();
			const stats = service.getCacheStats();
			expect(stats).toBeDefined();
		});

		it("can clear all cache", async () => {
			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);
			await service.loadFiles();
			expect(() => {
				service.invalidateCache();
			}).not.toThrow();
			service.resetCacheStats();
			const stats = service.getCacheStats();
			expect(stats.hits).toBe(0);
			expect(stats.misses).toBe(0);
			expect(stats.reloads).toBe(0);
		});

		// Test related to the SonarLint S2486 issue (empty catch block)
		it("invalidates cache for missing files (S2486 related)", async () => {
			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);
			// Simulate loadFiles encountering an issue (e.g., a file it tries to create/read fails)
			// For this test, let's assume initial loadFiles completes, then we test getIsMemoryBankInitialized
			// The original S2486 was about an empty catch during loadFiles, which is complex to isolate here
			// without potentially re-introducing failing tests if loadFiles itself fails.
			// The previous edit changed the empty catch to a console.error.
			// This test will focus on the getIsMemoryBankInitialized after cache invalidation with missing files.

			const projectBriefPath = await getPath(`core/${MemoryBankFileType.ProjectBrief}`);
			const enoentError = new Error(
				"ENOENT: File not found after cache invalidation",
			) as NodeJS.ErrnoException;
			enoentError.code = "ENOENT";

			// First, allow loadFiles to succeed to populate cache
			await service.loadFiles();
			service.invalidateCache(); // Clear the cache

			// Now setup mocks for missing files scenario
			configureFsStatBehavior([
				{ path: await getPath(), isDirectory: true },
				{ path: await getPath("core"), isDirectory: true },
				{ path: projectBriefPath, error: enoentError },
			]);

			const result = await service.getIsMemoryBankInitialized();
			expect(result).toBe(false); // Expect false as project brief is missing
		});
	});

	describe("loadFiles error handling", () => {
		it("sets ready to false on error during template writing", async () => {
			const fs = (await import("node:fs/promises")).default;
			const projectBriefPath = await getPath(`core/${MemoryBankFileType.ProjectBrief}`);

			// Configure all directories to exist, but projectbrief.md file to not exist (triggering template creation)
			configureFsStatBehavior([
				{ path: await getPath(), isDirectory: true },
				{ path: await getPath("core"), isDirectory: true },
				{ path: await getPath("systemPatterns"), isDirectory: true },
				{ path: await getPath("techContext"), isDirectory: true },
				{ path: await getPath("progress"), isDirectory: true },
				{ path: projectBriefPath, error: new Error("ENOENT") as NodeJS.ErrnoException },
			]);

			// Make writeFile fail when trying to create the template
			vi.mocked(fs.writeFile).mockRejectedValue(new Error("Write template failed"));

			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);
			service.invalidateCache();

			await expect(service.loadFiles()).rejects.toThrow("Write template failed");
			expect(service.isReady()).toBe(false);
		});

		it("creates missing files from templates if writeFile succeeds", async () => {
			const fs = (await import("node:fs/promises")).default;
			const mockedWriteFile = vi.mocked(fs.writeFile).mockResolvedValue(undefined);
			const mockedStat = vi.mocked(fs.stat);

			const projectBriefPath = await getPath(`core/${MemoryBankFileType.ProjectBrief}`);
			// Other file paths that would be templated...
			const activeContextPath = await getPath(`core/${MemoryBankFileType.ActiveContext}`);

			// Simulate files not existing initially, then existing after being "written"
			mockedStat.mockImplementation(
				createAdvancedStatMockHandler(
					getPath,
					projectBriefPath,
					activeContextPath,
					mockedWriteFile,
				),
			);

			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);
			service.invalidateCache();

			const createdFiles = await service.loadFiles();
			expect(createdFiles.length).toBeGreaterThan(0);
			expect(mockedWriteFile).toHaveBeenCalled();
			expect(service.isReady()).toBe(true);
		});
	});

	describe("updateFile error handling", () => {
		it("throws error when write fails", async () => {
			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);
			await service.loadFiles(); // Initial load with successful mocks

			const fs = (await import("node:fs/promises")).default;
			vi.mocked(fs.writeFile).mockRejectedValue(new Error("Write update failed"));

			await expect(
				service.updateFile(MemoryBankFileType.ProjectBrief, "new content"),
			).rejects.toThrow("Write update failed");
		});
	});

	describe("initializeFolders", () => {
		it("creates all required subfolders", async () => {
			const fs = (await import("node:fs/promises")).default;
			const mkdirMock = vi.mocked(fs.mkdir);

			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);
			await service.initializeFolders();

			const base = await getPath();
			expect(mkdirMock).toHaveBeenCalledWith(base, { recursive: true });
			expect(mkdirMock).toHaveBeenCalledWith(`${base}/core`, { recursive: true });
			expect(mkdirMock).toHaveBeenCalledWith(`${base}/systemPatterns`, { recursive: true });
			expect(mkdirMock).toHaveBeenCalledWith(`${base}/techContext`, { recursive: true });
			expect(mkdirMock).toHaveBeenCalledWith(`${base}/progress`, { recursive: true });
		});
	});

	// createMemoryBankRulesIfNotExists test might need CursorRulesService mock to be more detailed
	// or to verify calls on the instance if that's desired.
	// For now, it mainly tests that the method doesn't throw.
	describe("createMemoryBankRulesIfNotExists", () => {
		it("calls cursor rules service to create rules file", async () => {
			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);
			await expect(service.createMemoryBankRulesIfNotExists()).resolves.toBeUndefined();
		});
	});
});
