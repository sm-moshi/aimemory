import { registerMemoryBankPrompts } from "@/cursor/mcp-prompts-registry.js";
import { describe, expect, it } from "vitest";

describe("registerMemoryBankPrompts", () => {
	it("registers all expected prompt names", () => {
		const registered: string[] = [];
		const mockServer = {
			prompt: (name: string, _fn: any) => {
				registered.push(name);
			},
		};
		registerMemoryBankPrompts(mockServer as any);
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
