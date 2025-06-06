import { mockCommands, mockWindow } from "@test-utils/index.js";
import { describe, expect, it, vi } from "vitest";
import { activate, deactivate } from "../../extension.js";

// Mock the dependencies that `activate` calls into.
vi.mock("@/app/extension/commandHandler.js", () => ({
	CommandHandler: vi.fn(() => ({
		registerCommands: vi.fn(),
	})),
}));
vi.mock("@/core/vsCodeMemoryBankService.js", () => ({
	VSCodeMemoryBankService: {
		getInstance: vi.fn(() => ({
			initialize: vi.fn().mockResolvedValue({ success: true }),
		})),
	},
}));
vi.mock("@/cursor/rules-service.js", () => ({
	CursorRulesService: vi.fn(() => ({
		createRulesFile: vi.fn().mockResolvedValue(undefined),
	})),
}));

describe("Extension Activation and Deactivation", () => {
	it("should activate the extension and register commands", async () => {
		const mockContext: any = {
			subscriptions: [],
			extensionPath: "/mock/path",
		};
		await activate(mockContext);

		// Verify that a command was registered
		expect(mockCommands.registerCommand).toHaveBeenCalled();
		// Verify that a disposable was pushed to subscriptions
		expect(mockContext.subscriptions.length).toBeGreaterThan(0);
	});

	it("should show an error message if initialization fails", async () => {
		// Override mock for this specific test case
		const { VSCodeMemoryBankService } = await import("@/core/vsCodeMemoryBankService.js");
		(VSCodeMemoryBankService.getInstance as any).mockReturnValueOnce({
			initialize: vi.fn().mockResolvedValue({
				success: false,
				error: "Initialization failed",
			}),
		});

		const mockContext: any = { subscriptions: [] };
		await activate(mockContext);

		expect(mockWindow.showErrorMessage).toHaveBeenCalledWith(
			"Failed to initialize AI Memory Bank: Initialization failed",
		);
	});

	it("deactivates the extension", () => {
		deactivate();
		// Currently, deactivate does nothing, so this is just a smoke test.
		// If deactivation logic is added, this test should be updated.
		expect(true).toBe(true);
	});
});
