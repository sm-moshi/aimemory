/**
 * Tests for Cursor Config Helpers
 * Verifies functionality of cursor config management utilities
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	compareServerConfigs,
	createAIMemoryServerConfig,
	ensureCursorDirectory,
	readCursorMCPConfig,
	writeCursorMCPConfig,
} from "../../services/cursor/config-helpers.js";
import type { CursorMCPConfig, MCPServerConfig } from "../../types/config.js";
import { setupVSCodeMock, standardAfterEach, standardBeforeEach } from "../test-utils/index.js";

// Setup mocks
setupVSCodeMock();

// Define a consistent mock logger instance with proper Vitest mock functions
const mockLoggerInstance = {
	info: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
	log: vi.fn(),
	setLevel: vi.fn(),
	showOutput: vi.fn(),
};

// Mock Logger to return the consistent instance
vi.mock("../../infrastructure/logging/vscode-logger.js", () => ({
	Logger: {
		getInstance: () => mockLoggerInstance,
	},
	LogLevel: {
		Trace: 0,
		Debug: 1,
		Info: 2,
		Warning: 3,
		Error: 4,
		Off: 5,
	},
}));

// Mock process helpers
vi.mock("../../infrastructure/process/helpers.js", () => ({
	validateWorkspace: vi.fn().mockReturnValue("/test/workspace"),
}));

// Mock OS
vi.mock("node:os", () => ({
	homedir: vi.fn(() => "/test/home"),
}));

describe("Cursor Config Helpers", () => {
	beforeEach(() => {
		standardBeforeEach();
	});

	afterEach(() => {
		standardAfterEach();
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
		const mockFileOperationManager = {
			mkdirWithRetry: vi.fn(),
			readFileWithRetry: vi.fn(),
			writeFileWithRetry: vi.fn(),
		} as any;

		it("should create directory successfully", async () => {
			mockFileOperationManager.mkdirWithRetry.mockResolvedValue({
				success: true,
				data: undefined,
			});

			const result = await ensureCursorDirectory(mockFileOperationManager);

			expect(result).toBe("/test/home/.cursor");
			expect(mockFileOperationManager.mkdirWithRetry).toHaveBeenCalledWith(
				"/test/home/.cursor",
				{
					recursive: true,
				},
			);
		});

		it("should handle EEXIST error gracefully", async () => {
			mockFileOperationManager.mkdirWithRetry.mockResolvedValue({
				success: false,
				error: { code: "EEXIST", message: "Directory exists" },
			});

			const result = await ensureCursorDirectory(mockFileOperationManager);

			expect(result).toBe("/test/home/.cursor");
		});

		it("should log unexpected errors", async () => {
			mockFileOperationManager.mkdirWithRetry.mockResolvedValue({
				success: false,
				error: { code: "EACCES", message: "Permission denied" },
			});

			// Spy on the 'error' method of the consistent mockLoggerInstance
			const loggerErrorSpy = vi.spyOn(mockLoggerInstance, "error");

			await expect(ensureCursorDirectory(mockFileOperationManager)).rejects.toThrow(
				"Permission denied",
			);

			expect(loggerErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("Failed to create .cursor directory: Permission denied"),
			);
			// No need to restore spy on mockLoggerInstance.error if it's cleared in beforeEach
		});
	});

	describe("readCursorMCPConfig", () => {
		const mockFileOperationManager = {
			readFileWithRetry: vi.fn(),
		} as any;

		it("should read and parse existing config", async () => {
			const mockConfig = { mcpServers: { test: { name: "test" } } };
			mockFileOperationManager.readFileWithRetry.mockResolvedValue({
				success: true,
				data: JSON.stringify(mockConfig),
			});

			const result = await readCursorMCPConfig(mockFileOperationManager);

			expect(result).toEqual(mockConfig);
			expect(mockFileOperationManager.readFileWithRetry).toHaveBeenCalledWith(
				"/test/home/.cursor/mcp.json",
			);
		});

		it("should handle missing config file", async () => {
			const enoentError = new Error("File not found") as NodeJS.ErrnoException;
			enoentError.code = "ENOENT";
			mockFileOperationManager.readFileWithRetry.mockResolvedValue({
				success: false,
				error: { code: "ENOENT", message: "File not found" },
			});

			const result = await readCursorMCPConfig(mockFileOperationManager);

			expect(result).toEqual({ mcpServers: {} });
		});

		it("should handle JSON parse errors", async () => {
			mockFileOperationManager.readFileWithRetry.mockResolvedValue({
				success: true,
				data: "invalid json",
			});

			const result = await readCursorMCPConfig(mockFileOperationManager);

			expect(result).toEqual({ mcpServers: {} });
		});
	});

	describe("writeCursorMCPConfig", () => {
		it("should write config with proper formatting", async () => {
			const mockFileOperationManager = {
				writeFileWithRetry: vi.fn(),
			} as any;
			mockFileOperationManager.writeFileWithRetry.mockResolvedValue({ success: true });

			const config: CursorMCPConfig = {
				mcpServers: {
					"AI Memory": {
						name: "AI Memory",
						command: "node",
					},
				},
			};

			await writeCursorMCPConfig(config, mockFileOperationManager);

			expect(mockFileOperationManager.writeFileWithRetry).toHaveBeenCalledWith(
				"/test/home/.cursor/mcp.json",
				JSON.stringify(config, null, 2),
			);
		});
	});
});
