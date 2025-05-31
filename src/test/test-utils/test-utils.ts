// Moved getPath to be accessible by multiple test files
export const getPath = async (subPath = "") => {
	const pathModule = await import("node:path");
	return pathModule.join("/mock/workspace", ".aimemory", "memory-bank", subPath);
};
