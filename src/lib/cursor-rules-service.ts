import path from "node:path";
import fs from "node:fs/promises";
import * as vscode from "vscode";

export class CursorRulesService {
  private cursorRulesPath = ".cursor/rules/";

  constructor(private context: vscode.ExtensionContext) {}

  async createRulesFile(filename: string, ruleContent: string) {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
      vscode.window.showErrorMessage(
        "No workspace folder found, please open a workspace first"
      );
      return;
    }

    const cursorRulesPath = path.join(
      workspaceFolders[0].uri.fsPath,
      this.cursorRulesPath
    );

    if (!(await fs.stat(cursorRulesPath)).isDirectory()) {
      await fs.mkdir(cursorRulesPath, { recursive: true });
    }

    const rulePath = path.join(cursorRulesPath, filename);

    if (await fs.stat(rulePath)) {
      // File already exists, do nothing
      //TODO: Ask the user to overwrite the file?
      return;
    }

    const encodedRuleContent = new TextEncoder().encode(ruleContent);
    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(rulePath),
      encodedRuleContent
    );
  }
}
