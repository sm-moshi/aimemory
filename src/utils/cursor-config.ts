import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";

/**
 * Updates the Cursor MCP config to point to our MCP server (STDIO mode)
 */
export async function updateCursorMCPConfig(extensionPath: string): Promise<void> {
	try {
		const homeDir = os.homedir();
		const mcpConfigPath = path.join(homeDir, ".cursor", "mcp.json");

		// Get the workspace path
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			vscode.window.showErrorMessage(
				"AI Memory: No workspace folder found. Cannot update MCP config.",
			);
			return;
		}
		const workspacePath = workspaceFolders[0].uri.fsPath;

		// Create our STDIO server config object
		const ourServerConfig = {
			name: "AI Memory",
			command: "node",
			args: [path.join(extensionPath, "dist", "index.cjs"), workspacePath],
			cwd: extensionPath,
		};

		// Ensure .cursor directory exists
		const cursorDir = path.join(homeDir, ".cursor");
		try {
			await fs.mkdir(cursorDir, { recursive: true });
		} catch (err) {
			// If the error is something other than the directory already existing (though recursive helps),
			// it might be useful to log it. For now, we assume recursive: true handles most cases.
			// We'll log if it's an unexpected error.
			if (err instanceof Error && (err as NodeJS.ErrnoException).code !== "EEXIST") {
				console.warn(
					`[AI Memory] Unexpected error creating .cursor directory: ${err.message}`,
				);
			}
		}

		// Check if the config file already exists
		let existingConfig: {
			mcpServers?: Record<
				string,
				{ name: string; url?: string; command?: string; args?: string[]; cwd?: string }
			>;
		} = {};

		try {
			const fileContent = await fs.readFile(mcpConfigPath, "utf-8");
			existingConfig = JSON.parse(fileContent);
		} catch (err) {
			if (err instanceof Error && (err as NodeJS.ErrnoException).code === "ENOENT") {
				console.log("[AI Memory] Config file doesn't exist, will create new one.");
			} else {
				console.warn(
					`[AI Memory] Config file couldn't be read or parsed (error: ${err instanceof Error ? err.message : String(err)}), creating new one.`,
				);
			}
			existingConfig = { mcpServers: {} };
		}

		existingConfig.mcpServers ??= {};

		const existingEntry = existingConfig.mcpServers["AI Memory"];
		let configMatches = false;
		if (
			existingEntry &&
			existingEntry.command === ourServerConfig.command &&
			existingEntry.cwd === ourServerConfig.cwd &&
			JSON.stringify(existingEntry.args) === JSON.stringify(ourServerConfig.args)
		) {
			configMatches = true;
		}

		if (!configMatches) {
			existingConfig.mcpServers["AI Memory"] = ourServerConfig;
			await fs.writeFile(mcpConfigPath, JSON.stringify(existingConfig, null, 2));
			vscode.window.showInformationMessage(
				"Cursor MCP config updated for AI Memory (STDIO).",
			);
		} else {
			console.log("AI Memory server already configured in Cursor MCP config (STDIO).");
		}
	} catch (error) {
		vscode.window.showErrorMessage(
			`Failed to update Cursor MCP config: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
}
