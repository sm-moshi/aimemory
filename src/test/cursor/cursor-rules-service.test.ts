import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { CursorRulesService } from "../../lib/cursor-rules-service.js";

// Mock vscode
vi.mock("vscode", () => ({
	workspace: {
		workspaceFolders: [{ uri: { fsPath: "/mock/workspace" } }],
		fs: {
			stat: vi.fn(),
			writeFile: vi.fn(),
			createDirectory: vi.fn(),
		},
	},
	Uri: {
		file: vi.fn((path) => ({ fsPath: path })),
		joinPath: vi.fn((base, ...paths) => ({ fsPath: `${base.fsPath}/${paths.join("/")}` })),
	},
	window: {
		showInformationMessage: vi.fn(),
		showWarningMessage: vi.fn(),
		showErrorMessage: vi.fn(),
	},
	FileSystemError: {
		FileNotFound: vi.fn(() => ({ name: "FileNotFound" })),
	},
}));

// Mock fs promises with readFile for cursor-rules
vi.mock("node:fs/promises", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs/promises")>();
	return {
		...actual,
		mkdir: vi.fn(),
		readFile: vi.fn().mockResolvedValue("Mocked Markdown Content"),
	};
});

// Import cursor-rules constants for testing
import {
	CURSOR_MEMORY_BANK_FILENAME,
	CURSOR_RULES_PATH,
	getCursorMemoryBankRulesFile,
} from "../../lib/cursor-rules.js";

describe("CursorRulesService", () => {
	let service: CursorRulesService;
	let mockContext: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockContext = {
			extensionUri: { fsPath: "/mock/extension" },
		};
		service = new CursorRulesService(mockContext);
	});

	describe("createRulesFile", () => {
		it("successfully creates rules file when it doesn't exist", async () => {
			// Mock file doesn't exist
			vscode.workspace.fs.stat = vi
				.fn()
				.mockRejectedValue(vscode.FileSystemError.FileNotFound());
			vscode.workspace.fs.writeFile = vi.fn().mockResolvedValue(undefined);

			await service.createRulesFile("test-rules.mdc", "# Test Rules Content");

			expect(vscode.workspace.fs.writeFile).toHaveBeenCalledWith(
				expect.objectContaining({
					fsPath: "/mock/workspace/.cursor/rules/test-rules.mdc",
				}),
				expect.any(Uint8Array),
			);
		});

		it("shows warning and prompts for overwrite when file exists", async () => {
			// Mock file exists
			vscode.workspace.fs.stat = vi.fn().mockResolvedValue({ type: 1 }); // FileType.File
			vscode.window.showWarningMessage = vi.fn().mockResolvedValue("Yes");
			vscode.workspace.fs.writeFile = vi.fn().mockResolvedValue(undefined);
			vscode.workspace.fs.createDirectory = vi.fn().mockResolvedValue(undefined);

			await service.createRulesFile("test-rules.mdc", "# Test Rules Content");

			expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
				"The file test-rules.mdc already exists in .cursor/rules/. Overwrite?",
				{ modal: true },
				"Yes",
				"No",
			);
			expect(vscode.workspace.fs.writeFile).toHaveBeenCalled();
		});

		it("does not overwrite when user cancels", async () => {
			// Mock file exists
			vscode.workspace.fs.stat = vi.fn().mockResolvedValue({ type: 1 });
			vscode.window.showWarningMessage = vi.fn().mockResolvedValue("No");
			vscode.workspace.fs.createDirectory = vi.fn().mockResolvedValue(undefined);

			await service.createRulesFile("test-rules.mdc", "# Test Rules Content");

			expect(vscode.workspace.fs.writeFile).not.toHaveBeenCalled();
		});

		it("shows error when no workspace folder exists", async () => {
			// Mock no workspace folders
			const originalWorkspaceFolders = vscode.workspace.workspaceFolders;
			(vscode.workspace as any).workspaceFolders = undefined;
			vscode.window.showErrorMessage = vi.fn().mockResolvedValue(undefined);

			await service.createRulesFile("test-rules.mdc", "# Test Rules Content");

			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
				"No workspace folder found, please open a workspace first",
			);

			// Restore original mock
			(vscode.workspace as any).workspaceFolders = originalWorkspaceFolders;
		});

		it("creates directory structure if it doesn't exist", async () => {
			vscode.workspace.fs.stat = vi
				.fn()
				.mockRejectedValueOnce(vscode.FileSystemError.FileNotFound()) // directory doesn't exist
				.mockRejectedValueOnce(vscode.FileSystemError.FileNotFound()); // file doesn't exist
			vscode.workspace.fs.writeFile = vi.fn().mockResolvedValue(undefined);
			vscode.workspace.fs.createDirectory = vi.fn().mockResolvedValue(undefined);

			await service.createRulesFile("test-rules.mdc", "# Test Rules Content");

			expect(vscode.workspace.fs.createDirectory).toHaveBeenCalledWith(
				expect.objectContaining({
					fsPath: "/mock/workspace/.cursor/rules/",
				}),
			);
		});

		it("handles file system errors gracefully", async () => {
			vscode.workspace.fs.stat = vi
				.fn()
				.mockRejectedValueOnce(vscode.FileSystemError.FileNotFound()) // directory doesn't exist
				.mockRejectedValueOnce(vscode.FileSystemError.FileNotFound()); // file doesn't exist
			vscode.workspace.fs.createDirectory = vi.fn().mockResolvedValue(undefined);
			vscode.workspace.fs.writeFile = vi.fn().mockRejectedValue(new Error("Write failed"));

			await expect(
				service.createRulesFile("test-rules.mdc", "# Test Rules Content"),
			).rejects.toThrow("Write failed");
		});

		it("handles different file extension correctly", async () => {
			vscode.workspace.fs.stat = vi
				.fn()
				.mockRejectedValueOnce(vscode.FileSystemError.FileNotFound()) // directory doesn't exist
				.mockRejectedValueOnce(vscode.FileSystemError.FileNotFound()); // file doesn't exist
			vscode.workspace.fs.writeFile = vi.fn().mockResolvedValue(undefined);
			vscode.workspace.fs.createDirectory = vi.fn().mockResolvedValue(undefined);

			await service.createRulesFile("custom-rules.md", "# Custom Rules");

			expect(vscode.workspace.fs.writeFile).toHaveBeenCalledWith(
				expect.objectContaining({
					fsPath: "/mock/workspace/.cursor/rules/custom-rules.md",
				}),
				expect.any(Uint8Array),
			);
		});

		it("creates file successfully when it doesn't exist", async () => {
			vscode.workspace.fs.stat = vi
				.fn()
				.mockRejectedValueOnce(vscode.FileSystemError.FileNotFound()) // directory doesn't exist
				.mockRejectedValueOnce(vscode.FileSystemError.FileNotFound()); // file doesn't exist
			vscode.workspace.fs.writeFile = vi.fn().mockResolvedValue(undefined);
			vscode.workspace.fs.createDirectory = vi.fn().mockResolvedValue(undefined);

			await service.createRulesFile("test-rules.mdc", "# Test Rules Content");

			expect(vscode.workspace.fs.writeFile).toHaveBeenCalledWith(
				expect.objectContaining({
					fsPath: "/mock/workspace/.cursor/rules/test-rules.mdc",
				}),
				expect.any(Uint8Array),
			);
		});

		it("handles undefined user response as cancellation", async () => {
			vscode.workspace.fs.stat = vi.fn().mockResolvedValue({ type: 1 });
			vscode.window.showWarningMessage = vi.fn().mockResolvedValue(undefined);
			vscode.workspace.fs.createDirectory = vi.fn().mockResolvedValue(undefined);

			await service.createRulesFile("test-rules.mdc", "# Test Rules Content");

			expect(vscode.workspace.fs.writeFile).not.toHaveBeenCalled();
		});
	});
});

describe("cursor-rules constants", () => {
	it("CURSOR_RULES_PATH ends with memory-bank.mdc", () => {
		expect(CURSOR_RULES_PATH.endsWith("memory-bank.mdc")).toBe(true);
	});

	it("CURSOR_MEMORY_BANK_FILENAME is correct", () => {
		expect(CURSOR_MEMORY_BANK_FILENAME).toBe("memory-bank.mdc");
	});

	it("getCursorMemoryBankRulesFile returns mocked markdown content", async () => {
		const content = await getCursorMemoryBankRulesFile();
		expect(content).toContain("Mocked Markdown Content");
	});
});
