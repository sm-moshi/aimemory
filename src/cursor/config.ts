import type { FileOperationManager } from "../core/file-operations";
import { updateCursorMCPServerConfig } from "./config-helpers";

/**
 * Updates the Cursor MCP config to point to our MCP server (STDIO mode)
 */
export async function updateCursorMCPConfig(
	_extensionPath: string,
	fileOperationManager: FileOperationManager,
): Promise<void> {
	await updateCursorMCPServerConfig(fileOperationManager);
}
