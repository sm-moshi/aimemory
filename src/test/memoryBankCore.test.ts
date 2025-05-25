import { beforeEach, describe, expect, it, vi } from "vitest";
import * as memoryBankCore from "../core/memoryBankCore.js";
import { MemoryBankFileType } from "../types/types.js";

vi.mock("node:fs/promises", async (importOriginal) => {
	const actual = (await importOriginal()) as any;
	return {
		...actual,
		readFile: vi.fn().mockResolvedValue("mock file content"),
		writeFile: vi.fn().mockResolvedValue(undefined),
		mkdir: vi.fn().mockResolvedValue(undefined),
		stat: vi.fn().mockResolvedValue({
			isFile: () => true,
			size: 100,
			mtime: new Date(),
		}),
		access: vi.fn().mockResolvedValue(undefined),
	};
});
vi.mock("node:path", async () => {
	const actual = await vi.importActual("node:path");
	return { ...actual, resolve: (...args: string[]) => args.join("/") };
});
vi.mock("node:url", () => ({ fileURLToPath: () => "/mock/dir/memoryBankCore.ts" }));

describe("memoryBankCore", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		// Reset readFile mock to return consistent content
		const mockedFs = vi.mocked(await import("node:fs/promises"));
		mockedFs.readFile.mockResolvedValue("mock file content");
	});

	it("readMemoryBankFile reads the correct file", async () => {
		const content = await memoryBankCore.readMemoryBankFile(MemoryBankFileType.ProjectBrief);
		expect(content).toBe("mock file content");
	});

	it("updateMemoryBankFile writes the correct file", async () => {
		await expect(
			memoryBankCore.updateMemoryBankFile(MemoryBankFileType.ProjectBrief, "new content"),
		).resolves.toBeUndefined();
	});

	it("getMemoryBankTools returns handlers that call the correct functions", async () => {
		const tools = memoryBankCore.getMemoryBankTools();
		const readTool = tools.find((t) => t.name === "read-memory-bank-file");
		const updateTool = tools.find((t) => t.name === "update-memory-bank-file");
		expect(readTool).toBeDefined();
		expect(updateTool).toBeDefined();
		if (readTool && updateTool) {
			// Test update functionality
			const updateResult = await updateTool.handler({
				fileType: MemoryBankFileType.ProjectBrief,
				content: "test content for integration",
			});
			if ("success" in updateResult) {
				expect(updateResult.success).toBe(true);
			} else {
				throw new Error("updateTool.handler did not return expected result");
			}

			// Test read functionality - should get the updated content from memory
			const readResult = await readTool.handler({
				fileType: MemoryBankFileType.ProjectBrief,
				content: "",
			});
			if ("content" in readResult) {
				expect(readResult.content).toBe("test content for integration");
			} else {
				throw new Error("readTool.handler did not return expected result");
			}
		}
	});
});
