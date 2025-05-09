# AI Memory Extension for Cursor

## Overview

AI Memory is a modular, robust, and user-friendly extension for Cursor (0.49+), designed to provide memory superpowers to LLMs and agents. It features a modern webview, a stable MCP server, and a fully modular memory-bank system.

---

## 🚀 New Features (as of 2024-05-09)

### 🟢 Webview Controls
- **Initialize Memory Bank**: One-click button in the webview to initialise the memory bank, ensuring all required files and structure are created.
- **Update Memory Bank**: One-click button to update any memory bank file directly from the webview, without interrupting your chat or workflow.
- **Feedback & Error Handling**: All actions provide clear feedback and robust error messages, so you always know the state of your memory bank.

### 🟢 Modular & Robust Backend
- **Async, non-blocking memory-bank**: All file operations are async, with explicit readiness checks and error handling.
- **MCP server integration**: All endpoints/tools check memory-bank readiness and fail gracefully if not initialised.
- **Automatic port failover**: MCP server will try alternative ports if the default is in use.

---

## 🛠 How to Use

1. **Start the MCP Server**
   - Open the extension webview in Cursor.
   - Click **Start MCP Server**.

2. **Initialize the Memory Bank**
   - Click **Initialize Memory Bank**.
   - The extension will create all required files and structure. Feedback will be shown in the UI.

3. **Update the Memory Bank**
   - Click **Update Memory Bank**.
   - Enter the file type (e.g. `projectbrief.md`) and the new content in the prompts.
   - The file will be updated and feedback will be shown.

4. **Agent Chat & Tools**
   - The Agent Chat and MCP tools now interact with the memory bank in a robust, modular way.
   - Errors (e.g. memory bank not ready) are shown clearly in the UI and logs.

---

## 🧩 Project Structure
- **src/memoryBank.ts**: Modular, async memory bank logic.
- **src/mcpServer.ts**: Robust MCP server with readiness checks and error handling.
- **src/webview/src/components/mcp-server-manager/index.tsx**: Webview UI for server and memory bank controls.

---

## 📝 Changelog
- 2024-05-09: Added webview buttons for memory bank initialisation and update. Improved backend modularity and error handling. 🐹

---

## 🦾 Best Practices
- Use the webview controls for all memory bank actions.
- If you see errors, check the feedback in the webview and the extension logs.
- Keep dependencies up to date for best performance and compatibility.

---

## 💤 Sleep Well!

This extension is now robust, modern, and easy to maintain. If you have feedback or want to contribute, open an issue or PR. 🐹

_Last updated: 2024-05-09_

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

1. Download the latest `.vsix` file from [GitHub releases](https://github.com/sm-moshi/aimemory/releases)
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

### Memory Bank Structure (v0.0.8 onwards)

The AI Memory extension creates a modular Memory Bank in a `memory-bank/` directory within your workspace. This structure helps organise your project's context for more efficient AI interaction.

The main folders and their purposes are:

- **`memory-bank/core/`**: Contains essential overview files.
  - `projectbrief.md`: Foundation document defining core requirements and goals.
  - `productContext.md`: Why this project exists, problems it solves, user experience goals.
  - `activeContext.md`: Current work focus, recent changes, next steps, active decisions.
- **`memory-bank/systemPatterns/`**: Describes the system's architecture and design.
  - `index.md`: Summary of system patterns.
  - `architecture.md`: Detailed system architecture.
  - `patterns.md`: Design patterns in use.
  - `scanning.md`: Information on how different parts of the system interact or are scanned.
- **`memory-bank/techContext/`**: Details the technologies and technical environment.
  - `index.md`: Summary of the technical context.
  - `stack.md`: The technology stack used.
  - `dependencies.md`: Key dependencies and their roles.
  - `environment.md`: Development setup and technical constraints.
- **`memory-bank/progress/`**: Tracks the project's development status.
  - `index.md`: Summary of project progress.
  - `current.md`: What is currently being worked on and recent updates.
  - `history.md`: Historical log of significant developments or decisions.

The extension will create these folders and files with default templates if they don't exist.

#### Migration from Older Versions

If you used a previous version of AI Memory that created a "flat" memory bank (all files directly in the `memory-bank/` root), the latest version includes a migration assistant:

1. **Automatic Detection**: On startup, the extension checks for an old flat structure.
2. **Migration Prompt**: If a flat structure is found, you'll be asked if you want to migrate to the new modular structure. Your existing files will be moved into the new subfolders (`core/`, `systemPatterns/`, etc.), and any missing modular files will be created with default templates.
3. **User Control**: **No files will be overwritten without your explicit consent.** If a file already exists in a target modular location (e.g., `memory-bank/core/projectbrief.md` exists and a flat `projectbrief.md` is also found), you will be prompted to confirm before any overwrite occurs. You can always choose to skip the migration or parts of it.

This ensures a smooth transition while keeping your data safe.

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

## Contributing

Contributions to AI Memory are welcome! This project uses automated versioning and release processes.

### Commit Message Format

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) standard for commit messages:

- `feat:` - A new feature (triggers a minor version bump)
- `fix:` - A bug fix (triggers a patch version bump)
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code changes that neither fix bugs nor add features
- `perf:` - Performance improvements
- `test:` - Adding or modifying tests
- `chore:` - Changes to the build process or auxiliary tools
- `BREAKING CHANGE:` - Changes that break backward compatibility (triggers a major version bump)

### Automated Releases

When you push to the `main` branch, the following happens automatically:

1. A GitHub Action analyzes your commit messages
2. The version in `package.json` is bumped based on the commit types
3. A new tag is created and pushed
4. A GitHub release is created with the packaged VSIX file
5. The extension is published to VS Code Marketplace and Open VSX Registry (if tokens are configured)

### Repository Secrets for Publishing

To enable automated publishing to the extension marketplaces, set up these repository secrets in your GitHub repository:

1. `GH_TOKEN` (optional): Personal Access Token with 'repo' scope (used for pushing version changes)
   - If not provided, the workflow will use the default `GITHUB_TOKEN` with write permissions
   - Create this token at <https://github.com/settings/tokens>

2. `VSCE_PAT` (optional): Personal Access Token for VSCode Marketplace publishing
   - Create this token at <https://dev.azure.com/>
   - Instructions: <https://code.visualstudio.com/api/working-with-extensions/publishing-extension#get-a-personal-access-token>

3. `OVSX_PAT` (optional): Personal Access Token for Open VSX Registry publishing
   - Create this token at <https://open-vsx.org/>
   - Instructions: <https://github.com/eclipse/openvsx/wiki/Publishing-Extensions#how-to-publish-an-extension>

To add these secrets:

1. Go to your repository on GitHub
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add each token with its corresponding name

### Pull Request Process

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using the conventional format (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [pnpm](https://pnpm.io/) (v8 or later)
- Cursor IDE for testing

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/sm-moshi/aimemory.git
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

**Enjoy!**
