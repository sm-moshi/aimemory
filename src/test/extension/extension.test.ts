import { describe, expect, it, vi } from "vitest";
import { deactivate } from "../../extension.js";
import { setupVSCodeMock } from "../test-utils/index.js";

// Setup VS Code mock
setupVSCodeMock();

// Mock all dependencies
vi.mock("../../commandHandler.js", () => ({
	CommandHandler: vi.fn().mockImplementation(() => ({
		processMemoryCommand: vi.fn(),
	})),
}));

vi.mock("../../mcp/mcpAdapter.js", () => ({
	MemoryBankMCPAdapter: vi.fn().mockImplementation(() => ({
		start: vi.fn(),
		stop: vi.fn(),
		getPort: vi.fn().mockReturnValue(7331),
	})),
}));

vi.mock("../../utils/cursor-config.js", () => ({
	updateCursorMCPConfig: vi.fn(),
}));

vi.mock("../../utils/log.js", () => ({
	Logger: {
		getInstance: vi.fn(() => ({
			setLevel: vi.fn(),
			info: vi.fn(),
			showOutput: vi.fn(),
		})),
	},
	LogLevel: {
		Trace: "trace",
		Debug: "debug",
		Info: "info",
		Warning: "warning",
		Error: "error",
	},
}));

vi.mock("../../webview/webviewManager.js", () => ({
	WebviewManager: vi.fn().mockImplementation(() => ({
		openWebview: vi.fn(),
	})),
}));

describe("Extension", () => {
	describe("deactivate", () => {
		it("can be called without errors", () => {
			expect(() => deactivate()).not.toThrow();
		});
	});

	describe("module structure", () => {
		it("has required exports", async () => {
			const extensionModule = await import("../../extension.js");
			expect(extensionModule.activate).toBeDefined();
			expect(extensionModule.deactivate).toBeDefined();
		});
	});
});
