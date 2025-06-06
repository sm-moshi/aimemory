/**
 * Tests for Cursor Config Helpers
 * Verifies functionality of cursor config management utilities
 */

import {
	compareServerConfigs,
	createAIMemoryServerConfig,
	ensureCursorDirectory,
	readCursorMCPConfig,
	writeCursorMCPConfig,
} from "@/cursor/config-helpers.js";
import { Logger } from "@/utils/vscode/vscode-logger.js";
import { mockWindow, standardAfterEach, standardBeforeEach } from "@test-utils/index.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CursorMCPConfig, MCPServerConfig } from "../../types/config.js";

// OS mocking is handled automatically by __mocks__/node:os.ts
// Override specific values for this test suite
import { mockOsOperations } from "../__mocks__/node:os.js";

// Configure homedir for cursor tests
mockOsOperations.homedir.mockReturnValue("/test/home");

describe("Cursor Config Helpers", () => {
	let mockLoggerInstance: ReturnType<typeof Logger.getInstance>;

	beforeEach(() => {
		standardBeforeEach();
		// Get a reference to the mocked logger instance for spying
		mockLoggerInstance = Logger.getInstance();
		mockWindow.showErrorMessage.mockClear();
		mockWindow.showInformationMessage.mockClear();
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
				expect.stringContaining(
					"Failed to create directory /test/home/.cursor: Permission denied",
				),
				undefined, // Acknowledge the second argument being undefined
			);
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
