import { vi } from "vitest";
import { createMockFileOperationManager, createMockLogger } from "../test-utils/utilities";

/**
 * Centralized service mocks to reduce boilerplate across test files
 */

/**
 * Mock MetadataIndexManager for MetadataSearchEngine tests
 */
export const createMockMetadataIndexManager = () =>
	({
		getIndex: vi.fn(),
		rebuildIndex: vi.fn(),
		getStats: vi.fn(),
		addEntry: vi.fn(),
		updateEntry: vi.fn(),
		removeEntry: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	}) as any;

/**
 * Mock MemoryBank service for command handler tests
 */
export const createMockMemoryBankService = () => ({
	getIsMemoryBankInitialized: vi.fn(),
	initializeFolders: vi.fn(),
	loadFiles: vi.fn(),
	checkHealth: vi.fn(),
	getAllFiles: vi.fn(),
	writeFileByPath: vi.fn(),
	initialize: vi.fn(), // Add missing methods
	healthCheck: vi.fn(),
	createFile: vi.fn(),
	getFile: vi.fn(),
	updateFile: vi.fn(),
	isReady: vi.fn(),
});

/**
 * Mock MCP Server for extension tests
 */
export const createMockMCPServer = () => ({
	getMemoryBank: vi.fn(),
	updateMemoryBankFile: vi.fn(),
	start: vi.fn(),
	stop: vi.fn(),
	getPort: vi.fn(() => 3000),
	setExternalServerRunning: vi.fn(),
	handleCommand: vi.fn(),
	isServerRunning: vi.fn(() => true),
});

/**
 * Mock WebviewManager for command handler tests
 */
export const createMockWebviewManager = () => ({
	openWebview: vi.fn(),
	closeWebview: vi.fn(),
	sendMessage: vi.fn(),
	isWebviewOpen: vi.fn(() => false),
});

/**
 * Mock CursorRulesService
 */
export const createMockCursorRulesService = () => ({
	createRulesFile: vi.fn(),
	readRulesFile: vi.fn(),
	listAllRulesFilesInfo: vi.fn(),
});

/**
 * Mock MemoryBankServiceCore with all commonly used methods
 */
export const createMockCoreService = () => ({
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
	getFileOperationManager: vi.fn().mockReturnValue(createMockFileOperationManager()),
});

/**
 * Complex helper function mocks for MemoryBankServiceCore tests
 */
export const createMockHelperFunctions = () => ({
	mockValidateMemoryBankDirectory: vi.fn(),
	mockValidateAllMemoryBankFiles: vi.fn(),
	mockLoadAllMemoryBankFiles: vi.fn(),
	mockPerformHealthCheck: vi.fn(),
	mockEnsureMemoryBankFolders: vi.fn(),
	mockUpdateMemoryBankFileHelper: vi.fn(),
});

/**
 * Mock FileStreamer for streaming tests
 */
export const createMockFileStreamer = () => ({
	streamFile: vi.fn(),
});

/**
 * Mock StreamFile function for global use
 */
export const mockStreamFile = vi.fn();

/**
 * Export as streamFileMock for backward compatibility
 */
export const streamFileMock = mockStreamFile;

/**
 * Module mocks for complex dependencies - centralizes vi.mock patterns
 */
export const createModuleMocks = () => ({
	// Extension dependencies
	extensionDependencies: () => {
		vi.mock("@/app/extension/commandHandler", () => ({
			commandHandler: vi.fn(() => ({
				registerCommands: vi.fn(),
			})),
		}));
		vi.mock("@/core/memoryBankServiceCore", () => ({
			memoryBankServiceCore: vi.fn(() => createMockCoreService()),
		}));
		vi.mock("@/cursor/rules-service", () => ({
			cursorRulesService: vi.fn(() => createMockCursorRulesService()),
		}));
	},

	// Memory bank file helpers
	memoryBankHelpers: (helpers = createMockHelperFunctions()) => {
		vi.mock("@/core/memory-bank-file-helpers", () => ({
			validateMemoryBankDirectory: helpers.mockValidateMemoryBankDirectory,
			validateAllMemoryBankFiles: helpers.mockValidateAllMemoryBankFiles,
			loadAllMemoryBankFiles: helpers.mockLoadAllMemoryBankFiles,
			performHealthCheck: helpers.mockPerformHealthCheck,
			ensureMemoryBankFolders: helpers.mockEnsureMemoryBankFolders,
			updateMemoryBankFile: helpers.mockUpdateMemoryBankFileHelper,
		}));
	},

	// Streaming dependencies
	streamingDependencies: () => {
		vi.mock("@/performance/FileStreamer", () => ({
			fileStreamer: vi.fn().mockImplementation(() => ({
				streamFile: mockStreamFile,
			})),
		}));
		vi.mock("@/utils/system/path-sanitizer", () => ({
			sanitizePath: vi.fn((inputPath, root) => {
				const path = require("node:path");
				const resolvedRoot = path.resolve(root ?? "/test/memory-bank");
				if (inputPath.includes("..")) {
					throw new Error("Path traversal attempt");
				}
				return path.resolve(resolvedRoot, inputPath);
			}),
		}));
	},

	// Template mocks
	templateMocks: () => {
		vi.mock("@/shared/templates/template-registry", () => ({
			getTemplateForFileType: vi.fn((fileType: string) => `Template for ${fileType}`),
		}));
		vi.mock("@/lib/memoryBankTemplates", () => ({
			getTemplateForFileType: vi.fn().mockReturnValue("mock template content"),
		}));
	},

	// Logger mocks
	loggerMocks: () => {
		vi.mock("@/utils/log", () => ({
			logger: {
				getInstance: () => createMockLogger(),
			},
			logLevel: { info: 2, error: 4, warn: 3, debug: 1, trace: 0, off: 5 },
		}));
	},
});

/**
 * Mock module patterns commonly used across tests
 */
export const commonModuleMocks = {
	memoryBankServiceCore: () => {
		vi.mock("@/core/memoryBankServiceCore", () => ({
			memoryBankServiceCore: vi.fn(() => createMockCoreService()),
		}));
	},

	baseMcpServer: () => {
		vi.mock("@/mcp/shared/baseMcpServer", () => ({
			BaseMCPServer: vi.fn().mockImplementation(() => ({
				server: {
					resource: vi.fn(),
					tool: vi.fn(),
					prompt: vi.fn(),
				},
				registerTools: vi.fn(),
				registerPrompts: vi.fn(),
				connect: vi.fn(),
				start: vi.fn(),
				stop: vi.fn(),
			})),
		}));
	},

	mcpPromptsRegistry: () => {
		vi.mock("@/cursor/mcp-prompts-registry", () => ({
			registerMemoryBankPrompts: vi.fn(),
		}));
	},

	memoryBankRules: () => {
		vi.mock("../../lib/rules/memory-bank-rules.md", () => ({
			default: "Mocked Markdown Content",
		}));
	},
};

/**
 * Setup default mock behaviors for core service
 */
export const setupMockCoreServiceDefaults = (mockCoreService: any) => {
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
};

/**
 * Create mock with common defaults for memory bank service
 */
export const createMockMemoryBankWithDefaults = () => {
	const mock = createMockMemoryBankService();
	mock.getIsMemoryBankInitialized.mockResolvedValue({ success: true, data: false });
	mock.initialize.mockResolvedValue({ success: true });
	mock.healthCheck.mockResolvedValue({ success: true });
	mock.createFile.mockResolvedValue({ success: true });
	return mock;
};
