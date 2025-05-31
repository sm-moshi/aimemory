/**
 * Tests for File Operation Helpers
 * Verifies functionality of shared file operation utilities
 */

import fs from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CacheStats, FileCache, FileOperationContext } from "../types/types.js";
import { MemoryBankFileType } from "../types/types.js";
import {
	CacheManager,
	loadFileWithTemplate,
	performHealthCheck,
	validateMemoryBankDirectory,
	validateSingleFile,
} from "../utils/fileOperationHelpers.js";

// Mock file system operations
vi.mock("node:fs/promises", () => ({
	default: {
		stat: vi.fn(),
		readFile: vi.fn(),
		writeFile: vi.fn(),
		mkdir: vi.fn(),
		access: vi.fn(),
	},
}));

// Mock templates
vi.mock("../lib/memoryBankTemplates.js", () => ({
	getTemplateForFileType: vi.fn((fileType: string) => `Template for ${fileType}`),
}));

describe("File Operation Helpers", () => {
	let mockContext: FileOperationContext;
	let mockFileCache: Map<string, FileCache>;
	let mockCacheStats: CacheStats;
	let mockLogger: any;

	beforeEach(() => {
		vi.clearAllMocks();

		mockFileCache = new Map();
		mockCacheStats = {
			hits: 0,
			misses: 0,
			totalFiles: 0,
			hitRate: 0,
			lastReset: new Date(),
			reloads: 0,
		};
		mockLogger = {
			info: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
			debug: vi.fn(),
		};

		mockContext = {
			memoryBankFolder: "/test/memory-bank",
			logger: mockLogger,
			fileCache: mockFileCache,
			cacheStats: mockCacheStats,
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("CacheManager", () => {
		let cacheManager: CacheManager;

		beforeEach(() => {
			cacheManager = new CacheManager(mockFileCache, mockCacheStats);
		});

		it("should return cached content when available and up-to-date", () => {
			const filePath = "/test/file.md";
			const stats = { mtimeMs: 123456 } as any;
			mockFileCache.set(filePath, { content: "cached content", mtimeMs: 123456 });

			const result = cacheManager.getCachedContent(filePath, stats);

			expect(result).toBe("cached content");
			expect(mockCacheStats.hits).toBe(1);
		});

		it("should return null for outdated cache", () => {
			const filePath = "/test/file.md";
			const stats = { mtimeMs: 123457 } as any; // Different mtime
			mockFileCache.set(filePath, { content: "cached content", mtimeMs: 123456 });

			const result = cacheManager.getCachedContent(filePath, stats);

			expect(result).toBeNull();
		});

		it("should update cache correctly", () => {
			const filePath = "/test/file.md";
			const stats = { mtimeMs: 123456 } as any;

			cacheManager.updateCache(filePath, "new content", stats);

			expect(mockFileCache.get(filePath)).toEqual({
				content: "new content",
				mtimeMs: 123456,
			});
			expect(mockCacheStats.misses).toBe(1);
		});

		it("should track cache reloads", () => {
			const filePath = "/test/file.md";
			const stats = { mtimeMs: 123456 } as any;

			// Set initial cache
			mockFileCache.set(filePath, { content: "old content", mtimeMs: 123455 });

			cacheManager.updateCache(filePath, "new content", stats);

			expect(mockCacheStats.reloads).toBe(1);
			expect(mockCacheStats.misses).toBe(0);
		});

		it("should invalidate specific cache entry", () => {
			mockFileCache.set("/test/file1.md", { content: "content1", mtimeMs: 123 });
			mockFileCache.set("/test/file2.md", { content: "content2", mtimeMs: 456 });

			cacheManager.invalidateCache("/test/file1.md");

			expect(mockFileCache.has("/test/file1.md")).toBe(false);
			expect(mockFileCache.has("/test/file2.md")).toBe(true);
		});

		it("should invalidate all cache entries", () => {
			mockFileCache.set("/test/file1.md", { content: "content1", mtimeMs: 123 });
			mockFileCache.set("/test/file2.md", { content: "content2", mtimeMs: 456 });

			cacheManager.invalidateCache();

			expect(mockFileCache.size).toBe(0);
		});
	});

	describe("validateMemoryBankDirectory", () => {
		it("should return true for valid directory", async () => {
			vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);

			const result = await validateMemoryBankDirectory(mockContext);

			expect(result).toBe(true);
			expect(fs.stat).toHaveBeenCalledWith("/test/memory-bank");
		});

		it("should return false for non-directory", async () => {
			vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false } as any);

			const result = await validateMemoryBankDirectory(mockContext);

			expect(result).toBe(false);
			expect(mockLogger.error).toHaveBeenCalledWith("Memory bank folder does not exist.");
		});

		it("should return false for missing directory", async () => {
			vi.mocked(fs.stat).mockRejectedValue(new Error("ENOENT"));

			const result = await validateMemoryBankDirectory(mockContext);

			expect(result).toBe(false);
			expect(mockLogger.error).toHaveBeenCalledWith("Memory bank folder does not exist.");
		});
	});

	describe("validateSingleFile", () => {
		const fileType = MemoryBankFileType.ProjectBrief;

		it("should return valid result for existing file", async () => {
			vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true } as any);

			const result = await validateSingleFile(fileType, mockContext);

			expect(result.isValid).toBe(true);
			expect(result.fileType).toBe(fileType);
			expect(result.filePath).toBe("/test/memory-bank/core/projectBrief.md");
		});

		it("should return invalid result for non-file", async () => {
			vi.mocked(fs.stat).mockResolvedValue({ isFile: () => false } as any);

			const result = await validateSingleFile(fileType, mockContext);

			expect(result.isValid).toBe(false);
			expect(result.error).toBe("Not a file");
		});

		it("should return invalid result for missing file", async () => {
			vi.mocked(fs.stat).mockRejectedValue(new Error("ENOENT"));

			const result = await validateSingleFile(fileType, mockContext);

			expect(result.isValid).toBe(false);
			expect(result.error).toBe("ENOENT");
		});
	});

	describe("loadFileWithTemplate", () => {
		const fileType = MemoryBankFileType.ProjectBrief;
		let cacheManager: CacheManager;

		beforeEach(() => {
			cacheManager = new CacheManager(mockFileCache, mockCacheStats);
		});

		it("should load existing file from cache", async () => {
			const stats = { mtimeMs: 123456, mtime: new Date() } as any;

			vi.mocked(fs.mkdir).mockResolvedValue(undefined as any);
			vi.mocked(fs.stat).mockResolvedValue(stats);

			// Set up cache
			mockFileCache.set("/test/memory-bank/core/projectBrief.md", {
				content: "cached content",
				mtimeMs: 123456,
			});

			const result = await loadFileWithTemplate(fileType, mockContext, cacheManager);

			expect(result.content).toBe("cached content");
			expect(result.wasCreated).toBe(false);
			expect(mockCacheStats.hits).toBe(1);
		});

		it("should read existing file from disk", async () => {
			const stats = { mtimeMs: 123456, mtime: new Date() } as any;

			vi.mocked(fs.mkdir).mockResolvedValue(undefined as any);
			vi.mocked(fs.stat).mockResolvedValue(stats);
			vi.mocked(fs.readFile).mockResolvedValue("file content" as any);

			const result = await loadFileWithTemplate(fileType, mockContext, cacheManager);

			expect(result.content).toBe("file content");
			expect(result.wasCreated).toBe(false);
			expect(mockCacheStats.misses).toBe(1);
		});

		it("should create file from template when missing", async () => {
			const { getTemplateForFileType } = await import("../lib/memoryBankTemplates.js");
			const stats = { mtimeMs: 123456, mtime: new Date() } as any;

			vi.mocked(fs.mkdir).mockResolvedValue(undefined as any);
			vi.mocked(fs.stat)
				.mockRejectedValueOnce(new Error("ENOENT")) // First call fails
				.mockResolvedValueOnce(stats); // Second call after creation succeeds
			vi.mocked(fs.writeFile).mockResolvedValue(undefined);
			vi.mocked(getTemplateForFileType).mockReturnValue("template content");

			const result = await loadFileWithTemplate(fileType, mockContext, cacheManager);

			expect(result.content).toBe("template content");
			expect(result.wasCreated).toBe(true);
			expect(fs.writeFile).toHaveBeenCalledWith(
				"/test/memory-bank/core/projectBrief.md",
				"template content",
			);
		});
	});

	describe("performHealthCheck", () => {
		it("should return healthy result when all files exist", async () => {
			vi.mocked(fs.stat).mockResolvedValue({} as any);
			vi.mocked(fs.access).mockResolvedValue(undefined);

			const result = await performHealthCheck(mockContext);

			expect(result.isHealthy).toBe(true);
			expect(result.issues).toHaveLength(0);
			expect(result.summary).toContain("✅");
		});

		it("should return unhealthy result when folder is missing", async () => {
			vi.mocked(fs.stat).mockRejectedValue(new Error("ENOENT"));
			vi.mocked(fs.access).mockResolvedValue(undefined);

			const result = await performHealthCheck(mockContext);

			expect(result.isHealthy).toBe(false);
			expect(result.issues).toContain("Missing folder: /test/memory-bank");
			expect(result.summary).toContain("❌");
		});

		it("should return unhealthy result when files are missing", async () => {
			vi.mocked(fs.stat).mockResolvedValue({} as any);
			vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"));

			const result = await performHealthCheck(mockContext);

			expect(result.isHealthy).toBe(false);
			expect(result.issues.length).toBeGreaterThan(0);
			expect(result.summary).toContain("❌");
		});
	});
});
