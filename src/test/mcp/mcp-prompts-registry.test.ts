import { describe, expect, it } from "vitest";
import { registerMemoryBankPrompts } from "../../services/cursor/mcp-prompts-registry.js";

describe("registerMemoryBankPrompts", () => {
	it("registers all expected prompt names", () => {
		const registered: string[] = [];
		const mockServer = {
			prompt: (name: string, fn: any) => {
				registered.push(name);
			},
		};
		// @ts-expect-error: partial mock is fine for this test
		registerMemoryBankPrompts(mockServer);
		expect(registered).toEqual(
			expect.arrayContaining([
				"memory-bank-guide",
				"memory-bank-already-initialized",
				"memory-bank-health-check",
				"memory-bank-file-missing",
				"memory-bank-update-confirmation",
				"memory-bank-structure-guide",
				"memory-bank-usage-tip",
				"review-and-update-memory-bank",
				"agentic-batch-update-guidance",
			]),
		);
	});
});
