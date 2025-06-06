import { vi } from "vitest";

export const homedir = vi.fn().mockReturnValue("/mock/home");
export const tmpdir = vi.fn().mockReturnValue("/mock/tmp");
export const platform = vi.fn().mockReturnValue("darwin" as NodeJS.Platform);
export const type = vi.fn().mockReturnValue("Darwin");
export const release = vi.fn().mockReturnValue("21.0.0");
export const arch = vi.fn().mockReturnValue("x64");

// Export for easy access in tests with proper typing
export const mockOsOperations = {
	homedir,
	tmpdir,
	platform,
	type,
	release,
	arch,
} as const;
