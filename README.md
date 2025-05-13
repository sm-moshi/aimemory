# AI Memory Extension for Cursor 🐹

## Overview

AI Memory is a modular, robust, and user-friendly extension for Cursor (0.50+) and VS Code, providing persistent, context-aware memory for LLMs and agents. It features a modern webview, a stable MCP server (CLI/stdio), and a fully modular, self-healing memory bank system. Designed Cursor-first, it ensures seamless context retention, robust error handling, and a smooth developer experience.

---

## ✨ Key Features

- **Modular Memory Bank**: Structured folders (`core/`, `systemPatterns/`, `techContext/`, `progress/`) for project, product, technical, and progress context.
- **MCP Server (CLI/stdio)**: Robust, async, error-tolerant, and Cursor-first. Automatic port failover and readiness checks.
- **Webview UI**: Initialise, update, and repair the memory bank with clear feedback and error messages.
- **Self-Healing**: Auto-creates missing files/folders from templates. Manual repair available via webview.
- **Migration Logic**: Detects and migrates flat memory banks to modular structure with user consent.
- **/memory Commands**: Interact directly with the memory bank from Cursor chat (e.g., `/memory status`, `/memory list`, `/memory read <filename>`).
- **Version Control Ready**: Modular structure supports future versioning, remote/cloud, and visualisation features.

---

## 🗂 Project Structure

- `src/` — Modular TypeScript source (core logic, MCP server, webview, types, utils, tests, assets)
- `memory-bank/` — Modular, persistent project memory (see below)
- `docs/` — Public documentation, guides, and plans
- `dist/` — Packaged extension and assets

### Modular Memory Bank Structure

| Folder            | Purpose                                        |
| ----------------- | ---------------------------------------------- |
| `core/`           | Project brief, product context, active context |
| `systemPatterns/` | System architecture, design patterns, scanning |
| `techContext/`    | Tech stack, dependencies, environment          |
| `progress/`       | Progress index, current work, history          |

All required files are auto-created if missing. See [memory-bank rules](memory-bank/core/projectbrief.md) for details.

---

## 🛠 Installation

### From Cursor Extension Panel (Recommended)
1. Open Cursor
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "AI Memory"
4. Click Install

### From VSIX File
1. Download the latest `.vsix` from [GitHub releases](https://github.com/sm-moshi/aimemory/releases)
2. In Cursor, open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
3. Run "Extensions: Install from VSIX..." and select the file

---

## 🚦 Setup & Usage

### Initial Setup
1. Install the extension
2. Open the webview dashboard (`AI Memory: Open Dashboard`)
3. Click **Start MCP Server**
4. Click **Initialise Memory Bank** (auto-creates all required files/folders)

### Using the Memory Bank
- **Webview Controls**: Initialise, update, and repair the memory bank with one click.
- **/memory Commands**: Use `/memory status`, `/memory list`, `/memory read <filename>` in Cursor chat.
- **Dashboard**: View and manage all memory bank files in one place.

### Migration from Older Versions
- Automatic detection and migration of flat memory banks to modular structure.
- No files are overwritten without explicit user consent.

---

## 🧠 Memory Bank Details

- **Self-Healing**: Missing files/folders are auto-created from templates before any operation.
- **Manual Repair**: Use the "Repair Memory Bank" button in the webview if needed.
- **Consent & Safety**: No files are overwritten or deleted without user consent.
- **Modular Structure**: Enables future features like version control, remote/cloud, and visualisation.

---

## 🧩 Development & Contribution

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)
- [pnpm](https://pnpm.io/) (v8+)
- Cursor IDE (0.50+) for testing

### Setup
```bash
pnpm install
```

### Build & Test
```bash
pnpm run compile   # Build the extension
pnpm run watch     # Watch for changes
```

### Debug & Run
- Press F5 in Cursor, or use the "Run Extension" launch config
- Use `/memory` commands and webview controls

### Package for Distribution
```bash
pnpm run package
pnpm run package:vsce
```

### Commit & Release
- Use [Conventional Commits](https://www.conventionalcommits.org/) and include an emoji (e.g., 🐹)
- Follow [Gitflow](https://nvie.com/posts/a-successful-git-branching-model/) for branching and releases

---

## 🛠 Troubleshooting
- **MCP Server Health**: Visit `http://localhost:7331/health` (or fallback port) for status.
- **Port Conflicts**: Extension will auto-failover to next port.
- **Repair**: Use the webview's repair button if files are missing or broken.
- **See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)** for more.

---

## 📜 License
Apache 2.0

---

_Last updated: 2025-05-13_
