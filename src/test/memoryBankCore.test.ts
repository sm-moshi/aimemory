// Import vitest utilities needed for mocks FIRST
import { beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.hoisted to create mocks that can be referenced in the factory
const { mockServiceInstance } = vi.hoisted(() => {
	const mockServiceInstance = {
		loadFiles: vi.fn().mockResolvedValue([]),
		getFile: vi.fn(),
		updateFile: vi.fn().mockResolvedValue(undefined),
	};
	return { mockServiceInstance };
});

vi.mock("../core/memoryBankServiceCore.js", () => {
	return {
		MemoryBankServiceCore: vi.fn().mockImplementation(() => mockServiceInstance),
	};
});

// Import the actual functions and types AFTER vi and mocks are set up
import {
	MemoryBankFileType,
	getMemoryBankTools,
	readMemoryBankFile,
	updateMemoryBankFile,
} from "../core/memoryBankCore.js";

// Mock fs/promises for any direct calls that might still occur or for other modules
vi.mock("node:fs/promises", () => ({
	default: {
		readFile: vi.fn().mockResolvedValue("mocked file content"),
		writeFile: vi.fn().mockResolvedValue(undefined),
		mkdir: vi.fn().mockResolvedValue(undefined),
		stat: vi.fn().mockResolvedValue({
			isDirectory: () => false,
			isFile: () => true,
			mtime: new Date(),
			size: 100,
		}),
		access: vi.fn().mockResolvedValue(undefined),
	},
}));

// This mock is for process.cwd() used in memoryBankCore.ts to define MEMORY_BANK_DIR
vi.mock("node:process", async () => {
	const actual = await vi.importActual("node:process");
	return {
		...actual,
		cwd: () => "/mock/workspace", // Mock current working directory
	};
});

describe("memoryBankCore functions", () => {
	beforeEach(() => {
		// Clear and set up default behaviors for the global mocks
		mockServiceInstance.loadFiles.mockClear().mockResolvedValue([]);
		mockServiceInstance.getFile
			.mockClear()
			.mockImplementation((fileType: MemoryBankFileType) => ({
				type: fileType,
				content: `content for ${fileType}`,
				lastUpdated: new Date(),
			}));
		mockServiceInstance.updateFile.mockClear().mockResolvedValue(undefined);
	});

	// All tests will now use the global mocks directly for assertions and specific mock setups.
	it("readMemoryBankFile calls service.loadFiles and service.getFile", async () => {
		mockServiceInstance.getFile.mockReturnValueOnce({
			type: MemoryBankFileType.ProjectBrief,
			content: "mock file content",
			lastUpdated: new Date(),
		});
		const content = await readMemoryBankFile(MemoryBankFileType.ProjectBrief);
		expect(mockServiceInstance.loadFiles).toHaveBeenCalled();
		expect(mockServiceInstance.getFile).toHaveBeenCalledWith(MemoryBankFileType.ProjectBrief);
		expect(content).toBe("mock file content");
	});

	it("readMemoryBankFile throws if file not found by service", async () => {
		mockServiceInstance.getFile.mockReturnValueOnce(undefined);
		await expect(readMemoryBankFile(MemoryBankFileType.ActiveContext)).rejects.toThrow(
			`File ${MemoryBankFileType.ActiveContext} not found`,
		);
		expect(mockServiceInstance.loadFiles).toHaveBeenCalled();
	});

	it("updateMemoryBankFile calls service.updateFile", async () => {
		await expect(
			updateMemoryBankFile(MemoryBankFileType.ProjectBrief, "new content"),
		).resolves.toBeUndefined();
		expect(mockServiceInstance.updateFile).toHaveBeenCalledWith(
			MemoryBankFileType.ProjectBrief,
			"new content",
		);
	});

	describe("getMemoryBankTools", () => {
		it("read-memory-bank-file tool reads content via service", async () => {
			const tools = getMemoryBankTools();
			const readTool = tools.find((t) => t.name === "read-memory-bank-file");
			expect(readTool).toBeDefined();
			if (!readTool) throw new Error("Read tool not found");

			mockServiceInstance.getFile.mockReturnValueOnce({
				type: MemoryBankFileType.ProductContext,
				content: "product context content",
				lastUpdated: new Date(),
			});

			const result = await readTool.handler({
				fileType: MemoryBankFileType.ProductContext as string,
				content: "dummy",
			});
			expect(mockServiceInstance.loadFiles).toHaveBeenCalled();
			expect(mockServiceInstance.getFile).toHaveBeenCalledWith(
				MemoryBankFileType.ProductContext,
			);
			if ("content" in result && typeof result.content === "string") {
				expect(result.content).toBe("product context content");
			} else if ("error" in result && typeof result.error === "string") {
				throw new Error(`Read tool returned an error: ${result.error}`);
			} else {
				throw new Error("Read tool returned an unexpected result structure");
			}
		});

		it("update-memory-bank-file tool updates content via service", async () => {
			const tools = getMemoryBankTools();
			const updateTool = tools.find((t) => t.name === "update-memory-bank-file");
			expect(updateTool).toBeDefined();
			if (!updateTool) throw new Error("Update tool not found");

			const result = await updateTool.handler({
				fileType: MemoryBankFileType.TechContextStack as string,
				content: "new tech stack content",
			});

			expect(mockServiceInstance.updateFile).toHaveBeenCalledWith(
				MemoryBankFileType.TechContextStack,
				"new tech stack content",
			);
			if ("success" in result && typeof result.success === "boolean") {
				expect(result.success).toBe(true);
			} else if ("error" in result && typeof result.error === "string") {
				throw new Error(`Update tool returned an error: ${result.error}`);
			} else {
				throw new Error("Update tool returned an unexpected result structure");
			}
		});
	});
});
