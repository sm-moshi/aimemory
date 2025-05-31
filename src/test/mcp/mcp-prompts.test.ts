import { describe, expect, it } from "vitest";
import {
	INITIALIZE_MEMORY_BANK_PROMPT,
	MEMORY_BANK_ALREADY_INITIALIZED_PROMPT,
	MEMORY_BANK_FILE_MISSING_PROMPT,
	MEMORY_BANK_HEALTH_CHECK_PROMPT,
	MEMORY_BANK_STRUCTURE_GUIDE_PROMPT,
	MEMORY_BANK_UPDATE_CONFIRMATION_PROMPT,
	MEMORY_BANK_USAGE_TIP_PROMPT,
	REVIEW_AND_UPDATE_MEMORY_BANK_PROMPT,
} from "../../lib/mcp-prompts.js";

// Unit tests for mcp-prompts.ts

describe("mcp-prompts", () => {
	it("INITIALIZE_MEMORY_BANK_PROMPT contains key instructions", () => {
		expect(INITIALIZE_MEMORY_BANK_PROMPT).toContain("initialize the Memory Bank");
		expect(INITIALIZE_MEMORY_BANK_PROMPT).toContain("project context");
	});

	it("MEMORY_BANK_ALREADY_INITIALIZED_PROMPT mentions already initialized", () => {
		expect(MEMORY_BANK_ALREADY_INITIALIZED_PROMPT).toContain("already been initialized");
	});

	it("MEMORY_BANK_HEALTH_CHECK_PROMPT mentions health", () => {
		expect(MEMORY_BANK_HEALTH_CHECK_PROMPT).toContain("health of the Memory Bank");
	});

	it("MEMORY_BANK_FILE_MISSING_PROMPT returns correct string", () => {
		const fileType = "core/projectbrief.md";
		const result = MEMORY_BANK_FILE_MISSING_PROMPT(fileType);
		expect(result).toContain(fileType);
		expect(result).toContain("is missing");
	});

	it("MEMORY_BANK_UPDATE_CONFIRMATION_PROMPT returns correct string", () => {
		const fileType = "progress/current.md";
		const result = MEMORY_BANK_UPDATE_CONFIRMATION_PROMPT(fileType);
		expect(result).toContain(fileType);
		expect(result).toContain("confirm the changes");
	});

	it("MEMORY_BANK_STRUCTURE_GUIDE_PROMPT mentions structure diagram", () => {
		expect(MEMORY_BANK_STRUCTURE_GUIDE_PROMPT).toContain("structure diagram");
	});

	it("MEMORY_BANK_USAGE_TIP_PROMPT mentions tip", () => {
		expect(MEMORY_BANK_USAGE_TIP_PROMPT).toContain("Tip:");
	});

	it("REVIEW_AND_UPDATE_MEMORY_BANK_PROMPT mentions reviewing files", () => {
		expect(REVIEW_AND_UPDATE_MEMORY_BANK_PROMPT).toContain("reviewing all memory bank files");
	});
});
