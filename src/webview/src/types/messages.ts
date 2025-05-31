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

// --- Specific command message interfaces (Webview to Extension) ---

/**
 * Start MCP server command message
 */
export interface StartMCPServerMessage {
	command: "startMCPServer";
}

/**
 * Stop MCP server command message
 */
export interface StopMCPServerMessage {
	command: "stopMCPServer";
}

/**
 * Get rules status command message
 */
export interface GetRulesStatusMessage {
	command: "getRulesStatus";
}

/**
 * Reset rules command message
 */
export interface ResetRulesMessage {
	command: "resetRules";
}

/**
 * Request memory bank status command message
 */
export interface RequestMemoryBankStatusMessage {
	command: "requestMemoryBankStatus";
}

/**
 * Review and update memory bank command message
 * Keeping fileType and content as optional based on previous definition,
 * although usage in webviewManager.ts is not apparent for this command.
 */
export interface ReviewAndUpdateMemoryBankMessage {
	command: "reviewAndUpdateMemoryBank";
	fileType?: string;
	content?: string;
}

/**
 * Server already running command message
 */
export interface ServerAlreadyRunningMessage {
	command: "serverAlreadyRunning";
	port: number;
}

/**
 * Union type for all messages sent from webview to extension
 */
export type WebviewToExtensionMessage =
	| WebviewLogMessage
	| StartMCPServerMessage
	| StopMCPServerMessage
	| GetRulesStatusMessage
	| ResetRulesMessage
	| RequestMemoryBankStatusMessage
	| ReviewAndUpdateMemoryBankMessage
	| ServerAlreadyRunningMessage;
