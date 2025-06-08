/**
 * Simple Test Setup for AI Memory Extension
 *
 * KISS Principle: One file, basic mocks, no over-engineering
 */

import { beforeEach, vi } from "vitest";
import * as vscodeMock from "../__mocks__/vscode";

vi.mock("vscode", () => {
	return vscodeMock;
});

// =================== SIMPLE MOCKS ===================

export const createMockLogger = () => ({
	trace: vi.fn(),
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	setLevel: vi.fn(),
});

export const createMockFileOperationManager = () => ({
	readFileWithRetry: vi.fn().mockResolvedValue({ success: true, data: "mock content" }),
	writeFileWithRetry: vi.fn().mockResolvedValue({ success: true }),
	mkdirWithRetry: vi.fn().mockResolvedValue({ success: true }),
	statWithRetry: vi.fn().mockResolvedValue({
		success: true,
		data: { isFile: () => true, isDirectory: () => false },
	}),
});

export const createMockMemoryBankService = () => ({
	getIsMemoryBankInitialized: vi.fn().mockResolvedValue({ success: true, data: true }),
	initializeFolders: vi.fn().mockResolvedValue({ success: true }),
	loadFiles: vi.fn().mockResolvedValue({ success: true }),
	getFile: vi.fn(),
	getAllFiles: vi.fn().mockReturnValue([]),
	updateFile: vi.fn().mockResolvedValue({ success: true }),
	writeFileByPath: vi.fn().mockResolvedValue({ success: true }),
});

// =================== GLOBAL SETUP ===================

beforeEach(() => {
	vi.clearAllMocks();
	vscodeMock.resetVSCodeMocks();
});
