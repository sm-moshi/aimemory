import { beforeEach, describe, expect, it, vi } from "vitest";
import { VSCodeMemoryBankService } from "../core/vsCodeMemoryBankService.js";

// Mock dependencies for VSCodeMemoryBankService
const mockCoreService = {
	initializeFolders: vi.fn(),
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

describe("VSCodeMemoryBankService initializeFolders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCoreService.initializeFolders.mockClear().mockResolvedValue({ success: true });
		mockLogger.info.mockClear();
		mockLogger.error.mockClear();
		mockLogger.warn.mockClear();
		mockLogger.debug.mockClear();
	});

	it("creates all required subfolders", async () => {
		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreService,
			mockCursorRulesService,
			mockLogger,
		);
		await expect(service.initializeFolders()).resolves.toEqual({ success: true });
		expect(mockCoreService.initializeFolders).toHaveBeenCalled();
	});
});
