import * as os from "node:os";
import * as path from "node:path";
import { type Mock, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import type { FileOperationManager } from "../../core/FileOperationManager.js";
import { updateCursorMCPConfig } from "../../services/cursor/config.js";

// Import centralized test utilities
import {
	createMockFileOperationManager,
	createMockLogger,
	createTestCursorMCPConfig,
	standardAfterEach,
	standardBeforeEach,
} from "../test-utils/index.js";

const createExpectedConfig = (workspacePath: string) => createTestCursorMCPConfig(workspacePath);

// Mock Setup
const mockLoggerInstance = createMockLogger();

vi.mock("node:os", () => ({
	homedir: vi.fn(),
}));

vi.mock("node:path", () => ({
	join: vi.fn(),
	resolve: vi.fn(),
}));

vi.mock("vscode", () => ({
	window: {
		showInformationMessage: vi.fn(),
		showErrorMessage: vi.fn(),
	},
	workspace: {
		workspaceFolders: [
			{
				uri: { fsPath: "/mock/workspace" },
				name: "Mock Workspace",
				index: 0,
			},
		],
	},
}));

// CRITICAL FIX: Correct logger mock path
vi.mock("../../infrastructure/logging/vscode-logger.js", () => ({
	Logger: {
		getInstance: () => mockLoggerInstance,
	},
}));

describe("cursor-config", () => {
	const mockHomeDir = "/mock/home";
	const mockConfigPath = "/mock/home/.cursor/mcp.json";
	const mockCursorDir = "/mock/home/.cursor";
	const mockWorkspacePath = "/mock/workspace";

	let mockFileOperationManager: FileOperationManager;

	beforeEach(() => {
		standardBeforeEach();
		mockFileOperationManager = createMockFileOperationManager() as FileOperationManager;

		// Setup OS and path mocks
		(os.homedir as Mock).mockReturnValue(mockHomeDir);
		(path.join as Mock).mockImplementation((...args: string[]): string => {
			if (
				args.length === 3 &&
				args[0] === mockHomeDir &&
				args[1] === ".cursor" &&
				args[2] === "mcp.json"
			) {
				return mockConfigPath;
			}
			if (args.length === 2 && args[0] === mockHomeDir && args[1] === ".cursor") {
				return mockCursorDir;
			}
			// For workspace paths - avoid circular reference by using simple string joining
			return args.join("/");
		});

		// Default successful mocks
		(mockFileOperationManager.mkdirWithRetry as Mock).mockResolvedValue({ success: true });
		(mockFileOperationManager.readFileWithRetry as Mock).mockResolvedValue({
			success: true,
			data: '{"mcpServers": {}}',
		});
		(mockFileOperationManager.writeFileWithRetry as Mock).mockResolvedValue({ success: true });
	});

	afterEach(() => {
		standardAfterEach();
	});

	describe("Configuration Creation", () => {
		it("creates new config file with AI Memory server", async () => {
			(mockFileOperationManager.readFileWithRetry as Mock).mockResolvedValueOnce({
				success: false,
				error: { code: "ENOENT", message: "File not found" },
			});

			await updateCursorMCPConfig(mockWorkspacePath, mockFileOperationManager);

			const expectedConfig = createExpectedConfig(mockWorkspacePath);
			expect(mockFileOperationManager.mkdirWithRetry).toHaveBeenCalledWith(mockCursorDir, {
				recursive: true,
			});
			expect(mockFileOperationManager.writeFileWithRetry).toHaveBeenCalledWith(
				mockConfigPath,
				JSON.stringify(expectedConfig, null, 2),
			);
			expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
				"Cursor MCP config updated for AI Memory (STDIO).",
			);
		});

		it("handles config file with no mcpServers property", async () => {
			const existingConfig = { someOtherProperty: "value" };
			(mockFileOperationManager.readFileWithRetry as Mock).mockResolvedValueOnce({
				success: true,
				data: JSON.stringify(existingConfig),
			});

			await updateCursorMCPConfig(mockWorkspacePath, mockFileOperationManager);

			const expectedConfig = {
				someOtherProperty: "value",
				...createExpectedConfig(mockWorkspacePath),
			};
			expect(mockFileOperationManager.writeFileWithRetry).toHaveBeenCalledWith(
				mockConfigPath,
				JSON.stringify(expectedConfig, null, 2),
			);
		});

		it("handles invalid JSON in existing config file", async () => {
			(mockFileOperationManager.readFileWithRetry as Mock).mockResolvedValueOnce({
				success: true,
				data: "invalid json",
			});

			await updateCursorMCPConfig(mockWorkspacePath, mockFileOperationManager);

			const expectedConfig = createExpectedConfig(mockWorkspacePath);
			expect(mockFileOperationManager.writeFileWithRetry).toHaveBeenCalledWith(
				mockConfigPath,
				JSON.stringify(expectedConfig, null, 2),
			);
		});
	});

	describe("Configuration Updates", () => {
		it("updates existing config file with AI Memory server", async () => {
			const existingConfig = {
				mcpServers: {
					"Other Server": { command: "other-command" },
				},
			};
			(mockFileOperationManager.readFileWithRetry as Mock).mockResolvedValueOnce({
				success: true,
				data: JSON.stringify(existingConfig),
			});

			await updateCursorMCPConfig(mockWorkspacePath, mockFileOperationManager);

			const expectedConfig = {
				mcpServers: {
					"Other Server": { command: "other-command" },
					...createExpectedConfig(mockWorkspacePath).mcpServers,
				},
			};
			expect(mockFileOperationManager.writeFileWithRetry).toHaveBeenCalledWith(
				mockConfigPath,
				JSON.stringify(expectedConfig, null, 2),
			);
		});

		it("updates AI Memory server when config differs", async () => {
			const existingConfig = {
				mcpServers: {
					"AI Memory": {
						name: "AI Memory",
						command: "node",
						args: [
							"/old/workspace/dist/mcp-server.js",
							"--workspace",
							"/old/workspace",
						],
						cwd: "/old/workspace",
					},
				},
			};
			(mockFileOperationManager.readFileWithRetry as Mock).mockResolvedValueOnce({
				success: true,
				data: JSON.stringify(existingConfig),
			});

			await updateCursorMCPConfig(mockWorkspacePath, mockFileOperationManager);

			const expectedConfig = createExpectedConfig(mockWorkspacePath);
			expect(mockFileOperationManager.writeFileWithRetry).toHaveBeenCalledWith(
				mockConfigPath,
				JSON.stringify(expectedConfig, null, 2),
			);
		});

		it("overwrites old URL-based config with new STDIO config", async () => {
			const oldUrlConfig = {
				mcpServers: {
					"AI Memory": {
						name: "AI Memory",
						url: "http://localhost:7331/sse",
					},
				},
			};
			(mockFileOperationManager.readFileWithRetry as Mock).mockResolvedValueOnce({
				success: true,
				data: JSON.stringify(oldUrlConfig),
			});

			await updateCursorMCPConfig(mockWorkspacePath, mockFileOperationManager);

			const expectedConfig = createExpectedConfig(mockWorkspacePath);
			expect(mockFileOperationManager.writeFileWithRetry).toHaveBeenCalledWith(
				mockConfigPath,
				JSON.stringify(expectedConfig, null, 2),
			);
		});
	});

	describe("Configuration Preservation", () => {
		it("skips update when AI Memory server already exists with same config", async () => {
			const existingConfig = createExpectedConfig(mockWorkspacePath);
			(mockFileOperationManager.readFileWithRetry as Mock).mockResolvedValueOnce({
				success: true,
				data: JSON.stringify(existingConfig),
			});

			await updateCursorMCPConfig(mockWorkspacePath, mockFileOperationManager);

			expect(mockFileOperationManager.writeFileWithRetry).not.toHaveBeenCalled();
		});
	});

	describe("Error Handling", () => {
		it("handles directory creation errors gracefully", async () => {
			const originalError = new Error("Original mkdir failure");
			(mockFileOperationManager.mkdirWithRetry as Mock).mockResolvedValueOnce({
				success: false,
				error: originalError,
			});

			await expect(
				updateCursorMCPConfig(mockWorkspacePath, mockFileOperationManager),
			).rejects.toThrow("Failed to create .cursor directory: Original mkdir failure");

			expect(mockLoggerInstance.error).toHaveBeenCalledTimes(2);
			expect(mockLoggerInstance.error).toHaveBeenNthCalledWith(
				1,
				"Failed to create .cursor directory: Original mkdir failure",
			);
			expect(mockLoggerInstance.error).toHaveBeenNthCalledWith(
				2,
				"Failed to update Cursor MCP config: Failed to create .cursor directory: Original mkdir failure",
			);
			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
				"Failed to update Cursor MCP config: Failed to create .cursor directory: Original mkdir failure",
			);
		});

		it("handles file write errors gracefully", async () => {
			const originalWriteError = new Error("Original writeFile failure");
			(mockFileOperationManager.writeFileWithRetry as Mock).mockResolvedValueOnce({
				success: false,
				error: originalWriteError,
			});

			await expect(
				updateCursorMCPConfig(mockWorkspacePath, mockFileOperationManager),
			).rejects.toThrow("Failed to write MCP config: Original writeFile failure");

			expect(mockLoggerInstance.error).toHaveBeenCalledTimes(1);
			expect(mockLoggerInstance.error).toHaveBeenCalledWith(
				"Failed to update Cursor MCP config: Failed to write MCP config: Original writeFile failure",
			);
			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
				"Failed to update Cursor MCP config: Failed to write MCP config: Original writeFile failure",
			);
		});

		it("handles non-Error exceptions gracefully", async () => {
			const nonErrorObject = "thrown string exception";
			(mockFileOperationManager.writeFileWithRetry as Mock).mockRejectedValueOnce(
				nonErrorObject,
			);

			await expect(
				updateCursorMCPConfig(mockWorkspacePath, mockFileOperationManager),
			).rejects.toBe(nonErrorObject);

			expect(mockLoggerInstance.error).toHaveBeenCalledTimes(1);
			expect(mockLoggerInstance.error).toHaveBeenCalledWith(
				"Failed to update Cursor MCP config: thrown string exception",
			);
			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
				"Failed to update Cursor MCP config: thrown string exception",
			);
		});
	});
});
