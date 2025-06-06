import type { Stats } from "node:fs";
import { vi } from "vitest";

export const readFile = vi.fn().mockResolvedValue("mock file content");
export const writeFile = vi.fn().mockResolvedValue(undefined);
export const access = vi.fn().mockResolvedValue(undefined);
export const mkdir = vi.fn().mockResolvedValue(undefined);
export const rm = vi.fn().mockResolvedValue(undefined);
export const stat = vi.fn().mockResolvedValue({
	isFile: () => true,
	isDirectory: () => false,
	size: 1024,
	mtime: new Date(),
	ctime: new Date(),
	atime: new Date(),
	mtimeMs: Date.now(),
	ctimeMs: Date.now(),
	atimeMs: Date.now(),
} as Stats);
export const readdir = vi.fn().mockResolvedValue([]);
export const copyFile = vi.fn().mockResolvedValue(undefined);
export const mkdtemp = vi.fn().mockResolvedValue("/mock/tmp/test-dir");
export const realpath = vi.fn().mockImplementation((path: string) => path);

// Export common patterns for easy access in tests with proper typing
export const mockFileOperations = {
	readFile,
	writeFile,
	access,
	mkdir,
	rm,
	stat,
	readdir,
	copyFile,
	mkdtemp,
	realpath,
} as const;
