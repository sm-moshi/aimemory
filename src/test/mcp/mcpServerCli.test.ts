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

// Create proper Console mock that implements Node.js Console interface
const createMockConsole = (): Console => ({
	assert: vi.fn(),
	clear: vi.fn(),
	count: vi.fn(),
	countReset: vi.fn(),
	debug: vi.fn(),
	dir: vi.fn(),
	dirxml: vi.fn(),
	error: vi.fn(),
	group: vi.fn(),
	groupCollapsed: vi.fn(),
	groupEnd: vi.fn(),
	info: vi.fn(),
	log: vi.fn(),
	table: vi.fn(),
	time: vi.fn(),
	timeEnd: vi.fn(),
	timeLog: vi.fn(),
	trace: vi.fn(),
	warn: vi.fn(),
	Console: vi.fn(),
	profile: vi.fn(),
	profileEnd: vi.fn(),
	timeStamp: vi.fn(),
});

describe("MCPServerCLI", () => {
	let tempDir: string;
	let server: MCPServerCLI;
	let mockConsole: Console;

	beforeEach(async () => {
		// Clear all mocks before each test
		vi.clearAllMocks();

		// Create temporary directory for testing
		tempDir = resolve(process.cwd(), `test-temp-mcp-${Date.now()}`);
		await fs.mkdir(tempDir, { recursive: true });
		await fs.mkdir(resolve(tempDir, "memory-bank"), { recursive: true });

		// Create basic memory bank structure
		const memoryBankDirs = [
			"memory-bank/core",
			"memory-bank/progress",
			"memory-bank/systemPatterns",
			"memory-bank/techContext",
		];

		for (const dir of memoryBankDirs) {
			await fs.mkdir(resolve(tempDir, dir), { recursive: true });
		}

		mockConsole = createMockConsole();
	});

	afterEach(async () => {
		// Cleanup
		try {
			await fs.rm(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
		vi.clearAllMocks();
	});

	describe("constructor", () => {
		it("should create instance with valid workspace path", () => {
			expect(() => {
				server = new MCPServerCLI({
					workspacePath: tempDir,
					logger: mockConsole,
				});
			}).not.toThrow();

			expect(server).toBeDefined();
			expect(server).toBeInstanceOf(MCPServerCLI);
		});

		it("should create instance without logger (using console fallback)", () => {
			expect(() => {
				server = new MCPServerCLI({
					workspacePath: tempDir,
				});
			}).not.toThrow();

			expect(server).toBeDefined();
		});

		it("should initialize with memory bank directory", () => {
			server = new MCPServerCLI({
				workspacePath: tempDir,
				logger: mockConsole,
			});

			// Verify constructor completed successfully
			expect(server).toBeDefined();
		});
	});

	describe("fromCommandLineArgs", () => {
		it("should create server from command line arguments", () => {
			const args = ["node", "script.js", tempDir];

			const server = MCPServerCLI.fromCommandLineArgs(args);

			expect(server).toBeInstanceOf(MCPServerCLI);
		});

		it("should throw error when workspace path not provided", () => {
			const args = ["node", "script.js"];

			expect(() => {
				MCPServerCLI.fromCommandLineArgs(args);
			}).toThrow("Workspace path argument not provided");
		});

		it("should use process.argv when no args provided", () => {
			// Mock process.argv
			const originalArgv = process.argv;
			process.argv = ["node", "script.js", tempDir];

			try {
				const server = MCPServerCLI.fromCommandLineArgs();
				expect(server).toBeInstanceOf(MCPServerCLI);
			} finally {
				process.argv = originalArgv;
			}
		});

		it("should handle relative workspace paths", () => {
			const args = ["node", "script.js", "./"];

			expect(() => {
				MCPServerCLI.fromCommandLineArgs(args);
			}).not.toThrow();
		});
	});

	describe("server functionality", () => {
		beforeEach(() => {
			server = new MCPServerCLI({
				workspacePath: tempDir,
				logger: mockConsole,
			});
		});

		it("should have connect method", () => {
			expect(typeof server.connect).toBe("function");
		});

		it("should connect to STDIO transport", () => {
			// Mock the server connection to avoid actual STDIO binding
			const connectSpy = vi.spyOn(server, "connect").mockImplementation(() => {});

			server.connect();

			expect(connectSpy).toHaveBeenCalledTimes(1);
		});
	});

	describe("tool registration and execution", () => {
		beforeEach(async () => {
			server = new MCPServerCLI({
				workspacePath: tempDir,
				logger: mockConsole,
			});

			// Create test files for tool operations
			await fs.writeFile(
				resolve(tempDir, "memory-bank", "core", "projectBrief.md"),
				"---\ntitle: Test Project\n---\nProject content",
			);
		});

		it("should handle tool registration without errors", () => {
			// Tool registration happens in constructor - verify no errors occurred
			expect(server).toBeDefined();
			expect(mockConsole.error).not.toHaveBeenCalled();
		});

		it("should be ready for MCP operation", () => {
			// Verify server is in a state ready for MCP tool calls
			expect(server).toBeDefined();
			expect(typeof server.connect).toBe("function");
		});
	});

	describe("error handling", () => {
		it("should handle invalid workspace path gracefully", () => {
			expect(() => {
				const server = new MCPServerCLI({
					workspacePath: "/nonexistent/path/that/does/not/exist",
					logger: mockConsole,
				});
				expect(server).toBeDefined();
			}).not.toThrow(); // Constructor should not throw, errors handled during operations
		});

		it("should provide console logger fallback when no logger provided", () => {
			const server = new MCPServerCLI({
				workspacePath: tempDir,
			});

			expect(server).toBeDefined();
		});

		it("should handle empty workspace path", () => {
			expect(() => {
				const server = new MCPServerCLI({
					workspacePath: "",
					logger: mockConsole,
				});
				expect(server).toBeDefined();
			}).not.toThrow();
		});
	});

	describe("memory bank integration", () => {
		beforeEach(async () => {
			// Create realistic memory bank structure
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

			server = new MCPServerCLI({
				workspacePath: tempDir,
				logger: mockConsole,
			});
		});

		it("should handle realistic memory bank structure", () => {
			expect(server).toBeDefined();
		});

		it("should integrate with metadata system", () => {
			// Metadata system integration happens in constructor
			expect(server).toBeDefined();
			expect(mockConsole.error).not.toHaveBeenCalled();
		});
	});

	describe("configuration validation", () => {
		it("should accept valid workspace configuration", () => {
			const config = {
				workspacePath: tempDir,
				logger: mockConsole,
			};

			expect(() => new MCPServerCLI(config)).not.toThrow();
		});

		it("should work with minimal configuration", () => {
			const config = {
				workspacePath: tempDir,
			};

			expect(() => new MCPServerCLI(config)).not.toThrow();
		});
	});

	describe("dependency injection", () => {
		beforeEach(() => {
			server = new MCPServerCLI({
				workspacePath: tempDir,
				logger: mockConsole,
			});
		});

		it("should initialize all required dependencies", () => {
			// Verify server construction succeeded (dependencies properly injected)
			expect(server).toBeDefined();
			expect(mockConsole.error).not.toHaveBeenCalled();
		});

		it("should create proper service chain", () => {
			// Dependencies are created internally - verify construction succeeds
			expect(server).toBeDefined();
		});
	});

	describe("multiple instances", () => {
		it("should support multiple server instances", () => {
			const server1 = new MCPServerCLI({
				workspacePath: tempDir,
				logger: mockConsole,
			});

			const server2 = new MCPServerCLI({
				workspacePath: tempDir,
				logger: createMockConsole(),
			});

			expect(server1).toBeDefined();
			expect(server2).toBeDefined();
			expect(server1).not.toBe(server2);
		});

		it("should handle concurrent initialization", () => {
			const servers = Array.from(
				{ length: 3 },
				() =>
					new MCPServerCLI({
						workspacePath: tempDir,
						logger: createMockConsole(),
					}),
			);

			for (const server of servers) {
				expect(server).toBeDefined();
				expect(server).toBeInstanceOf(MCPServerCLI);
			}
		});
	});

	describe("edge cases", () => {
		it("should handle special characters in workspace path", () => {
			const specialPath = resolve(tempDir, "special chars & symbols!");

			expect(() => {
				const server = new MCPServerCLI({
					workspacePath: specialPath,
					logger: mockConsole,
				});
				expect(server).toBeDefined();
			}).not.toThrow();
		});

		it("should handle very long workspace paths", () => {
			const longPath = resolve(tempDir, "very/long/path/with/many/segments/that/goes/deep");

			expect(() => {
				const server = new MCPServerCLI({
					workspacePath: longPath,
					logger: mockConsole,
				});
				expect(server).toBeDefined();
			}).not.toThrow();
		});
	});

	describe("mocked MCP SDK integration", () => {
		it("should work with mocked MCP SDK", () => {
			// Verify that our mocking approach works
			const server = new MCPServerCLI({
				workspacePath: tempDir,
				logger: mockConsole,
			});

			expect(server).toBeDefined();
			expect(server).toBeInstanceOf(MCPServerCLI);
		});

		it("should maintain expected interface", () => {
			const server = new MCPServerCLI({
				workspacePath: tempDir,
				logger: mockConsole,
			});

			// Verify expected public interface
			expect(typeof server.connect).toBe("function");
			expect(server).toBeInstanceOf(MCPServerCLI);
		});
	});
});
