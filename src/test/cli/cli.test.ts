import { standardBeforeEach } from "@test-utils/index.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../mcp/coreMemoryBankMCP.js", () => ({
	CoreMemoryBankMCP: vi.fn().mockImplementation(() => ({
		getServer: vi.fn().mockReturnValue({ connect: vi.fn().mockResolvedValue(undefined) }),
	})),
}));
vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
	StdioServerTransport: vi.fn().mockImplementation(() => ({})),
}));

describe("cli main", () => {
	beforeEach(() => {
		standardBeforeEach();
	});

	it("creates CoreMemoryBankMCP and connects transport", async () => {
		const cliModule = await import("@/app/cli/index.js");
		const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue("/mock/path");
		const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("exit");
		});
		let threw = false;
		try {
			await cliModule.main();
		} catch (_e) {
			threw = true;
		}
		expect(threw).toBe(false);
		cwdSpy.mockRestore();
		exitSpy.mockRestore();
	});
});
