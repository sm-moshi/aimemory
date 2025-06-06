import { registerMemoryBankPrompts } from "@/cursor/mcp-prompts-registry.js";
import { CoreMemoryBankMCP } from "@/mcp/coreMemoryBankMCP.js";
import { createMockLogger } from "@test-utils/utilities.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock MemoryBankServiceCore
const mockMemoryBankService = {
	getIsMemoryBankInitialized: vi.fn(),
	initializeFolders: vi.fn(),
	loadFiles: vi.fn(),
	getAllFiles: vi.fn(),
	getFilesWithFilenames: vi.fn(),
	updateFile: vi.fn(),
	checkHealth: vi.fn(),
	getFile: vi.fn(),
	isReady: vi.fn(),
};

vi.mock("@/core/memoryBankServiceCore.js", () => ({
	MemoryBankServiceCore: vi.fn(() => mockMemoryBankService),
}));

vi.mock("@/mcp/shared/baseMcpServer.js", () => {
	return {
		BaseMCPServer: vi.fn().mockImplementation(function () {
			this.server = {
				resource: vi.fn(),
				tool: vi.fn(),
				prompt: vi.fn(),
			};
			this.registerTools = vi.fn();
			this.registerPrompts = vi.fn();
			this.connect = vi.fn();
			this.start = vi.fn();
			this.stop = vi.fn();
			return this;
		}),
	};
});

vi.mock("@/mcp/mcp-prompts-registry.js", () => ({
	registerMemoryBankPrompts: vi.fn(),
}));

// Helper function to set up the MCP instance
function setupMcpInstance() {
	const mcpInstance = new CoreMemoryBankMCP({
		memoryBank: mockMemoryBankService as any,
		logger: createMockLogger(),
		memoryBankPath: "/test/memory-bank",
	});
	return { mcpInstance };
}

describe("CoreMemoryBankMCP", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("constructs and calls registerTools and registerMemoryBankPrompts", () => {
		const { mcpInstance } = setupMcpInstance();

		expect(mcpInstance).toBeInstanceOf(CoreMemoryBankMCP);
		expect(mcpInstance.registerTools).toHaveBeenCalled();
		expect(registerMemoryBankPrompts).toHaveBeenCalledWith(mcpInstance);
	});
});
