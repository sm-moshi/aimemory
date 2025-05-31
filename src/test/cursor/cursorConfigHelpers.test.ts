/**
 * Tests for Cursor Config Helpers
 * Verifies functionality of cursor config management utilities
 */

import fs from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CursorMCPConfig, MCPServerConfig } from "../../types/config.js";
import {
	compareServerConfigs,
	createAIMemoryServerConfig,
	ensureCursorDirectory,
	readCursorMCPConfig,
	writeCursorMCPConfig,
} from "../../utils/cursorConfigHelpers.js";

// Mock file system operations
vi.mock("node:fs/promises", () => ({
	default: {
		mkdir: vi.fn(),
		readFile: vi.fn(),
		writeFile: vi.fn(),
	},
}));

// Mock VS Code
vi.mock("vscode", () => ({
	window: {
		showInformationMessage: vi.fn(),
		showErrorMessage: vi.fn(),
	},
}));

// Define a consistent mock logger instance
const mockLoggerInstance = {
	info: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
	warn: vi.fn(), // Added warn as it's a common log level
};

// Mock Logger to return the consistent instance
vi.mock("../../utils/log.js", () => ({
	Logger: {
		getInstance: () => mockLoggerInstance,
	},
}));

// Mock process helpers
vi.mock("../../mcp/shared/processHelpers.js", () => ({
	validateWorkspace: vi.fn().mockReturnValue("/test/workspace"),
}));

// Mock OS
vi.mock("node:os", () => ({
	homedir: vi.fn(() => "/test/home"),
}));

describe("Cursor Config Helpers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Specifically clear mocks on the shared logger instance
		mockLoggerInstance.info.mockClear();
		mockLoggerInstance.error.mockClear();
		mockLoggerInstance.debug.mockClear();
		mockLoggerInstance.warn.mockClear();
	});

	afterEach(() => {
		vi.restoreAllMocks(); // This might be redundant if clearAllMocks and specific clears are used.
	});

	describe("createAIMemoryServerConfig", () => {
		it("should create AI Memory server config for Unix paths", () => {
			const result = createAIMemoryServerConfig("/workspace/path");
			expect(result).toEqual({
				name: "AI Memory",
				command: "node",
				args: ["/workspace/path/dist/mcp-server.js", "--workspace", "/workspace/path"],
				cwd: "/workspace/path",
			});
		});

		it("should create AI Memory server config for Windows paths", () => {
			const result = createAIMemoryServerConfig("C:\\workspace\\path");
			expect(result).toEqual({
				name: "AI Memory",
				command: "node",
				args: [
					"C:\\workspace\\path/dist/mcp-server.js",
					"--workspace",
					"C:\\workspace\\path",
				],
				cwd: "C:\\workspace\\path",
			});
		});

		it("should detect differences when configs don't match", () => {
			const config1 = {
				name: "AI Memory",
				command: "node",
				args: ["old-path.js"],
				cwd: "/old/path",
			};
			const config2 = {
				name: "AI Memory",
				command: "node",
				args: ["new-path.js"],
				cwd: "/new/path",
			};
			const result = compareServerConfigs(config1, config2);
			expect(result.matches).toBe(false);
			expect(result.differences).toContain("cwd: /old/path → /new/path");
			expect(result.differences).toContain('args: ["old-path.js"] → ["new-path.js"]');
		});
	});

	describe("compareServerConfigs", () => {
		const baseConfig: MCPServerConfig = {
			name: "AI Memory",
			command: "node",
			args: ["/ext/dist/index.cjs", "/workspace"],
			cwd: "/ext",
		};

		it("should return match when configs are identical", () => {
			const result = compareServerConfigs(baseConfig, baseConfig);

			expect(result.matches).toBe(true);
			expect(result.differences).toBeUndefined();
		});

		it("should detect command differences", () => {
			const differentConfig = { ...baseConfig, command: "bun" };
			const result = compareServerConfigs(baseConfig, differentConfig);

			expect(result.matches).toBe(false);
			expect(result.differences).toContain("command: node → bun");
		});

		it("should detect cwd differences", () => {
			const differentConfig = { ...baseConfig, cwd: "/different/ext" };
			const result = compareServerConfigs(baseConfig, differentConfig);

			expect(result.matches).toBe(false);
			expect(result.differences).toContain("cwd: /ext → /different/ext");
		});

		it("should detect args differences", () => {
			const differentConfig = { ...baseConfig, args: ["/different/path"] };
			const result = compareServerConfigs(baseConfig, differentConfig);

			expect(result.matches).toBe(false);
			expect(result.differences?.length).toBe(1);
			expect(result.differences?.[0]).toContain("args:");
		});

		it("should detect multiple differences", () => {
			const differentConfig: MCPServerConfig = {
				...baseConfig,
				command: "bun",
				cwd: "/different",
			};
			const result = compareServerConfigs(baseConfig, differentConfig);

			expect(result.matches).toBe(false);
			expect(result.differences?.length).toBe(2);
		});
	});

	describe("ensureCursorDirectory", () => {
		it("should create directory successfully", async () => {
			vi.mocked(fs.mkdir).mockResolvedValue(undefined as any);

			const result = await ensureCursorDirectory();

			expect(result).toBe("/test/home/.cursor");
			expect(fs.mkdir).toHaveBeenCalledWith("/test/home/.cursor", { recursive: true });
		});

		it("should handle EEXIST error gracefully", async () => {
			const eexistError = new Error("Directory exists") as NodeJS.ErrnoException;
			eexistError.code = "EEXIST";
			vi.mocked(fs.mkdir).mockRejectedValue(eexistError);

			const result = await ensureCursorDirectory();

			expect(result).toBe("/test/home/.cursor");
		});

		it("should log unexpected errors", async () => {
			const unexpectedError = new Error("Permission denied") as NodeJS.ErrnoException;
			unexpectedError.code = "EACCES";
			vi.mocked(fs.mkdir).mockRejectedValue(unexpectedError);

			// Spy on the 'error' method of the consistent mockLoggerInstance
			const loggerErrorSpy = vi.spyOn(mockLoggerInstance, "error");

			await expect(ensureCursorDirectory()).rejects.toThrow("Permission denied");

			expect(loggerErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					"Unexpected error creating .cursor directory: Permission denied",
				),
			);
			// No need to restore spy on mockLoggerInstance.error if it's cleared in beforeEach
		});
	});

	describe("readCursorMCPConfig", () => {
		it("should read and parse existing config", async () => {
			const mockConfig = { mcpServers: { test: { name: "test" } } };
			vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig) as any);

			const result = await readCursorMCPConfig();

			expect(result).toEqual(mockConfig);
			expect(fs.readFile).toHaveBeenCalledWith("/test/home/.cursor/mcp.json", "utf-8");
		});

		it("should handle missing config file", async () => {
			const enoentError = new Error("File not found") as NodeJS.ErrnoException;
			enoentError.code = "ENOENT";
			vi.mocked(fs.readFile).mockRejectedValue(enoentError);

			const result = await readCursorMCPConfig();

			expect(result).toEqual({ mcpServers: {} });
		});

		it("should handle JSON parse errors", async () => {
			vi.mocked(fs.readFile).mockResolvedValue("invalid json" as any);

			const result = await readCursorMCPConfig();

			expect(result).toEqual({ mcpServers: {} });
		});
	});

	describe("writeCursorMCPConfig", () => {
		it("should write config with proper formatting", async () => {
			vi.mocked(fs.writeFile).mockResolvedValue(undefined);

			const config: CursorMCPConfig = {
				mcpServers: {
					"AI Memory": {
						name: "AI Memory",
						command: "node",
					},
				},
			};

			await writeCursorMCPConfig(config);

			expect(fs.writeFile).toHaveBeenCalledWith(
				"/test/home/.cursor/mcp.json",
				JSON.stringify(config, null, 2),
			);
		});
	});
});
