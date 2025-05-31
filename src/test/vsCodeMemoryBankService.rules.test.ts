import { beforeEach, describe, expect, it, vi } from "vitest";
import { VSCodeMemoryBankService } from "../core/vsCodeMemoryBankService.js";

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
vi.mock("../lib/rules/memory-bank-rules.md", () => ({ default: "Mocked Markdown Content" }));

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

describe("VSCodeMemoryBankService createMemoryBankRulesIfNotExists", () => {
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
