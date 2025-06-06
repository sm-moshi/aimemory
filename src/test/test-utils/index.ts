// Export all test utilities from a central location
export {
	mockCommands,
	mockWindow,
	mockWorkspace,
	mockLogger,
	mockMcpServer,
	mockMemoryBankServiceCore,
	mockFileOperations,
	mockPathUtils,
	mockValidation,
	mockVscodeWorkspaceFs,
	mockOutputChannel,
	mockNodeFs,
	mockWebviewManager,
	mockMemoryBank,
} from "../setup/shared-mocks.js";

// Re-export vscode-specific mocks
export { mockVscodeWindow } from "../__mocks__/vscode.js";

// MCP-specific mocks (import directly when needed)
export {
	createMockLogger,
	createSecurityMockLogger,
	createMockFileOperationManager,
	createMockCacheManager,
	createMockExtensionContext,
	createMockMemoryBankServiceCore,
	createMockConsole,
	createMockCursorRulesService,
	createMockMemoryBankFile,
	createMockDirectoryListing,
	createMockFileStats,
	createEnoentError,
	createEaccesError,
	createFileMetrics,
	createTempDirectory,
	createTestFilePath,
	createTestRulesFilePath,
	createAIMemoryServerConfig,
	createTestCursorMCPConfig,
	setupCommonFileOperationMocks,
	setupMockCoreServiceDefaults,
	setupVSCodeMock,
	getVSCodeMock,
	// Test setup functions
	standardBeforeEach,
	standardAfterEach,
} from "./utilities.js";

// Centralized service mocks
export {
	createMockMetadataIndexManager,
	createMockMemoryBankService,
	createMockMCPServer,
	createMockWebviewManager,
	createMockCoreService,
	createMockMemoryBankWithDefaults,
	commonModuleMocks,
} from "../__mocks__/services.js";

export {
	expectSuccess,
	expectFailure,
	expectBuildResult,
	expectConstructorError,
	expectValidationSuccess,
	expectValidationFailure,
	expectAsyncSuccess,
	expectAsyncFailure,
	expectSecurityValidationFailure,
	setupMaliciousPathRejection,
	setupValidPathAcceptance,
	setupSecurityValidationError,
} from "./utilities.js";

export {
	getPath,
	createMockCursorConfigPaths,
	getOriginalValidateMemoryBankPath,
	getOriginalSanitizePath,
	getOriginalValidateCommand,
} from "./utilities.js";

export { SECURITY_TEST_DATA } from "./utilities.js";
export { resetSharedMocks } from "../setup/shared-mocks.js";
