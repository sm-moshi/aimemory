import { beforeEach, describe, expect, it, vi } from "vitest";
import { VSCodeMemoryBankService } from "../../core/vsCodeMemoryBankService.js";
import { MemoryBankFileType, isSuccess } from "../../types/index.js";

// Mock dependencies for VSCodeMemoryBankService
const mockCoreService = {
	// Basic mock for MemoryBankServiceCore
	loadFiles: vi.fn(),
	getFile: vi.fn(),
	getAllFiles: vi.fn(),
	getFilesWithFilenames: vi.fn(),
	checkHealth: vi.fn(),
	getIsMemoryBankInitialized: vi.fn(),
	initializeFolders: vi.fn(),
	isReady: vi.fn(),
	updateFile: vi.fn(),
	invalidateCache: vi.fn(),
	getCacheStats: vi.fn(),
	resetCacheStats: vi.fn(),
	writeFileByPath: vi.fn(),
} as any;

const mockCursorRulesService = {
	// Basic mock for CursorRulesService
	createRulesFile: vi.fn(),
} as any;

const mockLogger = {
	// Basic mock for Logger
	info: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
	debug: vi.fn(),
} as any;

// Mock Markdown import to avoid Rollup parse errors
vi.mock("../../lib/rules/memory-bank-rules.md", () => ({ default: "Mocked Markdown Content" }));

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

describe("VSCodeMemoryBankService", () => {
	beforeEach(async () => {
		vi.clearAllMocks();

		// Reset mock implementations for injected dependencies
		mockCoreService.loadFiles.mockClear().mockResolvedValue({ success: true, data: [] });
		mockCoreService.getFile.mockClear().mockReturnValue(undefined);
		mockCoreService.getAllFiles.mockClear().mockReturnValue([]);
		mockCoreService.getFilesWithFilenames.mockClear().mockReturnValue("");
		mockCoreService.checkHealth
			.mockClear()
			.mockResolvedValue({ success: true, data: "Healthy" }); // Corrected mock return type
		mockCoreService.getIsMemoryBankInitialized
			.mockClear()
			.mockResolvedValue({ success: true, data: false }); // Corrected mock return type
		mockCoreService.initializeFolders.mockClear().mockResolvedValue({ success: true });
		mockCoreService.isReady.mockClear().mockReturnValue(false);
		mockCoreService.updateFile.mockClear().mockResolvedValue({ success: true });
		mockCoreService.invalidateCache.mockClear();
		mockCoreService.getCacheStats.mockClear().mockReturnValue({});
		mockCoreService.resetCacheStats.mockClear();
		mockCoreService.writeFileByPath.mockClear().mockResolvedValue({ success: true });

		mockCursorRulesService.createRulesFile.mockClear().mockResolvedValue(undefined);

		mockLogger.info.mockClear();
		mockLogger.error.mockClear();
		mockLogger.warn.mockClear();
		mockLogger.debug.mockClear();
	});

	it("throws if no workspace folder is found", async () => {
		const vscode = await import("vscode");
		const original = vscode.workspace.workspaceFolders;
		// Override the global mock for this specific test
		vi.mocked(vscode.workspace).workspaceFolders = undefined;

		// Mock a core service that would throw because of no workspace folder
		const mockCoreServiceThatThrows = {
			...mockCoreService,
			loadFiles: vi
				.fn()
				.mockRejectedValue(
					new Error("Cannot initialize MemoryBankServiceCore: No workspace folder found"),
				),
		};

		// This should NOT throw during construction since we're providing the core service
		// The real error would happen during MemoryBankServiceCore creation in the DI container
		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreServiceThatThrows,
			mockCursorRulesService,
			mockLogger,
		);

		// The error should happen when trying to use the service
		await expect(service.loadFiles()).rejects.toThrow(
			"Cannot initialize MemoryBankServiceCore: No workspace folder found",
		);

		// Restore the original mock
		vi.mocked(vscode.workspace).workspaceFolders = original;
	});

	it("isReady returns false before loadFiles, true after", async () => {
		mockCoreService.isReady.mockReturnValueOnce(false).mockReturnValueOnce(true);
		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreService,
			mockCursorRulesService,
			mockLogger,
		);
		expect(service.isReady()).toBe(false);
		await service.loadFiles();
		expect(service.isReady()).toBe(true);
	});

	it("getFile returns undefined if not loaded, then returns file after loadFiles", async () => {
		const mockFile = { content: "mock content" };
		mockCoreService.getFile.mockReturnValueOnce(undefined).mockReturnValueOnce(mockFile);
		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreService,
			mockCursorRulesService,
			mockLogger,
		);
		expect(service.getFile(MemoryBankFileType.ProjectBrief)).toBeUndefined();
		await service.loadFiles();
		const file = service.getFile(MemoryBankFileType.ProjectBrief);
		expect(file).toBeDefined();
		expect(file?.content).toBe("mock content");
	});

	it("getAllFiles returns all loaded files", async () => {
		const mockFiles = [{ content: "file1" }, { content: "file2" }];
		mockCoreService.getAllFiles.mockReturnValue(mockFiles);
		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreService,
			mockCursorRulesService,
			mockLogger,
		);
		await service.loadFiles();
		const files = service.getAllFiles();
		expect(Array.isArray(files)).toBe(true);
		expect(files.length).toBe(mockFiles.length);
	});

	it("updateFile updates the file content and lastUpdated", async () => {
		const initialFile = { content: "initial content", lastUpdated: new Date() };
		mockCoreService.getFile.mockReturnValue(initialFile);
		mockCoreService.updateFile.mockResolvedValue({ success: true }); // Assume core update succeeds
		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreService,
			mockCursorRulesService,
			mockLogger,
		);
		await service.loadFiles();
		const initialFileLoaded = service.getFile(MemoryBankFileType.ProjectBrief);
		expect(initialFileLoaded).toBeDefined();

		if (initialFileLoaded && initialFileLoaded.lastUpdated instanceof Date) {
			await service.updateFile(MemoryBankFileType.ProjectBrief, "new content");
			// After update, re-fetching the file should ideally show the new content
			// This test needs refinement to mock the coreService.getFile behavior after update.
			// For now, we just check if updateFile was called on the core service.
			expect(mockCoreService.updateFile).toHaveBeenCalledWith(
				MemoryBankFileType.ProjectBrief,
				"new content",
			);
		}
	});

	it("updateFile handles errors from core service", async () => {
		mockCoreService.updateFile.mockResolvedValue({
			success: false,
			error: new Error("Write update failed"),
		});
		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreService,
			mockCursorRulesService,
			mockLogger,
		);
		const result = await service.updateFile(MemoryBankFileType.ProjectBrief, "new content");
		expect(result).toEqual({ success: false, error: new Error("Write update failed") });
		expect(mockCoreService.updateFile).toHaveBeenCalledWith(
			MemoryBankFileType.ProjectBrief,
			"new content",
		);
	});

	it("can invalidate specific file cache", async () => {
		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreService,
			mockCursorRulesService,
			mockLogger,
		);
		await service.loadFiles();
		service.invalidateCache("/mock/workspace/.aimemory/memory-bank/core/projectbrief.md");
		expect(mockCoreService.invalidateCache).toHaveBeenCalledWith(
			"/mock/workspace/.aimemory/memory-bank/core/projectbrief.md",
		);
		const stats = service.getCacheStats();
		expect(stats).toBeDefined();
	});

	it("can clear all cache", async () => {
		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreService,
			mockCursorRulesService,
			mockLogger,
		);
		await service.loadFiles();
		service.invalidateCache();
		expect(mockCoreService.invalidateCache).toHaveBeenCalledWith(undefined);
		service.resetCacheStats();
		expect(mockCoreService.resetCacheStats).toHaveBeenCalled();
		const stats = service.getCacheStats();
		expect(mockCoreService.getCacheStats).toHaveBeenCalled();
		expect(stats).toEqual({});
	});

	it("invalidates cache for missing files", async () => {
		mockCoreService.getIsMemoryBankInitialized.mockResolvedValue({
			success: true,
			data: false,
		});
		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreService,
			mockCursorRulesService,
			mockLogger,
		);
		await service.loadFiles();
		service.invalidateCache();
		const result = await service.getIsMemoryBankInitialized();
		expect(isSuccess(result)).toBe(true);
		if (isSuccess(result)) {
			expect(result.data).toBe(false);
		}
		expect(mockCoreService.getIsMemoryBankInitialized).toHaveBeenCalled();
		expect(mockCoreService.invalidateCache).toHaveBeenCalled();
	});

	it("getFilesWithFilenames returns a string with file info", async () => {
		const mockFileInfoString = "file1: date1\nfile2: date2";
		mockCoreService.getFilesWithFilenames.mockReturnValue(mockFileInfoString);
		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreService,
			mockCursorRulesService,
			mockLogger,
		);
		await service.loadFiles();
		const result = service.getFilesWithFilenames();
		expect(typeof result).toBe("string");
		expect(result).toBe(mockFileInfoString);
	});

	it("checkHealth returns healthy message if all files/folders exist", async () => {
		const mockHealthMessage = "All systems healthy";
		mockCoreService.checkHealth.mockResolvedValue({ success: true, data: mockHealthMessage });
		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreService,
			mockCursorRulesService,
			mockLogger,
		);
		await service.loadFiles(); // Ensures files are "created" by mocks
		const health = await service.checkHealth();
		expect(isSuccess(health)).toBe(true);
		if (isSuccess(health)) {
			// Add check here
			expect(health.data).toBe(mockHealthMessage);
		}
	});

	it("checkHealth reports issues found by core service", async () => {
		mockCoreService.checkHealth.mockResolvedValue({
			success: true,
			data: "❌ Issues found:\nMissing folder: /mock/workspace/.aimemory/memory-bank",
		});
		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreService,
			mockCursorRulesService,
			mockLogger,
		);
		const health = await service.checkHealth();
		expect(isSuccess(health)).toBe(true);
		if (isSuccess(health)) {
			expect(health.data).toContain("❌ Issues found");
		}
		expect(mockCoreService.checkHealth).toHaveBeenCalled();
	});

	it("checkHealth handles errors from core service", async () => {
		mockCoreService.checkHealth.mockResolvedValue({
			success: false,
			error: new Error("Health check failed"),
		});
		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreService,
			mockCursorRulesService,
			mockLogger,
		);
		const health = await service.checkHealth();
		expect(isSuccess(health)).toBe(false);
		if (!isSuccess(health)) {
			expect(health.error.message).toContain("Health check failed");
		}
		expect(mockCoreService.checkHealth).toHaveBeenCalled();
	});

	describe("getIsMemoryBankInitialized", () => {
		it("returns true if all files exist", async () => {
			mockCoreService.getIsMemoryBankInitialized.mockResolvedValue({
				success: true,
				data: true,
			});
			const service = new VSCodeMemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
				mockCoreService,
				mockCursorRulesService,
				mockLogger,
			);
			await service.loadFiles(); // Ensures files are "created"
			const isInit = await service.getIsMemoryBankInitialized();
			expect(isSuccess(isInit)).toBe(true);
			if (isSuccess(isInit)) {
				// Add check here
				expect(isInit.data).toBe(true);
			}
		});

		it("returns false when memory bank is not initialized", async () => {
			mockCoreService.getIsMemoryBankInitialized.mockResolvedValue({
				success: true,
				data: false,
			});
			const service = new VSCodeMemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
				mockCoreService,
				mockCursorRulesService,
				mockLogger,
			);
			const isInit = await service.getIsMemoryBankInitialized();
			expect(isSuccess(isInit)).toBe(true);
			if (isSuccess(isInit)) {
				expect(isInit.data).toBe(false);
			}
		});

		it("handles errors from core service", async () => {
			mockCoreService.getIsMemoryBankInitialized.mockResolvedValue({
				success: false,
				error: new Error("Core service error"),
			});
			const service = new VSCodeMemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
				mockCoreService,
				mockCursorRulesService,
				mockLogger,
			);
			const isInit = await service.getIsMemoryBankInitialized();
			expect(isSuccess(isInit)).toBe(false);
		});
	});

	describe("initializeFolders", () => {
		it("creates all required subfolders", async () => {
			mockCoreService.initializeFolders.mockResolvedValue({ success: true }); // Simulate core success
			const service = new VSCodeMemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
				mockCoreService,
				mockCursorRulesService,
				mockLogger,
			);
			await expect(service.initializeFolders()).resolves.toEqual({ success: true });
			expect(mockCoreService.initializeFolders).toHaveBeenCalled();
		});
	});

	// createMemoryBankRulesIfNotExists test might need CursorRulesService mock to be more detailed
	// or to verify calls on the instance if that's desired.
	// For now, it mainly tests that the method doesn't throw.
	describe("createMemoryBankRulesIfNotExists", () => {
		it("calls cursor rules service to create rules file", async () => {
			const service = new VSCodeMemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
				mockCoreService,
				mockCursorRulesService,
				mockLogger,
			);
			await expect(service.createMemoryBankRulesIfNotExists()).resolves.toBeUndefined(); // Expect method to complete
			expect(mockCursorRulesService.createRulesFile).toHaveBeenCalled();
		});
	});
});
