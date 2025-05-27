import { describe, expect, it, vi } from "vitest";
import { MemoryBankMCPAdapter } from "../mcp/mcpAdapter.js";

// Mock vscode API
vi.mock("vscode", () => ({
	workspace: {
		workspaceFolders: [
			{
				uri: { fsPath: "/mock/workspace" },
				name: "Mock Workspace",
				index: 0,
			},
		],
	},
	// TODO: Add other vscode parts if needed by the adapter, e.g., window for messages
	window: {
		showInformationMessage: vi.fn(),
		showErrorMessage: vi.fn(),
		// ... any other window properties used
	},
}));

// Mock dependencies
vi.mock("node:child_process", () => ({
	spawn: vi.fn(() => ({
		on: vi.fn(),
		kill: vi.fn(),
		killed: false,
		stderr: {
			on: vi.fn(),
		},
	})),
}));

vi.mock("node:path", async () => {
	const actual = await vi.importActual("node:path");
	return {
		...actual,
		join: vi.fn(() => "/mock/extension/path/dist/index.cjs"),
	};
});

vi.mock("../core/memoryBank.js", () => ({
	MemoryBankService: vi.fn().mockImplementation(() => ({
		updateFile: vi.fn(),
		initializeFolders: vi.fn(),
		loadFiles: vi.fn(),
		checkHealth: vi.fn().mockResolvedValue("All systems healthy"),
	})),
}));

vi.mock("../utils/log.js", () => ({
	Logger: {
		getInstance: vi.fn(() => ({
			info: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
		})),
	},
}));

describe("MemoryBankMCPAdapter", () => {
	const mockContext = {
		extensionPath: "/mock/extension/path",
	};

	describe("constructor", () => {
		it("initializes with correct default values", () => {
			const adapter = new MemoryBankMCPAdapter(mockContext as any, 7331);
			expect(adapter.getPort()).toBe(7331);
			expect(adapter.isServerRunning()).toBe(false);
		});

		it("uses default port when not specified", () => {
			const adapter = new MemoryBankMCPAdapter(mockContext as any);
			expect(adapter.getPort()).toBe(3000);
		});
	});

	describe("interface compatibility", () => {
		it("getPort returns configured port", () => {
			const adapter = new MemoryBankMCPAdapter(mockContext as any, 7331);
			expect(adapter.getPort()).toBe(7331);
		});

		it("getMemoryBank returns memory bank service instance", () => {
			const adapter = new MemoryBankMCPAdapter(mockContext as any, 7331);
			const memoryBank = adapter.getMemoryBank();
			expect(memoryBank).toBeDefined();
		});

		it("setExternalServerRunning can be called", () => {
			const adapter = new MemoryBankMCPAdapter(mockContext as any, 7331);
			expect(() => adapter.setExternalServerRunning(8080)).not.toThrow();
		});
	});

	describe("isServerRunning", () => {
		it("returns false when not started", () => {
			const adapter = new MemoryBankMCPAdapter(mockContext as any, 7331);
			expect(adapter.isServerRunning()).toBe(false);
		});
	});

	describe("updateMemoryBankFile", () => {
		it("delegates to memory bank service", async () => {
			const adapter = new MemoryBankMCPAdapter(mockContext as any, 7331);
			await expect(
				adapter.updateMemoryBankFile("core/projectbrief.md", "test content"),
			).resolves.not.toThrow();
		});
	});

	describe("handleCommand", () => {
		it("handles init command", async () => {
			const adapter = new MemoryBankMCPAdapter(mockContext as any, 7331);
			const result = await adapter.handleCommand("init", []);
			expect(result).toBe("Memory bank initialized successfully");
		});

		it("handles status command", async () => {
			const adapter = new MemoryBankMCPAdapter(mockContext as any, 7331);
			const result = await adapter.handleCommand("status", []);
			expect(result).toBe("Memory bank status: All systems healthy");
		});

		it("handles unknown commands", async () => {
			const adapter = new MemoryBankMCPAdapter(mockContext as any, 7331);
			const result = await adapter.handleCommand("unknown", []);
			expect(result).toBe("Unknown command: unknown");
		});
	});

	describe("start and stop", () => {
		it("start method exists and can be called", async () => {
			const adapter = new MemoryBankMCPAdapter(mockContext as any, 7331);
			await expect(adapter.start()).resolves.not.toThrow();
		});

		it("stop method exists and can be called", () => {
			const adapter = new MemoryBankMCPAdapter(mockContext as any, 7331);
			expect(() => adapter.stop()).not.toThrow();
		});
	});
});
