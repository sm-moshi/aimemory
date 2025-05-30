import { join } from "node:path";
import { type ExtensionContext, Uri, window, workspace } from "vscode";

export class CursorRulesService {
	private readonly cursorRulesPath = ".cursor/rules/";

	constructor(private readonly context: ExtensionContext) {}

	async createRulesFile(filename: string, ruleContent: string) {
		try {
			const workspaceFolders = workspace.workspaceFolders;

			if (!workspaceFolders) {
				window.showErrorMessage("No workspace folder found, please open a workspace first");
				return;
			}

			const cursorRulesPath = join(workspaceFolders[0].uri.fsPath, this.cursorRulesPath);

			console.log("cursorRulesPath", cursorRulesPath);

			// Create directory if it doesn't exist
			await this.ensureDirectoryExists(cursorRulesPath);

			const rulePath = join(cursorRulesPath, filename);
			const rulePathUri = Uri.file(rulePath);

			try {
				await workspace.fs.stat(rulePathUri); // Check if file exists
				// File exists, ask to overwrite
				const result = await window.showWarningMessage(
					`The file ${filename} already exists in .cursor/rules/. Overwrite?`,
					{ modal: true },
					"Yes",
					"No",
				);
				if (result !== "Yes") {
					window.showInformationMessage(`Skipped creating ${filename}.`);
					return; // User chose not to overwrite
				}
				// If we reach here, user selected "Yes" to overwrite.
			} catch (error) {
				// Assuming error from stat means file doesn't exist, which is fine.
				// We can proceed to write without confirmation.
			}

			// If we've reached this point, either the file didn't exist or the user agreed to overwrite.
			console.log("Creating cursor rules file");
			const encodedRuleContent = new TextEncoder().encode(ruleContent);
			await workspace.fs.writeFile(rulePathUri, encodedRuleContent);
		} catch (error) {
			console.error("Error creating cursor rules file", error);
			throw error; // Rethrow error to be handled by caller
		}
	}

	private async ensureDirectoryExists(dirPath: string): Promise<void> {
		try {
			// workspace.fs.createDirectory is expected to be idempotent (like mkdir -p)
			// and create parent directories if they don't exist.
			await workspace.fs.createDirectory(Uri.file(dirPath));
			console.log("Ensured directory exists (or was created):", dirPath);
		} catch (error) {
			// Log and rethrow any unexpected error (e.g., permissions, path is a file)
			console.error(`Failed to ensure directory ${dirPath}:`, error);
			throw error;
		}
	}
}
