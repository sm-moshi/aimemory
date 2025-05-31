import { join } from "node:path";
import { type ExtensionContext, Uri, window, workspace } from "vscode";

export class CursorRulesService {
	private readonly cursorRulesPath = ".cursor/rules/";

	constructor(private readonly context: ExtensionContext) {}

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

	private getWorkspaceRoot(): string | null {
		const workspaceFolders = workspace.workspaceFolders;
		if (!workspaceFolders) {
			window.showErrorMessage("No workspace folder found, please open a workspace first");
			return null;
		}
		return workspaceFolders[0].uri.fsPath;
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
			console.log("Creating cursor rules file:", fileUri.fsPath);
			const encodedContent = new TextEncoder().encode(content);
			await workspace.fs.writeFile(fileUri, encodedContent);
		} catch (error) {
			console.error("Error writing cursor rules file:", error);
			throw new Error(`Failed to write rules file: ${error}`);
		}
	}

	private async ensureDirectoryExists(dirPath: string): Promise<void> {
		try {
			await workspace.fs.createDirectory(Uri.file(dirPath));
			console.log("Ensured directory exists:", dirPath);
		} catch (error) {
			console.error(`Failed to create directory ${dirPath}:`, error);
			throw new Error(`Failed to create rules directory: ${error}`);
		}
	}
}
