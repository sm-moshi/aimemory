import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

vi.mock("node:path", async () => {
	const actual = await vi.importActual("node:path");
	return {
		...actual,
		join: vi.fn(),
	};
});

vi.mock("vscode", () => ({
	window: {
		showInformationMessage: vi.fn(),
		showErrorMessage: vi.fn(),
	},
}));

describe("cursor-config", () => {
	const mockHomeDir = "/mock/home";
	const mockConfigPath = "/mock/home/.cursor/mcp.json";
	const mockCursorDir = "/mock/home/.cursor";

	beforeEach(() => {
		vi.clearAllMocks();

		// Setup default mocks
		(os.homedir as any).mockReturnValue(mockHomeDir);
		(path.join as any)
			.mockReturnValueOnce(mockConfigPath) // for mcpConfigPath
			.mockReturnValueOnce(mockCursorDir); // for cursorDir

		(fs.mkdir as any).mockResolvedValue(undefined);
		(fs.readFile as any).mockResolvedValue('{"mcpServers": {}}');
		(fs.writeFile as any).mockResolvedValue(undefined);
	});

	describe("updateCursorMCPConfig", () => {
		it("creates new config file with AI Memory server", async () => {
			// Mock file doesn't exist
			(fs.readFile as any).mockRejectedValue(new Error("ENOENT: file not found"));

			await updateCursorMCPConfig(7331);

			expect(fs.mkdir).toHaveBeenCalledWith(mockCursorDir, { recursive: true });
			expect(fs.writeFile).toHaveBeenCalledWith(
				mockConfigPath,
				JSON.stringify(
					{
						mcpServers: {
							"AI Memory": {
								name: "AI Memory",
								url: "http://localhost:7331/sse",
							},
						},
					},
					null,
					2,
				),
			);
			expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
				"Cursor MCP config updated to use AI Memory server on port 7331",
			);
		});

		it("updates existing config file with AI Memory server", async () => {
			const existingConfig = {
				mcpServers: {
					"Other Server": {
						name: "Other Server",
						url: "http://localhost:8080/sse",
					},
				},
			};
			(fs.readFile as any).mockResolvedValue(JSON.stringify(existingConfig));

			await updateCursorMCPConfig(7331);

			const expectedConfig = {
				mcpServers: {
					"Other Server": {
						name: "Other Server",
						url: "http://localhost:8080/sse",
					},
					"AI Memory": {
						name: "AI Memory",
						url: "http://localhost:7331/sse",
					},
				},
			};

			expect(fs.writeFile).toHaveBeenCalledWith(
				mockConfigPath,
				JSON.stringify(expectedConfig, null, 2),
			);
		});

		it("handles config file with no mcpServers property", async () => {
			const existingConfig = { someOtherProperty: "value" };
			(fs.readFile as any).mockResolvedValue(JSON.stringify(existingConfig));

			await updateCursorMCPConfig(7331);

			const expectedConfig = {
				someOtherProperty: "value",
				mcpServers: {
					"AI Memory": {
						name: "AI Memory",
						url: "http://localhost:7331/sse",
					},
				},
			};

			expect(fs.writeFile).toHaveBeenCalledWith(
				mockConfigPath,
				JSON.stringify(expectedConfig, null, 2),
			);
		});

		it("skips update when AI Memory server already exists with same URL", async () => {
			const existingConfig = {
				mcpServers: {
					"AI Memory": {
						name: "AI Memory",
						url: "http://localhost:7331/sse",
					},
				},
			};
			(fs.readFile as any).mockResolvedValue(JSON.stringify(existingConfig));

			await updateCursorMCPConfig(7331);

			expect(fs.writeFile).not.toHaveBeenCalled();
			expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
		});

		it("updates AI Memory server when URL differs", async () => {
			const existingConfig = {
				mcpServers: {
					"AI Memory": {
						name: "AI Memory",
						url: "http://localhost:8080/sse", // Different port
					},
				},
			};
			(fs.readFile as any).mockResolvedValue(JSON.stringify(existingConfig));

			await updateCursorMCPConfig(7331);

			const expectedConfig = {
				mcpServers: {
					"AI Memory": {
						name: "AI Memory",
						url: "http://localhost:7331/sse",
					},
				},
			};

			expect(fs.writeFile).toHaveBeenCalledWith(
				mockConfigPath,
				JSON.stringify(expectedConfig, null, 2),
			);
		});

		it("handles invalid JSON in existing config file", async () => {
			(fs.readFile as any).mockResolvedValue("invalid json content");

			await updateCursorMCPConfig(7331);

			const expectedConfig = {
				mcpServers: {
					"AI Memory": {
						name: "AI Memory",
						url: "http://localhost:7331/sse",
					},
				},
			};

			expect(fs.writeFile).toHaveBeenCalledWith(
				mockConfigPath,
				JSON.stringify(expectedConfig, null, 2),
			);
		});

		it("handles directory creation errors gracefully", async () => {
			(fs.mkdir as any).mockRejectedValue(new Error("Permission denied"));
			(fs.readFile as any).mockRejectedValue(new Error("ENOENT: file not found"));

			await updateCursorMCPConfig(7331);

			// Should still attempt to write the file
			expect(fs.writeFile).toHaveBeenCalled();
		});

		it("handles file write errors", async () => {
			(fs.readFile as any).mockRejectedValue(new Error("ENOENT: file not found"));
			(fs.writeFile as any).mockRejectedValue(new Error("Write permission denied"));

			await updateCursorMCPConfig(7331);

			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
				"Failed to update Cursor MCP config: Write permission denied",
			);
		});

		it("handles non-Error exceptions", async () => {
			(fs.readFile as any).mockRejectedValue(new Error("ENOENT: file not found"));
			(fs.writeFile as any).mockRejectedValue("String error");

			await updateCursorMCPConfig(7331);

			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
				"Failed to update Cursor MCP config: String error",
			);
		});

		it("handles different port numbers correctly", async () => {
			(fs.readFile as any).mockRejectedValue(new Error("ENOENT: file not found"));

			await updateCursorMCPConfig(9999);

			expect(fs.writeFile).toHaveBeenCalledWith(
				mockConfigPath,
				JSON.stringify(
					{
						mcpServers: {
							"AI Memory": {
								name: "AI Memory",
								url: "http://localhost:9999/sse",
							},
						},
					},
					null,
					2,
				),
			);
		});

		it("preserves other properties in existing config", async () => {
			const existingConfig = {
				otherSetting: true,
				serverSettings: { timeout: 5000 },
				mcpServers: {
					"Existing Server": {
						name: "Existing Server",
						url: "http://localhost:8888/sse",
					},
				},
			};
			(fs.readFile as any).mockResolvedValue(JSON.stringify(existingConfig));

			await updateCursorMCPConfig(7331);

			const expectedConfig = {
				otherSetting: true,
				serverSettings: { timeout: 5000 },
				mcpServers: {
					"Existing Server": {
						name: "Existing Server",
						url: "http://localhost:8888/sse",
					},
					"AI Memory": {
						name: "AI Memory",
						url: "http://localhost:7331/sse",
					},
				},
			};

			expect(fs.writeFile).toHaveBeenCalledWith(
				mockConfigPath,
				JSON.stringify(expectedConfig, null, 2),
			);
		});
	});
});
