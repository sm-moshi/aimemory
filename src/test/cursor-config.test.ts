import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { type Mock, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { updateCursorMCPConfig } from "../utils/cursor-config.js";

// Mock dependencies
vi.mock("node:fs/promises", () => ({
	mkdir: vi.fn(),
	readFile: vi.fn(),
	writeFile: vi.fn(),
}));

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

vi.mock("vscode", () => ({
	window: {
		showInformationMessage: vi.fn(),
		showErrorMessage: vi.fn(),
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

describe("cursor-config", () => {
	let actualNodePath: typeof path; // To store the actual 'node:path' module

	beforeAll(async () => {
		// Import the actual 'node:path' module once before any tests or hooks run
		actualNodePath = await vi.importActual<typeof path>("node:path");
	});

	const mockHomeDir = "/mock/home";
	const mockConfigPath = "/mock/home/.cursor/mcp.json";
	const mockCursorDir = "/mock/home/.cursor";
	const mockExtensionPath = "/mock/extension/path";
	const mockWorkspacePath = "/mock/workspace"; // Same as in the vscode mock

	let expectedStdioServerConfig: any;

	beforeEach(() => {
		vi.clearAllMocks();

		if (!actualNodePath) {
			throw new Error("actualNodePath not initialized - check beforeAll hook");
		}

		// Define expectedStdioServerConfig using the actual path join logic
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

		(fs.mkdir as Mock).mockResolvedValue(undefined);
		(fs.readFile as Mock).mockResolvedValue('{"mcpServers": {}}');
		(fs.writeFile as Mock).mockResolvedValue(undefined);
	});

	describe("updateCursorMCPConfig", () => {
		it("creates new config file with AI Memory server (STDIO)", async () => {
			(fs.readFile as Mock).mockRejectedValue(new Error("ENOENT: file not found"));

			await updateCursorMCPConfig(mockExtensionPath);

			expect(fs.mkdir).toHaveBeenCalledWith(mockCursorDir, { recursive: true });
			expect(fs.writeFile).toHaveBeenCalledWith(
				mockConfigPath,
				JSON.stringify(
					{
						mcpServers: {
							"AI Memory": expectedStdioServerConfig,
						},
					},
					null,
					2,
				),
			);
			expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
				"Cursor MCP config updated for AI Memory (STDIO).",
			);
		});

		it("updates existing config file with AI Memory server (STDIO)", async () => {
			const existingConfig = {
				mcpServers: {
					"Other Server": {
						name: "Other Server",
						url: "http://localhost:8080/sse",
					},
				},
			};
			(fs.readFile as Mock).mockResolvedValue(JSON.stringify(existingConfig));

			await updateCursorMCPConfig(mockExtensionPath);

			const expectedConfig = {
				mcpServers: {
					"Other Server": {
						name: "Other Server",
						url: "http://localhost:8080/sse",
					},
					"AI Memory": expectedStdioServerConfig,
				},
			};

			expect(fs.writeFile).toHaveBeenCalledWith(
				mockConfigPath,
				JSON.stringify(expectedConfig, null, 2),
			);
		});

		it("handles config file with no mcpServers property (STDIO)", async () => {
			const existingConfig = { someOtherProperty: "value" };
			(fs.readFile as Mock).mockResolvedValue(JSON.stringify(existingConfig));

			await updateCursorMCPConfig(mockExtensionPath);

			const expectedConfig = {
				someOtherProperty: "value",
				mcpServers: {
					"AI Memory": expectedStdioServerConfig,
				},
			};

			expect(fs.writeFile).toHaveBeenCalledWith(
				mockConfigPath,
				JSON.stringify(expectedConfig, null, 2),
			);
		});

		it("skips update when AI Memory server already exists with same STDIO config", async () => {
			const existingConfig = {
				mcpServers: {
					"AI Memory": expectedStdioServerConfig,
				},
			};
			(fs.readFile as Mock).mockResolvedValue(JSON.stringify(existingConfig));

			await updateCursorMCPConfig(mockExtensionPath);

			expect(fs.writeFile).not.toHaveBeenCalled();
			expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
		});

		it("updates AI Memory server when STDIO config differs (e.g. different extensionPath)", async () => {
			const differentStdioConfig = {
				name: "AI Memory",
				command: "node",
				args: [actualNodePath.join("/different/path", "dist", "index.cjs")],
				cwd: "/different/path",
			};
			const existingConfig = {
				mcpServers: {
					"AI Memory": differentStdioConfig,
				},
			};
			(fs.readFile as Mock).mockResolvedValue(JSON.stringify(existingConfig));

			await updateCursorMCPConfig(mockExtensionPath);

			const expectedConfig = {
				mcpServers: {
					"AI Memory": expectedStdioServerConfig,
				},
			};

			expect(fs.writeFile).toHaveBeenCalledWith(
				mockConfigPath,
				JSON.stringify(expectedConfig, null, 2),
			);
		});

		it("handles invalid JSON in existing config file (STDIO)", async () => {
			(fs.readFile as Mock).mockResolvedValue("invalid json content");

			await updateCursorMCPConfig(mockExtensionPath);

			const expectedConfig = {
				mcpServers: {
					"AI Memory": expectedStdioServerConfig,
				},
			};

			expect(fs.writeFile).toHaveBeenCalledWith(
				mockConfigPath,
				JSON.stringify(expectedConfig, null, 2),
			);
		});

		it("handles directory creation errors gracefully (STDIO)", async () => {
			(fs.mkdir as Mock).mockRejectedValue(new Error("Permission denied"));
			(fs.readFile as Mock).mockRejectedValue(new Error("ENOENT: file not found"));

			await updateCursorMCPConfig(mockExtensionPath);

			// Should still attempt to write the file
			expect(fs.writeFile).toHaveBeenCalled();
		});

		it("handles file write errors (STDIO)", async () => {
			(fs.readFile as Mock).mockRejectedValue(new Error("ENOENT: file not found"));
			(fs.writeFile as Mock).mockRejectedValue(new Error("Write permission denied"));

			await updateCursorMCPConfig(mockExtensionPath);

			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
				"Failed to update Cursor MCP config: Write permission denied",
			);
		});

		it("handles non-Error exceptions (STDIO)", async () => {
			(fs.readFile as Mock).mockRejectedValue(new Error("ENOENT: file not found"));
			(fs.writeFile as Mock).mockRejectedValue("String error");

			await updateCursorMCPConfig(mockExtensionPath);

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
			(fs.readFile as Mock).mockResolvedValue(JSON.stringify(oldUrlConfig));

			await updateCursorMCPConfig(mockExtensionPath);

			const expectedConfig = {
				mcpServers: {
					"AI Memory": expectedStdioServerConfig,
				},
			};

			expect(fs.writeFile).toHaveBeenCalledWith(
				mockConfigPath,
				JSON.stringify(expectedConfig, null, 2),
			);
			expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
				"Cursor MCP config updated for AI Memory (STDIO).",
			);
		});
	});
});
