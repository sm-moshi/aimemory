# AI Memory Extension Quickstart Guide

> _Last updated: 2025-05-28 🐹_

Welcome to the AI Memory extension for Cursor and VS Code! This guide will help you install, set up, and use the extension for persistent, context-aware AI workflows.

---

## 🚀 Installation

### From Cursor Extension Panel (Recommended)

1. Open Cursor.
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X).
3. Search for “AI Memory”.
4. Click **Install**.

### From VSIX File

1. Download the latest `.vsix` from [GitHub releases](https://github.com/sm-moshi/aimemory/releases).
2. In Cursor, open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P).
3. Run “Extensions: Install from VSIX...” and select the file.

_For troubleshooting installation, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)._

---

## 🏗️ Initial Setup

1. Install the extension.
2. Open or create a workspace folder for your project.
3. Run `AI Memory: Start MCP` from the Command Palette.
   - This creates a `memory-bank/` folder if missing.
   - Starts the MCP server (default port: 7331, fallback: 7332).
   - Updates your Cursor MCP config to connect to the server.

---

## 🧠 Using the Memory Bank

### Webview Dashboard

- Run `AI Memory: Open Dashboard` to launch the UI.
- Use buttons to initialise, update, or repair the memory bank.
- Status and error messages are shown in the dashboard.

### Memory Bank Structure

- Modular folders:
  - `memory-bank/core/`: Project brief, product context, active context
  - `memory-bank/systemPatterns/`: Architecture, patterns, scanning
  - `memory-bank/techContext/`: Stack, dependencies, environment
  - `memory-bank/progress/`: Current status, history

### MCP Tools & Commands

- Use MCP tools for automation and scripting:
  - `initialize-memory-bank`: Create all required files and structure
  - `list-memory-bank-files`: List all memory bank files
  - `get-memory-bank-file`: Get the content of a specific file
  - `update-memory-bank-file`: Update a file's content
- Use `/memory` commands in Cursor chat:
  - `/memory status`: Check memory bank status
  - `/memory list`: List all memory bank files
  - `/memory read <filename>`: Read a specific file

---

## 💡 Best Practices & Tips

- Use the webview for all memory bank actions.
- Keep your extension and dependencies up to date.
- Review feedback and logs for errors.
- For technical details, see [IMPLEMENTATION.md](../wip/IMPLEMENTATION.md).

> **Tip (May 2025):**
>
> - The "AI Memory: Create Memory Bank Rule" command is coming soon (logic present, not yet exposed).
> - Advanced UI features (refresh, file preview, diff viewer) are planned for future releases.
> - The extension is currently migrating away from Express for all communication. Some advanced features may be temporarily unavailable.
> - For the latest status and limitations, see [ROADMAP.md](../wip/ROADMAP.md).

---

## 📚 More Information

- [ROADMAP.md](../wip/ROADMAP.md) — Milestones and planned features
- [TODO.md](../wip/TO DO.md) — Detailed task list
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — Common issues and solutions
- [IMPLEMENTATION.md](../wip/IMPLEMENTATION.md) — Technical deep dive
