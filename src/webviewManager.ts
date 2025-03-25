import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { CURSOR_MEMORY_BANK_RULES_FILE } from "./lib/cursor-rules";
import { CursorRulesService } from "./lib/cursor-rules-service";
import { MemoryBankService } from "./memoryBank";

export class WebviewManager {
  private panel: vscode.WebviewPanel | undefined;
  private readonly extensionUri: vscode.Uri;
  private memoryBankService: MemoryBankService;
  private cursorRulesService: CursorRulesService;

  constructor(private context: vscode.ExtensionContext) {
    this.extensionUri = context.extensionUri;
    this.memoryBankService = new MemoryBankService(context);
    this.cursorRulesService = new CursorRulesService(context);
  }

  public openWebview() {
    // If we already have a panel, show it
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    // Create and show a new webview panel
    this.panel = vscode.window.createWebviewPanel(
      "aiMemoryWebview", // Identifies the type of the webview
      "AI Memory", // Title displayed in the UI
      vscode.ViewColumn.One, // Editor column to show the webview in
      {
        // Enable scripts in the webview
        enableScripts: true,
        // Restrict the webview to only load resources from the extension's directory
        localResourceRoots: [
          this.extensionUri,
          vscode.Uri.parse("http://localhost:5173"),
        ],
        // Retain the webview when it becomes hidden
        retainContextWhenHidden: true,
      }
    );

    // Set the webview's HTML content
    this.panel.webview.html = this.getWebviewContent(this.panel.webview);

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        console.log("Received message in extension:", message);
        switch (message.type) {
          case "getRulesStatus":
            await this.getRulesStatus();
            break;
          case "resetRules":
            await this.resetRules();
            break;
        }
      },
      undefined,
      this.context.subscriptions
    );

    // Clean up resources when the panel is closed
    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
      },
      null,
      this.context.subscriptions
    );

    // Initial status check
    setTimeout(async () => {
      await this.getRulesStatus();
    }, 500);
  }

  private async getRulesStatus() {
    if (!this.panel) {
      return;
    }

    // Check if Cursor rules file exists in workspace
    const workspaceFolders = vscode.workspace.workspaceFolders;
    console.log("Getting rules status for workspace", workspaceFolders);
    if (!workspaceFolders) {
      this.panel.webview.postMessage({
        type: "rulesStatus",
        initialized: false,
      });
      return;
    }

    const cursorRulesPath = path.join(
      workspaceFolders[0].uri.fsPath,
      ".cursor/rules/memory-bank.mdc"
    );

    let initialized = false;
    try {
      // Check if file exists
      await vscode.workspace.fs.stat(vscode.Uri.file(cursorRulesPath));
      initialized = true;
    } catch (error) {
      initialized = false;
    }

    console.log("Sending rules status:", initialized);
    // Send status to webview
    this.panel.webview.postMessage({
      type: "rulesStatus",
      initialized,
    });
  }

  private async resetRules() {
    if (!this.panel) {
      return;
    }

    try {
      // Reset rules by overwriting with original content
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        throw new Error("No workspace folder found");
      }

      // Create rules file with original content (overwriting existing if it exists)
      await this.cursorRulesService.createRulesFile(
        "memory-bank.mdc",
        CURSOR_MEMORY_BANK_RULES_FILE
      );

      // Send success message
      this.panel.webview.postMessage({
        type: "resetRulesResult",
        success: true,
      });
    } catch (error) {
      console.error("Error resetting rules:", error);

      // Send error message
      this.panel.webview.postMessage({
        type: "resetRulesResult",
        success: false,
      });
    }
  }

  private getWebviewContent(webview: vscode.Webview): string {
    // Get path to dist folder for webview assets
    const distPath = path.join(this.extensionUri.fsPath, "dist", "webview");

    // Check if dist folder exists (production build)
    if (fs.existsSync(distPath)) {
      // Get paths to JS & CSS files
      const scriptPathOnDisk = path.join(distPath, "assets", "index.js");
      const stylePathOnDisk = path.join(distPath, "assets", "index.css");

      // Convert paths to webview URIs
      const scriptUri = webview.asWebviewUri(vscode.Uri.file(scriptPathOnDisk));
      const styleUri = webview.asWebviewUri(vscode.Uri.file(stylePathOnDisk));

      // Create HTML with production assets
      return `<!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="${styleUri}" rel="stylesheet">
          <title>AI Memory</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" src="${scriptUri}"></script>
        </body>
        </html>`;
    } else {
      // For development, using direct access to localhost is problematic due to CORS restrictions
      // We'll use a fully standalone development UI with a mock VSCode API
      return `<!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>AI Memory</title>
          <style>
            body, html {
              margin: 0;
              padding: 0;
              height: 100%;
              overflow: hidden;
            }
            .dev-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              font-family: system-ui, sans-serif;
              color: #333;
              background-color: #f5f5f5;
            }
            .button {
              background-color: #0078d4;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 16px;
              margin-top: 20px;
            }
            .button:hover {
              background-color: #005a9e;
            }
          </style>
        </head>
        <body>
          <div class="dev-container">
            <h1>AI Memory Extension Development Mode</h1>
            <p>Please use the Vite development server:</p>
            <a class="button" href="http://localhost:5173" target="_blank">Open Dev Server</a>
            <p style="margin-top: 20px;">
              Run this command to start the dev server:
              <br>
              <code>cd src/webview && pnpm run dev</code>
            </p>
          </div>
        </body>
        </html>`;
    }
  }
}
