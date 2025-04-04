# AI Memory

Easily manage AI context for your projects using the Memory Bank technique. This extension integrates with the Model Context Protocol (MCP) to provide structured AI interactions with Cursor.

> **Note:** This extension is designed to work exclusively with Cursor IDE, not with VS Code. (Maybe will add support for VSCode in the future)

## Features

- Creates and manages a collection of Memory Bank files to maintain context across AI interactions
- Seamlessly integrates with Cursor AI through the Model Context Protocol (MCP)
- Provides a simple interface for accessing and updating memory bank files
- Automatically configures Cursor's MCP integration settings for easy connection
- Helps maintain and access project context across different sessions

## Installation

### From Cursor Extension Panel (Recommended)

1. Open Cursor
2. Go to Extensions view (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "AI Memory" 
4. Click "Install"

### From VSIX File

1. Download the latest `.vsix` file from [GitHub releases](https://github.com/Ipenywis/aimemory/releases)
2. In Cursor, open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
3. Run "Extensions: Install from VSIX..." and select the downloaded file

## Setup and Usage

### Initial Setup

1. Install the extension (see above)
2. Create a workspace folder for your project (if you haven't already)
3. Run the `AI Memory: Start MCP` command from the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
4. The extension will:
   - Create a `memory-bank` folder in your workspace root if it doesn't exist
   - Start the MCP server (default port: 7331, fallback: 7332)
   - Automatically update your Cursor MCP configuration to connect to the server

### Memory Bank Structure

The extension creates and manages these core files in the `memory-bank` folder:

- `projectbrief.md`: Foundation document that shapes all other files
- `productContext.md`: Why this project exists, problems it solves, user experience goals
- `activeContext.md`: Current work focus, recent changes, next steps
- `systemPatterns.md`: System architecture, key technical decisions, design patterns
- `techContext.md`: Technologies used, development setup, technical constraints
- `progress.md`: What works, what's left to build, current status, known issues

### Using with Cursor AI

Once the MCP server is running, you can use AI Memory with Cursor in two ways:

1. **Direct interaction with Cursor AI**: Cursor will automatically access the memory bank context when you chat with it.

2. **Using `/memory` commands**: Type commands like `/memory status` in the Cursor chat to interact with your memory bank.

   Available commands:
   - `/memory status`: Check the status of the memory bank
   - `/memory list`: List all memory bank files
   - `/memory read <filename>`: Read a specific memory bank file

## Dashboard

Run the `AI Memory: Open Dashboard` command to open a dashboard interface for viewing and managing your memory bank files.

## Troubleshooting MCP Connections

If you experience issues connecting to the MCP server from Cursor:

1. **Check server status**: Ensure the server is running by visiting `http://localhost:7331/health` in your browser. You should see `{"status":"ok ok"}`.

2. **Port conflicts**: If port 7331 is in use, the extension will try port 7332. Check the extension output to see which port was actually used.

3. **Manual config update**: Run the `AI Memory: Update Cursor MCP Config` command to manually update the Cursor configuration.

4. **Connection issues**: If you see "Client closed" errors:
   - Make sure no firewalls are blocking localhost connections
   - Try restarting the MCP server with `AI Memory: Start MCP` again
   - Check the extension's output panel for error messages

For detailed troubleshooting steps, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [pnpm](https://pnpm.io/) (v8 or later)
- Cursor IDE for testing

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Ipenywis/aimemory.git
   cd aimemory
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Build the extension:
   ```bash
   pnpm run compile
   ```

### Development Workflow

1. Start the watch process for automatic rebuilding:
   ```bash
   pnpm run watch
   ```

2. Launch the extension in debug mode:
   - Press F5 in Cursor
   - Or run the "Run Extension" launch configuration

3. Test the extension:
   - Run commands from the Command Palette
   - Use `/memory` commands in Cursor AI

### Building VSIX Package

To package the extension for distribution:

```bash
pnpm run package
pnpm run package:vsce
```

The VSIX file will be created in the project root directory.

## License

Apache 2.0

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
