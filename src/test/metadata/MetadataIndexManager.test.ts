import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MetadataIndexManager } from "../../metadata/MetadataIndexManager";
import {
	createMockCoreService,
	createMockFileOperationManager,
	createMockLogger,
	createMockMemoryBankFile,
	standardAfterEach,
	standardBeforeEach,
} from "../test-utils/index";

import { readdir } from "node:fs/promises";
// Use centralized mocks
import { mockFsPromisesOperations } from "../__mocks__/node:fs/promises";

vi.mock("node:fs/promises", async () => {
	const original = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
	return {
		...original,
		readdir: vi.fn(), // Mock readdir specifically
	};
});

// =================== TEST SETUP ===================

let tempDir: string;
let indexManager: MetadataIndexManager;
let mockCore: any;
let mockLogger: any;
let mockFom: any;

beforeEach(async () => {
	standardBeforeEach();
	tempDir = "/mock/temp-index-manager";

	// Use centralized mocks
	mockLogger = createMockLogger();
	mockCore = createMockCoreService();
	mockFom = createMockFileOperationManager();

	// Setup minimal required behaviors
	mockCore.getFileOperationManager.mockReturnValue(mockFom);

	// Set up default mock behaviors for FileOperationManager
	mockFom.mkdirWithRetry.mockResolvedValue({ success: true, data: undefined });
	mockFom.readFileWithRetry.mockResolvedValue({ success: true, data: "[]" });
	mockFom.writeFileWithRetry.mockResolvedValue({ success: true, data: undefined });
	mockFom.statWithRetry.mockResolvedValue({
		success: true,
		data: {
			isFile: () => true,
			isDirectory: () => false,
			size: 100,
			mtime: new Date(),
			ctime: new Date(),
		},
	});

	indexManager = new MetadataIndexManager(mockCore, mockLogger, mockFom, {
		memoryBankPath: tempDir,
	});
});

afterEach(() => {
	standardAfterEach();
});

// =================== HELPER FUNCTIONS ===================

function expectBuildResult(result: any, expected: { processed: number; indexed: number; errored: number }) {
	expect(result.filesProcessed).toBe(expected.processed);
	expect(result.filesIndexed).toBe(expected.indexed);
	expect(result.filesErrored).toBe(expected.errored);
}

// =================== TEST SUITES ===================

describe("MetadataIndexManager - Initialization & Configuration", () => {
	it("should initialize with correct config", async () => {
		await indexManager.initialize();

		expect(mockFom.mkdirWithRetry).toHaveBeenCalledWith(`${tempDir}/.index`, {
			recursive: true,
		});
	});

	it("should create index directory if it does not exist", async () => {
		await indexManager.initialize();

		expect(mockFom.mkdirWithRetry).toHaveBeenCalledWith(`${tempDir}/.index`, {
			recursive: true,
		});
	});

	it("should load existing index on initialize", async () => {
		const mockIndex = [
			{
				relativePath: "test.md",
				type: "note",
				title: "Test Note",
				created: "2025-05-31T10:00:00.000Z",
				updated: "2025-05-31T10:00:00.000Z",
				validationStatus: "valid",
				actualSchemaUsed: "note",
				lastIndexed: "2025-05-31T10:00:00.000Z",
				fileMetrics: { sizeBytes: 100, lineCount: 5, sizeFormatted: "100 B" },
			},
		];

		mockFom.readFileWithRetry.mockResolvedValueOnce({
			success: true,
			data: JSON.stringify(mockIndex),
		});

		await indexManager.initialize();

		const entry = indexManager.getEntry("test.md");
		expect(entry).toBeDefined();
		expect(entry?.title).toBe("Test Note");
	});
});

describe("MetadataIndexManager - Index Building & File Processing", () => {
	beforeEach(async () => {
		await indexManager.initialize();
	});

	it("should scan and index markdown files", async () => {
		// Mock fs.readdir to return test files using centralized mocks
		mockFsPromisesOperations.readdir.mockResolvedValueOnce([
			{ name: "test1.md", isFile: () => true, isDirectory: () => false } as any,
			{ name: "test2.md", isFile: () => true, isDirectory: () => false } as any,
		]);

		const result = await indexManager.buildIndex();

		expectBuildResult(result, { processed: 2, indexed: 2, errored: 0 });
	});

	it("should handle files with no frontmatter", async () => {
		mockFsPromisesOperations.readdir.mockResolvedValueOnce([
			{ name: "no-frontmatter.md", isFile: () => true, isDirectory: () => false } as any,
		]);

		const result = await indexManager.buildIndex();

		expectBuildResult(result, { processed: 1, indexed: 1, errored: 0 });
	});

	it("should skip non-markdown files", async () => {
		mockFsPromisesOperations.readdir.mockResolvedValueOnce([
			{ name: "test.txt", isFile: () => true, isDirectory: () => false } as any,
			{ name: "test.json", isFile: () => true, isDirectory: () => false } as any,
		]);

		const result = await indexManager.buildIndex();

		expectBuildResult(result, { processed: 0, indexed: 0, errored: 0 });
	});

	it("should persist index to file after building", async () => {
		mockFsPromisesOperations.readdir.mockResolvedValueOnce([
			{ name: "test.md", isFile: () => true, isDirectory: () => false } as any,
		]);

		await indexManager.buildIndex();

		expect(mockFom.writeFileWithRetry).toHaveBeenCalledWith(
			expect.stringContaining("metadata.json"),
			expect.any(String),
		);
	});

	it("should handle missing metadata gracefully during buildIndex", async () => {
		mockFsPromisesOperations.readdir.mockResolvedValueOnce([
			{ name: "missing-meta.md", isFile: () => true, isDirectory: () => false } as any,
		]);

		const result = await indexManager.buildIndex();

		expectBuildResult(result, { processed: 1, indexed: 1, errored: 0 });
		const entry = indexManager.getEntry("missing-meta.md");
		expect(entry?.type).toBe("documentation"); // Default type
	});
});

describe("MetadataIndexManager - Entry Management & Retrieval", () => {
	beforeEach(async () => {
		await indexManager.initialize();
	});

	it("should return undefined for non-existent entry", () => {
		const entry = indexManager.getEntry("non-existent.md");
		expect(entry).toBeUndefined();
	});

	it("should remove entry", async () => {
		mockFsPromisesOperations.readdir.mockResolvedValueOnce([
			{ name: "remove-test.md", isFile: () => true, isDirectory: () => false } as any,
		]);

		await indexManager.buildIndex();
		expect(indexManager.getEntry("remove-test.md")).toBeDefined();

		indexManager.removeEntry("remove-test.md");
		expect(indexManager.getEntry("remove-test.md")).toBeUndefined();
	});

	it("should return all entries", async () => {
		mockFsPromisesOperations.readdir.mockResolvedValueOnce([
			{ name: "entry1.md", isFile: () => true, isDirectory: () => false } as any,
			{ name: "entry2.md", isFile: () => true, isDirectory: () => false } as any,
		]);

		const mockFile1 = createMockMemoryBankFile("entry1.md", "Content", { title: "Entry 1" });
		const mockFile2 = createMockMemoryBankFile("entry2.md", "Content", { title: "Entry 2" });
		mockCore.getAllFiles.mockReturnValue([mockFile1, mockFile2]);

		await indexManager.buildIndex();

		const entries = indexManager.getIndex();
		expect(entries).toHaveLength(2);
		expect(entries.map(e => e.title)).toEqual(["Entry 1", "Entry 2"]);
	});

	it("should return empty array when no entries", () => {
		const entries = indexManager.getIndex();
		expect(entries).toEqual([]);
	});
});

describe("MetadataIndexManager - Statistics & Analytics", () => {
	beforeEach(async () => {
		await indexManager.initialize();
	});

	it("should return correct stats for empty index", async () => {
		const stats = await indexManager.getIndexStats();

		expect(stats.totalFiles).toBe(0);
		expect(stats.validFiles).toBe(0);
		expect(stats.invalidFiles).toBe(0);
		expect(stats.uncheckedFiles).toBe(0);
		expect(stats.totalSizeBytes).toBe(0);
		expect(stats.totalLineCount).toBe(0);
	});

	it("should calculate stats correctly", async () => {
		mockFsPromisesOperations.readdir.mockResolvedValueOnce([
			{ name: "valid.md", isFile: () => true, isDirectory: () => false } as any,
			{ name: "unchecked.md", isFile: () => true, isDirectory: () => false } as any,
		]);

		await indexManager.buildIndex();

		const stats = await indexManager.getIndexStats();

		expect(stats.totalFiles).toBe(2);
		expect(stats.uncheckedFiles).toBe(2); // Default status
		expect(stats.totalSizeBytes).toBeGreaterThan(0);
		expect(stats.totalLineCount).toBeGreaterThan(0);
	});
});

describe("MetadataIndexManager - Error Handling & Recovery", () => {
	beforeEach(async () => {
		await indexManager.initialize();
	});

	it("should handle corrupted index file", async () => {
		mockFom.readFileWithRetry.mockResolvedValueOnce({
			success: true,
			data: "invalid json",
		});

		await expect(indexManager.initialize()).resolves.not.toThrow();
		expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("Failed to load existing index"));
	});

	it("should handle filesystem errors gracefully during buildIndex", async () => {
		mockFsPromisesOperations.readdir.mockRejectedValueOnce(new Error("Simulated readdir failure"));

		const result = await indexManager.buildIndex();

		expectBuildResult(result, { processed: 0, indexed: 0, errored: 0 });
		expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("Failed to scan directory"));
	});

	it("should handle filesystem errors gracefully when statWithRetry fails", async () => {
		mockFsPromisesOperations.readdir.mockResolvedValueOnce([
			{ name: "error-stat.md", isFile: () => true, isDirectory: () => false } as any,
		]);

		mockFom.statWithRetry.mockResolvedValueOnce({
			success: false,
			error: { code: "FS_ERROR_STAT", message: "Test FS error on stat" },
		});

		const result = await indexManager.buildIndex();

		expectBuildResult(result, { processed: 1, indexed: 0, errored: 1 });
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]?.error).toContain("Test FS error on stat");
		expect(result.errors[0]?.relativePath).toBe("error-stat.md");
	});
});

describe("MetadataIndexManager - Updates & Persistence", () => {
	beforeEach(async () => {
		await indexManager.initialize();
	});

	it("should update single entry", async () => {
		const filePath = "update-me.md";

		// Initial build
		const mockFileOld = createMockMemoryBankFile(filePath, "Old content", {
			title: "Old Title",
		});
		mockCore.getAllFiles.mockReturnValue([mockFileOld]);
		await indexManager.buildIndex();

		let entry = indexManager.getEntry(filePath);
		expect(entry?.title).toBe("Old Title");

		// Mock the updated file for readFile call in updateEntry
		const mockFileNew = createMockMemoryBankFile(filePath, "New content", {
			title: "New Title",
			type: "DISTINCT_UPDATED_TYPE",
		});
		mockFileNew.validationStatus = "valid";
		mockCore.readFile.mockResolvedValueOnce({ success: true, data: mockFileNew });

		await indexManager.updateEntry(filePath);

		entry = indexManager.getEntry(filePath);
		expect(entry?.title).toBe("New Title");
		expect(entry?.type).toBe("DISTINCT_UPDATED_TYPE");
		expect(entry?.validationStatus).toBe("unchecked"); // Default status from source code
	});

	it("should handle update errors gracefully", async () => {
		const filePath = "error-update.md";

		mockFom.statWithRetry.mockResolvedValueOnce({
			success: false,
			error: { code: "STAT_ERROR", message: "simulated stat error" },
		});

		await expect(indexManager.updateEntry(filePath)).rejects.toThrow("Failed to stat file: simulated stat error");

		expect(mockLogger.error).toHaveBeenCalledWith(
			expect.stringContaining("Failed to update index entry: error-update.md"),
		);
	});

	it("should save index after modifications", async () => {
		vi.mocked(readdir).mockResolvedValueOnce([
			{ name: "persist-test.md", isFile: () => true, isDirectory: () => false } as any,
		]);

		await indexManager.buildIndex(); // This should trigger a save

		expect(mockFom.writeFileWithRetry).toHaveBeenCalledWith(
			expect.stringContaining("metadata.json"),
			expect.any(String),
		);

		// Test debounced save after modification
		vi.useFakeTimers();
		mockFom.writeFileWithRetry.mockClear();

		// Remove an entry and advance timers for debounced save
		indexManager.removeEntry("persist-test.md");

		// Advance timers to trigger debounced save
		await vi.runAllTimersAsync();

		expect(mockFom.writeFileWithRetry).toHaveBeenCalledWith(
			expect.stringContaining("metadata.json"),
			expect.any(String),
		);

		vi.useRealTimers();
	});
});
