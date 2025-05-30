import * as path from "node:path";
import * as vscode from "vscode";
import { CursorRulesService } from "../lib/cursor-rules-service.js";
import { CURSOR_MEMORY_BANK_FILENAME, CURSOR_MEMORY_BANK_RULES_FILE } from "../lib/cursor-rules.js";
import type {
	MemoryBank,
	MemoryBankFile,
	MemoryBankFileType,
	MemoryBankLogger,
} from "../types/types.js";
import { Logger } from "../utils/log.js";
import { MemoryBankServiceCore } from "./memoryBankServiceCore.js";

export class MemoryBankService implements MemoryBank {
	private readonly core: MemoryBankServiceCore;
	private readonly cursorRulesService: CursorRulesService;
	private readonly logger: Logger;

	constructor(private readonly context: vscode.ExtensionContext) {
		const memoryBankFolder = this.getMemoryBankFolder();
		const logger = this.createVSCodeLoggerAdapter();

		this.core = new MemoryBankServiceCore(memoryBankFolder, logger);
		this.cursorRulesService = new CursorRulesService(context);
		this.logger = Logger.getInstance();
	}

	// VS Code-specific methods
	async createMemoryBankRulesIfNotExists(): Promise<void> {
		await this.cursorRulesService.createRulesFile(
			CURSOR_MEMORY_BANK_FILENAME,
			CURSOR_MEMORY_BANK_RULES_FILE,
		);
	}

	// Delegate to core with VS Code-specific error handling
	async loadFiles(): Promise<MemoryBankFileType[]> {
		try {
			const createdFiles = await this.core.loadFiles();

			if (createdFiles.length > 0) {
				vscode.window.showInformationMessage(
					`Memory Bank repaired: ${createdFiles.length} file(s) created.`,
					{ modal: false },
				);
			}

			return createdFiles;
		} catch (error) {
			this.logger.error(
				`Failed to load memory bank: ${error instanceof Error ? error.message : String(error)}`,
			);
			throw error;
		}
	}

	// Direct delegation to core (no additional logic needed)
	get files(): Map<MemoryBankFileType, MemoryBankFile> {
		return this.core.files;
	}

	async getIsMemoryBankInitialized(): Promise<boolean> {
		return this.core.getIsMemoryBankInitialized();
	}

	async initializeFolders(): Promise<void> {
		return this.core.initializeFolders();
	}

	isReady(): boolean {
		return this.core.isReady();
	}

	getFile(type: MemoryBankFileType): MemoryBankFile | undefined {
		return this.core.getFile(type);
	}

	async updateFile(type: MemoryBankFileType, content: string): Promise<void> {
		return this.core.updateFile(type, content);
	}

	getAllFiles(): MemoryBankFile[] {
		return this.core.getAllFiles();
	}

	getFilesWithFilenames(): string {
		return this.core.getFilesWithFilenames();
	}

	async checkHealth(): Promise<string> {
		return this.core.checkHealth();
	}

	invalidateCache(filePath?: string): void {
		this.core.invalidateCache(filePath);
	}

	getCacheStats() {
		return this.core.getCacheStats();
	}

	resetCacheStats(): void {
		this.core.resetCacheStats();
	}

	async writeFileByPath(relativePath: string, content: string): Promise<void> {
		return this.core.writeFileByPath(relativePath, content);
	}

	// Private helper methods
	private getMemoryBankFolder(): string {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			throw new Error("No workspace folder found");
		}
		return path.join(workspaceFolders[0].uri.fsPath, ".aimemory", "memory-bank");
	}

	private createVSCodeLoggerAdapter(): MemoryBankLogger {
		const logger = Logger.getInstance();
		return {
			info: (message: string) => logger.info(message),
			error: (message: string) => logger.error(message),
			warn: (message: string) => logger.info(message), // Map to info since VSCode Logger lacks warn
			debug: (message: string) => logger.debug(message),
		};
	}
}
