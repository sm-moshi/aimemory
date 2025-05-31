import { beforeEach, describe, expect, it, vi } from "vitest";
import { VSCodeMemoryBankService } from "../core/vsCodeMemoryBankService.js";
import { MemoryBankFileType, isSuccess } from "../types/types.js";

// Mock dependencies for VSCodeMemoryBankService
const mockCoreService = {
	loadFiles: vi.fn(),
	getIsMemoryBankInitialized: vi.fn(),
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

describe("VSCodeMemoryBankService LoadFiles Edge Cases", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCoreService.loadFiles.mockClear().mockResolvedValue({ success: true, data: [] });
		mockCoreService.getIsMemoryBankInitialized
			.mockClear()
			.mockResolvedValue({ success: true, data: true });
	});

	it("successfully loads files from core service", async () => {
		mockCoreService.loadFiles.mockResolvedValue({
			success: true,
			data: ["core/projectbrief.md", "progress/current.md"],
		});

		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreService,
			mockCursorRulesService,
			mockLogger,
		);

		const result = await service.loadFiles();
		expect(isSuccess(result)).toBe(true);
		if (isSuccess(result)) {
			expect(result.data).toEqual(["core/projectbrief.md", "progress/current.md"]);
		}
		expect(mockCoreService.loadFiles).toHaveBeenCalled();
	});

	it("handles errors from core service during loadFiles", async () => {
		mockCoreService.loadFiles.mockResolvedValue({
			success: false,
			error: new Error("Load files failed"),
		});

		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreService,
			mockCursorRulesService,
			mockLogger,
		);

		const result = await service.loadFiles();
		expect(isSuccess(result)).toBe(false);
		if (!isSuccess(result)) {
			expect(result.error.message).toContain("Load files failed");
		}
		expect(mockCoreService.loadFiles).toHaveBeenCalled();
	});
});
