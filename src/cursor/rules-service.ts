import { join } from "node:path";
import { type ExtensionContext, FileType, Uri, window, workspace } from "vscode";
import { createLogger } from "../lib/logging";
import type { Logger } from "../types/logging";

export class CursorRulesService {
	private readonly cursorRulesPath = ".cursor/rules/";
	private readonly logger: Logger;

	constructor(private readonly context: ExtensionContext) {
		this.logger = createLogger({ component: "CursorRulesService" });
	}

	async createRulesFile(filename: string, ruleContent: string): Promise<void> {
		const workspaceRoot = this.getWorkspaceRoot();
		if (!workspaceRoot) return;

		const rulesDir = join(workspaceRoot, this.cursorRulesPath);
		await this.ensureDirectoryExists(rulesDir);

		const ruleFileUri = Uri.file(join(rulesDir, filename));

		const shouldProceed = await this.checkFileOverwrite(ruleFileUri, filename);
		if (!shouldProceed) return;

		await this.writeRuleFile(ruleFileUri, ruleContent);
	}

	async readRulesFile(
		filename: string,
	): Promise<{ success: true; data: string } | { success: false; error: string }> {
		try {
			const workspaceRoot = this.getWorkspaceRoot();
			if (!workspaceRoot) {
				return { success: false, error: "No workspace folder found" };
			}

			const ruleFileUri = Uri.file(join(workspaceRoot, this.cursorRulesPath, filename));
			const fileContent = await workspace.fs.readFile(ruleFileUri);
			const content = new TextDecoder().decode(fileContent);

			return { success: true, data: content };
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return {
				success: false,
				error: `Failed to read rules file: ${errorMessage}`,
			};
		}
	}

	async deleteRulesFile(filename: string): Promise<void> {
		try {
			const workspaceRoot = this.getWorkspaceRoot();
			if (!workspaceRoot) return;

			const ruleFileUri = Uri.file(join(workspaceRoot, this.cursorRulesPath, filename));
			await workspace.fs.delete(ruleFileUri);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to delete rules file: ${errorMessage}`);
		}
	}

	async listAllRulesFilesInfo(): Promise<Array<{ name: string; lastUpdated?: Date }>> {
		try {
			const workspaceRoot = this.getWorkspaceRoot();
			if (!workspaceRoot) return [];

			const rulesDir = Uri.file(join(workspaceRoot, this.cursorRulesPath));

			try {
				const files = await workspace.fs.readDirectory(rulesDir);
				const mdcFiles = files
					.filter(([name, type]) => type === FileType.File && name.endsWith(".mdc"))
					.map(([name]) => ({ name })); // Could add stat info later if needed

				return mdcFiles;
			} catch {
				// Directory doesn't exist
				return [];
			}
		} catch (error) {
			this.logger.error("Error listing rules files", {
				error: error instanceof Error ? error.message : String(error),
				operation: "listAllRulesFilesInfo",
			});
			return [];
		}
	}

	private getWorkspaceRoot(): string | null {
		const workspaceFolders = workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			window.showErrorMessage("No workspace folder found, please open a workspace first");
			return null;
		}
		const firstFolder = workspaceFolders[0];
		if (!firstFolder) {
			window.showErrorMessage("No workspace folder found, please open a workspace first");
			return null;
		}
		return firstFolder.uri.fsPath;
	}

	private async checkFileOverwrite(fileUri: Uri, filename: string): Promise<boolean> {
		try {
			await workspace.fs.stat(fileUri);
			// File exists, ask for confirmation
			const result = await window.showWarningMessage(
				`The file ${filename} already exists in .cursor/rules/. Overwrite?`,
				{ modal: true },
				"Yes",
				"No",
			);

			if (result !== "Yes") {
				window.showInformationMessage(`Skipped creating ${filename}.`);
				return false;
			}
			return true;
		} catch {
			// File doesn't exist, proceed without confirmation
			return true;
		}
	}

	private async writeRuleFile(fileUri: Uri, content: string): Promise<void> {
		try {
			this.logger.debug("Creating cursor rules file", {
				filePath: fileUri.fsPath,
				operation: "writeRuleFile",
			});
			const encodedContent = new TextEncoder().encode(content);
			await workspace.fs.writeFile(fileUri, encodedContent);
		} catch (error) {
			this.logger.error("Error writing cursor rules file", {
				filePath: fileUri.fsPath,
				error: error instanceof Error ? error.message : String(error),
				operation: "writeRuleFile",
			});
			throw new Error(`Failed to write rules file: ${error}`);
		}
	}

	private async ensureDirectoryExists(dirPath: string): Promise<void> {
		try {
			await workspace.fs.createDirectory(Uri.file(dirPath));
			this.logger.debug("Ensured directory exists", {
				dirPath,
				operation: "ensureDirectoryExists",
			});
		} catch (error) {
			this.logger.error("Failed to create directory", {
				dirPath,
				error: error instanceof Error ? error.message : String(error),
				operation: "ensureDirectoryExists",
			});
			throw new Error(`Failed to create rules directory: ${error}`);
		}
	}
}
