import { describe, expect, it } from "vitest";
import { getTemplateForFileType } from "../../services/templates/memory-bank-templates.js";
import { MemoryBankFileType } from "../../types/types.js";

// Unit tests for getTemplateForFileType

describe("getTemplateForFileType", () => {
	it("returns the correct template for ProjectBrief", () => {
		const result = getTemplateForFileType(MemoryBankFileType.ProjectBrief);
		expect(result).toContain("Project Brief");
		expect(result).toContain("Foundation document");
	});

	it("returns the correct template for ProductContext", () => {
		const result = getTemplateForFileType(MemoryBankFileType.ProductContext);
		expect(result).toContain("Product Context");
		expect(result).toContain("User Experience Goals");
	});

	it("returns the default template for unknown type", () => {
		// @ts-expect-error: Testing with invalid type intentionally
		const result = getTemplateForFileType("not-a-real-type");
		expect(result).toContain("Memory Bank File");
		expect(result).toContain("default template");
	});
});
