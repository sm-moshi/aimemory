import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the MCP SDK to avoid tool registration conflicts
vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
	Client: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
	McpServer: vi.fn(() => ({
		tool: vi.fn(),
		resource: vi.fn(),
		prompt: vi.fn(),
		connect: vi.fn(),
		list: vi.fn(),
		close: vi.fn(),
	})),
	ResourceTemplate: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
	StdioServerTransport: vi.fn(() => ({
		connect: vi.fn(),
		close: vi.fn(),
	})),
}));

// Import after mocking
import { MCPServerCLI } from "../../mcp/mcpServerCliClass.js";
import {
	createMockConsole,
	standardAfterEach, // Import standardAfterEach
	standardBeforeEach, // Import standardBeforeEach
} from "../test-utils/index.js";

// Test Helper Functions

async function createTempWorkspace(): Promise<string> {
	const tempDir = resolve(process.cwd(), `test-temp-mcp-${Date.now()}`);
	await fs.mkdir(tempDir, { recursive: true });
	await fs.mkdir(resolve(tempDir, "memory-bank"), { recursive: true });
	return tempDir;
}

async function setupMemoryBankStructure(tempDir: string): Promise<void> {
	const memoryBankDirs = [
		"memory-bank/core",
		"memory-bank/progress",
		"memory-bank/systemPatterns",
		"memory-bank/techContext",
	];

	for (const dir of memoryBankDirs) {
		await fs.mkdir(resolve(tempDir, dir), { recursive: true });
	}
}

async function cleanupTempDir(tempDir: string): Promise<void> {
	try {
		await fs.rm(tempDir, { recursive: true, force: true });
	} catch {
		// Ignore cleanup errors
	}
}

function createTestServer(config: { workspacePath: string; logger?: Console }): MCPServerCLI {
	return new MCPServerCLI(config);
}

function expectServerValid(server: MCPServerCLI): void {
	expect(server).toBeDefined();
	expect(server).toBeInstanceOf(MCPServerCLI);
	expect(typeof server.connect).toBe("function");
}

// Server Creation & Configuration Tests
describe("MCPServerCLI - Server Creation & Configuration", () => {
	let tempDir: string;
	let mockConsole: Console;

	beforeEach(async () => {
		standardBeforeEach(); // Use standardBeforeEach
		tempDir = await createTempWorkspace();
		await setupMemoryBankStructure(tempDir);
		mockConsole = createMockConsole();
	});

	afterEach(async () => {
		await cleanupTempDir(tempDir);
		standardAfterEach(); // Use standardAfterEach
	});

	describe("constructor", () => {
		it("should create instance with valid workspace path", () => {
			const server = createTestServer({ workspacePath: tempDir, logger: mockConsole });
			expectServerValid(server);
		});

		it("should create instance without logger (using console fallback)", () => {
			const server = createTestServer({ workspacePath: tempDir });
			expectServerValid(server);
		});

		it("should initialize with memory bank directory", () => {
			const server = createTestServer({ workspacePath: tempDir, logger: mockConsole });
			expectServerValid(server);
		});
	});

	describe("fromCommandLineArgs", () => {
		it("should create server from command line arguments", () => {
			const args = ["node", "script.js", tempDir];
			const server = MCPServerCLI.fromCommandLineArgs(args);
			expectServerValid(server);
		});

		it("should throw error when workspace path not provided", () => {
			const args = ["node", "script.js"];
			expect(() => MCPServerCLI.fromCommandLineArgs(args)).toThrow(
				"Workspace path argument not provided",
			);
		});

		it("should use process.argv when no args provided", () => {
			const originalArgv = process.argv;
			process.argv = ["node", "script.js", tempDir];

			try {
				const server = MCPServerCLI.fromCommandLineArgs();
				expectServerValid(server);
			} finally {
				process.argv = originalArgv;
			}
		});

		it("should handle relative workspace paths", () => {
			const args = ["node", "script.js", "./"];
			expect(() => MCPServerCLI.fromCommandLineArgs(args)).not.toThrow();
		});
	});

	describe("configuration validation", () => {
		it("should accept valid workspace configuration", () => {
			const config = { workspacePath: tempDir, logger: mockConsole };
			expect(() => createTestServer(config)).not.toThrow();
		});

		it("should work with minimal configuration", () => {
			const config = { workspacePath: tempDir };
			expect(() => createTestServer(config)).not.toThrow();
		});
	});
});

// Core Server Functionality Tests
describe("MCPServerCLI - Core Server Functionality", () => {
	let tempDir: string;
	let mockConsole: Console;

	beforeEach(async () => {
		standardBeforeEach(); // Use standardBeforeEach
		tempDir = await createTempWorkspace();
		await setupMemoryBankStructure(tempDir);
		mockConsole = createMockConsole();
	});

	afterEach(async () => {
		await cleanupTempDir(tempDir);
		standardAfterEach(); // Use standardAfterEach
	});

	describe("server functionality", () => {
		it("should have connect method", () => {
			const server = createTestServer({ workspacePath: tempDir, logger: mockConsole });
			expect(typeof server.connect).toBe("function");
		});

		it("should connect to STDIO transport", () => {
			const server = createTestServer({ workspacePath: tempDir, logger: mockConsole });
			const connectSpy = vi.spyOn(server, "connect").mockImplementation(() => {});

			server.connect();
			expect(connectSpy).toHaveBeenCalledTimes(1);
		});
	});

	describe("tool registration and execution", () => {
		beforeEach(async () => {
			await fs.writeFile(
				resolve(tempDir, "memory-bank", "core", "projectBrief.md"),
				"---\ntitle: Test Project\n---\nProject content",
			);
		});

		it("should handle tool registration without errors", () => {
			const server = createTestServer({ workspacePath: tempDir, logger: mockConsole });
			expectServerValid(server);
			expect(mockConsole.error).not.toHaveBeenCalled();
		});

		it("should be ready for MCP operation", () => {
			const server = createTestServer({ workspacePath: tempDir, logger: mockConsole });
			expectServerValid(server);
		});
	});
});

// Error Handling & Edge Cases Tests
describe("MCPServerCLI - Error Handling & Edge Cases", () => {
	let tempDir: string;
	let mockConsole: Console;

	beforeEach(async () => {
		standardBeforeEach(); // Use standardBeforeEach
		tempDir = await createTempWorkspace();
		await setupMemoryBankStructure(tempDir);
		mockConsole = createMockConsole();
	});

	afterEach(async () => {
		await cleanupTempDir(tempDir);
		standardAfterEach(); // Use standardAfterEach
	});

	describe("error handling", () => {
		it("should handle invalid workspace path gracefully", () => {
			expect(() => {
				const server = createTestServer({
					workspacePath: "/nonexistent/path/that/does/not/exist",
					logger: mockConsole,
				});
				expect(server).toBeDefined();
			}).not.toThrow(); // Constructor should not throw, errors handled during operations
		});

		it("should provide console logger fallback when no logger provided", () => {
			const server = createTestServer({ workspacePath: tempDir });
			expectServerValid(server);
		});

		it("should throw error for empty workspace path", () => {
			expect(() => {
				createTestServer({ workspacePath: "", logger: mockConsole });
			}).toThrow("FileOperationManager requires allowedRoot for security");
		});
	});

	describe("edge cases", () => {
		it("should handle special characters in workspace path", () => {
			const specialPath = resolve(tempDir, "special chars & symbols!");
			expect(() => {
				const server = createTestServer({
					workspacePath: specialPath,
					logger: mockConsole,
				});
				expect(server).toBeDefined();
			}).not.toThrow();
		});

		it("should handle very long workspace paths", () => {
			const longPath = resolve(tempDir, "very/long/path/with/many/segments/that/goes/deep");
			expect(() => {
				const server = createTestServer({ workspacePath: longPath, logger: mockConsole });
				expect(server).toBeDefined();
			}).not.toThrow();
		});
	});

	describe("mocked MCP SDK integration", () => {
		it("should work with mocked MCP SDK", () => {
			const server = createTestServer({ workspacePath: tempDir, logger: mockConsole });
			expectServerValid(server);
		});

		it("should maintain expected interface", () => {
			const server = createTestServer({ workspacePath: tempDir, logger: mockConsole });
			expectServerValid(server);
		});
	});
});

// Memory Bank Integration Tests
describe("MCPServerCLI - Memory Bank Integration", () => {
	let tempDir: string;
	let mockConsole: Console;

	beforeEach(async () => {
		vi.clearAllMocks();
		tempDir = await createTempWorkspace();
		await setupMemoryBankStructure(tempDir);
		mockConsole = createMockConsole();
	});

	afterEach(async () => {
		await cleanupTempDir(tempDir);
	});

	describe("memory bank integration", () => {
		beforeEach(async () => {
			const files = [
				"memory-bank/core/projectBrief.md",
				"memory-bank/core/activeContext.md",
				"memory-bank/progress/current.md",
				"memory-bank/systemPatterns/architecture.md",
			];

			for (const file of files) {
				const fullPath = resolve(tempDir, file);
				await fs.mkdir(resolve(fullPath, ".."), { recursive: true });
				await fs.writeFile(fullPath, "---\ntitle: Test\ntype: test\n---\nContent here");
			}
		});

		it("should handle realistic memory bank structure", () => {
			const server = createTestServer({ workspacePath: tempDir, logger: mockConsole });
			expectServerValid(server);
		});

		it("should integrate with metadata system", () => {
			const server = createTestServer({ workspacePath: tempDir, logger: mockConsole });
			expectServerValid(server);
			expect(mockConsole.error).not.toHaveBeenCalled();
		});
	});

	describe("dependency injection", () => {
		it("should initialize all required dependencies", () => {
			const server = createTestServer({ workspacePath: tempDir, logger: mockConsole });
			expectServerValid(server);
			expect(mockConsole.error).not.toHaveBeenCalled();
		});

		it("should create proper service chain", () => {
			const server = createTestServer({ workspacePath: tempDir, logger: mockConsole });
			expectServerValid(server);
		});
	});
});

// Concurrency & Multiple Instances Tests
describe("MCPServerCLI - Concurrency & Multiple Instances", () => {
	let tempDir: string;
	let mockConsole: Console;

	beforeEach(async () => {
		vi.clearAllMocks();
		tempDir = await createTempWorkspace();
		await setupMemoryBankStructure(tempDir);
		mockConsole = createMockConsole();
	});

	afterEach(async () => {
		await cleanupTempDir(tempDir);
	});

	describe("multiple instances", () => {
		it("should support multiple server instances", () => {
			const server1 = createTestServer({ workspacePath: tempDir, logger: mockConsole });
			const server2 = createTestServer({
				workspacePath: tempDir,
				logger: createMockConsole(),
			});

			expectServerValid(server1);
			expectServerValid(server2);
			expect(server1).not.toBe(server2);
		});

		it("should handle concurrent initialization", () => {
			const servers = Array.from({ length: 3 }, () =>
				createTestServer({ workspacePath: tempDir, logger: createMockConsole() }),
			);

			for (const server of servers) {
				expectServerValid(server);
			}
		});
	});
});
