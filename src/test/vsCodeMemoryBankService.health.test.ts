import { beforeEach, describe, expect, it, vi } from "vitest";
import { VSCodeMemoryBankService } from "../core/vsCodeMemoryBankService.js";
import { isSuccess } from "../types/types.js";

// Mock dependencies for VSCodeMemoryBankService
const mockCoreService = {
	checkHealth: vi.fn(),
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

describe("VSCodeMemoryBankService Health Check Edge Cases", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCoreService.checkHealth.mockClear().mockResolvedValue({
			success: true,
			data: "✅ All files and folders are present and readable.",
		});
	});

	it("reports healthy status from core service", async () => {
		mockCoreService.checkHealth.mockResolvedValue({
			success: true,
			data: "✅ All files and folders are present and readable.",
		});

		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreService,
			mockCursorRulesService,
			mockLogger,
		);

		const health = await service.checkHealth();
		expect(isSuccess(health)).toBe(true);
		if (isSuccess(health)) {
			expect(health.data).toContain("✅");
		}
		expect(mockCoreService.checkHealth).toHaveBeenCalled();
	});

	it("reports issues found by core service", async () => {
		mockCoreService.checkHealth.mockResolvedValue({
			success: true,
			data: "❌ Issues found:\nMissing folder: /mock/workspace/.aimemory/memory-bank",
		});

		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreService,
			mockCursorRulesService,
			mockLogger,
		);

		const health = await service.checkHealth();
		expect(isSuccess(health)).toBe(true);
		if (isSuccess(health)) {
			expect(health.data).toContain("❌ Issues found");
		}
		expect(mockCoreService.checkHealth).toHaveBeenCalled();
	});

	it("handles errors from core service health check", async () => {
		mockCoreService.checkHealth.mockResolvedValue({
			success: false,
			error: new Error("Health check failed"),
		});

		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreService,
			mockCursorRulesService,
			mockLogger,
		);

		const health = await service.checkHealth();
		expect(isSuccess(health)).toBe(false);
		if (!isSuccess(health)) {
			expect(health.error.message).toContain("Health check failed");
		}
		expect(mockCoreService.checkHealth).toHaveBeenCalled();
	});
});
