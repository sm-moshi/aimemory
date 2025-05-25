import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";

export class CursorRulesService {
	private cursorRulesPath = ".cursor/rules/";

	constructor(private context: vscode.ExtensionContext) {}

	async createRulesFile(filename: string, ruleContent: string) {
		try {
			const workspaceFolders = vscode.workspace.workspaceFolders;

			if (!workspaceFolders) {
				vscode.window.showErrorMessage(
					"No workspace folder found, please open a workspace first",
				);
				return;
			}

			const cursorRulesPath = path.join(workspaceFolders[0].uri.fsPath, this.cursorRulesPath);

			console.log("cursorRulesPath", cursorRulesPath);

			// Create directory if it doesn't exist
			await this.ensureDirectoryExists(cursorRulesPath);

			const rulePath = path.join(cursorRulesPath, filename);

			// Check if file exists, safely
			let fileExists = false;
			try {
				await vscode.workspace.fs.stat(vscode.Uri.file(rulePath));
				fileExists = true;
			} catch (error) {
				// File doesn't exist, which is fine
				fileExists = false;
			}

			if (fileExists) {
				// File already exists, ask the user to overwrite
				const result = await vscode.window.showWarningMessage(
					`The file ${filename} already exists in .cursor/rules/. Overwrite?`,
					{ modal: true },
					"Yes",
					"No",
				);
				if (result !== "Yes") {
					// User chose not to overwrite
					return;
				}
			}

			console.log("Creating cursor rules file");
			const encodedRuleContent = new TextEncoder().encode(ruleContent);
			await vscode.workspace.fs.writeFile(vscode.Uri.file(rulePath), encodedRuleContent);
		} catch (error) {
			console.error("Error creating cursor rules file", error);
			throw error; // Rethrow error to be handled by caller
		}
	}

	private async ensureDirectoryExists(dirPath: string): Promise<void> {
		try {
			await vscode.workspace.fs.stat(vscode.Uri.file(dirPath));
			// Directory exists, do nothing
		} catch (error) {
			// Directory doesn't exist, create it
			console.log("Creating directory:", dirPath);
			try {
				await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));
			} catch (createError) {
				console.error("Error creating directory:", createError);
				throw createError;
			}
		}
	}
}
