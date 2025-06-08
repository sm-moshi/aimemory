import { describe, expect, it } from "vitest";
import { formatMarkdownContent } from "../../lib/utils";

describe("formatMarkdownContent", () => {
	describe("MD036 - Emphasis as heading prevention", () => {
		it("should convert standalone emphasized text to blockquotes", () => {
			const input = "*Brief description or purpose statement*";
			const expected = "> Brief description or purpose statement";
			expect(formatMarkdownContent(input).trim()).toBe(expected);
		});

		it("should convert emphasized labels with colons to bold", () => {
			const input = "*Status*: Complete\n*Priority*: High";
			const expected = "**Status**: Complete\n\n**Priority**: High";
			expect(formatMarkdownContent(input).trim()).toBe(expected);
		});

		it("should convert emphasized status indicators to bold", () => {
			const input = "*Status* Complete\n*Priority* High\n*Timeline* 2025-06-08";
			const expected = "**Status** Complete\n\n**Priority** High\n\n**Timeline** 2025-06-08";
			expect(formatMarkdownContent(input).trim()).toBe(expected);
		});

		it("should convert emphasized timestamps to blockquotes", () => {
			const input = "*Last updated: 2025-06-08*";
			const expected = "> Last updated: 2025-06-08";
			expect(formatMarkdownContent(input).trim()).toBe(expected);
		});
	});

	describe("MD032 - List spacing", () => {
		it("should add blank lines before lists", () => {
			const input = "Some text\n- Item 1\n- Item 2";
			const expected = "Some text\n\n- Item 1\n- Item 2";
			expect(formatMarkdownContent(input).trim()).toBe(expected);
		});

		it("should add blank lines after lists", () => {
			const input = "- Item 1\n- Item 2\nSome text";
			const expected = "- Item 1\n- Item 2\n\nSome text";
			expect(formatMarkdownContent(input).trim()).toBe(expected);
		});

		it("should handle numbered lists", () => {
			const input = "Text\n1. First\n2. Second\nMore text";
			const expected = "Text\n\n1. First\n2. Second\n\nMore text";
			expect(formatMarkdownContent(input).trim()).toBe(expected);
		});
	});

	describe("General formatting", () => {
		it("should clean up multiple consecutive blank lines", () => {
			const input = "Line 1\n\n\n\nLine 2";
			const expected = "Line 1\n\nLine 2";
			expect(formatMarkdownContent(input).trim()).toBe(expected);
		});

		it("should add blank lines before headers (except H1)", () => {
			const input = "Text\n## Header 2\n### Header 3";
			const expected = "Text\n\n## Header 2\n\n### Header 3";
			expect(formatMarkdownContent(input).trim()).toBe(expected);
		});

		it("should not add blank lines before H1 if it's the first line", () => {
			const input = "# Main Title\nSome content";
			const expected = "# Main Title\nSome content";
			expect(formatMarkdownContent(input).trim()).toBe(expected);
		});

		it("should handle empty or invalid input", () => {
			expect(formatMarkdownContent("")).toBe("");
			expect(formatMarkdownContent(null as any)).toBe("");
			expect(formatMarkdownContent(undefined as any)).toBe("");
		});
	});

	describe("Complex scenarios", () => {
		it("should handle a complex document with multiple issues", () => {
			const input = `# Title
*Brief description*
Text before list
- Item 1
- Item 2
Text after list
*Status*: Complete
*Last updated: 2025-06-08*
## Section
*Important note*`;

			const expected = `# Title
> Brief description
Text before list

- Item 1
- Item 2

Text after list
**Status**: Complete
> Last updated: 2025-06-08

## Section
> Important note`;

			expect(formatMarkdownContent(input).trim()).toBe(expected);
		});

		it("should preserve legitimate emphasis within sentences", () => {
			const input = "This is *important* text with emphasis.";
			const expected = "This is *important* text with emphasis.";
			expect(formatMarkdownContent(input).trim()).toBe(expected);
		});
	});
});
