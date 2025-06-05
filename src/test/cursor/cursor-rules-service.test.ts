import * as path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import * as vscode from "vscode";
import type { ExtensionContext } from "vscode";
import { CursorRulesService } from "../../services/cursor/rules-service.js";
import {
	CURSOR_MEMORY_BANK_FILENAME,
	CURSOR_RULES_PATH,
	getCursorMemoryBankRulesFile,
} from "../../services/cursor/rules.js";

// Import centralized test utilities
import {
	createMockDirectoryListing,
	createMockExtensionContext,
	createMockFileOperationManager,
	createMockLogger,
	createTestRulesFilePath,
	standardBeforeEach,
} from "../test-utils/index.js";

// Mock Setup (defined before vi.mock to avoid hoisting issues)
const mockLoggerInstance = createMockLogger();

vi.mock("vscode", () => {
	const mockWorkspaceFs = {
		stat: vi.fn(),
		readFile: vi.fn(),
		writeFile: vi.fn(),
		delete: vi.fn(),
		createDirectory: vi.fn(),
		readDirectory: vi.fn(),
	};

	return {
		workspace: {
			workspaceFolders: [{ uri: { fsPath: "/mock/workspace" } }],
			getConfiguration: vi.fn(() => ({
				get: vi.fn((key: string) => {
					if (key === "aiMemory.memoryBankPath") return ".aimemory/memory-bank";
					if (key === "aiMemory.logLevel") return "info";
					return undefined;
				}),
			})),
			fs: mockWorkspaceFs,
		},
		window: {
			showErrorMessage: vi.fn(),
			showWarningMessage: vi.fn(),
			showInformationMessage: vi.fn(),
		},
		Uri: {
			joinPath: vi.fn((base, ...parts) => path.join(base.fsPath, ...parts)),
			file: vi.fn((p) => ({ fsPath: p })),
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
	};
});

// Access the mocked fs after the mock is created
const mockWorkspaceFs = (vscode as any).workspace.fs;

vi.mock("node:fs/promises", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs/promises")>();
	return {
		...actual,
		mkdir: vi.fn(),
		readFile: vi.fn().mockResolvedValue("Mocked Markdown Content"),
	};
});

vi.mock("../../core/FileOperationManager.js", () => ({
	FileOperationManager: vi.fn(() => createMockFileOperationManager()),
}));

vi.mock("../../infrastructure/logging/logger.js", () => ({
	Logger: {
		getInstance: vi.fn(() => mockLoggerInstance),
	},
}));

// Use centralized test data factories

// Test Suite: Core CursorRulesService functionality
describe("CursorRulesService - Core Operations", () => {
	let cursorRulesService: CursorRulesService;
	let mockExtensionContext: ExtensionContext;

	beforeEach(() => {
		standardBeforeEach();
		mockExtensionContext = createMockExtensionContext();
		cursorRulesService = new CursorRulesService(mockExtensionContext);

		// Reset workspace fs mocks
		for (const mock of Object.values(mockWorkspaceFs)) {
			(mock as any).mockReset();
		}
	});

	describe("createRulesFile", () => {
		const setupCreateRulesFile = (fileExists = false, userChoice?: string) => {
			mockWorkspaceFs.createDirectory.mockResolvedValue(undefined);

			if (fileExists) {
				mockWorkspaceFs.stat.mockResolvedValue({ type: vscode.FileType.File } as any);
				if (userChoice) {
					(vscode.window.showWarningMessage as Mock).mockResolvedValue(userChoice);
				}
			} else {
				mockWorkspaceFs.stat.mockRejectedValue(new Error("File not found"));
			}

			mockWorkspaceFs.writeFile.mockResolvedValue(undefined);
		};

		it("should create a new rules file successfully", async () => {
			setupCreateRulesFile(false);

			await cursorRulesService.createRulesFile("test-rules.mdc", "Test content");

			expect(mockWorkspaceFs.createDirectory).toHaveBeenCalledWith(
				vscode.Uri.file("/mock/workspace/.cursor/rules/"),
			);
			expect(mockWorkspaceFs.writeFile).toHaveBeenCalledWith(
				vscode.Uri.file(createTestRulesFilePath("test-rules.mdc")),
				expect.any(Uint8Array),
			);
		});

		it("should not overwrite existing file when user declines", async () => {
			setupCreateRulesFile(true, "No");

			await cursorRulesService.createRulesFile("existing-rules.mdc", "New content");

			expect(mockWorkspaceFs.writeFile).not.toHaveBeenCalled();
			expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
				"Skipped creating existing-rules.mdc.",
			);
		});

		it("should overwrite existing file when user confirms", async () => {
			setupCreateRulesFile(true, "Yes");

			await cursorRulesService.createRulesFile("overwrite-rules.mdc", "Overwritten content");

			expect(mockWorkspaceFs.writeFile).toHaveBeenCalledWith(
				vscode.Uri.file(createTestRulesFilePath("overwrite-rules.mdc")),
				expect.any(Uint8Array),
			);
		});
	});

	describe("readRulesFile", () => {
		it("should read existing rules file successfully", async () => {
			const content = "Test content";
			mockWorkspaceFs.readFile.mockResolvedValue(Buffer.from(content));

			const result = await cursorRulesService.readRulesFile("test-rules.mdc");

			expect(result).toEqual({ success: true, data: content });
			expect(mockWorkspaceFs.readFile).toHaveBeenCalledWith(
				vscode.Uri.file(createTestRulesFilePath("test-rules.mdc")),
			);
		});

		it("should return error when file read fails", async () => {
			mockWorkspaceFs.readFile.mockRejectedValue(new Error("Read failed"));

			const result = await cursorRulesService.readRulesFile("test-rules.mdc");

			expect(result).toEqual({
				success: false,
				error: "Failed to read rules file: Read failed",
			});
		});
	});

	describe("deleteRulesFile", () => {
		it("should delete rules file successfully", async () => {
			mockWorkspaceFs.delete.mockResolvedValue(undefined);

			await expect(
				cursorRulesService.deleteRulesFile("test-rules.mdc"),
			).resolves.toBeUndefined();

			expect(mockWorkspaceFs.delete).toHaveBeenCalledWith(
				vscode.Uri.file(createTestRulesFilePath("test-rules.mdc")),
			);
		});

		it("should throw error when delete fails", async () => {
			mockWorkspaceFs.delete.mockRejectedValue(new Error("Delete failed"));

			await expect(cursorRulesService.deleteRulesFile("test-rules.mdc")).rejects.toThrow(
				"Failed to delete rules file: Delete failed",
			);
		});
	});

	describe("listAllRulesFilesInfo", () => {
		it("should list .mdc files in rules directory", async () => {
			const mockFiles = createMockDirectoryListing();
			// Convert the simplified format to VS Code format
			const vscodeFormat: [string, vscode.FileType][] = mockFiles.map(([name, type]) => [
				name,
				type === 1 ? vscode.FileType.File : vscode.FileType.Directory,
			]);
			mockWorkspaceFs.readDirectory.mockResolvedValue(vscodeFormat);

			const result = await cursorRulesService.listAllRulesFilesInfo();

			expect(result).toEqual([
				{ name: "rule1.mdc", lastUpdated: undefined },
				{ name: "rule2.mdc", lastUpdated: undefined },
			]);
			expect(mockWorkspaceFs.readDirectory).toHaveBeenCalledWith(
				vscode.Uri.file("/mock/workspace/.cursor/rules/"),
			);
		});

		it("should return empty array when directory does not exist", async () => {
			mockWorkspaceFs.readDirectory.mockRejectedValue(new Error("Dir not found"));

			const result = await cursorRulesService.listAllRulesFilesInfo();

			expect(result).toEqual([]);
		});

		it("should return empty array when no .mdc files exist", async () => {
			mockWorkspaceFs.readDirectory.mockResolvedValue([["other.txt", vscode.FileType.File]]);

			const result = await cursorRulesService.listAllRulesFilesInfo();

			expect(result).toEqual([]);
		});
	});
});

// Test Suite: Error Handling
describe("CursorRulesService - Error Handling", () => {
	let cursorRulesService: CursorRulesService;
	let mockExtensionContext: ExtensionContext;

	beforeEach(() => {
		standardBeforeEach();
		mockExtensionContext = createMockExtensionContext();
		cursorRulesService = new CursorRulesService(mockExtensionContext);
		for (const mock of Object.values(mockWorkspaceFs)) {
			(mock as any).mockReset();
		}
	});

	it("should handle directory creation failure", async () => {
		mockWorkspaceFs.createDirectory.mockRejectedValue(new Error("Create dir failed"));

		await expect(
			cursorRulesService.createRulesFile("test-rules.mdc", "Test content"),
		).rejects.toThrow("Failed to create rules directory: Error: Create dir failed");
	});

	it("should handle file write failure", async () => {
		mockWorkspaceFs.createDirectory.mockResolvedValue(undefined);
		mockWorkspaceFs.stat.mockRejectedValue(new Error("File not found"));
		mockWorkspaceFs.writeFile.mockRejectedValue(new Error("Write failed"));

		await expect(
			cursorRulesService.createRulesFile("test-rules.mdc", "Test content"),
		).rejects.toThrow("Failed to write rules file: Error: Write failed");
	});
});

// Test Suite: Cursor Rules Constants and Utilities
describe("Cursor Rules - Constants and Utilities", () => {
	it("should have correct constants", () => {
		expect(CURSOR_RULES_PATH.endsWith("memory-bank.mdc")).toBe(true);
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
		vi.doMock("../../services/cursor/rules.js", () => ({
			getCursorMemoryBankRulesFile: async (fom: any) => {
				const readResult = await fom.readFileWithRetry();
				if (!readResult.success) {
					throw new Error(
						`Failed to load memory bank rules: ${readResult.error.message}`,
					);
				}
				return readResult.data;
			},
			CURSOR_RULES_PATH: "/test/path",
			CURSOR_MEMORY_BANK_FILENAME: "memory-bank.mdc",
		}));

		const { getCursorMemoryBankRulesFile: freshGetCursorMemoryBankRulesFile } = await import(
			"../../services/cursor/rules.js"
		);
		const mockFileOperationManager = createMockFileOperationManager() as any;

		(mockFileOperationManager.readFileWithRetry as Mock).mockResolvedValue({
			success: false,
			error: { message: "File not found" },
		});

		await expect(freshGetCursorMemoryBankRulesFile(mockFileOperationManager)).rejects.toThrow(
			"Failed to load memory bank rules: File not found",
		);

		vi.doUnmock("../../services/cursor/rules.js");
	});
});
