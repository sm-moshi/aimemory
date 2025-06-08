import { beforeEach, describe, expect, it, vi } from "vitest";
import { standardBeforeEach } from "../test-utils/index";

vi.mock("commander", () => ({
	program: {
		name: vi.fn().mockReturnThis(),
		description: vi.fn().mockReturnThis(),
		version: vi.fn().mockReturnThis(),
		option: vi.fn().mockReturnThis(),
		parse: vi.fn().mockReturnThis(),
		opts: vi.fn().mockReturnValue({}),
	},
}));

vi.mock("../../mcp/coreMemoryBankMCP", () => ({
	CoreMemoryBankMCP: vi.fn().mockImplementation(() => ({
		getServer: vi.fn().mockReturnValue({ connect: vi.fn().mockResolvedValue(undefined) }),
	})),
}));
vi.mock("@modelcontextprotocol/sdk/server/stdio", () => ({
	StdioServerTransport: vi.fn().mockImplementation(() => ({})),
}));

describe("cli main", () => {
	beforeEach(() => {
		standardBeforeEach();
	});

	it("creates CoreMemoryBankMCP and connects transport", async () => {
		const cliModule = await import("../../app/cli/index");
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
