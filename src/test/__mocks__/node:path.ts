import { vi } from "vitest";

// Centralized Node.js path mocking using POSIX paths for cross-platform consistency
export const join = vi.fn((...args: string[]) => args.filter(Boolean).join("/"));
export const resolve = vi.fn((...args: string[]) => {
	const segments = args.filter(Boolean);
	if (segments.length === 0) return "/mock";
	if (segments[0]?.startsWith("/")) return segments.join("/");
	return `/mock/${segments.join("/")}`;
});
export const dirname = vi.fn((path: string) => {
	const parts = path.split("/");
	return parts.slice(0, -1).join("/") || "/";
});
export const basename = vi.fn((path: string, ext?: string) => {
	const name = path.split("/").pop() || "";
	return ext && name.endsWith(ext) ? name.slice(0, -ext.length) : name;
});
export const extname = vi.fn((path: string) => {
	const name = path.split("/").pop() || "";
	const lastDot = name.lastIndexOf(".");
	return lastDot > 0 ? name.slice(lastDot) : "";
});
export const normalize = vi.fn((path: string) => {
	// Simplified normalize for tests - removes double slashes and resolves dots
	return (
		path
			.replace(/\/+/g, "/")
			.replace(/\/\./g, "/")
			.replace(/\/[^/]+\/\.\./g, "") || "/"
	);
});
export const isAbsolute = vi.fn((path: string) => path.startsWith("/"));
export const relative = vi.fn((from: string, to: string) => {
	// Simplified relative path logic for tests
	return to.replace(from, "").replace(/^\//, "") || ".";
});

// POSIX-specific for consistency
export const posix = {
	join,
	resolve,
	dirname,
	basename,
	extname,
	normalize,
	isAbsolute,
	relative,
};

// Export for easy access in tests with proper typing
export const mockPathOperations = {
	join,
	resolve,
	dirname,
	basename,
	extname,
	normalize,
	isAbsolute,
	relative,
	posix,
} as const;
