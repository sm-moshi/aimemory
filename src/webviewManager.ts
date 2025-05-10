import * as vscode from "vscode";
import * as path from "node:path";
import * as fs from "node:fs";
import { CURSOR_MEMORY_BANK_RULES_FILE } from "./lib/cursor-rules";
import { CursorRulesService } from "./lib/cursor-rules-service";
import { MemoryBankService } from "./memoryBank";
import type { MemoryBankMCPServer } from "./mcpServer";
import * as http from "node:http";
import * as crypto from "node:crypto";
import * as fsPromises from 'node:fs/promises';

// Utility to extract MCP server ports from .cursor/mcp.json
async function getMCPPortsFromConfig(workspaceRoot: string): Promise<number[]> {
  try {
    const configPath = path.join(workspaceRoot, '.cursor', 'mcp.json');
    const configRaw = await fsPromises.readFile(configPath, 'utf-8');
    const config = JSON.parse(configRaw);
    const ports: number[] = [];
    if (!config || !config.mcpServers) {return ports;}
    for (const key of Object.keys(config.mcpServers)) {
      const server = config.mcpServers[key];
      if (server && typeof server.url === 'string') {
        // Try to extract port from URL (e.g., http://localhost:PORT/sse)
        const match = server.url.match(/:(\d+)(?:\/|$)/);
        if (match && match[1]) {
          ports.push(Number(match[1]));
        }
      } else if (server && Array.isArray(server.args)) {
        // Heuristic: look for a numeric arg that could be a port
        for (let i = 0; i < server.args.length; i++) {
          const arg = server.args[i];
          const port = Number(arg);
          if (!Number.isNaN(port) && port > 1024 && port < 65536) {
            ports.push(port);
          }
        }
      }
    }
    return ports;
  } catch {
    // If config not found or parse error, fallback
    return [];
  }
}

export class WebviewManager {
  private panel: vscode.WebviewPanel | undefined;
  private readonly extensionUri: vscode.Uri;
  private memoryBankService: MemoryBankService;
  private cursorRulesService: CursorRulesService;

  constructor(
    private context: vscode.ExtensionContext,
    private mcpServer: MemoryBankMCPServer
  ) {
    this.extensionUri = context.extensionUri;
    this.memoryBankService = new MemoryBankService(context);
    this.cursorRulesService = new CursorRulesService(context);
  }

  // Checks if an MCP server is already running on a specific port
  private async checkServerHealth(port: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const request = http.get(`http://localhost:${port}/health`, (res) => {
        let data = "";

        // A chunk of data has been received
        res.on("data", (chunk) => {
          data += chunk;
        });

        // The whole response has been received
        res.on("end", () => {
          try {
            if (res.statusCode === 200) {
              const parsedData = JSON.parse(data);
              if (parsedData.status === "ok ok") {
                console.log(`Server found running on port ${port}`);
                resolve(true);
                return;
              }
            }
            resolve(false);
          } catch (e) {
            console.error("Error parsing JSON:", e);
            resolve(false);
          }
        });
      });

      request.on("error", (error) => {
        console.log(`No server running on port ${port}: ${error.message}`);
        resolve(false);
      });

      // Set timeout to avoid hanging
      request.setTimeout(1000, () => {
        console.log(`Request to port ${port} timed out`);
        request.destroy();
        resolve(false);
      });
    });
  }

  // Check standard ports for already running MCP servers
  private async checkForRunningServers() {
    // Try to get ports from .cursor/mcp.json, fallback to defaults
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
    let portsToCheck = await getMCPPortsFromConfig(workspaceRoot);
    if (!portsToCheck.length) {
      // Fallback to default ports if config not found or empty
      portsToCheck = [7331, 7332]; // Same as DEFAULT_MCP_PORT and ALTERNATIVE_MCP_PORT
    }

    for (const port of portsToCheck) {
      const isRunning = await this.checkServerHealth(port);
      if (isRunning) {
        // Update the server state
        this.mcpServer.setExternalServerRunning(port);

        // Update the webview if it's open
        setTimeout(() => {
          if (this.panel) {
            this.panel.webview.postMessage({
              type: "MCPServerStatus",
              status: "started",
              port,
            });
          }
        }, 300);

        return true;
      }
    }

    return false;
  }

  public async openWebview() {
    // Check for running servers first
    await this.checkForRunningServers();

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
        // Restrict the webview to only load resources from the extension's directory and Vite dev server
        localResourceRoots: [
          vscode.Uri.joinPath(this.extensionUri, 'dist'), // Allow access to the main dist folder
          vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview'), // Explicitly allow webview assets
          vscode.Uri.parse("http://localhost:5173"), // Allow Vite dev server (HMR)
        ],
        // Retain the webview when it becomes hidden
        retainContextWhenHidden: true,
      }
    );

    // Set the webview's HTML content
    this.panel.webview.html = this.getWebviewContent(this.panel.webview);

    console.log("Handlig message");

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        console.log("Received message in extension:", message);
        switch (message.command) {
          case "getRulesStatus":
            await this.getRulesStatus();
            break;
          case "resetRules":
            await this.resetRules();
            break;
          case "requestMemoryBankStatus":
            console.log("Requesting...");
            await this.getMemoryBankStatus();
            break;
          case "serverAlreadyRunning":
            // Update our internal tracking that a server is already running
            console.log(`Server already running on port ${message.port}`);
            this.mcpServer.setExternalServerRunning(message.port);
            this.panel?.webview.postMessage({
              type: "MCPServerStatus",
              status: "started",
              port: message.port,
            });
            break;
          case "startMCPServer":
            await this.mcpServer.start();
            this.panel?.webview.postMessage({
              type: "MCPServerStatus",
              status: "started",
              port: this.mcpServer.getPort(),
            });
            break;
          case "stopMCPServer":
            await this.mcpServer.stop();
            this.panel?.webview.postMessage({
              type: "MCPServerStatus",
              status: "stopped",
            });
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

  private async getMemoryBankStatus() {
    console.log("Here1");
    if (!this.panel) {
      return;
    }

    const isInitialized =
      await this.memoryBankService.getIsMemoryBankInitialized();

    console.log("Sending memory bank status:", isInitialized);

    this.panel.webview.postMessage({
      type: "memoryBankStatus",
      initialized: isInitialized,
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

  /**
   * Generates the HTML content for the webview, ensuring CSP compliance and secure asset loading.
   * - Uses a strong nonce for scripts.
   * - Loads all assets via webview.asWebviewUri.
   * - CSP allows only required sources (scripts, styles, connect to MCP, images, fonts).
   * - No unsafe-inline for scripts; only for styles if absolutely necessary.
   * - All asset URIs are resolved at runtime for VSCode compatibility.
   */
  private getWebviewContent(webview: vscode.Webview): string {
    // Generate a nonce for CSP
    const nonce = crypto.randomBytes(16).toString('base64');

    // Get path to dist folder for webview assets
    const distPath = path.join(this.extensionUri.fsPath, "dist", "webview");

    // Get paths to JS & CSS files
    const scriptPathOnDisk = path.join(distPath, "assets", "index.js");
    const stylePathOnDisk = path.join(distPath, "assets", "index.css");

    // Convert paths to webview URIs
    const scriptUri = webview.asWebviewUri(vscode.Uri.file(scriptPathOnDisk));
    const styleUri = webview.asWebviewUri(vscode.Uri.file(stylePathOnDisk));

    // Define Content Security Policy
    // Allows scripts with the correct nonce, styles from webview, and connections to localhost for the MCP server.
    // No unsafe-inline for scripts. Only allow inline styles if absolutely necessary (here, only for Tailwind JIT, otherwise remove).
    const mcpPort = this.mcpServer.getPort(); // Get the current MCP port
    const csp = [
      "default-src 'none'", // Block all by default
      `style-src ${webview.cspSource} 'unsafe-inline'`, // Allow styles from webview and inline (Tailwind JIT needs this)
      `script-src 'nonce-${nonce}'`, // Only allow scripts with this nonce
      `connect-src http://localhost:${mcpPort}`, // Only allow connecting to MCP server
      `img-src ${webview.cspSource} data:`, // Allow images from webview and data URIs
      `font-src ${webview.cspSource}` // Allow fonts from webview
    ].join('; ');

    // Return HTML with strict CSP and correct asset URIs
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${styleUri}" rel="stylesheet">
  <title>AI Memory</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${scriptUri}" nonce="${nonce}"></script>
</body>
</html>`;
  }

  public getWebviewPanel(): vscode.WebviewPanel | undefined {
    return this.panel;
  }
}
