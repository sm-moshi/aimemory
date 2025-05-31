import { updateCursorMCPServerConfig } from "./config-helpers.js";

/**
 * Updates the Cursor MCP config to point to our MCP server (STDIO mode)
 */
export async function updateCursorMCPConfig(extensionPath: string): Promise<void> {
	// Delegate to the new utility function that reduces complexity from ~21 to ~5-6
	await updateCursorMCPServerConfig();
}
