/**
 * @file src/types/mcp.ts
 * @description Defines the types and interfaces for the Model Context Protocol (MCP). This includes
 *   the server interface, response formats, and configuration structures for communication between
 *   the VS Code extension and the MCP server.
 */

import type { MemoryBankManager } from "../core/memory-bank";
import type { MemoryBankError } from "./error";
import type { Logger } from "./logging";

/**
 * Common interface for MCP server implementations. As of the current architecture, the extension
 * uses an STDIO transport exclusively, but this interface provides a stable contract.
 */
export interface MCPServerInterface {
	start(): Promise<void>;
	stop(): void;
	getPort(): number; // Returns a default for STDIO adapters for compatibility.
	setExternalServerRunning(port: number): void;
	getMemoryBank(): MemoryBankManager;
	updateMemoryBankFile(fileType: string, content: string): Promise<void>;
	handleCommand(command: string, args: string[]): Promise<string>;
	isServerRunning(): boolean;
}

/**
 * Standard success response format for MCP tool handlers.
 */
export interface MCPSuccessResponse {
	[x: string]: unknown;
	content: Array<{ type: "text"; text: string }>;
	isError?: false;
}

/**
 * Standard error response format for MCP tool handlers.
 */
export interface MCPErrorResponse {
	[x: string]: unknown;
	content: Array<{ type: "text"; text: string }>;
	isError: true;
}

export type MCPResponse = MCPSuccessResponse | MCPErrorResponse;

/**
 * Unified configuration interface for all MCP server implementations.
 */
export interface MCPServerConfig {
	memoryBankPath?: string;
	workspacePath?: string; // Legacy alias for memoryBankPath.
	name?: string;
	version?: string;
	logger?: Logger;
	logLevel?: string;
	memoryBank?: MemoryBankManager; // For pre-supplying an instance.
}

// Type aliases for specific use cases to maintain clarity and backward compatibility.
export type BaseMCPServerConfig = MCPServerConfig;
export type CoreMemoryBankConfig = MCPServerConfig;
export type MCPServerCLIOptions = MCPServerConfig;
export type CLIServerConfig = MCPServerConfig;

/**
 * Result type for command handler operations.
 */
export interface CommandResult {
	success: boolean;
	message: string;
	error?: MemoryBankError;
}
