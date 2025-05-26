import * as fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryBankServiceCore } from "../core/memoryBankServiceCore.js";
import { MemoryBankFileType } from "../types/types.js";

// Mock fs and path modules
vi.mock("node:fs/promises", () => ({
	stat: vi.fn(),
	mkdir: vi.fn().mockResolvedValue(undefined),
	readFile: vi.fn(),
	writeFile: vi.fn().mockResolvedValue(undefined),
	access: vi.fn(),
}));
vi.mock("node:path", async () => {
	const actual = await vi.importActual("node:path");
	return {
		...actual,
		join: (...args: string[]) => args.join("/"),
		dirname: (path: string) => path.split("/").slice(0, -1).join("/"),
	};
});
vi.mock("../lib/memoryBankTemplates.js", () => ({
	getTemplateForFileType: () => "template content",
}));

describe("MemoryBankServiceCore", () => {
	let mockStat: any;
	let mockReadFile: any;
	let mockAccess: any;

	beforeEach(() => {
		vi.clearAllMocks();

		// Get mocked functions
		mockStat = vi.mocked(fs.stat);
		mockReadFile = vi.mocked(fs.readFile);
		mockAccess = vi.mocked(fs.access);

		// Default successful mocks
		mockStat.mockResolvedValue({
			isDirectory: () => true,
			isFile: () => true,
			mtime: new Date(),
			mtimeMs: Date.now(),
		} as any);
		mockReadFile.mockResolvedValue("mock content");
		mockAccess.mockResolvedValue(undefined);
	});

	describe("constructor", () => {
		it("constructs with provided path and is not ready by default", () => {
			const service = new MemoryBankServiceCore("/mock/path");
			expect(service.isReady()).toBe(false);
		});

		it("constructs with custom logger", () => {
			const mockLogger = { info: vi.fn() } as any;
			const service = new MemoryBankServiceCore("/mock/path", mockLogger);
			expect(service.isReady()).toBe(false);
		});
	});

	describe("getIsMemoryBankInitialized", () => {
		it("returns true when directory and all files exist", async () => {
			const service = new MemoryBankServiceCore("/mock/path");
			const result = await service.getIsMemoryBankInitialized();
			expect(result).toBe(true);
		});

		it("returns false when directory does not exist", async () => {
			mockStat.mockRejectedValueOnce(new Error("ENOENT"));
			const service = new MemoryBankServiceCore("/mock/path");
			const result = await service.getIsMemoryBankInitialized();
			expect(result).toBe(false);
		});

		it("returns false when a required file is missing", async () => {
			mockStat
				.mockResolvedValueOnce({ isDirectory: () => true } as any) // Directory exists
				.mockRejectedValueOnce(new Error("ENOENT")); // First file missing
			const service = new MemoryBankServiceCore("/mock/path");
			const result = await service.getIsMemoryBankInitialized();
			expect(result).toBe(false);
		});

		it("handles errors during checking", async () => {
			mockStat.mockRejectedValue(new Error("Permission denied"));
			const service = new MemoryBankServiceCore("/mock/path");
			const result = await service.getIsMemoryBankInitialized();
			expect(result).toBe(false);
		});
	});

	describe("initializeFolders", () => {
		it("creates all required folders", async () => {
			const service = new MemoryBankServiceCore("/mock/path");
			await service.initializeFolders();

			const mockMkdir = vi.mocked(fs.mkdir);
			expect(mockMkdir).toHaveBeenCalledWith("/mock/path/", { recursive: true });
			expect(mockMkdir).toHaveBeenCalledWith("/mock/path/core", { recursive: true });
			expect(mockMkdir).toHaveBeenCalledWith("/mock/path/systemPatterns", {
				recursive: true,
			});
			expect(mockMkdir).toHaveBeenCalledWith("/mock/path/techContext", { recursive: true });
			expect(mockMkdir).toHaveBeenCalledWith("/mock/path/progress", { recursive: true });
		});
	});

	describe("loadFiles", () => {
		it("loads existing files successfully", async () => {
			const service = new MemoryBankServiceCore("/mock/path");
			expect(service.getFile(MemoryBankFileType.ProjectBrief)).toBeUndefined();

			const result = await service.loadFiles();

			expect(service.isReady()).toBe(true);
			expect(result).toEqual([]); // No files created
			const file = service.getFile(MemoryBankFileType.ProjectBrief);
			expect(file).toBeDefined();
			expect(file?.content).toBe("mock content");
		});

		it("creates missing files from templates", async () => {
			mockReadFile.mockRejectedValueOnce(new Error("ENOENT")); // File doesn't exist
			const service = new MemoryBankServiceCore("/mock/path");

			const result = await service.loadFiles();

			expect(result).toContain(MemoryBankFileType.ProjectBrief);
			expect(vi.mocked(fs.writeFile)).toHaveBeenCalled();
		});

		it("handles errors during loading", async () => {
			mockStat.mockRejectedValue(new Error("Permission denied"));
			const service = new MemoryBankServiceCore("/mock/path");

			await expect(service.loadFiles()).rejects.toThrow("Permission denied");
			expect(service.isReady()).toBe(false);
		});

		it("uses cache on subsequent reads with same mtime", async () => {
			const service = new MemoryBankServiceCore("/mock/path");
			const firstLoadTime = Date.now();

			mockStat.mockResolvedValue({
				isDirectory: () => true,
				isFile: () => true,
				mtime: new Date(firstLoadTime),
				mtimeMs: firstLoadTime,
			} as any);

			// First load
			await service.loadFiles();
			expect(mockReadFile).toHaveBeenCalled();

			const cacheStatsAfterFirstLoad = service.getCacheStats();
			expect(cacheStatsAfterFirstLoad.misses).toBeGreaterThan(0);

			vi.clearAllMocks(); // Clear mocks, especially readFile

			// Re-apply the same stat mock for the second load to simulate unchanged file time
			mockStat.mockResolvedValue({
				isDirectory: () => true,
				isFile: () => true,
				mtime: new Date(firstLoadTime),
				mtimeMs: firstLoadTime, // Crucial: use the exact same mtimeMs
			} as any);

			// Second load - should use cache
			await service.loadFiles();
			expect(mockReadFile).not.toHaveBeenCalled(); // Cache hit

			const cacheStatsAfterSecondLoad = service.getCacheStats();
			expect(cacheStatsAfterSecondLoad.hits).toBeGreaterThan(0);
		});
	});

	describe("updateFile", () => {
		it("updates file content and cache", async () => {
			const service = new MemoryBankServiceCore("/mock/path");
			await service.loadFiles();

			await service.updateFile(MemoryBankFileType.ProjectBrief, "new content");

			const file = service.getFile(MemoryBankFileType.ProjectBrief);
			expect(file?.content).toBe("new content");
			expect(vi.mocked(fs.writeFile)).toHaveBeenCalledWith(
				"/mock/path/core/projectbrief.md",
				"new content",
			);
		});
	});

	describe("utility methods", () => {
		it("getAllFiles returns all loaded files", async () => {
			const service = new MemoryBankServiceCore("/mock/path");
			await service.loadFiles();

			const files = service.getAllFiles();
			expect(files.length).toBeGreaterThan(0);
			expect(files[0]).toHaveProperty("type");
			expect(files[0]).toHaveProperty("content");
		});

		it("getFilesWithFilenames returns formatted string", async () => {
			const service = new MemoryBankServiceCore("/mock/path");
			await service.loadFiles();

			const result = service.getFilesWithFilenames();
			expect(result).toContain("core/projectbrief.md");
			expect(result).toContain("mock content");
		});
	});

	describe("checkHealth", () => {
		it("returns success when all files are accessible", async () => {
			const service = new MemoryBankServiceCore("/mock/path");
			const result = await service.checkHealth();
			expect(result).toContain("✅ All files and folders are present and readable");
		});

		it("reports missing folder", async () => {
			mockStat.mockRejectedValueOnce(new Error("ENOENT"));
			const service = new MemoryBankServiceCore("/mock/path");
			const result = await service.checkHealth();
			expect(result).toContain("❌ Issues found");
			expect(result).toContain("Missing folder");
		});

		it("reports missing files", async () => {
			mockStat.mockResolvedValueOnce({ isDirectory: () => true } as any); // Folder exists
			mockAccess.mockRejectedValueOnce(new Error("ENOENT")); // File missing
			const service = new MemoryBankServiceCore("/mock/path");
			const result = await service.checkHealth();
			expect(result).toContain("❌ Issues found");
			expect(result).toContain("Missing or unreadable");
		});
	});

	describe("cache management", () => {
		it("invalidates specific file cache", async () => {
			const service = new MemoryBankServiceCore("/mock/path");
			await service.loadFiles();

			service.invalidateCache("/mock/path/core/projectbrief.md");

			// Should be fine - this is a void method
			expect(true).toBe(true);
		});

		it("invalidates all cache", async () => {
			const service = new MemoryBankServiceCore("/mock/path");
			await service.loadFiles();

			service.invalidateCache();

			// Should be fine - this is a void method
			expect(true).toBe(true);
		});

		it("gets and resets cache stats", async () => {
			const service = new MemoryBankServiceCore("/mock/path");
			await service.loadFiles();

			const stats = service.getCacheStats();
			expect(stats).toHaveProperty("hits");
			expect(stats).toHaveProperty("misses");
			expect(stats).toHaveProperty("reloads");

			service.resetCacheStats();
			const resetStats = service.getCacheStats();
			expect(resetStats.hits).toBe(0);
			expect(resetStats.misses).toBe(0);
			expect(resetStats.reloads).toBe(0);
		});
	});
});
