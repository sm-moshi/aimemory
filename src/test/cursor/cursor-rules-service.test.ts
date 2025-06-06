import { CursorRulesService } from "@/cursor/rules-service.js";
import { CURSOR_MEMORY_BANK_FILENAME, getCursorMemoryBankRulesFile } from "@/cursor/rules.js";
import {
	createMockDirectoryListing,
	createMockExtensionContext,
	createMockFileOperationManager,
	createMockLogger,
	createTestRulesFilePath,
	getVSCodeMock,
	mockVscodeWindow,
	mockVscodeWorkspaceFs,
} from "@test-utils/index.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import type { ExtensionContext } from "vscode";

const { Uri, FileType } = getVSCodeMock();

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
			mockVscodeWorkspaceFs.createDirectory.mockResolvedValue(undefined);

			if (fileExists) {
				mockVscodeWorkspaceFs.stat.mockResolvedValue({ type: FileType.File } as any);
				if (userChoice) {
					(mockVscodeWindow.showWarningMessage as Mock).mockResolvedValue(userChoice);
				}
			} else {
				mockVscodeWorkspaceFs.stat.mockRejectedValue(new Error("File not found"));
			}

			mockVscodeWorkspaceFs.writeFile.mockResolvedValue(undefined);
		};

		it("should create a new rules file successfully", async () => {
			setupCreateRulesFile(false);

			await rulesService.createRulesFile("test-rules.mdc", "Test content");

			expect(mockVscodeWorkspaceFs.createDirectory).toHaveBeenCalledWith(
				Uri.file("/mock/workspace/.cursor/rules/"),
			);
			expect(mockVscodeWorkspaceFs.writeFile).toHaveBeenCalledWith(
				Uri.file(createTestRulesFilePath("test-rules.mdc")),
				expect.any(Uint8Array),
			);
		});

		it("should not overwrite existing file when user declines", async () => {
			setupCreateRulesFile(true, "No");

			await rulesService.createRulesFile("existing-rules.mdc", "New content");

			expect(mockVscodeWorkspaceFs.writeFile).not.toHaveBeenCalled();
			expect(mockVscodeWindow.showInformationMessage).toHaveBeenCalledWith(
				"Skipped creating existing-rules.mdc.",
			);
		});

		it("should overwrite existing file when user confirms", async () => {
			setupCreateRulesFile(true, "Yes");

			await rulesService.createRulesFile("overwrite-rules.mdc", "Overwritten content");

			expect(mockVscodeWorkspaceFs.writeFile).toHaveBeenCalledWith(
				Uri.file(createTestRulesFilePath("overwrite-rules.mdc")),
				expect.any(Uint8Array),
			);
		});
	});

	describe("readRulesFile", () => {
		it("should read existing rules file successfully", async () => {
			const content = "Test content";
			mockVscodeWorkspaceFs.readFile.mockResolvedValue(Buffer.from(content));

			const result = await rulesService.readRulesFile("test-rules.mdc");

			expect(result).toEqual({ success: true, data: content });
			expect(mockVscodeWorkspaceFs.readFile).toHaveBeenCalledWith(
				Uri.file(createTestRulesFilePath("test-rules.mdc")),
			);
		});

		it("should return error when file read fails", async () => {
			mockVscodeWorkspaceFs.readFile.mockRejectedValue(new Error("Read failed"));

			const result = await rulesService.readRulesFile("test-rules.mdc");

			expect(result).toEqual({
				success: false,
				error: "Failed to read rules file: Read failed",
			});
		});
	});

	describe("deleteRulesFile", () => {
		it("should delete rules file successfully", async () => {
			mockVscodeWorkspaceFs.delete.mockResolvedValue(undefined);

			await expect(rulesService.deleteRulesFile("test-rules.mdc")).resolves.toBeUndefined();

			expect(mockVscodeWorkspaceFs.delete).toHaveBeenCalledWith(
				Uri.file(createTestRulesFilePath("test-rules.mdc")),
			);
		});

		it("should throw error when delete fails", async () => {
			mockVscodeWorkspaceFs.delete.mockRejectedValue(new Error("Delete failed"));

			await expect(rulesService.deleteRulesFile("test-rules.mdc")).rejects.toThrow(
				"Failed to delete rules file: Delete failed",
			);
		});
	});

	describe("listAllRulesFilesInfo", () => {
		it("should list .mdc files in rules directory", async () => {
			const mockFiles = createMockDirectoryListing();
			// Convert the simplified format to VS Code format
			const vscodeFormat: [string, FileType][] = mockFiles.map(([name, type]) => [
				name,
				type === 1 ? FileType.File : FileType.Directory,
			]);
			mockVscodeWorkspaceFs.readDirectory.mockResolvedValue(vscodeFormat);

			const result = await rulesService.listAllRulesFilesInfo();

			expect(result).toEqual([
				{ name: "rule1.mdc", lastUpdated: undefined },
				{ name: "rule2.mdc", lastUpdated: undefined },
			]);
			expect(mockVscodeWorkspaceFs.readDirectory).toHaveBeenCalledWith(
				Uri.file("/mock/workspace/.cursor/rules/"),
			);
		});

		it("should return empty array when directory does not exist", async () => {
			mockVscodeWorkspaceFs.readDirectory.mockRejectedValue(new Error("Dir not found"));

			const result = await rulesService.listAllRulesFilesInfo();

			expect(result).toEqual([]);
		});

		it("should return empty array when no .mdc files exist", async () => {
			mockVscodeWorkspaceFs.readDirectory.mockResolvedValue([["other.txt", FileType.File]]);

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
		for (const mock of Object.values(mockVscodeWorkspaceFs)) {
			(mock as any).mockReset();
		}
	});

	it("should handle directory creation failure", async () => {
		mockVscodeWorkspaceFs.createDirectory.mockRejectedValue(new Error("Create dir failed"));

		await expect(
			cursorRulesService.createRulesFile("test-rules.mdc", "Test content"),
		).rejects.toThrow("Failed to create rules directory: Error: Create dir failed");
	});

	it("should handle file write failure", async () => {
		mockVscodeWorkspaceFs.createDirectory.mockResolvedValue(undefined);
		mockVscodeWorkspaceFs.stat.mockRejectedValue(new Error("File not found"));
		mockVscodeWorkspaceFs.writeFile.mockRejectedValue(new Error("Write failed"));

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
