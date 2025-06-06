/**
 * Version utilities for AI Memory Extension
 *
 * Centralizes version management by reading from package.json
 * to avoid scattered hardcoded versions throughout the codebase.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Get the project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..", "..");

let cachedPackageInfo: { name: string; version: string; displayName: string } | null = null;

/**
 * Reads and caches package.json information
 */
function getPackageInfo() {
	if (cachedPackageInfo) {
		return cachedPackageInfo;
	}

	try {
		const packageJsonPath = resolve(projectRoot, "package.json");
		const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

		cachedPackageInfo = {
			name: packageJson.name ?? "aimemory",
			version: packageJson.version ?? "0.0.0",
			displayName: packageJson.displayName ?? "Cursor AI Memory",
		};

		return cachedPackageInfo;
	} catch (error) {
		console.warn("Failed to read package.json, using fallback version:", error);
		// Fallback for edge cases
		cachedPackageInfo = {
			name: "aimemory",
			version: "0.8.0",
			displayName: "Cursor AI Memory",
		};
		return cachedPackageInfo;
	}
}

/**
 * Get the current extension version from package.json
 */
export function getExtensionVersion(): string {
	return getPackageInfo().version;
}

/**
 * Get the extension name from package.json
 */
export function getExtensionName(): string {
	return getPackageInfo().name;
}

/**
 * Get the extension display name from package.json
 */
export function getExtensionDisplayName(): string {
	return getPackageInfo().displayName;
}

/**
 * Get full package information
 */
export function getPackageDetails() {
	return getPackageInfo();
}

/**
 * Generate a version string for MCP servers with optional suffix
 */
export function getMCPServerVersion(suffix?: string): string {
	const baseVersion = getExtensionVersion();
	return suffix ? `${baseVersion}-${suffix}` : baseVersion;
}
