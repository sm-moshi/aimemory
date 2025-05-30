/**
 * TODO: check why it's not used -> import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerMemoryBankPrompts } from "../lib/mcp-prompts-registry.js";
import { CoreMemoryBankMCP } from "../mcp/coreMemoryBankMCP.js";
import { MemoryBankFileType } from "../types/types.js";

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

vi.mock("../core/memoryBankServiceCore.js", () => ({
	MemoryBankServiceCore: vi.fn(() => mockMemoryBankService),
}));

// Mock McpServer and ResourceTemplate
const mockMcpServerInstance = {
	resource: vi.fn(),
	tool: vi.fn(),
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

vi.mock("../lib/mcp-prompts-registry.js", () => ({
	registerMemoryBankPrompts: vi.fn(),
}));

describe("CoreMemoryBankMCP", () => {
	let mcp: CoreMemoryBankMCP;
	let getToolHandler: (toolName: string) => (...args: any[]) => Promise<any>;
	let getResourceListHandler: (resourceName: string) => () => Promise<any>;
	let getResourceUriHandler: (resourceName: string) => (uri: URL, params: any) => Promise<any>;
	let getDirectResourceHandler: (resourceName: string) => (...args: any[]) => Promise<any>;

	beforeEach(() => {
		vi.resetAllMocks();

		mcp = new CoreMemoryBankMCP({ memoryBankPath: "/mock/path" });

		// Setup default mock behaviors for service methods that are commonly called
		mockMemoryBankService.getIsMemoryBankInitialized.mockResolvedValue(true);
		mockMemoryBankService.checkHealth.mockResolvedValue("Healthy");
		mockMemoryBankService.loadFiles.mockResolvedValue(undefined);
		mockMemoryBankService.isReady.mockReturnValue(false);

		// Helper to get tool handlers
		getToolHandler = (toolName: string) => {
			const call = mockMcpServerInstance.tool.mock.calls.find((c) => c[0] === toolName);
			if (!call || typeof call[2] !== "function") {
				throw new Error(`Tool handler for ${toolName} not found or not a function`);
			}
			return call[2] as (...args: any[]) => Promise<any>;
		};

		// Helper to get resource list handlers for ResourceTemplates
		getResourceListHandler = (resourceName: string) => {
			const call = mockMcpServerInstance.resource.mock.calls.find(
				(c) => c[0] === resourceName,
			);
			const resourceTemplateInstance = call?.[1];
			if (
				!resourceTemplateInstance ||
				typeof resourceTemplateInstance === "string" ||
				!(resourceTemplateInstance as any).handlers?.list
			) {
				throw new Error(
					`Resource list handler for ${resourceName} not found or not a function on template instance`,
				);
			}
			return (resourceTemplateInstance as any).handlers.list;
		};

		// Helper to get resource URI handlers for ResourceTemplates
		getResourceUriHandler = (resourceName: string) => {
			const call = mockMcpServerInstance.resource.mock.calls.find(
				(c) => c[0] === resourceName,
			);
			const resourceTemplateInstance = call?.[1];
			if (
				!resourceTemplateInstance ||
				typeof resourceTemplateInstance === "string" ||
				!(resourceTemplateInstance as any).handlers?.uri
			) {
				throw new Error(
					`Resource URI handler for ${resourceName} not found or not a function on template instance`,
				);
			}
			return (resourceTemplateInstance as any).handlers.uri;
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
				const resourceCall = mockMcpServerInstance.resource.mock.calls.find(
					(c) => c[0] === "memory-bank-files",
				);
				expect(
					resourceCall,
					"resourceCall for 'memory-bank-files' should be defined",
				).toBeDefined();

				if (!resourceCall) {
					throw new Error(
						"Test logic error: resourceCall is undefined after expect().toBeDefined()",
					);
				}

				const templateInstance = resourceCall[1] as any;
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
				mockMemoryBankService.getFile.mockReturnValueOnce({
					fileType: MemoryBankFileType.ProjectBrief,
					content: "Test content",
					mtime: Date.now(),
				});
				const result = await uriHandler(
					new URL(`memory-bank://files/${MemoryBankFileType.ProjectBrief}`),
					{ fileType: MemoryBankFileType.ProjectBrief },
				);
				expect(mockMemoryBankService.getFile).toHaveBeenCalledWith(
					MemoryBankFileType.ProjectBrief,
				);
				expect(result).toEqual({
					contents: [
						{
							text: "Test content",
							uri: `memory-bank://files/${MemoryBankFileType.ProjectBrief}`,
						},
					],
				});
			});

			it("direct URI handler (3rd arg) throws if file does not exist", async () => {
				const uriHandler = getDirectResourceHandler("memory-bank-files");
				mockMemoryBankService.getFile.mockReturnValueOnce(undefined);
				await expect(
					uriHandler(new URL("memory-bank://files/nonexistent.md"), {
						fileType: "nonexistent.md",
					}),
				).rejects.toThrow("File nonexistent.md not found");
				expect(mockMemoryBankService.getFile).toHaveBeenCalledWith("nonexistent.md");
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
				mockMemoryBankService.loadFiles.mockImplementationOnce(async () => {
					mockMemoryBankService.isReady.mockReturnValueOnce(true);
					return undefined;
				});
				const result = await handler();
				expect(mockMemoryBankService.initializeFolders).toHaveBeenCalled();
				expect(mockMemoryBankService.loadFiles).toHaveBeenCalled();
				expect(result.content[0].text).toBe("Memory bank initialized successfully.");
			});

			it("loads if already initialized", async () => {
				const handler = getToolHandler("init-memory-bank");
				mockMemoryBankService.getIsMemoryBankInitialized.mockResolvedValueOnce(true);
				mockMemoryBankService.loadFiles.mockImplementationOnce(async () => {
					mockMemoryBankService.isReady.mockReturnValueOnce(true);
					return undefined;
				});
				const result = await handler();
				expect(mockMemoryBankService.initializeFolders).not.toHaveBeenCalled();
				expect(mockMemoryBankService.loadFiles).toHaveBeenCalled();
				expect(result.content[0].text).toBe("Memory bank already initialized.");
			});

			it("handles errors during initialization", async () => {
				const handler = getToolHandler("init-memory-bank");
				mockMemoryBankService.getIsMemoryBankInitialized.mockResolvedValueOnce(false);
				mockMemoryBankService.initializeFolders.mockRejectedValueOnce(
					new Error("Init Error"),
				);
				mockMemoryBankService.isReady.mockReturnValueOnce(false);

				const result = await handler();
				expect(result.isError).toBe(true);
				expect(result.content[0].text).toContain(
					"Error initializing memory bank: Failed to load memory bank: Memory bank could not be initialized. Please run init-memory-bank first.",
				);
			});
		});

		describe("read-memory-bank-files", () => {
			it("loads and returns filenames", async () => {
				const handler = getToolHandler("read-memory-bank-files");
				mockMemoryBankService.getFilesWithFilenames.mockReturnValueOnce(
					"file1.md\nfile2.md",
				);
				mockMemoryBankService.loadFiles.mockImplementationOnce(async () => {
					mockMemoryBankService.isReady.mockReturnValueOnce(true);
					return undefined;
				});
				const result = await handler();
				expect(mockMemoryBankService.loadFiles).toHaveBeenCalled();
				expect(result.content[0].text).toContain("Here are the files in the memory bank:");
				expect(result.content[0].text).toContain("file1.md\nfile2.md");
			});

			it("handles empty memory bank", async () => {
				const handler = getToolHandler("read-memory-bank-files");
				mockMemoryBankService.getFilesWithFilenames.mockReturnValueOnce("");
				mockMemoryBankService.loadFiles.mockImplementationOnce(async () => {
					mockMemoryBankService.isReady.mockReturnValueOnce(true);
					return undefined;
				});
				const result = await handler();
				expect(result.content[0].text).toBe("Memory bank is empty or could not be read.");
			});

			it("handles errors during read", async () => {
				const handler = getToolHandler("read-memory-bank-files");
				mockMemoryBankService.loadFiles.mockRejectedValueOnce(new Error("Read Error"));
				mockMemoryBankService.isReady.mockReturnValueOnce(false);

				const result = await handler();
				expect(result.isError).toBe(true);
				expect(result.content[0].text).toContain(
					"Error reading memory bank files: Failed to load memory bank: Read Error",
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
				mockMemoryBankService.loadFiles.mockImplementationOnce(async () => {
					mockMemoryBankService.isReady.mockReturnValueOnce(true);
					return undefined;
				});
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
				mockMemoryBankService.updateFile.mockRejectedValueOnce(new Error("Update Error"));
				mockMemoryBankService.loadFiles.mockImplementationOnce(async () => {
					mockMemoryBankService.isReady.mockReturnValueOnce(true);
					return undefined;
				});

				const result = await handler(args);
				expect(result.isError).toBe(true);
				expect(result.content[0].text).toContain(
					"Error updating memory bank file: Update Error",
				);
			});
		});
	});
});
