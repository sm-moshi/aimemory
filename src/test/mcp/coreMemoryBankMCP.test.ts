/**
 * Note: McpServer and ResourceTemplate imports from "@modelcontextprotocol/sdk/server/mcp.js"
 * are not needed here because the entire module is mocked with vi.mock() below.
 * The test only uses the mocked versions, not the actual SDK types.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CoreMemoryBankMCP } from "../../mcp/coreMemoryBankMCP.js";
import { registerMemoryBankPrompts } from "../../services/cursor/mcp-prompts-registry.js";
import { MemoryBankFileType } from "../../types/types.js";

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

vi.mock("../../core/memoryBankServiceCore.js", () => ({
	MemoryBankServiceCore: vi.fn(() => mockMemoryBankService),
}));

// Mock McpServer and ResourceTemplate
const mockMcpServerInstance = {
	resource: vi.fn(),
	tool: vi.fn(),
	prompt: vi.fn(),
};

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
	// This function will be used as the constructor for ResourceTemplate
	const MockResourceTemplateConstructor = vi.fn((uriPattern, options) => {
		return {
			// Return the instance directly
			uriPattern,
			options, // Key: options should be here
			// If the ResourceTemplate instance is expected to have a 'list' method itself
			// (e.g., if options.list was copied to 'this.list' in a real class)
			// you might need to add it here based on how the actual SDK class behaves
			// For now, the test expects options.list, so having 'options' is primary.
			// list: options && options.list ? options.list : vi.fn() // Example if .list was direct
		};
	});

	return {
		McpServer: vi.fn(() => mockMcpServerInstance),
		ResourceTemplate: MockResourceTemplateConstructor, // Assign the mock constructor
	};
});

vi.mock("../../services/cursor/mcp-prompts-registry.js", () => ({
	registerMemoryBankPrompts: vi.fn(),
}));

// Helper functions to reduce nesting depth
const createLoadFilesSuccessImplementation = () => {
	return async () => {
		mockMemoryBankService.isReady.mockReturnValue(true);
		// Return a successful Result object
		return { success: true, data: [] };
	};
};

const createLoadFilesFailureImplementation = (error: Error) => {
	return async () => {
		// Return a failed Result object
		return { success: false, error: error };
	};
};

const setupSuccessfulLoadFiles = () => {
	mockMemoryBankService.loadFiles.mockImplementation(createLoadFilesSuccessImplementation());
};

const setupFailingLoadFiles = (error: Error) => {
	mockMemoryBankService.loadFiles.mockImplementation(createLoadFilesFailureImplementation(error));
};

// Helper function to create MCP instance for side effects
const setupMCPInstance = () => {
	// Create instance for side effects (registers resources, tools, and prompts)
	// Constructor return value intentionally unused
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const _mcpInstance = new CoreMemoryBankMCP({ memoryBankPath: "/mock/path" });
};

// Helper functions to find specific mock calls
const isMemoryBankFilesCall = (call: any[]) => call[0] === "memory-bank-files";

describe("CoreMemoryBankMCP", () => {
	let getToolHandler: (toolName: string) => (...args: any[]) => Promise<any>;
	let getDirectResourceHandler: (resourceName: string) => (...args: any[]) => Promise<any>;

	beforeEach(() => {
		vi.resetAllMocks();

		// Setup MCP instance for side effects (registers resources, tools, and prompts)
		setupMCPInstance();

		// Setup default mock behaviors for service methods that are commonly called
		mockMemoryBankService.getIsMemoryBankInitialized.mockResolvedValue({
			success: true,
			data: true,
		});
		mockMemoryBankService.checkHealth.mockResolvedValue({ success: true, data: "Healthy" });
		mockMemoryBankService.loadFiles.mockResolvedValue({ success: true, data: [] });
		mockMemoryBankService.initializeFolders.mockResolvedValue({ success: true });
		mockMemoryBankService.updateFile.mockResolvedValue({ success: true });
		// Set up isReady to return true by default for resource handlers
		mockMemoryBankService.isReady.mockReturnValue(true);

		// Helper to get tool handlers
		getToolHandler = (toolName: string) => {
			const call = mockMcpServerInstance.tool.mock.calls.find((c) => c[0] === toolName);
			if (!call || typeof call[2] !== "function") {
				throw new Error(`Tool handler for ${toolName} not found or not a function`);
			}
			return call[2] as (...args: any[]) => Promise<any>;
		};

		// Helper to get direct resource handlers
		getDirectResourceHandler = (resourceName: string) => {
			const call = mockMcpServerInstance.resource.mock.calls.find(
				(c) => c[0] === resourceName,
			);
			const handler = call?.[2];
			if (typeof handler !== "function") {
				throw new Error(
					`Direct resource handler for ${resourceName} not found or not a function`,
				);
			}
			return handler;
		};
	});

	it("constructs and registers resources, tools, and prompts", () => {
		expect(mockMemoryBankService).toBeDefined();
		expect(mockMcpServerInstance.resource).toHaveBeenCalled();
		expect(mockMcpServerInstance.tool).toHaveBeenCalled();
		expect(vi.mocked(registerMemoryBankPrompts)).toHaveBeenCalledWith(mockMcpServerInstance);
	});

	describe("Resources", () => {
		describe("memory-bank-files (template resource + direct handler)", () => {
			it("template's list handler (from constructor options) returns static list", async () => {
				const resourceCall =
					mockMcpServerInstance.resource.mock.calls.find(isMemoryBankFilesCall);
				expect(
					resourceCall,
					"resourceCall for 'memory-bank-files' should be defined",
				).toBeDefined();

				if (!resourceCall) {
					throw new Error(
						"Test logic error: resourceCall is undefined after expect().toBeDefined()",
					);
				}

				const templateInstance = resourceCall[1];
				console.log(
					"[Test Debug] templateInstance for memory-bank-files list:",
					templateInstance,
				);
				expect(templateInstance).toBeDefined();
				expect(
					templateInstance.options,
					"templateInstance.options should be defined",
				).toBeDefined();
				expect(
					typeof templateInstance.options.list,
					"templateInstance.options.list should be a function",
				).toBe("function");

				const listHandler = templateInstance.options.list;
				const result = await listHandler("memory-bank://files", {});
				expect(result).toEqual({
					resources: [{ uri: "memory-bank://", name: "Memory Bank Files" }],
				});
			});

			it("direct URI handler (3rd arg) returns file content if file exists", async () => {
				const uriHandler = getDirectResourceHandler("memory-bank-files");
				// Mock getFile to return a specific file content
				mockMemoryBankService.getFile.mockReturnValueOnce({
					type: MemoryBankFileType.ProjectBrief,
					content: "Mocked file content",
					lastUpdated: new Date(),
				});

				const result = await uriHandler(
					new URL(`memory-bank://files/${MemoryBankFileType.ProjectBrief}`),
					{
						fileType: MemoryBankFileType.ProjectBrief,
					},
				);

				expect(result).toEqual({
					contents: [
						{
							uri: `memory-bank://files/${MemoryBankFileType.ProjectBrief}`,
							text: "Mocked file content",
						},
					],
				});
				expect(mockMemoryBankService.getFile).toHaveBeenCalledWith(
					MemoryBankFileType.ProjectBrief,
				);
			});

			it("direct URI handler (3rd arg) throws if file does not exist", async () => {
				const uriHandler = getDirectResourceHandler("memory-bank-files");
				// Use a valid file type but mock getFile to return undefined
				mockMemoryBankService.getFile.mockReturnValueOnce(undefined);
				await expect(
					uriHandler(new URL(`memory-bank://files/${MemoryBankFileType.ProjectBrief}`), {
						fileType: MemoryBankFileType.ProjectBrief,
					}),
				).rejects.toThrow(`File ${MemoryBankFileType.ProjectBrief} not found`);
			});
		});

		describe("memory-bank-root (root resource)", () => {
			it("handler returns list of all files metadata", async () => {
				mockMemoryBankService.getAllFiles.mockReset().mockReturnValueOnce([
					{ type: MemoryBankFileType.ProjectBrief, content: "pb", lastUpdated: 123 },
					{ type: MemoryBankFileType.ProductContext, content: "pc", lastUpdated: 456 },
				]);

				const handler = getDirectResourceHandler("memory-bank-root");
				const result = await handler("memory-bank://", {});
				expect(mockMemoryBankService.getAllFiles).toHaveBeenCalled();
				expect(result).toEqual({
					contents: [
						{
							text: JSON.stringify(
								[
									{ type: MemoryBankFileType.ProjectBrief, lastUpdated: 123 },
									{ type: MemoryBankFileType.ProductContext, lastUpdated: 456 },
								],
								null,
								2,
							),
							uri: "memory-bank://",
						},
					],
				});
			});
		});
	});

	describe("Tools", () => {
		describe("init-memory-bank", () => {
			it("initializes and loads if not initialized", async () => {
				const handler = getToolHandler("init-memory-bank");
				mockMemoryBankService.getIsMemoryBankInitialized.mockResolvedValueOnce(false);
				setupSuccessfulLoadFiles();
				const result = await handler();
				expect(mockMemoryBankService.initializeFolders).toHaveBeenCalled();
				expect(mockMemoryBankService.loadFiles).toHaveBeenCalled();
				expect(result.content[0].text).toBe("Memory bank initialized successfully.");
			});

			it("loads if already initialized", async () => {
				const handler = getToolHandler("init-memory-bank");
				// Clear all mocks and set specific behavior for this test
				vi.clearAllMocks();
				mockMemoryBankService.getIsMemoryBankInitialized.mockResolvedValueOnce({
					success: true,
					data: true,
				});
				setupSuccessfulLoadFiles();
				const result = await handler();
				expect(mockMemoryBankService.initializeFolders).not.toHaveBeenCalled();
				expect(mockMemoryBankService.loadFiles).toHaveBeenCalled();
				expect(result.content[0].text).toBe("Memory bank already initialized.");
			});

			it("handles errors during initialization", async () => {
				const handler = getToolHandler("init-memory-bank");
				mockMemoryBankService.getIsMemoryBankInitialized.mockResolvedValueOnce({
					success: true,
					data: false,
				});
				mockMemoryBankService.initializeFolders.mockResolvedValueOnce({
					success: false,
					error: new Error("Init Error"),
				});
				// This test should verify the error message, but since init-memory-bank
				// has its own error handling, we expect the original init error
				const result = await handler();
				expect(result.isError).toBe(true);
				expect(result.content[0].text).toContain(
					"Error initializing memory bank: Init Error",
				);
			});
		});

		describe("read-memory-bank-files", () => {
			it("loads and returns filenames", async () => {
				const handler = getToolHandler("read-memory-bank-files");
				mockMemoryBankService.getFilesWithFilenames.mockReturnValueOnce(
					"file1.md\nfile2.md",
				);
				// For tools, we need to simulate memory bank not being ready initially
				// so ensureMemoryBankReady calls loadFiles
				mockMemoryBankService.isReady
					.mockReturnValueOnce(false) // First call in ensureMemoryBankReady
					.mockReturnValueOnce(true); // Second call after loadFiles
				setupSuccessfulLoadFiles();
				const result = await handler();
				expect(mockMemoryBankService.loadFiles).toHaveBeenCalled();
				expect(result.content[0].text).toContain("Here are the files in the memory bank:");
				expect(result.content[0].text).toContain("file1.md\nfile2.md");
			});

			it("handles empty memory bank", async () => {
				const handler = getToolHandler("read-memory-bank-files");
				mockMemoryBankService.getFilesWithFilenames.mockReturnValueOnce("");
				// Simulate memory bank not ready, then ready after loadFiles
				mockMemoryBankService.isReady.mockReturnValueOnce(false).mockReturnValueOnce(true);
				setupSuccessfulLoadFiles();
				const result = await handler();
				expect(result.content[0].text).toBe("Memory bank is empty or could not be read.");
			});

			it("handles errors during read", async () => {
				const handler = getToolHandler("read-memory-bank-files");
				// Set up a scenario where isReady returns false and loadFiles fails
				mockMemoryBankService.isReady.mockReturnValueOnce(false);
				setupFailingLoadFiles(new Error("Read Error"));

				const result = await handler();
				expect(result.isError).toBe(true);
				expect(result.content[0].text).toContain(
					"Error reading memory bank files: Read Error",
				);
			});
		});

		describe("update-memory-bank-file", () => {
			it("loads, updates file, and returns success", async () => {
				const handler = getToolHandler("update-memory-bank-file");
				const args = {
					fileType: MemoryBankFileType.ProjectBrief,
					content: "new content",
				};
				// Simulate memory bank not ready, then ready after loadFiles
				mockMemoryBankService.isReady.mockReturnValueOnce(false).mockReturnValueOnce(true);
				setupSuccessfulLoadFiles();
				const result = await handler(args);
				expect(mockMemoryBankService.loadFiles).toHaveBeenCalled();
				expect(mockMemoryBankService.updateFile).toHaveBeenCalledWith(
					args.fileType,
					args.content,
				);
				expect(result.content[0].text).toBe(`Updated ${args.fileType} successfully`);
			});

			it("handles errors during update", async () => {
				const handler = getToolHandler("update-memory-bank-file");
				const args = {
					fileType: MemoryBankFileType.ProjectBrief,
					content: "new content",
				};
				mockMemoryBankService.updateFile.mockResolvedValueOnce({
					success: false,
					error: new Error("Update Error"),
				});
				setupSuccessfulLoadFiles();

				const result = await handler(args);
				expect(result.isError).toBe(true);
				expect(result.content[0].text).toContain(
					"Error updating memory bank file: Update Error",
				);
			});
		});
	});
});
