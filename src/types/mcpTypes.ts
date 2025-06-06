import type { MemoryBankServiceCore } from "@/core/memoryBankServiceCore.js";
import type { Logger } from "./logging.js";

/**
 * Common interface for MCP server implementations.
 * As of Phase 1d, the extension uses STDIO transport exclusively.
 * This interface maintains compatibility with existing extension code.
 */
export interface MCPServerInterface {
	/**
	 * Start the MCP server
	 */
	start(): Promise<void>;

	/**
	 * Stop the MCP server
	 */
	stop(): void;

	/**
	 * Get the port number (for compatibility, STDIO adapters return a default)
	 */
	getPort(): number;

	/**
	 * Set external server running (for compatibility)
	 */
	setExternalServerRunning(port: number): void;

	/**
	 * Get the memory bank service instance
	 */
	getMemoryBank(): MemoryBankServiceCore;

	/**
	 * Update a memory bank file
	 */
	updateMemoryBankFile(fileType: string, content: string): Promise<void>;

	/**
	 * Handle a command
	 */
	handleCommand(command: string, args: string[]): Promise<string>;

	/**
	 * Check if the MCP server is currently running
	 */
	isServerRunning(): boolean;
}

/**
 * Standard MCP response types for tool handlers
 */
export interface MCPSuccessResponse {
	[x: string]: unknown;
	content: Array<{ type: "text"; text: string }>;
	isError?: false;
}

export interface MCPErrorResponse {
	[x: string]: unknown;
	content: Array<{ type: "text"; text: string }>;
	isError: true;
}

export type MCPResponse = MCPSuccessResponse | MCPErrorResponse;

/**
 * Unified MCP Server Configuration Interface
 *
 * This interface unifies all MCP server configuration needs across the codebase.
 * Individual implementations can require specific properties as needed.
 */
export interface MCPServerConfig {
	/** Path to the memory bank directory */
	memoryBankPath?: string;

	/** Legacy workspace path (mapped to memoryBankPath for backward compatibility) */
	workspacePath?: string;

	/** Server name (defaults provided by implementations) */
	name?: string;

	/** Server version (defaults provided by implementations) */
	version?: string;

	/** Logger instance using unified Logger interface */
	logger?: Logger;

	/** Log level for CLI implementations */
	logLevel?: string;

	/** Pre-configured memory bank instance (mainly for testing/DI) */
	memoryBank?: MemoryBankServiceCore;
}

// Type aliases for specific use cases (for clarity and backward compatibility)
export type BaseMCPServerConfig = MCPServerConfig;
export type CoreMemoryBankConfig = MCPServerConfig;
export type MCPServerCLIOptions = MCPServerConfig;
export type CLIServerConfig = MCPServerConfig;

/**
 * Original Configuration for base MCP server implementations.
 * Kept for reference or specific use cases where an instance is always pre-supplied.
 * @deprecated Use MCPServerConfig instead
 */
export interface MCPServerInstanceConfig {
	name: string;
	version: string;
	memoryBank: MemoryBankServiceCore;
	logger?: Logger;
}

/**
 * Error wrapper for type validation failures
 */
export class TypeValidationError extends Error {
	constructor(
		message: string,
		public readonly value: unknown,
	) {
		super(message);
		this.name = "TypeValidationError";
	}
}

/**
 * Result type for command handler operations
 */
export interface CommandResult {
	success: boolean;
	message: string;
	error?: import("./errorHandling.js").MemoryBankError;
}
