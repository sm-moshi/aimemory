import { beforeEach, describe, expect, it, vi } from "vitest";
import { VSCodeMemoryBankService } from "../core/vsCodeMemoryBankService.js";
import { MemoryBankFileType, isSuccess } from "../types/types.js";

// Mock dependencies for VSCodeMemoryBankService
const mockCoreService = {
	updateFile: vi.fn(),
} as any;

const mockCursorRulesService = { createRulesFile: vi.fn() } as any;

const mockLogger = {
	info: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
	debug: vi.fn(),
} as any;

// Minimal mock for vscode.ExtensionContext (simplified for this file)
const mockContext = {} as any;

describe("VSCodeMemoryBankService updateFile Error Handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCoreService.updateFile.mockClear();
		mockLogger.info.mockClear();
		mockLogger.error.mockClear();
		mockLogger.warn.mockClear();
		mockLogger.debug.mockClear();
	});

	it("throws error when write fails", async () => {
		mockCoreService.updateFile.mockResolvedValue({
			success: false,
			error: new Error("Write update failed"),
		}); // Simulate core error with resolved Result object
		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreService,
			mockCursorRulesService,
			mockLogger,
		);
		await expect(
			service.updateFile(MemoryBankFileType.ProjectBrief, "new content"),
		).resolves.toEqual({ success: false, error: new Error("Write update failed") });
		expect(mockCoreService.updateFile).toHaveBeenCalledWith(
			MemoryBankFileType.ProjectBrief,
			"new content",
		);
	});
});
