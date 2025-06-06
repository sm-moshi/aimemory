import { vi } from "vitest";

// Modern Vitest pattern: Create properly structured mock objects
// Note: vi.hoisted() is for module-level hoisting, not for creating shared instances

/**
 * Shared logger mock - used across multiple test files
 * Replaces individual logger mocking in every test
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
 * Shared MCP server instance mock
 * Consolidates MCP server mocking patterns
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
 * Shared memory bank service core mock
 * Replaces duplicate memory bank service mocking
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
 * Shared file system operations mock
 * Consolidates common file operation patterns
 */
export const mockFileOperations = {
	ensureDir: vi.fn().mockResolvedValue(undefined),
	readFile: vi.fn().mockResolvedValue("mock file content"),
	writeFile: vi.fn().mockResolvedValue(undefined),
	pathExists: vi.fn().mockResolvedValue(true),
	remove: vi.fn().mockResolvedValue(undefined),
	copy: vi.fn().mockResolvedValue(undefined),
	mkdirWithRetry: vi.fn().mockResolvedValue(undefined),
	readFileWithRetry: vi.fn().mockResolvedValue("mock content"),
	writeFileWithRetry: vi.fn().mockResolvedValue(undefined),
};

/**
 * Shared path utilities mock
 * Replaces path-related mocking across tests
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
 * Shared validation mock
 * Consolidates validation patterns
 */
export const mockValidation = {
	validateMemoryBankPath: vi.fn().mockReturnValue(true),
	validateFileContent: vi.fn().mockReturnValue(true),
	sanitizePath: vi.fn((path: string) => path),
	validateToolParameters: vi.fn().mockReturnValue(true),
};

/**
 * Shared VS Code window mock
 * Replaces mockVscodeWindow from global-mocks
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
 * Shared VS Code commands mock
 * Replaces mockVscodeCommands from global-mocks
 */
export const mockCommands = {
	registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
	registerTextEditorCommand: vi.fn(() => ({ dispose: vi.fn() })),
	executeCommand: vi.fn(),
};

/**
 * Shared VS Code workspace mock - with proper structure
 * Replaces mockVscodeWorkspace from global-mocks
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
 * Reset all shared mocks - call this in global setup or individual tests
 */
export function resetSharedMocks() {
	// Logger mocks
	if (mockLogger.info && typeof mockLogger.info.mockClear === "function") {
		mockLogger.info.mockClear();
		mockLogger.error.mockClear();
		mockLogger.warn.mockClear();
		mockLogger.debug.mockClear();
		mockLogger.verbose.mockClear();
		mockLogger.setLevel.mockClear();
		mockLogger.showOutput.mockClear();
	}

	// Output channel mocks
	if (
		mockOutputChannel.appendLine &&
		typeof mockOutputChannel.appendLine.mockClear === "function"
	) {
		mockOutputChannel.appendLine.mockClear();
		mockOutputChannel.show.mockClear();
		mockOutputChannel.dispose.mockClear();
		mockOutputChannel.clear.mockClear();
		mockOutputChannel.hide.mockClear();
	}

	// MCP server mocks
	if (mockMcpServer.registerTool && typeof mockMcpServer.registerTool.mockClear === "function") {
		mockMcpServer.registerTool.mockClear();
		mockMcpServer.registerResource.mockClear();
		mockMcpServer.start.mockClear();
		mockMcpServer.stop.mockClear();
		mockMcpServer.connect.mockClear();
		mockMcpServer.close.mockClear();
	}

	// Memory bank service mocks
	if (
		mockMemoryBankServiceCore.initialize &&
		typeof mockMemoryBankServiceCore.initialize.mockClear === "function"
	) {
		mockMemoryBankServiceCore.initialize.mockClear();
		mockMemoryBankServiceCore.readMemoryBankFiles.mockClear();
		mockMemoryBankServiceCore.updateMemoryBankFile.mockClear();
		mockMemoryBankServiceCore.getMemoryBankMetadata.mockClear();
		mockMemoryBankServiceCore.validateMemoryBankStructure.mockClear();
		mockMemoryBankServiceCore.getMemoryBank.mockClear();
		mockMemoryBankServiceCore.healthCheck.mockClear();
		mockMemoryBankServiceCore.createFile.mockClear();
	}

	// File operations mocks
	if (
		mockFileOperations.ensureDir &&
		typeof mockFileOperations.ensureDir.mockClear === "function"
	) {
		mockFileOperations.ensureDir.mockClear();
		mockFileOperations.readFile.mockClear();
		mockFileOperations.writeFile.mockClear();
		mockFileOperations.pathExists.mockClear();
		mockFileOperations.remove.mockClear();
		mockFileOperations.copy.mockClear();
		mockFileOperations.mkdirWithRetry.mockClear();
		mockFileOperations.readFileWithRetry.mockClear();
		mockFileOperations.writeFileWithRetry.mockClear();
	}

	// Path utils mocks
	if (mockPathUtils.join && typeof mockPathUtils.join.mockClear === "function") {
		mockPathUtils.join.mockClear();
		mockPathUtils.resolve.mockClear();
		mockPathUtils.dirname.mockClear();
		mockPathUtils.basename.mockClear();
		mockPathUtils.extname.mockClear();
		mockPathUtils.normalize.mockClear();
	}

	// Validation mocks
	if (
		mockValidation.validateMemoryBankPath &&
		typeof mockValidation.validateMemoryBankPath.mockClear === "function"
	) {
		mockValidation.validateMemoryBankPath.mockClear();
		mockValidation.validateFileContent.mockClear();
		mockValidation.sanitizePath.mockClear();
		mockValidation.validateToolParameters.mockClear();
	}

	// VS Code window mocks
	if (
		mockWindow.showInformationMessage &&
		typeof mockWindow.showInformationMessage.mockClear === "function"
	) {
		mockWindow.showInformationMessage.mockClear();
		mockWindow.showErrorMessage.mockClear();
		mockWindow.showWarningMessage.mockClear();
		mockWindow.showQuickPick.mockClear();
		mockWindow.createWebviewPanel.mockClear();
		mockWindow.createOutputChannel.mockClear();
	}

	// VS Code commands mocks
	if (
		mockCommands.registerCommand &&
		typeof mockCommands.registerCommand.mockClear === "function"
	) {
		mockCommands.registerCommand.mockClear();
		mockCommands.registerTextEditorCommand.mockClear();
		mockCommands.executeCommand.mockClear();
	}

	// VS Code workspace mocks
	if (mockWorkspace.fs.stat && typeof mockWorkspace.fs.stat.mockClear === "function") {
		mockWorkspace.fs.stat.mockClear();
		mockWorkspace.fs.readFile.mockClear();
		mockWorkspace.fs.writeFile.mockClear();
		mockWorkspace.fs.delete.mockClear();
		mockWorkspace.fs.createDirectory.mockClear();
		mockWorkspace.fs.readDirectory.mockClear();
		mockWorkspace.getConfiguration.mockClear();
	}

	// VS Code workspace filesystem mocks
	if (mockVscodeWorkspaceFs.stat && typeof mockVscodeWorkspaceFs.stat.mockClear === "function") {
		mockVscodeWorkspaceFs.stat.mockClear();
		mockVscodeWorkspaceFs.readFile.mockClear();
		mockVscodeWorkspaceFs.writeFile.mockClear();
		mockVscodeWorkspaceFs.delete.mockClear();
		mockVscodeWorkspaceFs.createDirectory.mockClear();
		mockVscodeWorkspaceFs.readDirectory.mockClear();
	}

	// Node.js fs mocks
	if (mockNodeFs.stat && typeof mockNodeFs.stat.mockClear === "function") {
		mockNodeFs.stat.mockClear();
		mockNodeFs.readFile.mockClear();
		mockNodeFs.writeFile.mockClear();
		mockNodeFs.mkdir.mockClear();
		mockNodeFs.mkdtemp.mockClear();
		mockNodeFs.readdir.mockClear();
		mockNodeFs.access.mockClear();
		mockNodeFs.copyFile.mockClear();
		mockNodeFs.unlink.mockClear();
		mockNodeFs.rmdir.mockClear();
	}

	// Webview manager mocks
	if (
		mockWebviewManager.openWebview &&
		typeof mockWebviewManager.openWebview.mockClear === "function"
	) {
		mockWebviewManager.openWebview.mockClear();
		mockWebviewManager.closeWebview.mockClear();
		mockWebviewManager.sendMessage.mockClear();
		mockWebviewManager.dispose.mockClear();
	}

	// Memory bank adapter mocks
	if (mockMemoryBank.initialize && typeof mockMemoryBank.initialize.mockClear === "function") {
		mockMemoryBank.initialize.mockClear();
		mockMemoryBank.healthCheck.mockClear();
		mockMemoryBank.createFile.mockClear();
		mockMemoryBank.getIsMemoryBankInitialized.mockClear();
	}
}
