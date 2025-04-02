import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";
import * as vscode from "vscode";

/**
 * Updates the Cursor MCP config to point to our MCP server
 */
export async function updateCursorMCPConfig(port: number): Promise<void> {
  try {
    const homeDir = os.homedir();
    const mcpConfigPath = path.join(homeDir, ".cursor", "mcp.json");

    // Create our server config object
    const ourServer = {
      name: "AI Memory",
      url: `http://localhost:${port}/sse`,
    };

    // Ensure .cursor directory exists
    const cursorDir = path.join(homeDir, ".cursor");
    try {
      await fs.mkdir(cursorDir, { recursive: true });
    } catch (err) {
      // Directory might already exist, which is fine
    }

    // Check if the config file already exists
    let existingConfig: {
      mcpServers?: Record<string, { name: string; url: string }>;
    } = {};
    let fileExists = false;

    try {
      const fileContent = await fs.readFile(mcpConfigPath, "utf-8");
      existingConfig = JSON.parse(fileContent);
      fileExists = true;
    } catch (err) {
      // File doesn't exist or isn't valid JSON, we'll create it
      console.log(
        "Config file doesn't exist or isn't valid, will create new one"
      );
      existingConfig = { mcpServers: {} };
    }

    // Initialize mcpServers object if it doesn't exist
    if (!existingConfig.mcpServers) {
      existingConfig.mcpServers = {};
    }

    // Check if our server is already in the configuration with the same URL
    const existingEntry = existingConfig.mcpServers["AI Memory"];
    const urlMatches = existingEntry && existingEntry.url === ourServer.url;

    if (!existingEntry || !urlMatches) {
      // Add/update our server in the configuration
      existingConfig.mcpServers["AI Memory"] = ourServer;

      // Write the updated config
      await fs.writeFile(
        mcpConfigPath,
        JSON.stringify(existingConfig, null, 2)
      );

      vscode.window.showInformationMessage(
        `Cursor MCP config updated to use AI Memory server on port ${port}`
      );
    } else {
      console.log("AI Memory server already configured in Cursor MCP config");
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to update Cursor MCP config: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
