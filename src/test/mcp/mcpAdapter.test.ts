import { VSCodeMemoryBankService } from "@/core/vsCodeMemoryBankService.js";
import { MemoryBankMCPAdapter } from "@/mcp/mcpAdapter.js";
import {
	createMockExtensionContext,
	createMockLogger,
	mockCommands,
	mockWindow,
} from "@test-utils/index.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtensionContext } from "vscode";

vi.mock("@/core/vsCodeMemoryBankService.js", () => {
	// Mock the class and its static getInstance method
	const mockInstance = {
		getMemoryBank: vi.fn(),
		initialize: vi.fn(),
		updateMemoryBankFile: vi.fn(),
		updateFile: vi.fn(),
		initializeFolders: vi.fn(),
		loadFiles: vi.fn(),
		checkHealth: vi.fn().mockResolvedValue("Healthy"),
	};
	return {
		VSCodeMemoryBankService: {
			getInstance: vi.fn(() => mockInstance),
		},
	};
});

describe("MemoryBankMCPAdapter", () => {
	let adapter: MemoryBankMCPAdapter;
	let mockContext: ExtensionContext;
	let mockMemoryBankService: ReturnType<typeof VSCodeMemoryBankService.getInstance>;
	let mockLogger: ReturnType<typeof createMockLogger>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockContext = createMockExtensionContext();
		mockMemoryBankService = VSCodeMemoryBankService.getInstance(mockContext);
		mockLogger = createMockLogger();
		adapter = new MemoryBankMCPAdapter(mockContext, mockMemoryBankService, mockLogger as any);
	});

	afterEach(() => {
		adapter.stop(); // Ensure cleanup
	});

	describe("start", () => {
		it("should register a command and show an info message", async () => {
			await adapter.start();
			expect(mockCommands.registerCommand).toHaveBeenCalledWith(
				"ai-memory.mcp-server-status",
				expect.any(Function),
			);
			expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
				"AI Memory MCP Server Adapter started.",
			);
		});
	});

	describe("stop", () => {
		it("should show an info message when stopped", () => {
			adapter.stop();
			expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
				"AI Memory MCP Server Adapter stopped.",
			);
		});
	});

	describe("getPort", () => {
		it("should return the configured port", () => {
			// This test assumes a default or previously set port.
			// The current implementation hardcodes 7331, so we test that.
			// TODO: Deprecate it down the road as we went stdio for the MCP.
			expect(adapter.getPort()).toBe(7331);
		});
	});

	describe("getMemoryBank", () => {
		it("should call the memory bank service to get memory bank", async () => {
			await adapter.getMemoryBank();
			expect(mockMemoryBankService.getMemoryBank).toHaveBeenCalled();
		});
	});

	describe("updateMemoryBankFile", () => {
		it("should call the memory bank service to update a file", async () => {
			const filePath = "core/projectbrief.md";
			const content = "new content";
			await adapter.updateMemoryBankFile(filePath, content);
			expect(mockMemoryBankService.updateMemoryBankFile).toHaveBeenCalledWith(
				filePath,
				content,
			);
		});
	});
});
