import * as path from "node:path";
import * as vscode from "vscode";
import { CursorRulesService } from "../lib/cursor-rules-service.js";
import { CURSOR_MEMORY_BANK_FILENAME, CURSOR_MEMORY_BANK_RULES_FILE } from "../lib/cursor-rules.js";
import type {
	AsyncResult,
	MemoryBank,
	MemoryBankError,
	MemoryBankFile,
	MemoryBankFileType,
	MemoryBankLogger,
} from "../types/types.js";
import { isSuccess } from "../types/types.js";
import { Logger } from "../utils/log.js";
import { MemoryBankServiceCore } from "./memoryBankServiceCore.js";

export class VSCodeMemoryBankService implements MemoryBank {
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
	async loadFiles(): AsyncResult<MemoryBankFileType[], MemoryBankError> {
		const result = await this.core.loadFiles();

		if (isSuccess(result)) {
			if (result.data.length > 0) {
				vscode.window.showInformationMessage(
					`Memory Bank repaired: ${result.data.length} file(s) created.`,
					{ modal: false },
				);
			}
			return result; // Return the success result
		}

		// Handle error case
		this.logger.error(`Failed to load memory bank: ${result.error.message}`);
		return result; // Return the error result
	}

	// Direct delegation to core (no additional logic needed)
	get files(): Map<MemoryBankFileType, MemoryBankFile> {
		return this.core.files;
	}

	async getIsMemoryBankInitialized(): AsyncResult<boolean, MemoryBankError> {
		return this.core.getIsMemoryBankInitialized();
	}

	async initializeFolders(): AsyncResult<void, MemoryBankError> {
		return this.core.initializeFolders();
	}

	isReady(): boolean {
		return this.core.isReady();
	}

	getFile(type: MemoryBankFileType): MemoryBankFile | undefined {
		this.logger.info(`getFile called for: ${type}`);
		return this.core.getFile(type);
	}

	async updateFile(
		type: MemoryBankFileType,
		content: string,
	): AsyncResult<void, MemoryBankError> {
		return this.core.updateFile(type, content);
	}

	getAllFiles(): MemoryBankFile[] {
		return this.core.getAllFiles();
	}

	getFilesWithFilenames(): string {
		return this.core.getFilesWithFilenames();
	}

	async checkHealth(): AsyncResult<string, MemoryBankError> {
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

	async writeFileByPath(
		relativePath: string,
		content: string,
	): AsyncResult<void, MemoryBankError> {
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
