import type { MemoryBankService } from "../core/memoryBank.js";
import type { MemoryBankServiceCore } from "../core/memoryBankServiceCore.js";

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
	getMemoryBank(): MemoryBankService;

	/**
	 * Update a memory bank file
	 */
	updateMemoryBankFile(fileType: string, content: string): Promise<void>;

	/**
	 * Handle a command
	 */
	handleCommand(command: string, args: string[]): Promise<string>;
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
 * Configuration for base MCP server implementations
 */
export interface MCPServerConfig {
	name: string;
	version: string;
	memoryBank: MemoryBankServiceCore;
	logger?: Console;
}

/**
 * Configuration for CLI-based MCP server
 */
export interface CLIServerConfig {
	workspacePath: string;
	logger?: Console;
}

/**
 * Configuration for Core Memory Bank MCP server
 */
export interface CoreMemoryBankConfig {
	memoryBankPath: string;
	logger?: Console;
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
