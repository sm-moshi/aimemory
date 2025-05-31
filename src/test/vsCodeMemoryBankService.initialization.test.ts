import { beforeEach, describe, expect, it, vi } from "vitest";
import { VSCodeMemoryBankService } from "../core/vsCodeMemoryBankService.js";
import { isSuccess } from "../types/types.js";

// Mock dependencies for VSCodeMemoryBankService
const mockCoreService = {
	getIsMemoryBankInitialized: vi.fn(),
	loadFiles: vi.fn(),
} as any;

const mockCursorRulesService = { createRulesFile: vi.fn() } as any;

const mockLogger = {
	info: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
	debug: vi.fn(),
} as any;

// Minimal mock for vscode.ExtensionContext
const mockContext = {} as any;

describe("VSCodeMemoryBankService Initialization Edge Cases", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCoreService.getIsMemoryBankInitialized
			.mockClear()
			.mockResolvedValue({ success: true, data: true });
		mockCoreService.loadFiles.mockClear().mockResolvedValue({ success: true, data: [] });
	});

	it("returns true when core service reports initialized", async () => {
		mockCoreService.getIsMemoryBankInitialized.mockResolvedValue({
			success: true,
			data: true,
		});

		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreService,
			mockCursorRulesService,
			mockLogger,
		);

		await service.loadFiles(); // Load files first
		const isInit = await service.getIsMemoryBankInitialized();
		expect(isSuccess(isInit)).toBe(true);
		if (isSuccess(isInit)) {
			expect(isInit.data).toBe(true);
		}
		expect(mockCoreService.getIsMemoryBankInitialized).toHaveBeenCalled();
	});

	it("returns false when core service reports not initialized", async () => {
		mockCoreService.getIsMemoryBankInitialized.mockResolvedValue({
			success: true,
			data: false,
		});

		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreService,
			mockCursorRulesService,
			mockLogger,
		);

		await service.loadFiles(); // Load files first
		const isInit = await service.getIsMemoryBankInitialized();
		expect(isSuccess(isInit)).toBe(true);
		if (isSuccess(isInit)) {
			expect(isInit.data).toBe(false);
		}
		expect(mockCoreService.getIsMemoryBankInitialized).toHaveBeenCalled();
	});

	it("handles errors from core service initialization check", async () => {
		mockCoreService.getIsMemoryBankInitialized.mockResolvedValue({
			success: false,
			error: new Error("Initialization check failed"),
		});

		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreService,
			mockCursorRulesService,
			mockLogger,
		);

		await service.loadFiles(); // Load files first
		const isInit = await service.getIsMemoryBankInitialized();
		expect(isSuccess(isInit)).toBe(false);
		if (!isSuccess(isInit)) {
			expect(isInit.error.message).toContain("Initialization check failed");
		}
		expect(mockCoreService.getIsMemoryBankInitialized).toHaveBeenCalled();
	});
});
