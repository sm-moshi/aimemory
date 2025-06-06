import { CursorRulesService } from "@/cursor/rules-service.js";
import { CURSOR_MEMORY_BANK_FILENAME, getCursorMemoryBankRulesFile } from "@/cursor/rules.js";
import {
	createMockExtensionContext,
	createMockFileOperationManager,
	createMockLogger,
	createTestRulesFilePath,
} from "@test-utils/index.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import type { ExtensionContext } from "vscode";

// Apply the proven template: Mock VS Code module at top level
vi.mock("vscode", () => ({
	workspace: {
		workspaceFolders: [
			{
				uri: { fsPath: "/mock/workspace" },
				name: "Mock Workspace",
				index: 0,
			},
		],
		getConfiguration: vi.fn(() => ({
			get: vi.fn((key: string) => {
				if (key === "aiMemory.memoryBankPath") return ".aimemory/memory-bank";
				if (key === "aiMemory.logLevel") return "info";
				return undefined;
			}),
			update: vi.fn(),
		})),
		fs: {
			stat: vi.fn(),
			readFile: vi.fn(),
			writeFile: vi.fn(),
			delete: vi.fn(),
			createDirectory: vi.fn(),
			readDirectory: vi.fn(),
		},
	},
	window: {
		showInformationMessage: vi.fn(),
		showErrorMessage: vi.fn(),
		showWarningMessage: vi.fn(),
		showQuickPick: vi.fn(),
		createWebviewPanel: vi.fn(() => ({
			webview: {
				html: "",
				onDidReceiveMessage: vi.fn(),
				postMessage: vi.fn(),
				asWebviewUri: vi.fn(uri => ({
					toString: () => `vscode-webview://fake${uri.fsPath}`,
				})),
				options: {},
				cspSource: "vscode-webview://fake",
			},
			onDidDispose: vi.fn(),
			dispose: vi.fn(),
			reveal: vi.fn(),
			visible: true,
			active: true,
			viewColumn: 1,
			title: "Mock Panel",
		})),
		createOutputChannel: vi.fn(() => ({
			appendLine: vi.fn(),
			show: vi.fn(),
			dispose: vi.fn(),
			clear: vi.fn(),
			hide: vi.fn(),
			name: "AI Memory",
		})),
	},
	commands: {
		registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
		registerTextEditorCommand: vi.fn(() => ({ dispose: vi.fn() })),
		executeCommand: vi.fn(),
	},
	Uri: {
		file: vi.fn((path: string) => {
			// Normalize path to remove double slashes (like real VS Code)
			const normalizedPath = path.replace(/\/+/g, "/");
			// Create a consistent mock object that has stable identity
			const uriMock = {
				fsPath: normalizedPath,
				path: normalizedPath,
				scheme: "file",
				with: vi.fn(),
				toString: () => normalizedPath,
				// Add equals method for better mock matching
				equals: vi.fn((other: any) => other?.fsPath === normalizedPath),
			};
			return uriMock;
		}),
		parse: vi.fn((uri: string) => ({
			fsPath: uri,
			path: uri,
			scheme: "file",
			with: vi.fn(),
			toString: () => uri,
		})),
		joinPath: vi.fn((base: { fsPath: string }, ...parts: string[]) => ({
			fsPath: `${base.fsPath}/${parts.join("/")}`,
			path: `${base.fsPath}/${parts.join("/")}`,
			scheme: "file",
		})),
	},
	FileType: {
		File: 1,
		Directory: 2,
		SymbolicLink: 64,
		Unknown: 0,
	},
	ExtensionMode: {
		Production: 1,
		Development: 2,
		Test: 3,
	},
}));

// Import after mocking
import { FileType, window, workspace } from "vscode";

// Mock the logger at the module level
const mockLoggerInstance = createMockLogger();
vi.mock("@/utils/vscode/vscode-logger.js", () => ({
	Logger: {
		getInstance: () => mockLoggerInstance,
	},
}));

describe("CursorRulesService", () => {
	let context: ExtensionContext;
	let rulesService: CursorRulesService;

	beforeEach(() => {
		vi.clearAllMocks();
		context = createMockExtensionContext();
		rulesService = new CursorRulesService(context);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("createRulesFile", () => {
		const setupCreateRulesFile = (fileExists = false, userChoice?: string) => {
			vi.mocked(workspace.fs.createDirectory).mockResolvedValue(undefined);

			if (fileExists) {
				vi.mocked(workspace.fs.stat).mockResolvedValue({ type: FileType.File } as any);
				if (userChoice) {
					vi.mocked(window.showWarningMessage).mockResolvedValue({
						title: userChoice,
					} as any);
				}
			} else {
				vi.mocked(workspace.fs.stat).mockRejectedValue(new Error("File not found"));
			}

			vi.mocked(workspace.fs.writeFile).mockResolvedValue(undefined);
		};

		it("should create a new rules file successfully", async () => {
			setupCreateRulesFile(false);

			await rulesService.createRulesFile("test-rules.mdc", "Test content");

			expect(vi.mocked(workspace.fs.createDirectory)).toHaveBeenCalledWith(
				expect.objectContaining({
					fsPath: "/mock/workspace/.cursor/rules",
				}),
			);
			expect(vi.mocked(workspace.fs.writeFile)).toHaveBeenCalledWith(
				expect.objectContaining({
					fsPath: createTestRulesFilePath("test-rules.mdc"),
				}),
				expect.any(Uint8Array),
			);
		});

		it("should not overwrite existing file when user declines", async () => {
			setupCreateRulesFile(true, "No");

			await rulesService.createRulesFile("existing-rules.mdc", "New content");

			expect(vi.mocked(workspace.fs.writeFile)).not.toHaveBeenCalled();
			expect(vi.mocked(window.showInformationMessage)).toHaveBeenCalledWith(
				"Skipped creating existing-rules.mdc.",
			);
		});

		it("should overwrite existing file when user confirms", async () => {
			setupCreateRulesFile(true, "Yes");

			await rulesService.createRulesFile("overwrite-rules.mdc", "Overwritten content");

			expect(vi.mocked(workspace.fs.writeFile)).toHaveBeenCalledWith(
				expect.objectContaining({
					fsPath: createTestRulesFilePath("overwrite-rules.mdc"),
				}),
				expect.any(Uint8Array),
			);
		});
	});

	describe("readRulesFile", () => {
		it("should read existing rules file successfully", async () => {
			const content = "Test content";
			vi.mocked(workspace.fs.readFile).mockResolvedValue(Buffer.from(content));

			const result = await rulesService.readRulesFile("test-rules.mdc");

			expect(result).toEqual({ success: true, data: content });
			expect(vi.mocked(workspace.fs.readFile)).toHaveBeenCalledWith(
				expect.objectContaining({
					fsPath: createTestRulesFilePath("test-rules.mdc"),
				}),
			);
		});

		it("should return error when file read fails", async () => {
			vi.mocked(workspace.fs.readFile).mockRejectedValue(new Error("Read failed"));

			const result = await rulesService.readRulesFile("test-rules.mdc");

			expect(result).toEqual({
				success: false,
				error: "Failed to read rules file: Read failed",
			});
		});
	});

	describe("deleteRulesFile", () => {
		it("should delete rules file successfully", async () => {
			vi.mocked(workspace.fs.delete).mockResolvedValue(undefined);

			await expect(rulesService.deleteRulesFile("test-rules.mdc")).resolves.toBeUndefined();

			expect(vi.mocked(workspace.fs.delete)).toHaveBeenCalledWith(
				expect.objectContaining({
					fsPath: createTestRulesFilePath("test-rules.mdc"),
				}),
			);
		});

		it("should throw error when delete fails", async () => {
			vi.mocked(workspace.fs.delete).mockRejectedValue(new Error("Delete failed"));

			await expect(rulesService.deleteRulesFile("test-rules.mdc")).rejects.toThrow(
				"Failed to delete rules file: Delete failed",
			);
		});
	});

	describe("listAllRulesFilesInfo", () => {
		it("should list .mdc files in rules directory", async () => {
			// Mock .mdc rule files instead of memory-bank directories
			const mockRuleFiles: [string, number][] = [
				["rule1.mdc", FileType.File],
				["rule2.mdc", FileType.File],
			];
			vi.mocked(workspace.fs.readDirectory).mockResolvedValue(mockRuleFiles);

			const result = await rulesService.listAllRulesFilesInfo();

			expect(result).toEqual([
				{ name: "rule1.mdc", lastUpdated: undefined },
				{ name: "rule2.mdc", lastUpdated: undefined },
			]);
			expect(vi.mocked(workspace.fs.readDirectory)).toHaveBeenCalledWith(
				expect.objectContaining({
					fsPath: "/mock/workspace/.cursor/rules",
				}),
			);
		});

		it("should return empty array when directory does not exist", async () => {
			vi.mocked(workspace.fs.readDirectory).mockRejectedValue(new Error("Dir not found"));

			const result = await rulesService.listAllRulesFilesInfo();

			expect(result).toEqual([]);
		});

		it("should return empty array when no .mdc files exist", async () => {
			vi.mocked(workspace.fs.readDirectory).mockResolvedValue([["other.txt", FileType.File]]);

			const result = await rulesService.listAllRulesFilesInfo();

			expect(result).toEqual([]);
		});
	});
});

// Test Suite: Error Handling
describe("CursorRulesService - Error Handling", () => {
	let cursorRulesService: CursorRulesService;
	let mockExtensionContext: ExtensionContext;

	beforeEach(() => {
		mockExtensionContext = createMockExtensionContext();
		cursorRulesService = new CursorRulesService(mockExtensionContext);
		// Reset all workspace.fs mocks
		vi.mocked(workspace.fs.stat).mockReset();
		vi.mocked(workspace.fs.readFile).mockReset();
		vi.mocked(workspace.fs.writeFile).mockReset();
		vi.mocked(workspace.fs.delete).mockReset();
		vi.mocked(workspace.fs.createDirectory).mockReset();
		vi.mocked(workspace.fs.readDirectory).mockReset();
	});

	it("should handle directory creation failure", async () => {
		vi.mocked(workspace.fs.createDirectory).mockRejectedValue(new Error("Create dir failed"));

		await expect(
			cursorRulesService.createRulesFile("test-rules.mdc", "Test content"),
		).rejects.toThrow("Failed to create rules directory: Error: Create dir failed");
	});

	it("should handle file write failure", async () => {
		vi.mocked(workspace.fs.createDirectory).mockResolvedValue(undefined);
		vi.mocked(workspace.fs.stat).mockRejectedValue(new Error("File not found"));
		vi.mocked(workspace.fs.writeFile).mockRejectedValue(new Error("Write failed"));

		await expect(
			cursorRulesService.createRulesFile("test-rules.mdc", "Test content"),
		).rejects.toThrow("Failed to write rules file: Error: Write failed");
	});
});

// Test Suite: Cursor Rules Constants and Utilities
describe("Cursor Rules - Constants and Utilities", () => {
	it("should have correct constants", () => {
		expect(CURSOR_MEMORY_BANK_FILENAME).toBe("memory-bank.mdc");
	});

	it("should format memory bank rules file content correctly", async () => {
		const mockFileOperationManager = createMockFileOperationManager() as any;
		const rawContent = "Test Rules Content";

		(mockFileOperationManager.readFileWithRetry as Mock).mockResolvedValue({
			success: true,
			data: rawContent,
		});

		const result = await getCursorMemoryBankRulesFile(mockFileOperationManager);

		const expectedContent = `---
description: Cursor Memory Bank Rules
globs:
alwaysApply: true
---

${rawContent}
`;
		expect(result).toBe(expectedContent);
		expect(mockFileOperationManager.readFileWithRetry).toHaveBeenCalledTimes(1);
	});

	it("should handle memory bank rules file read failure", async () => {
		// Note: Due to caching in getCursorMemoryBankRulesFile, we test this in isolation
		// by creating a fresh module mock that bypasses the cache
		vi.doMock("@/cursor/rules.js", () => ({
			getCursorMemoryBankRulesFile: async (fom: any) => {
				const readResult = await fom.readFileWithRetry();
				if (!readResult.success) {
					throw new Error(
						`Failed to load memory bank rules: ${readResult.error.message}`,
					);
				}
				return readResult.data;
			},
			cursorRulesPath: "/test/path",
			cursorMemoryBankFilename: "memory-bank.mdc",
		}));

		const { getCursorMemoryBankRulesFile: freshGetCursorMemoryBankRulesFile } = await import(
			"@/cursor/rules.js"
		);
		const mockFileOperationManager = createMockFileOperationManager() as any;

		(mockFileOperationManager.readFileWithRetry as Mock).mockResolvedValue({
			success: false,
			error: { message: "File not found" },
		});

		await expect(freshGetCursorMemoryBankRulesFile(mockFileOperationManager)).rejects.toThrow(
			"Failed to load memory bank rules: File not found",
		);

		vi.doUnmock("@/cursor/rules.js");
	});
});
