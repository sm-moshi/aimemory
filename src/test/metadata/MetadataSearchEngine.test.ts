import { MetadataSearchEngine } from "@/metadata/MetadataSearchEngine.js";
import type { MetadataIndexEntry } from "@/types/index.js";
import {
	createFileMetrics,
	createMockMetadataIndexManager,
	standardAfterEach,
	standardBeforeEach,
} from "@test-utils/index.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Use centralized mock
const mockIndexManager = createMockMetadataIndexManager();

describe("MetadataSearchEngine", () => {
	let searchEngine: MetadataSearchEngine;
	let mockEntries: MetadataIndexEntry[];

	beforeEach(() => {
		standardBeforeEach();
		searchEngine = new MetadataSearchEngine(mockIndexManager);

		// Create mock index entries for testing
		mockEntries = [
			{
				relativePath: "project-brief.md",
				type: "projectBrief",
				title: "AI Memory Extension",
				description: "VSCode extension for memory bank management",
				tags: ["vscode", "extension", "memory"],
				created: "2025-05-30T10:00:00.000Z",
				updated: "2025-05-31T12:00:00.000Z",
				validationStatus: "valid",
				lastIndexed: "2025-05-31T12:00:00.000Z",
				fileMetrics: {
					sizeBytes: 1024,
					lineCount: 50,
					sizeFormatted: "1.0 KB",
					contentLineCount: 45,
					wordCount: 200,
					characterCount: 1000,
				},
			},
			{
				relativePath: "tech-context.md",
				type: "techContext",
				title: "Technology Stack",
				description: "Overview of technologies used in the project",
				tags: ["tech", "stack", "typescript"],
				created: "2025-05-29T14:00:00.000Z",
				updated: "2025-05-31T11:00:00.000Z",
				validationStatus: "valid",
				lastIndexed: "2025-05-31T11:00:00.000Z",
				fileMetrics: createFileMetrics(2048, 80),
			},
			{
				relativePath: "notes/research.md",
				type: "researchNote",
				title: "Research Notes",
				description: "Various research findings",
				tags: ["research", "notes"],
				created: "2025-05-28T09:00:00.000Z",
				updated: "2025-05-30T16:00:00.000Z",
				validationStatus: "unchecked",
				lastIndexed: "2025-05-30T16:00:00.000Z",
				fileMetrics: createFileMetrics(512, 25),
			},
			{
				relativePath: "invalid-file.md",
				type: "note",
				title: "Invalid File",
				description: "File with validation errors",
				tags: ["invalid"],
				created: "2025-05-27T08:00:00.000Z",
				updated: "2025-05-28T10:00:00.000Z",
				validationStatus: "invalid",
				lastIndexed: "2025-05-28T10:00:00.000Z",
				fileMetrics: createFileMetrics(256, 10),
			},
		];

		vi.mocked(mockIndexManager.getIndex).mockReturnValue(mockEntries);
	});

	standardAfterEach();

	describe("search with no filters", () => {
		it("should return all entries when no filters are applied", async () => {
			const result = await searchEngine.search({});

			expect(result.results).toHaveLength(4);
			expect(result.total).toBe(4);
			expect(result.hasMore).toBe(false);
			expect(result.filters).toEqual({});
		});

		it("should respect limit parameter", async () => {
			const result = await searchEngine.search({ limit: 2 });

			expect(result.results).toHaveLength(2);
			expect(result.total).toBe(4);
			expect(result.hasMore).toBe(true);
		});

		it("should handle offset and limit together", async () => {
			const result = await searchEngine.search({ offset: 1, limit: 2 });

			expect(result.results).toHaveLength(2);
			expect(result.total).toBe(4);
			expect(result.hasMore).toBe(true);
			const firstResult = result.results[0];
			expect(firstResult).toBeDefined();
			expect(firstResult?.relativePath).toBe("tech-context.md");
		});

		it("should handle offset beyond results", async () => {
			const result = await searchEngine.search({ offset: 10 });

			expect(result.results).toHaveLength(0);
			expect(result.total).toBe(4);
			expect(result.hasMore).toBe(false);
		});
	});

	describe("text search", () => {
		it("should search in title", async () => {
			const result = await searchEngine.search({ query: "Memory" });

			expect(result.results).toHaveLength(1);
			const firstResult = result.results[0];
			expect(firstResult).toBeDefined();
			expect(firstResult?.title).toBe("AI Memory Extension");
		});

		it("should search in description", async () => {
			const result = await searchEngine.search({ query: "VSCode" });

			expect(result.results).toHaveLength(1);
			const firstResult = result.results[0];
			expect(firstResult).toBeDefined();
			expect(firstResult?.title).toBe("AI Memory Extension");
		});

		it("should search in relative path", async () => {
			const result = await searchEngine.search({ query: "research" });

			expect(result.results).toHaveLength(1);
			const firstResult = result.results[0];
			expect(firstResult).toBeDefined();
			expect(firstResult?.relativePath).toBe("notes/research.md");
		});

		it("should be case insensitive", async () => {
			const result = await searchEngine.search({ query: "MEMORY" });

			expect(result.results).toHaveLength(1);
			const firstResult = result.results[0];
			expect(firstResult).toBeDefined();
			expect(firstResult?.title).toBe("AI Memory Extension");
		});

		it("should return empty results for non-matching query", async () => {
			const result = await searchEngine.search({ query: "nonexistent" });

			expect(result.results).toHaveLength(0);
			expect(result.total).toBe(0);
		});

		it("should handle partial matches", async () => {
			const result = await searchEngine.search({ query: "Tech" });

			expect(result.results).toHaveLength(1); // "tech-context.md" matches in both path and type
			const firstResult = result.results[0];
			expect(firstResult).toBeDefined();
			expect(firstResult?.relativePath).toBe("tech-context.md");
			expect(firstResult?.type).toBe("techContext");
		});
	});

	describe("type filtering", () => {
		it("should filter by type", async () => {
			const result = await searchEngine.search({ type: "projectBrief" });

			expect(result.results).toHaveLength(1);
			const firstResult = result.results[0];
			expect(firstResult).toBeDefined();
			expect(firstResult?.type).toBe("projectBrief");
		});

		it("should return empty results for non-matching type", async () => {
			const result = await searchEngine.search({ type: "nonexistent" });

			expect(result.results).toHaveLength(0);
		});

		it("should handle undefined type filtering", async () => {
			const result = await searchEngine.search({});

			expect(result.results).toHaveLength(4); // No filtering applied
		});
	});

	describe("tag filtering", () => {
		it("should filter by single tag", async () => {
			const result = await searchEngine.search({ tags: ["extension"] });

			expect(result.results).toHaveLength(1);
			const firstResult = result.results[0];
			expect(firstResult).toBeDefined();
			expect(firstResult?.tags).toContain("extension");
		});

		it("should filter by multiple tags (OR logic)", async () => {
			const result = await searchEngine.search({ tags: ["typescript", "research"] });

			expect(result.results).toHaveLength(2); // One has typescript, one has research
		});

		it("should return empty results for non-matching tags", async () => {
			const result = await searchEngine.search({ tags: ["nonexistent"] });

			expect(result.results).toHaveLength(0);
		});

		it("should handle empty tags array", async () => {
			const result = await searchEngine.search({ tags: [] });

			expect(result.results).toHaveLength(4); // No filtering applied
		});

		it("should handle entries without tags", async () => {
			// Add entry without tags
			const entryWithoutTags: MetadataIndexEntry = {
				relativePath: "no-tags.md",
				type: "note",
				title: "No Tags",
				created: "2025-05-31T10:00:00.000Z",
				updated: "2025-05-31T10:00:00.000Z",
				validationStatus: "valid",
				lastIndexed: "2025-05-31T10:00:00.000Z",
				fileMetrics: createFileMetrics(100, 5),
			};

			vi.mocked(mockIndexManager.getIndex).mockReturnValue([
				...mockEntries,
				entryWithoutTags,
			]);

			const result = await searchEngine.search({ tags: ["extension"] });

			expect(result.results).toHaveLength(1);
			const firstResult = result.results[0];
			expect(firstResult).toBeDefined();
			expect(firstResult?.relativePath).toBe("project-brief.md");
		});
	});

	describe("validation status filtering", () => {
		it("should filter by validation status valid", async () => {
			const result = await searchEngine.search({ validationStatus: "valid" });

			expect(result.results).toHaveLength(2);
			expect(result.results.every(entry => entry.validationStatus === "valid")).toBe(true);
		});

		it("should filter by validation status invalid", async () => {
			const result = await searchEngine.search({ validationStatus: "invalid" });

			expect(result.results).toHaveLength(1);
			const firstResult = result.results[0];
			expect(firstResult).toBeDefined();
			expect(firstResult?.validationStatus).toBe("invalid");
		});

		it("should filter by validation status unchecked", async () => {
			const result = await searchEngine.search({ validationStatus: "unchecked" });

			expect(result.results).toHaveLength(1);
			const firstResult = result.results[0];
			expect(firstResult).toBeDefined();
			expect(firstResult?.validationStatus).toBe("unchecked");
		});
	});

	describe("date filtering", () => {
		it("should filter by createdAfter", async () => {
			const result = await searchEngine.search({
				createdAfter: "2025-05-29T00:00:00.000Z",
			});

			expect(result.results).toHaveLength(2);
			expect(
				result.results.every(
					entry => new Date(entry.created) >= new Date("2025-05-29T00:00:00.000Z"),
				),
			).toBe(true);
		});

		it("should filter by createdBefore", async () => {
			const result = await searchEngine.search({
				createdBefore: "2025-05-29T00:00:00.000Z",
			});

			expect(result.results).toHaveLength(2);
			expect(
				result.results.every(
					entry => new Date(entry.created) <= new Date("2025-05-29T00:00:00.000Z"),
				),
			).toBe(true);
		});

		it("should filter by date range", async () => {
			const result = await searchEngine.search({
				createdAfter: "2025-05-28T00:00:00.000Z",
				createdBefore: "2025-05-29T23:59:59.999Z",
			});

			expect(result.results).toHaveLength(2);
		});

		it("should handle invalid date strings gracefully", async () => {
			const result = await searchEngine.search({
				createdAfter: "invalid-date",
			});

			// Should not crash and return results (invalid dates are treated as no filter)
			expect(result.results).toHaveLength(4);
		});
	});

	describe("combined filters", () => {
		it("should apply multiple filters together", async () => {
			const result = await searchEngine.search({
				type: "projectBrief",
				tags: ["extension"],
				validationStatus: "valid",
				query: "Memory",
			});

			expect(result.results).toHaveLength(1);
			const firstResult = result.results[0];
			expect(firstResult).toBeDefined();
			expect(firstResult?.relativePath).toBe("project-brief.md");
		});

		it("should return empty results when filters exclude all entries", async () => {
			const result = await searchEngine.search({
				type: "projectBrief",
				tags: ["nonexistent"],
			});

			expect(result.results).toHaveLength(0);
		});

		it("should handle complex filtering scenario", async () => {
			const result = await searchEngine.search({
				validationStatus: "valid",
				createdAfter: "2025-05-29T00:00:00.000Z",
				query: "tech",
			});

			expect(result.results).toHaveLength(1);
			const firstResult = result.results[0];
			expect(firstResult).toBeDefined();
			if (firstResult) {
				expect(firstResult.relativePath).toBe("tech-context.md");
			}
		});
	});

	describe("sort order", () => {
		it("should maintain consistent sort order", async () => {
			const result1 = await searchEngine.search({});
			const result2 = await searchEngine.search({});

			expect(result1.results.map(r => r.relativePath)).toEqual(
				result2.results.map(r => r.relativePath),
			);
		});

		it("should sort results by updated date (newest first)", async () => {
			const result = await searchEngine.search({});

			const dates = result.results.map(r => new Date(r.updated));
			for (let i = 1; i < dates.length; i++) {
				const prevDate = dates[i - 1];
				const currentDate = dates[i];
				expect(prevDate).toBeDefined();
				expect(currentDate).toBeDefined();
				if (prevDate && currentDate) {
					expect(prevDate.getTime()).toBeGreaterThanOrEqual(currentDate.getTime());
				}
			}
		});
	});

	describe("edge cases", () => {
		it("should handle empty index", async () => {
			vi.mocked(mockIndexManager.getIndex).mockReturnValue([]);

			const result = await searchEngine.search({});

			expect(result.results).toHaveLength(0);
			expect(result.total).toBe(0);
			expect(result.hasMore).toBe(false);
		});

		it("should handle entries with missing optional fields", async () => {
			const minimalEntry: MetadataIndexEntry = {
				relativePath: "minimal.md",
				created: "2025-05-31T10:00:00.000Z",
				updated: "2025-05-31T10:00:00.000Z",
				validationStatus: "unchecked",
				lastIndexed: "2025-05-31T10:00:00.000Z",
				fileMetrics: createFileMetrics(100, 5),
			};

			vi.mocked(mockIndexManager.getIndex).mockReturnValue([minimalEntry]);

			const result = await searchEngine.search({ query: "minimal" });

			expect(result.results).toHaveLength(1);
		});

		it("should handle very large offset", async () => {
			const result = await searchEngine.search({ offset: 1000000 });

			expect(result.results).toHaveLength(0);
			expect(result.total).toBe(4);
			expect(result.hasMore).toBe(false);
		});

		it("should handle zero limit", async () => {
			const result = await searchEngine.search({ limit: 0 });

			expect(result.results).toHaveLength(0);
			expect(result.total).toBe(4);
			expect(result.hasMore).toBe(true);
		});

		it("should return applied filters in result", async () => {
			const filters = {
				type: "projectBrief",
				tags: ["extension"],
				validationStatus: "valid" as const,
				query: "Memory",
			};

			const result = await searchEngine.search(filters);

			expect(result.filters).toEqual(filters);
		});
	});

	describe("performance considerations", () => {
		it("should handle large result sets efficiently", async () => {
			// Create a large number of mock entries
			const largeEntrySet: MetadataIndexEntry[] = Array.from({ length: 1000 }, (_, i) => ({
				relativePath: `file-${i}.md`,
				type: "note",
				title: `File ${i}`,
				created: "2025-05-31T10:00:00.000Z",
				updated: "2025-05-31T10:00:00.000Z",
				validationStatus: "valid" as const,
				lastIndexed: "2025-05-31T10:00:00.000Z",
				fileMetrics: createFileMetrics(100, 5),
			}));

			vi.mocked(mockIndexManager.getIndex).mockReturnValue(largeEntrySet);

			const startTime = Date.now();
			const result = await searchEngine.search({ limit: 50 });
			const endTime = Date.now();

			expect(result.results).toHaveLength(50);
			expect(result.total).toBe(1000);
			expect(result.hasMore).toBe(true);

			// Should complete in reasonable time (less than 100ms for this simple operation)
			expect(endTime - startTime).toBeLessThan(100);
		});
	});
});
