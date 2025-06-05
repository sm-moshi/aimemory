import { describe, expect, it, vi } from "vitest";
import { VSCodeMemoryBankService } from "../../core/vsCodeMemoryBankService.js";
import { MemoryBankMCPAdapter } from "../../mcp/mcpAdapter.js";
import { createMockExtensionContext, setupVSCodeMock } from "../test-utils/index.js";

// Setup VS Code mock using centralized helper
setupVSCodeMock();

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

vi.mock("../../core/vsCodeMemoryBankService.js", () => ({
	// This mock implementation now correctly accepts constructor arguments
	VSCodeMemoryBankService: vi
		.fn()
		.mockImplementation((context, core, cursorRulesService, logger) => ({
			updateFile: vi.fn(),
			initializeFolders: vi.fn(),
			loadFiles: vi.fn(),
			checkHealth: vi.fn().mockResolvedValue("All systems healthy"),
			getIsMemoryBankInitialized: vi.fn().mockResolvedValue(true),
		})),
}));

vi.mock("../../utils/log.js", () => ({
	Logger: {
		getInstance: vi.fn(() => ({
			info: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
		})),
	},
	LogLevel: { Info: "info", Error: "error", Warn: "warn", Debug: "debug" },
}));

// Create basic mock dependencies for VSCodeMemoryBankService
const mockCoreService = {} as any;
const mockCursorRulesService = {} as any;
const mockLogger = {
	// Basic mock for Logger
	info: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
} as any;

// Helper function to create a consistent mock VSCodeMemoryBankService instance
const createMockVSCodeMemoryBankService = () =>
	new VSCodeMemoryBankService(
		mockContext as any,
		mockCoreService,
		mockCursorRulesService,
		mockLogger,
	);

const mockContext = createMockExtensionContext();

describe("MemoryBankMCPAdapter", () => {
	describe("constructor", () => {
		it("initializes with correct default values", () => {
			const mockVSCodeMemoryBankService = createMockVSCodeMemoryBankService();
			const adapter = new MemoryBankMCPAdapter(
				mockContext as any,
				mockVSCodeMemoryBankService,
				mockLogger,
				7331,
			);
			expect(adapter.getPort()).toBe(7331);
			expect(adapter.isServerRunning()).toBe(false);
		});

		it("uses default port when not specified", () => {
			const mockVSCodeMemoryBankService = createMockVSCodeMemoryBankService();
			const adapter = new MemoryBankMCPAdapter(
				mockContext as any,
				mockVSCodeMemoryBankService,
				mockLogger,
			);
			expect(adapter.getPort()).toBe(3000);
		});
	});

	describe("interface compatibility", () => {
		it("getPort returns configured port", () => {
			const mockVSCodeMemoryBankService = createMockVSCodeMemoryBankService();
			const adapter = new MemoryBankMCPAdapter(
				mockContext as any,
				mockVSCodeMemoryBankService,
				mockLogger,
				7331,
			);
			expect(adapter.getPort()).toBe(7331);
		});

		it("getMemoryBank returns memory bank service instance", () => {
			const mockVSCodeMemoryBankService = createMockVSCodeMemoryBankService();
			const adapter = new MemoryBankMCPAdapter(
				mockContext as any,
				mockVSCodeMemoryBankService,
				mockLogger,
				7331,
			);
			const memoryBank = adapter.getMemoryBank();
			expect(memoryBank).toBe(mockVSCodeMemoryBankService);
		});

		it("setExternalServerRunning can be called", () => {
			const mockVSCodeMemoryBankService = createMockVSCodeMemoryBankService();
			const adapter = new MemoryBankMCPAdapter(
				mockContext as any,
				mockVSCodeMemoryBankService,
				mockLogger,
				7331,
			);
			expect(() => adapter.setExternalServerRunning(8080)).not.toThrow();
		});
	});

	describe("isServerRunning", () => {
		it("returns false when not started", () => {
			const mockVSCodeMemoryBankService = createMockVSCodeMemoryBankService();
			const adapter = new MemoryBankMCPAdapter(
				mockContext as any,
				mockVSCodeMemoryBankService,
				mockLogger,
				7331,
			);
			expect(adapter.isServerRunning()).toBe(false);
		});
	});

	describe("updateMemoryBankFile", () => {
		it("delegates to memory bank service", async () => {
			const mockVSCodeMemoryBankService = createMockVSCodeMemoryBankService();
			const adapter = new MemoryBankMCPAdapter(
				mockContext as any,
				mockVSCodeMemoryBankService,
				mockLogger,
				7331,
			);
			await expect(
				adapter.updateMemoryBankFile("core/projectbrief.md", "test content"),
			).resolves.not.toThrow();
		});
	});

	describe("handleCommand", () => {
		it("handles init command", async () => {
			const mockVSCodeMemoryBankService = createMockVSCodeMemoryBankService();
			const adapter = new MemoryBankMCPAdapter(
				mockContext as any,
				mockVSCodeMemoryBankService,
				mockLogger,
				7331,
			);
			const result = await adapter.handleCommand("init", []);
			expect(result).toBe("Memory bank initialized successfully");
		});

		it("handles status command", async () => {
			const mockVSCodeMemoryBankService = createMockVSCodeMemoryBankService();
			const adapter = new MemoryBankMCPAdapter(
				mockContext as any,
				mockVSCodeMemoryBankService,
				mockLogger,
				7331,
			);
			const result = await adapter.handleCommand("status", []);
			expect(result).toBe("Memory bank status: All systems healthy");
		});

		it("handles unknown commands", async () => {
			const mockVSCodeMemoryBankService = createMockVSCodeMemoryBankService();
			const adapter = new MemoryBankMCPAdapter(
				mockContext as any,
				mockVSCodeMemoryBankService,
				mockLogger,
				7331,
			);
			const result = await adapter.handleCommand("unknown", []);
			expect(result).toBe("Unknown command: unknown");
		});
	});

	describe("start and stop", () => {
		it("start method exists and can be called", async () => {
			const mockVSCodeMemoryBankService = createMockVSCodeMemoryBankService();
			const adapter = new MemoryBankMCPAdapter(
				mockContext as any,
				mockVSCodeMemoryBankService,
				mockLogger,
				7331,
			);
			await expect(adapter.start()).resolves.not.toThrow();
		});

		it("stop method exists and can be called", () => {
			const mockVSCodeMemoryBankService = createMockVSCodeMemoryBankService();
			const adapter = new MemoryBankMCPAdapter(
				mockContext as any,
				mockVSCodeMemoryBankService,
				mockLogger,
				7331,
			);
			expect(() => adapter.stop()).not.toThrow();
		});
	});
});
