# AI Memory Extension Quickstart Guide

Welcome to the AI Memory extension for Cursor and VS Code! This guide will help you get started quickly with installation, setup, and usage.

---

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

*For troubleshooting installation or common issues, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).*

---

## Initial Setup

1. Install the extension (see above)
2. Create a workspace folder for your project (if you haven't already)
3. Run the `AI Memory: Start MCP` command from the Command Palette
4. The extension will:
   - Create a `memory-bank` folder in your workspace root if it doesn't exist
   - Start the MCP server (default port: 7331, fallback: 7332)
   - Automatically update your Cursor MCP configuration to connect to the server

*For technical details, see [IMPLEMENTATION.md](./IMPLEMENTATION.md).*

---

## Using the Memory Bank

### Webview Dashboard
- Run the `AI Memory: Open Dashboard` command to open the dashboard interface.
- Use the buttons to initialise or update the memory bank.
- Feedback and error messages are shown in the UI.

### Memory Bank Structure
- The extension uses a modular structure:
  - `memory-bank/core/`: Project brief, product context, active context
  - `memory-bank/systemPatterns/`: Architecture, patterns, scanning
  - `memory-bank/techContext/`: Stack, dependencies, environment
  - `memory-bank/progress/`: Current status, history

### MCP Tools & Commands
- Interact with the memory bank via MCP tools:
  - `initialize-memory-bank`: Create all required files and structure
  - `list-memory-bank-files`: List all memory bank files
  - `get-memory-bank-file`: Get the content of a specific file
  - `update-memory-bank-file`: Update a file's content
- Use `/memory` commands in Cursor chat:
  - `/memory status`: Check the status of the memory bank
  - `/memory list`: List all memory bank files
  - `/memory read <filename>`: Read a specific file

*For advanced usage, see [IMPLEMENTATION.md](./IMPLEMENTATION.md) and [ROADMAP.md](./ROADMAP.md).*

---

## Best Practices
- Use the webview for all memory bank actions
- Keep your extension and dependencies up to date
- Review feedback and logs for errors
- For a technical deep dive and full tech stack, see [IMPLEMENTATION.md](./IMPLEMENTATION.md)

---

For more details, see:
- [ROADMAP.md](./ROADMAP.md)
- [TODO.md](./TODO.md)
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- [IMPLEMENTATION.md](./IMPLEMENTATION.md)
