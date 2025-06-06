import {
	createMockExtensionContext,
	createMockLogger,
	expectAsyncFailure,
	expectAsyncSuccess,
	setupVSCodeMock,
	standardAfterEach,
	standardBeforeEach,
} from "@test-utils/index.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VSCodeMemoryBankService } from "../../core/vsCodeMemoryBankService.js";
import { MemoryBankFileType, isSuccess } from "../../types/index.js";

// Mock Markdown import to avoid Rollup parse errors
vi.mock("../../lib/rules/memory-bank-rules.md", () => ({ default: "Mocked Markdown Content" }));

// Test Helper Functions
function createMockCoreService() {
	return {
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
		getFileOperationManager: vi.fn().mockReturnValue({
			getAllFiles: vi.fn(),
			readFileWithRetry: vi.fn().mockResolvedValue({
				success: true,
				data: "Mock memory bank rules content",
			}),
			writeFileWithRetry: vi.fn().mockResolvedValue({ success: true }),
		}),
	} as any;
}

function createMockCursorRulesService() {
	return {
		createRulesFile: vi.fn(),
	} as any;
}

function createTestService(
	overrides: {
		coreService?: any;
		cursorRulesService?: any;
		logger?: any;
		context?: any;
	} = {},
) {
	const context = overrides.context ?? createMockExtensionContext();
	const coreService = overrides.coreService ?? createMockCoreService();
	const cursorRulesService = overrides.cursorRulesService ?? createMockCursorRulesService();
	const logger = overrides.logger ?? createMockLogger();

	return new VSCodeMemoryBankService(context, coreService, cursorRulesService, logger);
}

function setupMockCoreServiceDefaults(mockCoreService: any) {
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

// Basic Operations & State Tests
describe("VSCodeMemoryBankService - Basic Operations & State", () => {
	let mockCoreService: any;

	beforeEach(() => {
		standardBeforeEach();
		setupVSCodeMock();
		mockCoreService = createMockCoreService();
		setupMockCoreServiceDefaults(mockCoreService);
	});

	afterEach(() => {
		standardAfterEach();
	});

	it("throws if no workspace folder is found", async () => {
		const vscode = await import("vscode");
		const original = vscode.workspace.workspaceFolders;
		vi.mocked(vscode.workspace).workspaceFolders = undefined;

		const mockCoreServiceThatThrows = createMockCoreService();
		mockCoreServiceThatThrows.loadFiles.mockRejectedValue(
			new Error("Cannot initialize MemoryBankServiceCore: No workspace folder found"),
		);

		const service = createTestService({ coreService: mockCoreServiceThatThrows });

		await expect(service.loadFiles()).rejects.toThrow(
			"Cannot initialize MemoryBankServiceCore: No workspace folder found",
		);

		vi.mocked(vscode.workspace).workspaceFolders = original;
	});

	it("isReady returns false before loadFiles, true after", async () => {
		mockCoreService.isReady.mockReturnValueOnce(false).mockReturnValueOnce(true);
		const service = createTestService({ coreService: mockCoreService });

		expect(service.isReady()).toBe(false);
		await service.loadFiles();
		expect(service.isReady()).toBe(true);
	});

	it("getFile returns undefined if not loaded, then returns file after loadFiles", async () => {
		const mockFile = { content: "mock content" };
		mockCoreService.getFile.mockReturnValueOnce(undefined).mockReturnValueOnce(mockFile);

		const service = createTestService({ coreService: mockCoreService });
		expect(service.getFile(MemoryBankFileType.ProjectBrief)).toBeUndefined();

		await service.loadFiles();
		const file = service.getFile(MemoryBankFileType.ProjectBrief);
		expect(file).toBeDefined();
		expect(file?.content).toBe("mock content");
	});

	it("getAllFiles returns all loaded files", async () => {
		const mockFiles = [{ content: "file1" }, { content: "file2" }];
		mockCoreService.getAllFiles.mockReturnValue(mockFiles);

		const service = createTestService({ coreService: mockCoreService });
		await service.loadFiles();

		const files = service.getAllFiles();
		expect(Array.isArray(files)).toBe(true);
		expect(files.length).toBe(mockFiles.length);
	});

	it("getFilesWithFilenames returns a string with file info", async () => {
		const mockFileInfoString = "file1: date1\nfile2: date2";
		mockCoreService.getFilesWithFilenames.mockReturnValue(mockFileInfoString);

		const service = createTestService({ coreService: mockCoreService });
		await service.loadFiles();

		const result = service.getFilesWithFilenames();
		expect(typeof result).toBe("string");
		expect(result).toBe(mockFileInfoString);
	});
});

// File Management & Caching Tests
describe("VSCodeMemoryBankService - File Management & Caching", () => {
	let mockCoreService: any;

	beforeEach(() => {
		standardBeforeEach();
		setupVSCodeMock();
		mockCoreService = createMockCoreService();
		setupMockCoreServiceDefaults(mockCoreService);
	});

	afterEach(() => {
		standardAfterEach();
	});

	it("updateFile updates the file content and lastUpdated", async () => {
		const initialFile = { content: "initial content", lastUpdated: new Date() };
		mockCoreService.getFile.mockReturnValue(initialFile);
		mockCoreService.updateFile.mockResolvedValue({ success: true });

		const service = createTestService({ coreService: mockCoreService });
		await service.loadFiles();

		const initialFileLoaded = service.getFile(MemoryBankFileType.ProjectBrief);
		expect(initialFileLoaded).toBeDefined();

		if (initialFileLoaded && initialFileLoaded.lastUpdated instanceof Date) {
			await service.updateFile(MemoryBankFileType.ProjectBrief, "new content");
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

		const service = createTestService({ coreService: mockCoreService });
		const result = await service.updateFile(MemoryBankFileType.ProjectBrief, "new content");

		expect(result).toEqual({ success: false, error: new Error("Write update failed") });
		expect(mockCoreService.updateFile).toHaveBeenCalledWith(
			MemoryBankFileType.ProjectBrief,
			"new content",
		);
	});

	it("can invalidate specific file cache", async () => {
		const service = createTestService({ coreService: mockCoreService });
		await service.loadFiles();

		service.invalidateCache("/mock/workspace/.aimemory/memory-bank/core/projectbrief.md");
		expect(mockCoreService.invalidateCache).toHaveBeenCalledWith(
			"/mock/workspace/.aimemory/memory-bank/core/projectbrief.md",
		);

		const stats = service.getCacheStats();
		expect(stats).toBeDefined();
	});

	it("can clear all cache", async () => {
		const service = createTestService({ coreService: mockCoreService });
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

		const service = createTestService({ coreService: mockCoreService });
		await service.loadFiles();
		service.invalidateCache();

		const result = await service.getIsMemoryBankInitialized();
		expectAsyncSuccess(result, false);
		expect(mockCoreService.getIsMemoryBankInitialized).toHaveBeenCalled();
		expect(mockCoreService.invalidateCache).toHaveBeenCalled();
	});
});

// Health & Initialization Tests
describe("VSCodeMemoryBankService - Health & Initialization", () => {
	let mockCoreService: any;

	beforeEach(() => {
		standardBeforeEach();
		setupVSCodeMock();
		mockCoreService = createMockCoreService();
		setupMockCoreServiceDefaults(mockCoreService);
	});

	afterEach(() => {
		standardAfterEach();
	});

	it("checkHealth returns healthy message if all files/folders exist", async () => {
		const mockHealthMessage = "All systems healthy";
		mockCoreService.checkHealth.mockResolvedValue({ success: true, data: mockHealthMessage });

		const service = createTestService({ coreService: mockCoreService });
		await service.loadFiles();

		const health = await service.checkHealth();
		expectAsyncSuccess(health, mockHealthMessage);
	});

	it("checkHealth reports issues found by core service", async () => {
		mockCoreService.checkHealth.mockResolvedValue({
			success: true,
			data: "❌ Issues found:\nMissing folder: /mock/workspace/.aimemory/memory-bank",
		});

		const service = createTestService({ coreService: mockCoreService });
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

		const service = createTestService({ coreService: mockCoreService });
		const health = await service.checkHealth();

		expectAsyncFailure(health, "Health check failed");
		expect(mockCoreService.checkHealth).toHaveBeenCalled();
	});

	describe("getIsMemoryBankInitialized", () => {
		it("returns true if all files exist", async () => {
			mockCoreService.getIsMemoryBankInitialized.mockResolvedValue({
				success: true,
				data: true,
			});

			const service = createTestService({ coreService: mockCoreService });
			await service.loadFiles();

			const isInit = await service.getIsMemoryBankInitialized();
			expectAsyncSuccess(isInit, true);
		});

		it("returns false when memory bank is not initialized", async () => {
			mockCoreService.getIsMemoryBankInitialized.mockResolvedValue({
				success: true,
				data: false,
			});

			const service = createTestService({ coreService: mockCoreService });
			const isInit = await service.getIsMemoryBankInitialized();
			expectAsyncSuccess(isInit, false);
		});

		it("handles errors from core service", async () => {
			mockCoreService.getIsMemoryBankInitialized.mockResolvedValue({
				success: false,
				error: new Error("Core service error"),
			});

			const service = createTestService({ coreService: mockCoreService });
			const isInit = await service.getIsMemoryBankInitialized();
			expectAsyncFailure(isInit, "Core service error");
		});
	});

	it("initializeFolders creates all required subfolders", async () => {
		mockCoreService.initializeFolders.mockResolvedValue({ success: true });

		const service = createTestService({ coreService: mockCoreService });
		await expect(service.initializeFolders()).resolves.toEqual({ success: true });
		expect(mockCoreService.initializeFolders).toHaveBeenCalled();
	});
});

// Rules & VS Code Integration Tests
describe("VSCodeMemoryBankService - Rules & VS Code Integration", () => {
	let mockCoreService: any;
	let mockCursorRulesService: any;
	let mockLogger: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockCoreService = createMockCoreService();
		mockCursorRulesService = createMockCursorRulesService();
		mockLogger = createMockLogger();
		setupMockCoreServiceDefaults(mockCoreService);
		mockCursorRulesService.createRulesFile.mockResolvedValue(undefined);
	});

	it("calls cursor rules service to create rules file", async () => {
		const service = createTestService({
			coreService: mockCoreService,
			cursorRulesService: mockCursorRulesService,
			logger: mockLogger,
		});

		await expect(service.createMemoryBankRulesIfNotExists()).resolves.toBeUndefined();
		expect(mockCursorRulesService.createRulesFile).toHaveBeenCalled();
		expect(mockCoreService.getFileOperationManager).toHaveBeenCalled();
	});
});
