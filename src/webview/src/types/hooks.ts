/**
 * Hook Types
 * Type definitions for custom React hooks used in the webview
 */

/**
 * Return type for the MCP server detection hook
 */
export interface UseMCPServerDetectionReturn {
	isLoading: boolean;
	isServerRunning: boolean;
	detectedPort: number | null;
}
