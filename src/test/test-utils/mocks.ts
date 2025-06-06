import { vi } from "vitest";

// =============================================================================
// MCP MOCKS
// =============================================================================

/**
 * Creates a mock MCP Server instance
 */
export function createMockMcpServerInstance() {
	return {
		registerTool: vi.fn(),
		registerResource: vi.fn(),
		start: vi.fn(),
		stop: vi.fn(),
		connect: vi.fn().mockResolvedValue(undefined),
	};
}

/**
 * Creates a mock MCP ResourceTemplate class/function
 */
export function createMockResourceTemplateStatic() {
	const mockInstance = {
		// define instance methods if any are used
	};
	return vi.fn().mockImplementation(() => mockInstance);
}

/**
 * Creates a mock STDIO transport class/function
 */
export function createMockStdioTransportStatic() {
	const mockInstance = {
		start: vi.fn(),
		close: vi.fn(),
		on: vi.fn(),
		send: vi.fn(),
	};
	return vi.fn().mockImplementation(() => mockInstance);
}

// =============================================================================
// TOP-LEVEL MCP SDK MOCKS
// These mocks will be applied globally when this mocks.ts file is imported.
// =============================================================================

const mockMcpServerSingleton = createMockMcpServerInstance();
const MockResourceTemplateSingleton = createMockResourceTemplateStatic();
const MockStdioTransportSingleton = createMockStdioTransportStatic();

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
	McpServer: vi.fn(() => mockMcpServerSingleton),
	ResourceTemplate: MockResourceTemplateSingleton,
}));

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
	StdioServerTransport: MockStdioTransportSingleton,
}));

// =============================================================================
// MCP SDK MOCK ACCESSOR (formerly setupMcpSdkMocks)
// =============================================================================

/**
 * Returns the singleton instances of the MCP SDK mocks.
 * Useful if tests need to access these mocks directly (e.g., for assertions).
 */
export function getMcpSdkMockInstances() {
	return {
		mockMcpServer: mockMcpServerSingleton,
		MockResourceTemplate: MockResourceTemplateSingleton,
		MockStdioTransport: MockStdioTransportSingleton,
	};
}

/**
 * Creates a mock memory bank service for MCP testing
 */
export function createMockMemoryBankServiceForMcp() {
	return {
		getIsMemoryBankInitialized: vi.fn().mockResolvedValue({ success: true, data: true }),
		initializeFolders: vi.fn().mockResolvedValue({ success: true }),
		loadFiles: vi.fn().mockResolvedValue({ success: true, data: [] }),
		getAllFiles: vi.fn().mockReturnValue([]),
		getFilesWithFilenames: vi.fn().mockReturnValue(""),
		updateFile: vi.fn().mockResolvedValue({ success: true }),
		checkHealth: vi.fn().mockResolvedValue({ success: true, data: "Healthy" }),
		getFile: vi.fn().mockReturnValue(undefined),
		isReady: vi.fn().mockReturnValue(true),
	};
}

/**
 * Creates a mock MCP server adapter for testing
 */
export function createMockMcpAdapter() {
	const mockMemoryBank = createMockMemoryBankServiceForMcp();

	return {
		getMemoryBank: () => mockMemoryBank,
		updateMemoryBankFile: vi.fn().mockResolvedValue(undefined),
		getPort: vi.fn().mockReturnValue(7331),
		isServerRunning: vi.fn().mockReturnValue(false),
		start: vi.fn().mockResolvedValue(undefined),
		stop: vi.fn().mockResolvedValue(undefined),
		handleCommand: vi.fn().mockResolvedValue("Command handled"),
		setExternalServerRunning: vi.fn(),
		mockMemoryBank,
	};
}
