/**
 * Tests for File Operation Helpers
 * Verifies functionality of shared file operation utilities
 */

import type { Stats } from "node:fs";
import { stat } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	validateMemoryBankDirectory,
	validateSingleFile,
} from "@/shared/validation/file-validation.js";

import {
	createMockFileOperationManager,
	createMockLogger,
	standardAfterEach,
	standardBeforeEach,
} from "@test-utils/index.js";
import type { FileCache, FileOperationContext } from "../../types/index.js";
import { MemoryBankFileType } from "../../types/index.js";
import { validateAndConstructFilePath } from "../../utils/path-validation.js";

vi.mock("@/shared/templates/memory-bank-templates.js", () => ({
	getTemplateForFileType: vi.fn((fileType: string) => `Template for ${fileType}`),
}));

describe("File Operation Helpers", () => {
	let mockContext: FileOperationContext;
	let mockFileCache: Map<string, FileCache>;
	let mockLogger: ReturnType<typeof createMockLogger>;
	let mockStreamingManager: any;
	let mockFom: ReturnType<typeof createMockFileOperationManager>;

	const mockMemoryBankFolder = "/test/memory-bank";

	beforeEach(() => {
		standardBeforeEach();

		mockFileCache = new Map();
		mockLogger = createMockLogger();
		mockFom = createMockFileOperationManager();

		mockStreamingManager = {
			readFile: vi.fn().mockResolvedValue({
				success: true,
				data: { content: "default mock stream content", wasStreamed: true },
			}),
		};

		mockContext = {
			memoryBankFolder: mockMemoryBankFolder,
			logger: mockLogger,
			fileCache: mockFileCache,
			cacheStats: {
				hits: 0,
				misses: 0,
				totalFiles: 0,
				hitRate: 0,
				lastReset: new Date(),
				reloads: 0,
			},
			streamingManager: mockStreamingManager,
			fileOperationManager: mockFom as any,
		};
	});

	afterEach(() => {
		standardAfterEach();
		vi.resetAllMocks();
	});

	describe("validateMemoryBankDirectory", () => {
		it("should return true for valid directory", async () => {
			vi.mocked(stat).mockResolvedValue({ isDirectory: () => true } as Stats);

			const result = await validateMemoryBankDirectory(mockContext);

			expect(stat).toHaveBeenCalledWith(mockMemoryBankFolder);
			expect(result).toBe(true);
		});

		it("should return false for non-directory", async () => {
			vi.mocked(stat).mockResolvedValue({ isDirectory: () => false } as Stats);

			const result = await validateMemoryBankDirectory(mockContext);

			expect(stat).toHaveBeenCalledWith(mockMemoryBankFolder);
			expect(result).toBe(false);
			expect(mockLogger.error).toHaveBeenCalledWith("Memory bank folder does not exist.");
		});

		it("should return false for missing directory (stat returns error result)", async () => {
			vi.mocked(stat).mockRejectedValue(new Error("ENOENT"));

			const result = await validateMemoryBankDirectory(mockContext);

			expect(stat).toHaveBeenCalledWith(mockMemoryBankFolder);
			expect(result).toBe(false);
			expect(mockLogger.error).toHaveBeenCalledWith("Memory bank folder does not exist.");
		});
	});

	describe("validateSingleFile", () => {
		const fileType = MemoryBankFileType.ActiveContext;
		let expectedFilePath: string;

		beforeEach(() => {
			expectedFilePath = validateAndConstructFilePath(mockMemoryBankFolder, fileType);
		});

		it("should return valid result for existing file", async () => {
			vi.mocked(stat).mockResolvedValue({ isFile: () => true } as Stats);
			const result = await validateSingleFile(fileType, mockContext);

			expect(stat).toHaveBeenCalledWith(expectedFilePath);
			expect(result.isValid).toBe(true);
			expect(result.filePath).toBe(expectedFilePath);
			expect(result.fileType).toBe(fileType);
		});

		it("should return invalid result for non-file (e.g., a directory)", async () => {
			vi.mocked(stat).mockResolvedValue({ isFile: () => false } as Stats);
			const result = await validateSingleFile(fileType, mockContext);

			expect(stat).toHaveBeenCalledWith(expectedFilePath);
			expect(result.isValid).toBe(false);
			expect(result.error).toBe("Not a file");
			expect(mockLogger.info).toHaveBeenCalledWith(
				`Checked file: ${fileType} - Exists: false (not a file)`,
			);
		});

		it("should return invalid result for missing file (stat returns error result)", async () => {
			vi.mocked(stat).mockRejectedValue(new Error("ENOENT: No such file or directory"));

			const result = await validateSingleFile(fileType, mockContext);

			expect(stat).toHaveBeenCalledWith(expectedFilePath);
			expect(result.isValid).toBe(false);
			expect(result.error).toMatch(/ENOENT|No such file or directory/i);
			expect(mockLogger.info).toHaveBeenCalledWith(
				`Checked file: ${fileType} - Exists: false`,
			);
		});
	});
});
