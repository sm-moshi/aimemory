/**
 * Webview Message Types
 * Centralized type definitions for communication between webview and extension
 */

/**
 * Log levels supported by the webview logging system
 */
export type WebviewLogLevel = "info" | "error";

/**
 * Log message structure sent from webview to extension
 */
export interface WebviewLogMessage {
	command: "logMessage";
	level: WebviewLogLevel;
	text: string;
	meta?: Record<string, unknown>;
}

/**
 * MCP server status message structure
 */
export interface MCPServerStatusMessage {
	type: "MCPServerStatus";
	status: "started" | "stopped" | "error";
	port?: number | null;
	transport?: "stdio" | "http";
	error?: string;
}

/**
 * Rules status message structure
 */
export interface RulesStatusMessage {
	type: "rulesStatus";
	initialized: boolean;
}

/**
 * Memory bank status message structure
 */
export interface MemoryBankStatusMessage {
	type: "memoryBankStatus";
	initialized: boolean;
}

/**
 * Reset rules result message structure
 */
export interface ResetRulesResultMessage {
	type: "resetRulesResult";
	success: boolean;
	error?: string;
}

/**
 * Review and update memory bank result message structure
 */
export interface ReviewUpdateMemoryBankMessage {
	type: "reviewAndUpdateMemoryBankComplete";
	success: boolean;
	error?: string;
}

/**
 * Union type for all messages sent from extension to webview
 */
export type ExtensionToWebviewMessage =
	| MCPServerStatusMessage
	| RulesStatusMessage
	| MemoryBankStatusMessage
	| ResetRulesResultMessage
	| ReviewUpdateMemoryBankMessage;

/**
 * Command message structure sent from webview to extension
 */
export interface WebviewCommand {
	command:
		| "startMCPServer"
		| "stopMCPServer"
		| "getRulesStatus"
		| "resetRules"
		| "requestMemoryBankStatus"
		| "reviewAndUpdateMemoryBank"
		| "serverAlreadyRunning";
	port?: number;
	fileType?: string;
	content?: string;
}

/**
 * Union type for all messages sent from webview to extension
 */
export type WebviewToExtensionMessage = WebviewLogMessage | WebviewCommand;

/**
 * Union type for all webview messages (for backwards compatibility)
 */
export type WebviewMessage = WebviewToExtensionMessage;
