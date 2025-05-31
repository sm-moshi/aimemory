import { beforeEach, describe, expect, it, vi } from "vitest";
import { VSCodeMemoryBankService } from "../core/vsCodeMemoryBankService.js";
import { MemoryBankFileType, isSuccess } from "../types/types.js";

// Mock dependencies for VSCodeMemoryBankService
const mockCoreService = {
	invalidateCache: vi.fn(),
	getCacheStats: vi.fn(),
	resetCacheStats: vi.fn(),
	getIsMemoryBankInitialized: vi.fn(), // Needed for the S2486 test
	loadFiles: vi.fn(), // Needed for the S2486 test
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

const getPath = async (subPath = "") => {
	const pathModule = await import("node:path");
	return pathModule.join("/mock/workspace", ".aimemory", "memory-bank", subPath);
};

describe("VSCodeMemoryBankService Cache Management", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCoreService.invalidateCache.mockClear();
		mockCoreService.getCacheStats.mockClear().mockReturnValue({});
		mockCoreService.resetCacheStats.mockClear();
		mockCoreService.getIsMemoryBankInitialized
			.mockClear()
			.mockResolvedValue({ success: true, data: true }); // Default for S2486 test
		mockCoreService.loadFiles.mockClear().mockResolvedValue({ success: true, data: [] }); // Default for S2486 test
	});

	it("can invalidate specific file cache", async () => {
		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreService,
			mockCursorRulesService,
			mockLogger,
		);
		await service.loadFiles(); // Assuming loadFiles works with mocks
		expect(() => {
			service.invalidateCache("/mock/workspace/.aimemory/memory-bank/core/projectbrief.md");
		}).not.toThrow();
		// We can't easily check the cache stats here without more complex mocking,
		// but we can assert that the core service's method was called.
		expect(mockCoreService.invalidateCache).toHaveBeenCalledWith(
			"/mock/workspace/.aimemory/memory-bank/core/projectbrief.md",
		);
		const stats = service.getCacheStats();
		expect(stats).toBeDefined(); // Still expect some object, even if empty
	});

	it("can clear all cache", async () => {
		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreService,
			mockCursorRulesService,
			mockLogger,
		);
		await service.loadFiles(); // Assuming loadFiles works with mocks
		expect(() => {
			service.invalidateCache();
		}).not.toThrow();
		// We can't easily check the cache stats here without more complex mocking,
		// but we can assert that the core service's method was called.
		expect(mockCoreService.invalidateCache).toHaveBeenCalledWith(undefined); // Called with no specific path
		service.resetCacheStats(); // Call the VSCode service method
		expect(mockCoreService.resetCacheStats).toHaveBeenCalled(); // Expect resetCacheStats to be called on core
		const stats = service.getCacheStats(); // Call the VSCode service method
		expect(mockCoreService.getCacheStats).toHaveBeenCalled(); // Expect getCacheStats to be called on core
		expect(stats).toEqual({}); // Expect the mocked value
	});

	// Test related to the SonarLint S2486 issue (empty catch block)
	it("invalidates cache for missing files (S2486 related)", async () => {
		mockCoreService.getIsMemoryBankInitialized.mockResolvedValue({
			success: true,
			data: false,
		}); // Simulate core returning false
		const service = new VSCodeMemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
			mockCoreService,
			mockCursorRulesService,
			mockLogger,
		);

		// First, allow loadFiles to succeed to populate cache
		await service.loadFiles();
		service.invalidateCache(); // Clear the cache - this calls mockCoreService.invalidateCache

		// Test that the service correctly delegates to core service
		const result = await service.getIsMemoryBankInitialized();
		expect(isSuccess(result)).toBe(true);
		if (isSuccess(result)) {
			expect(result.data).toBe(false); // Expect false as simulated by mock
		}

		// Verify delegation was called
		expect(mockCoreService.getIsMemoryBankInitialized).toHaveBeenCalled();
		expect(mockCoreService.invalidateCache).toHaveBeenCalled();
	});
});
