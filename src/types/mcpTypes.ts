import type { MemoryBankService } from "../core/memoryBank.js";

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
