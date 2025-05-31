import * as os from "node:os";
import * as path from "node:path";
import { type Mock, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { updateCursorMCPConfig } from "../../utils/cursor-config.js";

// Mock dependencies
const mockMkdir = vi.fn(); // Keep for tests to reference, but factory won't use this directly
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();

vi.mock("node:fs/promises", () => {
	// The factory creates its own vi.fn() instances.
	const internalMockMkdir = vi.fn();
	const internalMockReadFile = vi.fn();
	const internalMockWriteFile = vi.fn();

	// In each test, we will need to ensure our top-level mockMkdir (etc.)
	// are reassigned or that we use fs.default.mkdir for setups/assertions.
	// For now, let's try to make the test setup point to these internal ones.

	// This is tricky. A better way is to have tests import the mocked 'fs' and use its methods.
	// However, to keep current test structure, we need to update the top-level mocks.

	// The simplest factory just returns the new mocks:
	return {
		default: {
			mkdir: internalMockMkdir, // Use the factory-scoped mocks
			readFile: internalMockReadFile,
			writeFile: internalMockWriteFile,
		},
	};
});

vi.mock("node:os", () => ({
	homedir: vi.fn(),
}));

// Mock for node:path - just provides spies, actual implementation obtained via importActual later
vi.mock("node:path", () => ({
	join: vi.fn(),
	resolve: vi.fn(),
	// Add other path functions if they are called by SUT and need to be part of the mock structure
	// e.g., dirname: vi.fn(), basename: vi.fn(), etc.
}));

const mockLoggerInstance = {
	// Define a consistent logger mock instance
	info: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
	warn: vi.fn(), // Added warn as it's a common log level
};

vi.mock("vscode", () => ({
	window: {
		showInformationMessage: vi.fn(),
		showErrorMessage: vi.fn(),
		createOutputChannel: vi.fn(() => ({ appendLine: vi.fn(), show: vi.fn() })),
	},
	workspace: {
		workspaceFolders: [
			{
				uri: {
					fsPath: "/mock/workspace", // Or use mockExtensionPath if it represents the workspace
				},
				name: "Mock Workspace",
				index: 0,
			},
		],
	},
}));

vi.mock("../../utils/log.js", () => ({
	// Ensure this mock returns the consistent instance
	Logger: {
		getInstance: () => mockLoggerInstance,
	},
}));

describe("cursor-config", () => {
	let actualNodePath: typeof path;
	// References to the *actual* mock functions created by the factory
	let currentFsMocks: {
		mkdir: typeof mockMkdir;
		readFile: typeof mockReadFile;
		writeFile: typeof mockWriteFile;
	};

	beforeAll(async () => {
		actualNodePath = await vi.importActual<typeof path>("node:path");
		// After mocks are set up, get the actual mocked functions
		const fs = await import("node:fs/promises");
		currentFsMocks = {
			mkdir: vi.mocked(fs.default.mkdir),
			readFile: vi.mocked(fs.default.readFile),
			writeFile: vi.mocked(fs.default.writeFile),
		};
	});

	const mockHomeDir = "/mock/home";
	const mockConfigPath = "/mock/home/.cursor/mcp.json";
	const mockCursorDir = "/mock/home/.cursor";
	const mockExtensionPath = "/mock/extension/path";
	const mockWorkspacePath = "/mock/workspace"; // Same as in the vscode mock

	let expectedStdioServerConfig: any;

	beforeEach(() => {
		vi.clearAllMocks(); // This will clear currentFsMocks.mkdir, etc.
		mockLoggerInstance.error.mockClear();

		if (!actualNodePath) {
			throw new Error("actualNodePath not initialized - check beforeAll hook");
		}

		// Define expectedStdioServerConfig using the actual path join logic
		// TODO: Why is this reported as "useless" by the linter?

		expectedStdioServerConfig = {
			name: "AI Memory",
			command: "node",
			args: [actualNodePath.join(mockExtensionPath, "dist", "index.cjs"), mockWorkspacePath],
			cwd: mockExtensionPath,
		};

		(os.homedir as Mock).mockReturnValue(mockHomeDir);

		// Configure the mocked path.join (which is a vi.fn() from the vi.mock factory)
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
			return actualNodePath.join(...args); // Delegate to the actual implementation
		});

		// If path.resolve is used by the SUT, configure its mock too to delegate to actual
		(path.resolve as Mock).mockImplementation((...args: string[]): string => {
			return actualNodePath.resolve(...args); // Delegate to actual
		});

		// Reset fs mocks using the references from currentFsMocks
		currentFsMocks.mkdir.mockResolvedValue(undefined);
		currentFsMocks.readFile.mockResolvedValue('{"mcpServers": {}}');
		currentFsMocks.writeFile.mockResolvedValue(undefined);
	});

	describe("updateCursorMCPConfig", () => {
		it("creates new config file with AI Memory server (STDIO)", async () => {
			currentFsMocks.readFile.mockRejectedValue(new Error("ENOENT"));

			await updateCursorMCPConfig(mockExtensionPath);

			const expectedConfig = {
				mcpServers: {
					"AI Memory": {
						name: "AI Memory",
						command: "node",
						args: [
							"/mock/workspace/dist/mcp-server.js",
							"--workspace",
							"/mock/workspace",
						],
						cwd: "/mock/workspace",
					},
				},
			};

			expect(currentFsMocks.mkdir).toHaveBeenCalledWith(mockCursorDir, { recursive: true });
			expect(currentFsMocks.writeFile).toHaveBeenCalledWith(
				mockConfigPath,
				JSON.stringify(expectedConfig, null, 2),
			);
			expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
				"Cursor MCP config updated for AI Memory (STDIO).",
			);
		});

		it("updates existing config file with AI Memory server (STDIO)", async () => {
			const existingConfig = {
				mcpServers: {
					"Other Server": {
						command: "other-command",
					},
				},
			};
			currentFsMocks.readFile.mockResolvedValue(JSON.stringify(existingConfig));

			await updateCursorMCPConfig(mockExtensionPath);

			const expectedConfig = {
				mcpServers: {
					"Other Server": {
						command: "other-command",
					},
					"AI Memory": {
						name: "AI Memory",
						command: "node",
						args: [
							"/mock/workspace/dist/mcp-server.js",
							"--workspace",
							"/mock/workspace",
						],
						cwd: "/mock/workspace",
					},
				},
			};

			expect(currentFsMocks.writeFile).toHaveBeenCalledWith(
				mockConfigPath,
				JSON.stringify(expectedConfig, null, 2),
			);
			expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
				"Cursor MCP config updated for AI Memory (STDIO).",
			);
		});

		it("handles config file with no mcpServers property (STDIO)", async () => {
			const existingConfig = { someOtherProperty: "value" };
			currentFsMocks.readFile.mockResolvedValue(JSON.stringify(existingConfig));

			await updateCursorMCPConfig(mockExtensionPath);

			const expectedConfig = {
				someOtherProperty: "value",
				mcpServers: {
					"AI Memory": {
						name: "AI Memory",
						command: "node",
						args: [
							"/mock/workspace/dist/mcp-server.js",
							"--workspace",
							"/mock/workspace",
						],
						cwd: "/mock/workspace",
					},
				},
			};

			expect(currentFsMocks.writeFile).toHaveBeenCalledWith(
				mockConfigPath,
				JSON.stringify(expectedConfig, null, 2),
			);
			expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
				"Cursor MCP config updated for AI Memory (STDIO).",
			);
		});

		it("skips update when AI Memory server already exists with same STDIO config", async () => {
			const existingConfig = {
				mcpServers: {
					"AI Memory": {
						name: "AI Memory",
						command: "node",
						args: [
							"/mock/workspace/dist/mcp-server.js",
							"--workspace",
							"/mock/workspace",
						],
						cwd: "/mock/workspace",
					},
				},
			};
			currentFsMocks.readFile.mockResolvedValue(JSON.stringify(existingConfig));

			await updateCursorMCPConfig(mockExtensionPath);

			expect(currentFsMocks.writeFile).not.toHaveBeenCalled();
			expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
		});

		it("updates AI Memory server when STDIO config differs (e.g. different extensionPath)", async () => {
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
			currentFsMocks.readFile.mockResolvedValue(JSON.stringify(existingConfig));

			await updateCursorMCPConfig(mockExtensionPath);

			const expectedConfig = {
				mcpServers: {
					"AI Memory": {
						name: "AI Memory",
						command: "node",
						args: [
							"/mock/workspace/dist/mcp-server.js",
							"--workspace",
							"/mock/workspace",
						],
						cwd: "/mock/workspace",
					},
				},
			};

			expect(currentFsMocks.writeFile).toHaveBeenCalledWith(
				mockConfigPath,
				JSON.stringify(expectedConfig, null, 2),
			);
			expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
				"Cursor MCP config updated for AI Memory (STDIO).",
			);
		});

		it("handles invalid JSON in existing config file (STDIO)", async () => {
			currentFsMocks.readFile.mockResolvedValue("invalid json");

			await updateCursorMCPConfig(mockExtensionPath);

			const expectedConfig = {
				mcpServers: {
					"AI Memory": {
						name: "AI Memory",
						command: "node",
						args: [
							"/mock/workspace/dist/mcp-server.js",
							"--workspace",
							"/mock/workspace",
						],
						cwd: "/mock/workspace",
					},
				},
			};

			expect(currentFsMocks.writeFile).toHaveBeenCalledWith(
				mockConfigPath,
				JSON.stringify(expectedConfig, null, 2),
			);
			expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
				"Cursor MCP config updated for AI Memory (STDIO).",
			);
		});

		it("handles directory creation errors gracefully (STDIO)", async () => {
			currentFsMocks.mkdir.mockRejectedValueOnce(new Error("Permission denied"));
			currentFsMocks.readFile.mockRejectedValueOnce(new Error("ENOENT: file not found")); // To ensure it tries to write

			await expect(updateCursorMCPConfig(mockExtensionPath)).rejects.toThrow(
				"Permission denied",
			);

			expect(currentFsMocks.mkdir).toHaveBeenCalledWith(mockCursorDir, { recursive: true });
			// writeFile should NOT be called if mkdir failed and the error propagated
			expect(currentFsMocks.writeFile).not.toHaveBeenCalled();
			// Check that an error message was shown to the user
			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
				"Failed to update Cursor MCP config: Permission denied",
			);
		});

		it("handles file write errors (STDIO)", async () => {
			currentFsMocks.readFile.mockRejectedValue(new Error("ENOENT: file not found")); // To ensure it tries to write
			currentFsMocks.writeFile.mockRejectedValue(new Error("Write permission denied"));

			await expect(updateCursorMCPConfig(mockExtensionPath)).rejects.toThrow(
				"Write permission denied",
			);

			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
				"Failed to update Cursor MCP config: Write permission denied",
			);
		});

		it("handles non-Error exceptions (STDIO)", async () => {
			currentFsMocks.readFile.mockRejectedValue(new Error("ENOENT: file not found")); // To ensure it tries to write
			currentFsMocks.writeFile.mockRejectedValue("String error");

			await expect(updateCursorMCPConfig(mockExtensionPath)).rejects.toThrow("String error");

			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
				"Failed to update Cursor MCP config: String error",
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
			currentFsMocks.readFile.mockResolvedValue(JSON.stringify(oldUrlConfig));

			await updateCursorMCPConfig(mockExtensionPath);

			const expectedConfig = {
				mcpServers: {
					"AI Memory": {
						name: "AI Memory",
						command: "node",
						args: [
							"/mock/workspace/dist/mcp-server.js",
							"--workspace",
							"/mock/workspace",
						],
						cwd: "/mock/workspace",
					},
				},
			};

			expect(currentFsMocks.writeFile).toHaveBeenCalledWith(
				mockConfigPath,
				JSON.stringify(expectedConfig, null, 2),
			);
			expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
				"Cursor MCP config updated for AI Memory (STDIO).",
			);
		});
	});
});
