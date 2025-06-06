/**
 * Tests for File Operation Helpers
 * Verifies functionality of shared file operation utilities
 */

import type { FileOperationManager } from "@/core/index.js";
import {
	validateMemoryBankDirectory,
	validateSingleFile,
} from "@/shared/validation/file-validation.js";
import {
	createMockFileOperationManager,
	createMockLogger,
} from "@/test/__mocks__/test-utilities.js";
import { MemoryBankFileType } from "@/types/core.js";
import type { FileOperationContext } from "@/types/core.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the fs module at the top level with default export
vi.mock("node:fs/promises", () => ({
	default: {
		stat: vi.fn(),
	},
	stat: vi.fn(),
}));

// Import after mocking
import fs from "node:fs/promises";

describe("File Operation Helpers", () => {
	let mockContext: FileOperationContext;
	let mockFileOperationManager: Partial<FileOperationManager>;

	beforeEach(() => {
		mockFileOperationManager = createMockFileOperationManager();
		mockContext = {
			memoryBankFolder: "/test/memory-bank",
			logger: createMockLogger(),
			fileCache: new Map(),
			cacheStats: {
				hits: 0,
				misses: 0,
				hitRate: 0,
				totalFiles: 0,
				lastReset: new Date(),
				reloads: 0,
			},
			streamingManager: {
				readFile: vi.fn(),
				getFileStats: vi.fn(),
			} as any,
			fileOperationManager: mockFileOperationManager as FileOperationManager,
		};

		// Clear all mocks before each test
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("validateMemoryBankDirectory", () => {
		it("should return true for valid directory", async () => {
			// Configure the mock using vi.mocked
			vi.mocked(fs.stat).mockResolvedValue({
				isDirectory: () => true,
				isFile: () => false,
			} as any);

			const result = await validateMemoryBankDirectory(mockContext);
			expect(result).toBe(true);
			expect(vi.mocked(fs.stat)).toHaveBeenCalledWith("/test/memory-bank");
		});

		it("should return false for non-directory", async () => {
			// Mock fs.stat to return file stats (not directory)
			vi.mocked(fs.stat).mockResolvedValue({
				isDirectory: () => false,
				isFile: () => true,
			} as any);

			const result = await validateMemoryBankDirectory(mockContext);
			expect(result).toBe(false);
		});

		it("should return false for missing directory (stat throws error)", async () => {
			// Mock fs.stat to throw error (file not found)
			vi.mocked(fs.stat).mockRejectedValue(new Error("ENOENT: no such file or directory"));

			const result = await validateMemoryBankDirectory(mockContext);
			expect(result).toBe(false);
		});
	});

	describe("validateSingleFile", () => {
		it("should return valid result for existing file", async () => {
			// Mock fs.stat to return file stats for any path that gets constructed
			vi.mocked(fs.stat).mockResolvedValue({
				isDirectory: () => false,
				isFile: () => true,
			} as any);

			const result = await validateSingleFile(MemoryBankFileType.ProjectBrief, mockContext);
			expect(result.isValid).toBe(true);
			expect(result.context?.filePath).toContain("core/projectBrief.md");
		});

		it("should return invalid result for non-file (e.g., a directory)", async () => {
			// Mock fs.stat to return directory stats (not file)
			vi.mocked(fs.stat).mockResolvedValue({
				isDirectory: () => true,
				isFile: () => false,
			} as any);

			const result = await validateSingleFile(MemoryBankFileType.ProjectBrief, mockContext);
			expect(result.isValid).toBe(false);
		});

		it("should return invalid result for missing file (stat throws error)", async () => {
			// Mock fs.stat to throw error (file not found)
			const errorMessage = "ENOENT: No such file or directory";
			vi.mocked(fs.stat).mockRejectedValue(new Error(errorMessage));

			const result = await validateSingleFile(MemoryBankFileType.ProjectBrief, mockContext);
			expect(result.isValid).toBe(false);
			expect(result.errors[0]).toContain(errorMessage);
		});

		it("should work with different file types", async () => {
			const testFileTypes = [
				MemoryBankFileType.ProjectBrief,
				MemoryBankFileType.ActiveContext,
				MemoryBankFileType.ProgressCurrent,
			];

			// Mock fs.stat to always return valid file stats
			vi.mocked(fs.stat).mockResolvedValue({
				isDirectory: () => false,
				isFile: () => true,
			} as any);

			for (const fileType of testFileTypes) {
				const result = await validateSingleFile(fileType, mockContext);
				expect(result.isValid).toBe(true);
			}

			// Should have been called once for each file type
			expect(vi.mocked(fs.stat)).toHaveBeenCalledTimes(testFileTypes.length);
		});
	});
});
