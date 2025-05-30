import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// eslint-disable-next-line sonarjs/no-deprecated-api
import { MemoryBankMCPServer } from "../mcp/mcpServer.js";

// Mock dependencies
vi.mock("../core/memoryBank.js", () => ({
	MemoryBankService: vi.fn().mockImplementation(() => ({
		updateFile: vi.fn(),
		initializeFolders: vi.fn(),
		loadFiles: vi.fn(),
		checkHealth: vi.fn().mockResolvedValue("All systems healthy"),
	})),
}));

// SonarLint: Disable deprecated warnings for this test file
// This test specifically validates deprecated MemoryBankMCPServer behavior
/* eslint-disable sonarjs/no-deprecated-api */
describe("MemoryBankMCPServer", () => {
	const mockContext = {
		extensionPath: "/mock/extension/path",
		subscriptions: [],
	};

	// Mock console.warn to capture deprecation warnings
	const originalWarn = console.warn;
	beforeEach(() => {
		console.warn = vi.fn();
	});

	afterEach(() => {
		console.warn = originalWarn;
	});

	describe("constructor", () => {
		it("initializes with port and shows deprecation warning", () => {
			const server = new MemoryBankMCPServer(mockContext as any, 8080);

			expect(server.getPort()).toBe(8080);
			expect(console.warn).toHaveBeenCalledWith(
				"⚠️ MemoryBankMCPServer is deprecated. Use MemoryBankMCPAdapter instead.",
			);
		});

		it("creates memory bank service instance", () => {
			const server = new MemoryBankMCPServer(mockContext as any, 8080);
			const memoryBank = server.getMemoryBank();

			expect(memoryBank).toBeDefined();
		});
	});

	describe("deprecated methods", () => {
		let server: MemoryBankMCPServer;

		beforeEach(() => {
			server = new MemoryBankMCPServer(mockContext as any, 8080);
		});

		it("setExternalServerRunning throws deprecation error", () => {
			expect(() => server.setExternalServerRunning(9090)).toThrow(
				"MemoryBankMCPServer is deprecated. Use MemoryBankMCPAdapter instead.",
			);
		});

		it("start throws deprecation error", async () => {
			await expect(server.start()).rejects.toThrow(
				"MemoryBankMCPServer is deprecated. Use MemoryBankMCPAdapter instead.",
			);
		});

		it("stop throws deprecation error", () => {
			expect(() => server.stop()).toThrow(
				"MemoryBankMCPServer is deprecated. Use MemoryBankMCPAdapter instead.",
			);
		});

		it("handleCommand throws deprecation error", async () => {
			try {
				await server.handleCommand("test", ["arg1"]);
				expect.fail("Expected handleCommand to throw an error");
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
				expect((error as Error).message).toBe(
					"MemoryBankMCPServer is deprecated. Use MemoryBankMCPAdapter instead.",
				);
			}
		});

		it("updateMemoryBankFile throws deprecation error", async () => {
			await expect(
				server.updateMemoryBankFile("core/projectbrief.md", "content"),
			).rejects.toThrow(
				"MemoryBankMCPServer is deprecated. Use MemoryBankMCPAdapter instead.",
			);
		});
	});

	describe("working methods", () => {
		let server: MemoryBankMCPServer;

		beforeEach(() => {
			server = new MemoryBankMCPServer(mockContext as any, 7331);
		});

		it("getPort returns configured port", () => {
			expect(server.getPort()).toBe(7331);
		});

		it("getMemoryBank returns memory bank service instance", () => {
			const memoryBank = server.getMemoryBank();
			expect(memoryBank).toBeDefined();
		});
	});
});
/* eslint-enable sonarjs/no-deprecated-api */
