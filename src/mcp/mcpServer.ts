/**
 * @deprecated This file contains the Express-based MCP server implementation.
 * As of Phase 1d, this has been replaced by STDIO transport (mcpAdapter.ts).
 * This file is kept for reference but is no longer used by the extension.
 *
 * Migration completed: Extension now uses MemoryBankMCPAdapter exclusively.
 *
 * Note: Express dependencies have been removed. This is now a stub implementation.
 */

import type * as vscode from "vscode";
import { MemoryBankService } from "../core/memoryBank.js";
import type { MCPServerInterface } from "../types/mcpTypes.js";

/**
 * @deprecated Express-based MCP server implementation - replaced by STDIO transport
 * This class is kept for reference only and will throw errors if instantiated.
 */
export class MemoryBankMCPServer implements MCPServerInterface {
	private readonly memoryBank: MemoryBankService;
	private readonly port: number;

	constructor(
		private readonly context: vscode.ExtensionContext,
		port: number,
	) {
		this.port = port;
		this.memoryBank = new MemoryBankService(context);

		console.warn("⚠️ MemoryBankMCPServer is deprecated. Use MemoryBankMCPAdapter instead.");
	}

	public getPort(): number {
		return this.port;
	}

	public setExternalServerRunning(port: number): void {
		throw new Error("MemoryBankMCPServer is deprecated. Use MemoryBankMCPAdapter instead.");
	}

	public async start(): Promise<void> {
		throw new Error("MemoryBankMCPServer is deprecated. Use MemoryBankMCPAdapter instead.");
	}

	public stop(): void {
		throw new Error("MemoryBankMCPServer is deprecated. Use MemoryBankMCPAdapter instead.");
	}

	handleCommand(command: string, args: string[]): Promise<string> {
		throw new Error("MemoryBankMCPServer is deprecated. Use MemoryBankMCPAdapter instead.");
	}

	getMemoryBank(): MemoryBankService {
		return this.memoryBank;
	}

	async updateMemoryBankFile(fileType: string, content: string): Promise<void> {
		throw new Error("MemoryBankMCPServer is deprecated. Use MemoryBankMCPAdapter instead.");
	}
}
