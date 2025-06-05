// Export all test utilities from a central location

// =============================================================================
// CORE TEST UTILITIES
// =============================================================================

// Mock factories and setup
export {
	createMockLogger,
	createMockFileOperationManager,
	createMockExtensionContext,
	createMockMemoryBankServiceCore,
	createMockConsole,
	createMockCursorRulesService,
	setupMockCoreServiceDefaults,
	MockReadStream,
	setupVSCodeMock,
} from "./mocks.js";

// Test data factories and assertion helpers
export {
	getPath,
	expectSuccess,
	expectFailure,
	expectBuildResult,
	expectConstructorError,
	expectValidationSuccess,
	expectValidationFailure,
	expectAsyncSuccess,
	expectAsyncFailure,
	createMockMemoryBankFile,
	createTestFilePath,
	createTestRulesFilePath,
	createAIMemoryServerConfig,
	createTestCursorMCPConfig,
	createMockDirectoryListing,
	createEnoentError,
	createFileMetrics,
	createTempDirectory,
} from "./utilities.js";

// Specialized file operation mocks (kept separate due to complexity)
export * from "./file-operation-mock-helpers.js";

// Security-specific test utilities
export * from "./security-mock-helpers.js";

// Test utilities, assertions, and data factories
export * from "./utilities.js";

// Setup and teardown helpers (explicit exports to avoid conflicts)
export {
	standardBeforeEach,
	standardAfterEach,
	setupFileSystemMocks,
	setupVSCodeWorkspaceMocks,
	setupVSCodeWindowMocks,
	createTempTestPath,
	resetMocks,
	setupCommonFileOperationMocks,
} from "./setup-helpers.js";
