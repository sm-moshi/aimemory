import type { ChildProcess } from "node:child_process";
import { createLogger } from "./logging";

interface MCPRequestEnvelope {
	id: number;
	tool: string;
	args: unknown;
}

interface MCPResponseEnvelope {
	id: number;
	success: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: Generic arbitrary payload from MCP server
	data?: any;
	// biome-ignore lint/suspicious/noExplicitAny: Generic arbitrary payload from MCP server
	error?: any;
}

export class StdioClient {
	private readonly child: ChildProcess;
	private readonly logger = createLogger({ component: "StdioClient" });
	private idCounter = 1;
	// biome-ignore lint/suspicious/noExplicitAny: Promise resolver cache
	private readonly pending: Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }> = new Map();

	constructor(child: ChildProcess) {
		this.child = child;
		if (!child.stdout) {
			throw new Error("Child process stdout not available – cannot create StdioClient");
		}
		child.stdout.setEncoding("utf8");
		let buffer = "";
		child.stdout.on("data", chunk => {
			buffer += chunk;
			let newlineIndex: number = buffer.indexOf("\n");
			while (newlineIndex !== -1) {
				const line = buffer.slice(0, newlineIndex).trim();
				buffer = buffer.slice(newlineIndex + 1);
				if (line !== "") this.handleLine(line);
				newlineIndex = buffer.indexOf("\n");
			}
		});
	}

	private handleLine(line: string) {
		try {
			const msg = JSON.parse(line) as MCPResponseEnvelope;
			const entry = this.pending.get(msg.id);
			if (!entry) return;
			this.pending.delete(msg.id);
			if (msg.success) entry.resolve(msg.data);
			else entry.reject(new Error(msg.error ?? "Unknown MCP error"));
		} catch (_err) {
			this.logger.warn(`Failed to parse MCP line: ${line}`);
		}
	}

	async callTool<T = unknown>(tool: string, args: unknown): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const id = this.idCounter++;
			this.pending.set(id, { resolve, reject });
			const envelope: MCPRequestEnvelope = { id, tool, args };
			this.child.stdin?.write(`${JSON.stringify(envelope)}\n`);
		});
	}

	isConnected(): boolean {
		return !this.child.killed;
	}

	dispose(): void {
		this.pending.forEach(p => p.reject(new Error("Client disposed")));
		this.pending.clear();
	}
}
