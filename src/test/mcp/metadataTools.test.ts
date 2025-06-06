import { createMockConsole } from "@test-utils/utilities.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// Import after mocking
import { CoreMemoryBankMCP } from "../../mcp/coreMemoryBankMCP.js";

// Mock the template provider to return valid, non-empty templates
vi.mock("@/shared/templates/memory-bank-templates.js", () => ({
	getTemplateForFileType: vi.fn(
		(fileType: string) =>
			`---\ntitle: Test ${fileType}\ntype: ${fileType}\n---\n\nTest content for ${fileType}.\n`,
	),
}));

// Mock the core dependencies
vi.mock("@/core/memoryBankServiceCore.js", () => ({
	MemoryBankServiceCore: vi.fn(() => ({
		getIsMemoryBankInitialized: vi.fn().mockResolvedValue({ success: true, data: true }),
		initializeFolders: vi.fn().mockResolvedValue({ success: true }),
		loadFiles: vi.fn().mockResolvedValue({ success: true }),
		getFile: vi.fn(),
		getAllFiles: vi.fn().mockReturnValue([]),
		updateFile: vi.fn(),
		// Mock metadata-related methods
		rebuildMetadataIndex: vi.fn().mockResolvedValue({ success: true }),
		getMetadataIndexStats: vi
			.fn()
			.mockResolvedValue({ success: true, data: { fileCount: 0, totalSize: 0 } }),
		getFileMetadata: vi.fn(),
	})),
}));

describe("Metadata MCP Tools Integration", () => {
	let server: CoreMemoryBankMCP;
	let mockConsole: Console;

	beforeEach(async () => {
		standardBeforeEach();
		mockConsole = createMockConsole();

		// Initialize server
		server = new CoreMemoryBankMCP({
			memoryBankPath: "/mock/memory-bank",
			logger: mockConsole,
		});
	});

	afterEach(async () => {
		standardAfterEach();
	});

	it("should initialize without errors", () => {
		expect(server).toBeDefined();
		expect(server).toBeInstanceOf(CoreMemoryBankMCP);
	});
});
