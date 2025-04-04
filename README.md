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
   - Create this token at https://github.com/settings/tokens

2. `VSCE_PAT` (optional): Personal Access Token for VSCode Marketplace publishing
   - Create this token at https://dev.azure.com/
   - Instructions: https://code.visualstudio.com/api/working-with-extensions/publishing-extension#get-a-personal-access-token

3. `OVSX_PAT` (optional): Personal Access Token for Open VSX Registry publishing
   - Create this token at https://open-vsx.org/
   - Instructions: https://github.com/eclipse/openvsx/wiki/Publishing-Extensions#how-to-publish-an-extension

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

**Enjoy!**
