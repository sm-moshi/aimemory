import { vi } from "vitest";
import type { Mock } from "vitest";

/**
 * Standard beforeEach setup that clears all mocks
 */
export function standardBeforeEach(): void {
	vi.clearAllMocks();
}

/**
 * Standard afterEach cleanup that restores all mocks
 */
export function standardAfterEach(): void {
	vi.restoreAllMocks();
}

/**
 * Configures filesystem mocks for testing
 * @deprecated Use mocks from utilities.ts or file-operations.ts instead
 */
export function setupFileSystemMocks() {
	const mockFs = {
		readFile: vi.fn(),
		writeFile: vi.fn(),
		mkdir: vi.fn(),
		stat: vi.fn(),
		access: vi.fn(),
		readdir: vi.fn(),
	};

	// Setup default successful responses
	mockFs.readFile.mockResolvedValue("mock file content");
	mockFs.writeFile.mockResolvedValue(undefined);
	mockFs.mkdir.mockResolvedValue(undefined);
	mockFs.stat.mockResolvedValue({
		isFile: () => true,
		isDirectory: () => false,
		size: 100,
		mtime: new Date(),
	});
	mockFs.access.mockResolvedValue(undefined);
	mockFs.readdir.mockResolvedValue([]);

	return mockFs;
}

/**
 * Configures VS Code workspace mocks
 * @deprecated Use createVSCodeWorkspaceMock from mocks.ts instead
 */
export function setupVSCodeWorkspaceMocks() {
	return {
		workspaceFolders: [{ uri: { fsPath: "/mock/workspace" } }],
		getConfiguration: vi.fn(() => ({
			get: vi.fn((key: string) => {
				if (key === "aiMemory.memoryBankPath") return ".aimemory/memory-bank";
				if (key === "aiMemory.logLevel") return "info";
				return undefined;
			}),
		})),
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
 * Configures VS Code window mocks
 * @deprecated Use createVSCodeWindowMock from mocks.ts instead
 */
export function setupVSCodeWindowMocks() {
	return {
		showErrorMessage: vi.fn(),
		showWarningMessage: vi.fn(),
		showInformationMessage: vi.fn(),
	};
}

/**
 * Creates a temporary directory path for testing
 */
export function createTempTestPath(baseName = "test"): string {
	return `/tmp/${baseName}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Resets specific mocks to their default state
 */
export function resetMocks(mocks: Record<string, Mock>): void {
	for (const [, mock] of Object.entries(mocks)) {
		mock.mockReset();
	}
}

/**
 * Sets up common mock implementations for file operations
 */
export function setupCommonFileOperationMocks(
	mockFOM: ReturnType<typeof import("./mocks.js").createMockFileOperationManager>,
) {
	mockFOM.readFileWithRetry = vi.fn().mockResolvedValue({
		success: true,
		data: "mock content",
	});
	mockFOM.writeFileWithRetry = vi.fn().mockResolvedValue({ success: true });
	mockFOM.mkdirWithRetry = vi.fn().mockResolvedValue({ success: true });
	mockFOM.statWithRetry = vi.fn().mockResolvedValue({
		success: true,
		data: {
			isFile: () => true,
			isDirectory: () => false,
			size: 100,
			mtime: new Date(),
		},
	});
	mockFOM.accessWithRetry = vi.fn().mockResolvedValue({ success: true });

	return mockFOM;
}
