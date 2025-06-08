import { vi } from "vitest";

// Modern Vitest pattern: Create properly structured mock objects Note: vi.hoisted() is for
// module-level hoisting, not for creating shared instances

/**
 * Shared logger mock - used across multiple test files Replaces individual logger mocking in every
 * test
 */
export const mockLogger = {
	info: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
	debug: vi.fn(),
	verbose: vi.fn(),
	setLevel: vi.fn(),
	showOutput: vi.fn(),
};

/**
 * Mock output channel for VS Code logger
 */
export const mockOutputChannel = {
	appendLine: vi.fn(),
	show: vi.fn(),
	dispose: vi.fn(),
	clear: vi.fn(),
	hide: vi.fn(),
	name: "AI Memory",
};

/**
 * Shared MCP server instance mock Consolidates MCP server mocking patterns
 */
export const mockMcpServer = {
	registerTool: vi.fn(),
	registerResource: vi.fn(),
	start: vi.fn(),
	stop: vi.fn(),
	connect: vi.fn().mockResolvedValue(undefined),
	close: vi.fn(),
};

/**
 * Shared memory bank service core mock Replaces duplicate memory bank service mocking
 */
export const mockMemoryBankServiceCore = {
	initialize: vi.fn().mockResolvedValue(undefined),
	readMemoryBankFiles: vi.fn().mockResolvedValue([]),
	updateMemoryBankFile: vi.fn().mockResolvedValue(undefined),
	getMemoryBankMetadata: vi.fn().mockResolvedValue({}),
	validateMemoryBankStructure: vi.fn().mockResolvedValue(true),
	getMemoryBank: vi.fn().mockResolvedValue({}),
	healthCheck: vi.fn().mockResolvedValue({ success: true }),
	createFile: vi.fn().mockResolvedValue({ success: true }),
};

/**
 * Shared file system operations mock Consolidates common file operation patterns with proper Result
 * pattern
 */
export const mockFileOperations = {
	ensureDir: vi.fn().mockResolvedValue(undefined),
	readFile: vi.fn().mockResolvedValue("mock file content"),
	writeFile: vi.fn().mockResolvedValue(undefined),
	pathExists: vi.fn().mockResolvedValue(true),
	remove: vi.fn().mockResolvedValue(undefined),
	copy: vi.fn().mockResolvedValue(undefined),
	// FileOperationManager methods return Result<T, FileError> pattern
	mkdirWithRetry: vi.fn().mockResolvedValue({ success: true, data: undefined }),
	readFileWithRetry: vi.fn().mockResolvedValue({ success: true, data: "mock content" }),
	writeFileWithRetry: vi.fn().mockResolvedValue({ success: true, data: undefined }),
};

/**
 * Shared path utilities mock Replaces path-related mocking across tests
 */
export const mockPathUtils = {
	join: vi.fn((...parts: string[]) => parts.join("/")),
	resolve: vi.fn((path: string) => `/test/home/${path}`),
	dirname: vi.fn((path: string) => path.split("/").slice(0, -1).join("/")),
	basename: vi.fn((path: string) => path.split("/").pop()),
	extname: vi.fn((path: string) => (path.includes(".") ? `.${path.split(".").pop()}` : "")),
	normalize: vi.fn((path: string) => path),
};

/**
 * Shared validation mock Consolidates validation patterns
 */
export const mockValidation = {
	validateMemoryBankPath: vi.fn().mockReturnValue(true),
	validateFileContent: vi.fn().mockReturnValue(true),
	sanitizePath: vi.fn((path: string) => path),
	validateToolParameters: vi.fn().mockReturnValue(true),
};

/**
 * Shared VS Code window mock Replaces mockVscodeWindow from global-mocks
 */
export const mockWindow = {
	showInformationMessage: vi.fn(),
	showErrorMessage: vi.fn(),
	showWarningMessage: vi.fn(),
	showQuickPick: vi.fn(),
	createWebviewPanel: vi.fn(),
	createOutputChannel: vi.fn(() => mockOutputChannel),
};

/**
 * Shared VS Code commands mock Replaces mockVscodeCommands from global-mocks
 */
export const mockCommands = {
	registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
	registerTextEditorCommand: vi.fn(() => ({ dispose: vi.fn() })),
	executeCommand: vi.fn(),
};

/**
 * Shared VS Code workspace mock - with proper structure Replaces mockVscodeWorkspace from
 * global-mocks
 */
export const mockWorkspace = {
	fs: {
		stat: vi.fn(),
		readFile: vi.fn(),
		writeFile: vi.fn(),
		delete: vi.fn(),
		createDirectory: vi.fn(),
		readDirectory: vi.fn(),
	},
	workspaceFolders: [
		{
			uri: { fsPath: "/test/home" },
			name: "test-workspace",
			index: 0,
		},
	],
	getConfiguration: vi.fn(() => ({
		get: vi.fn(),
		update: vi.fn(),
	})),
};

/**
 * Shared VS Code workspace filesystem mock that works correctly
 */
export const mockVscodeWorkspaceFs = {
	stat: vi.fn(),
	readFile: vi.fn(),
	writeFile: vi.fn(),
	delete: vi.fn(),
	createDirectory: vi.fn(),
	readDirectory: vi.fn(),
};

/**
 * Mock Node.js fs module with proper Promise-based functions
 */
export const mockNodeFs = {
	stat: vi.fn(),
	readFile: vi.fn(),
	writeFile: vi.fn(),
	mkdir: vi.fn(),
	mkdtemp: vi.fn().mockResolvedValue("/temp/test-dir"),
	readdir: vi.fn(),
	access: vi.fn(),
	copyFile: vi.fn(),
	unlink: vi.fn(),
	rmdir: vi.fn(),
};

/**
 * Mock webview manager
 */
export const mockWebviewManager = {
	openWebview: vi.fn(),
	closeWebview: vi.fn(),
	sendMessage: vi.fn(),
	dispose: vi.fn(),
};

/**
 * Mock memory bank adapter
 */
export const mockMemoryBank = {
	initialize: vi.fn().mockResolvedValue({ success: true }),
	healthCheck: vi.fn().mockResolvedValue({ success: true }),
	createFile: vi.fn().mockResolvedValue({ success: true }),
	getIsMemoryBankInitialized: vi.fn().mockResolvedValue(true),
};

/**
 * Mock streaming dependencies
 */
export const mockStreamFile = vi.fn().mockResolvedValue({
	success: true,
	data: { content: "mock stream content", wasStreamed: true },
});

/**
 * Mock file streamer
 */
export const mockFileStreamer = {
	streamFile: mockStreamFile,
};

/**
 * Helper function to safely clear mock functions in an object Provides explicit control while
 * reducing repetitive code
 */
function clearMockGroup(mockObj: Record<string, any>, groupName: string): void {
	if (!mockObj) {
		console.warn(`Mock group "${groupName}" is undefined, skipping cleanup`);
		return;
	}

	// Verify at least one property has mockClear before proceeding
	const hasAnyMockClear = Object.values(mockObj).some(prop => prop && typeof prop.mockClear === "function");

	if (!hasAnyMockClear) {
		console.warn(`Mock group "${groupName}" has no mockClear functions, skipping cleanup`);
		return;
	}

	// Clear all mock functions in the object
	for (const [key, value] of Object.entries(mockObj)) {
		if (value && typeof value.mockClear === "function") {
			value.mockClear();
		}
		// Handle nested objects (like workspace.fs)
		else if (value && typeof value === "object" && !Array.isArray(value)) {
			clearMockGroup(value, `${groupName}.${key}`);
		}
	}
}

/**
 * Reset all shared mocks to their initial state Explicitly handles each mock group for
 * maintainability and debugging
 */
export function resetSharedMocks() {
	// Core service mocks - explicitly listed for clarity
	clearMockGroup(mockLogger, "Logger");
	clearMockGroup(mockOutputChannel, "OutputChannel");
	clearMockGroup(mockMcpServer, "MCP Server");
	clearMockGroup(mockMemoryBankServiceCore, "MemoryBank Service Core");
	clearMockGroup(mockFileOperations, "FileOperations");
	clearMockGroup(mockPathUtils, "PathUtils");
	clearMockGroup(mockValidation, "Validation");
	clearMockGroup(mockMemoryBank, "MemoryBank");

	// VS Code extension mocks
	clearMockGroup(mockWorkspace, "VS Code Workspace");
	clearMockGroup(mockVscodeWorkspaceFs, "VS Code Workspace FS");
	clearMockGroup(mockWindow, "VS Code Window");
	clearMockGroup(mockCommands, "VS Code Commands");
	clearMockGroup(mockWebviewManager, "Webview Manager");

	// Node.js module mocks
	clearMockGroup(mockNodeFs, "Node.js FS");

	// Performance and streaming mocks
	clearMockGroup(mockFileStreamer, "FileStreamer");

	// Handle special case - mockStreamFile is a function, not an object
	if (mockStreamFile && typeof mockStreamFile.mockClear === "function") {
		mockStreamFile.mockClear();
	}
}
