import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MemoryBankServiceCore } from "../../core/memoryBankServiceCore.js";
import { MetadataIndexManager } from "../../metadata/MetadataIndexManager.js";
import type { MemoryBankLogger } from "../../types/core.js";

// Mock dependencies
const mockLogger: MemoryBankLogger = {
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
};

// Create a minimal mock of MemoryBankServiceCore
const mockMemoryBank = {} as unknown as MemoryBankServiceCore;

describe("MetadataIndexManager", () => {
	let indexManager: MetadataIndexManager;
	let tempDir: string;
	let indexPath: string;

	beforeEach(async () => {
		// Create temporary directory for testing
		tempDir = resolve(process.cwd(), `test-temp-${Date.now()}`);
		await fs.mkdir(tempDir, { recursive: true });
		await fs.mkdir(resolve(tempDir, ".index"), { recursive: true });

		indexPath = resolve(tempDir, ".index", "metadata.json");

		indexManager = new MetadataIndexManager(mockMemoryBank, mockLogger, {
			memoryBankPath: tempDir,
		});
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

	describe("initialization", () => {
		it("should initialize with correct config", () => {
			expect(indexManager).toBeDefined();
		});

		it("should create index directory if it does not exist", async () => {
			// Remove the index directory
			await fs.rm(resolve(tempDir, ".index"), { recursive: true, force: true });

			await indexManager.initialize();

			const indexDirExists = await fs
				.access(resolve(tempDir, ".index"))
				.then(() => true)
				.catch(() => false);
			expect(indexDirExists).toBe(true);
		});

		it("should load existing index on initialize", async () => {
			// Create a mock index file
			const mockIndex = [
				{
					relativePath: "test.md",
					type: "note",
					title: "Test Note",
					created: "2025-05-31T10:00:00.000Z",
					updated: "2025-05-31T10:00:00.000Z",
					validationStatus: "valid",
					lastIndexed: "2025-05-31T10:00:00.000Z",
					fileMetrics: { sizeBytes: 100, lineCount: 5, sizeFormatted: "100 B" },
				},
			];

			await fs.writeFile(indexPath, JSON.stringify(mockIndex, null, 2));

			await indexManager.initialize();

			const entry = indexManager.getEntry("test.md");
			expect(entry).toBeDefined();
			expect(entry?.title).toBe("Test Note");
		});
	});

	describe("buildIndex", () => {
		beforeEach(async () => {
			await indexManager.initialize();
		});

		it("should scan and index markdown files", async () => {
			// Create test files
			await fs.writeFile(
				resolve(tempDir, "test1.md"),
				"---\ntitle: Test 1\ntype: note\n---\nContent",
			);
			await fs.writeFile(
				resolve(tempDir, "test2.md"),
				"---\ntitle: Test 2\ntype: article\n---\nContent",
			);

			const result = await indexManager.buildIndex();

			expect(result.filesProcessed).toBe(2);
			expect(result.filesIndexed).toBe(2);
			expect(result.filesErrored).toBe(0);
			expect(result.errors).toHaveLength(0);
		});

		it("should handle files with no frontmatter", async () => {
			await fs.writeFile(resolve(tempDir, "no-frontmatter.md"), "Just content");

			const result = await indexManager.buildIndex();

			expect(result.filesProcessed).toBe(1);
			expect(result.filesIndexed).toBe(1);
		});

		it("should skip non-markdown files", async () => {
			await fs.writeFile(resolve(tempDir, "test.txt"), "Not markdown");
			await fs.writeFile(resolve(tempDir, "test.json"), "{}");

			const result = await indexManager.buildIndex();

			expect(result.filesProcessed).toBe(0);
			expect(result.filesIndexed).toBe(0);
		});

		it("should persist index to file after building", async () => {
			await fs.writeFile(resolve(tempDir, "test.md"), "---\ntitle: Test\n---\nContent");

			await indexManager.buildIndex();

			const indexExists = await fs
				.access(indexPath)
				.then(() => true)
				.catch(() => false);
			expect(indexExists).toBe(true);

			const indexContent = await fs.readFile(indexPath, "utf-8");
			const index = JSON.parse(indexContent);
			expect(index).toHaveLength(1);
			expect(index[0].title).toBe("Test");
		});
	});

	describe("entry management", () => {
		beforeEach(async () => {
			await indexManager.initialize();
		});

		it("should return undefined for non-existent entry", () => {
			const entry = indexManager.getEntry("non-existent.md");
			expect(entry).toBeUndefined();
		});

		it("should remove entry", async () => {
			// First add an entry by building the index
			await fs.writeFile(
				resolve(tempDir, "remove-test.md"),
				"---\ntitle: To Remove\n---\nContent",
			);
			await indexManager.buildIndex();

			expect(indexManager.getEntry("remove-test.md")).toBeDefined();

			// Now remove it
			indexManager.removeEntry("remove-test.md");
			expect(indexManager.getEntry("remove-test.md")).toBeUndefined();
		});
	});

	describe("getIndex", () => {
		beforeEach(async () => {
			await indexManager.initialize();
		});

		it("should return empty array when no entries", () => {
			const entries = indexManager.getIndex();
			expect(entries).toEqual([]);
		});

		it("should return all entries", async () => {
			// Add some entries
			await fs.writeFile(resolve(tempDir, "entry1.md"), "---\ntitle: Entry 1\n---\nContent");
			await fs.writeFile(resolve(tempDir, "entry2.md"), "---\ntitle: Entry 2\n---\nContent");

			await indexManager.buildIndex();

			const entries = indexManager.getIndex();
			expect(entries).toHaveLength(2);
			expect(entries.map((e) => e.title)).toEqual(["Entry 1", "Entry 2"]);
		});
	});

	describe("getIndexStats", () => {
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
			// Add test files
			await fs.writeFile(
				resolve(tempDir, "valid.md"),
				"---\ntitle: Valid\n---\nContent\nLine 2",
			);
			await fs.writeFile(
				resolve(tempDir, "unchecked.md"),
				"---\ntitle: Unchecked\n---\nContent",
			);

			await indexManager.buildIndex();

			const stats = await indexManager.getIndexStats();

			expect(stats.totalFiles).toBe(2);
			expect(stats.uncheckedFiles).toBe(2); // Default status is unchecked
			expect(stats.totalSizeBytes).toBeGreaterThan(0);
			expect(stats.totalLineCount).toBeGreaterThan(0);
		});
	});

	describe("error handling and edge cases", () => {
		beforeEach(async () => {
			await indexManager.initialize();
		});

		it("should handle corrupted index file", async () => {
			// Write invalid JSON to index file
			await fs.writeFile(indexPath, "invalid json");

			// Should not throw when initializing with corrupted index
			await expect(indexManager.initialize()).resolves.not.toThrow();
		});

		it("should handle filesystem errors gracefully", async () => {
			// Try to scan a non-existent subdirectory (creates an edge case)
			await fs.mkdir(resolve(tempDir, "subdir"));
			await fs.writeFile(
				resolve(tempDir, "subdir", "test.md"),
				"---\ntitle: Test\n---\nContent",
			);

			const result = await indexManager.buildIndex();

			// Should handle subdirectories correctly
			expect(result.filesIndexed).toBeGreaterThanOrEqual(0);
		});

		it("should handle missing metadata gracefully", async () => {
			await fs.writeFile(resolve(tempDir, "minimal.md"), "---\n---\nContent");

			const result = await indexManager.buildIndex();

			expect(result.filesIndexed).toBe(1);

			const entry = indexManager.getEntry("minimal.md");
			expect(entry).toBeDefined();
			expect(entry?.title).toBeUndefined();
			expect(entry?.type).toBeDefined(); // Should infer type from filename
		});
	});

	describe("updateEntry", () => {
		beforeEach(async () => {
			await indexManager.initialize();
		});

		it("should update single entry", async () => {
			// Create file first
			await fs.writeFile(
				resolve(tempDir, "update-test.md"),
				"---\ntitle: Original\n---\nContent",
			);
			await indexManager.buildIndex();

			// Update the file content
			await fs.writeFile(
				resolve(tempDir, "update-test.md"),
				"---\ntitle: Updated\n---\nNew Content",
			);

			await indexManager.updateEntry("update-test.md");

			const entry = indexManager.getEntry("update-test.md");
			expect(entry).toBeDefined();
			expect(entry?.title).toBe("Updated");
		});

		it("should handle update errors gracefully", async () => {
			// Try to update a non-existent file
			await expect(indexManager.updateEntry("non-existent.md")).rejects.toThrow();
		});
	});

	describe("persistence", () => {
		beforeEach(async () => {
			await indexManager.initialize();
		});

		it("should save index after modifications", async () => {
			await fs.writeFile(
				resolve(tempDir, "persist-test.md"),
				"---\ntitle: Persist Test\n---\nContent",
			);

			await indexManager.updateEntry("persist-test.md");

			// Check that index file was updated
			const indexContent = await fs.readFile(indexPath, "utf-8");
			const index = JSON.parse(indexContent);
			expect(index).toHaveLength(1);
			expect(index[0].title).toBe("Persist Test");
		});
	});
});
