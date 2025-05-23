# AI Memory Extension for Cursor 🐹

[![Build Status](https://img.shields.io/github/actions/workflow/status/sm-moshi/aimemory/ci.yml?branch=main)](https://github.com/sm-moshi/aimemory/actions)
[![License](https://img.shields.io/github/license/sm-moshi/aimemory)](LICENSE)
[![Version](https://img.shields.io/github/package-json/v/sm-moshi/aimemory/main)](package.json)

_A modular, robust, and user-friendly memory bank for Cursor and VS Code, enabling persistent, context-aware AI workflows._

_Last updated: 2025-05-17_

---

## 📑 Table of Contents

1. [AI Memory Extension for Cursor 🐹](#ai-memory-extension-for-cursor-)
	1. [📑 Table of Contents](#-table-of-contents)
	2. [🧠 Overview](#-overview)
	3. [✨ Features](#-features)
	4. [🖼 Visuals](#-visuals)
	5. [🛠 Installation](#-installation)
		1. [From Cursor Extension Panel (Recommended)](#from-cursor-extension-panel-recommended)
		2. [From VSIX File](#from-vsix-file)
	6. [⚡ Quick Start](#-quick-start)
	7. [💡 Usage Examples](#-usage-examples)
	8. [🗂 Project Structure](#-project-structure)
	9. [⚙️ Configuration](#️-configuration)
	10. [🔄 Migration](#-migration)
	11. [🛠 Troubleshooting](#-troubleshooting)
	12. [🤝 Contributing](#-contributing)
	13. [📬 Support \& Contact](#-support--contact)
	14. [📜 License](#-license)
	15. [🔗 Links \& Docs](#-links--docs)

---

## 🧠 Overview

AI Memory is a modular extension for [Cursor](https://www.cursor.com/) (0.50+) and VS Code, providing persistent, context-aware memory for LLMs and agents. It features a modern webview, a robust MCP server (CLI/stdio-only), and a fully modular, self-healing memory bank system. Designed Cursor-first, it ensures seamless context retention, robust error handling, and a smooth developer experience.

> **Note:** This extension uses **stdio transport only** for MCP server communication. No HTTP/Express endpoints are used or required.

---

## ✨ Features

- **Modular Memory Bank**: Structured folders for project, product, technical, and progress context.
- **MCP Server (CLI/stdio-only)**: Robust, async, error-tolerant, and Cursor-first.
- **Webview UI**: Initialise, update, and repair the memory bank with clear feedback and error messages.
- **Self-Healing**: Auto-creates missing files/folders from templates. Manual repair available via webview.
- **Migration Logic**: Detects and migrates flat memory banks to modular structure with user consent.
- **/memory Commands**: Interact directly with the memory bank from Cursor chat (e.g., `/memory status`, `/memory list`, `/memory read <filename>`).
- **Version Control Ready**: Modular structure supports future versioning, remote/cloud, and visualisation features.

---

## 🖼 Visuals

> _Screenshots and diagrams coming soon!_

- **Webview Dashboard:** _[Insert screenshot here]_
- **Memory Bank Structure:** _[Insert diagram here]_

---

## 🛠 Installation

### **WiP:** From Cursor Extension Panel (Recommended)
1. Open Cursor
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "AI Memory"
4. Click Install

### From VSIX File
1. Download the latest `.vsix` from [GitHub releases](https://github.com/sm-moshi/aimemory/releases)
2. In Cursor, open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
3. Run "Extensions: Install from VSIX..." and select the file

---

## ⚡ Quick Start

```bash
pnpm install
pnpm run compile
# Press F5 in Cursor to launch the extension
```

- Open the webview dashboard (`AI Memory: Open Dashboard`)
- Click **Start MCP Server**
- Click **Initialise Memory Bank**
- Use `/memory` commands in Cursor chat

---

## 💡 Usage Examples

- **Check memory status:**
  ```
  /memory status
  ```
- **List memory files:**
  ```
  /memory list
  ```
- **Read a memory file:**
  ```
  /memory read core/projectbrief.md
  ```
- **Repair memory bank:**
  - Use the "Repair Memory Bank" button in the webview

---

## 🗂 Project Structure

| Folder         | Purpose                                      |
| -------------- | -------------------------------------------- |
| `src/`         | Extension, MCP server, webview, types, utils |
| `memory-bank/` | Modular, persistent project memory           |
| `docs/`        | Public documentation, guides, and plans      |
| `dist/`        | Packaged extension and assets                |

See [memory-bank rules](memory-bank/core/projectbrief.md) for details.

---

## ⚙️ Configuration

- All required files are auto-created if missing.
- No manual configuration is required for basic use.
- Advanced settings and customisation coming soon.

---

## 🔄 Migration

- Automatic detection and migration of flat memory banks to modular structure.
- No files are overwritten without explicit user consent.
- See [Migration Guide](docs/guides/MIGRATION_GUIDE.md) for details.

---

## 🛠 Troubleshooting

- **MCP Server Health:** Use the webview dashboard or `/memory status` in Cursor chat.
- **Repair:** Use the webview's repair button if files are missing or broken.
- **See [Troubleshooting Guide](docs/guides/TROUBLESHOOTING.md)** for more.

> **Tip:** If you encounter issues, check the Output Channel in Cursor/VS Code for logs.

---

## 🤝 Contributing

We welcome contributions! Please see:
- [Contributing Guide](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Unified Ruleset](vsix-extension.mdc)

> **Branching:** We use [Gitflow](https://nvie.com/posts/a-successful-git-branching-model/). Please branch from `develop` and use `feature/*` for new features.

---

## 📬 Support & Contact

- Open an [issue](https://github.com/sm-moshi/aimemory/issues) for bugs or feature requests
- For questions, use GitHub Discussions or contact the maintainers via the repository

---

## 📜 License

[Apache 2.0](LICENSE)

---

## 🔗 Links & Docs

- [Quickstart Guide](docs/guides/QUICKSTART.md)
- [Migration Guide](docs/guides/MIGRATION_GUIDE.md)
- [Troubleshooting Guide](docs/guides/TROUBLESHOOTING.md)
- [Implementation Guide](docs/wip/IMPLEMENTATION.md)
- [Roadmap](docs/wip/ROADMAP.md)
- [Unified Ruleset](vsix-extension.mdc)
- [GitHub Repository Best Practices](docs/devs/github-repo-guide.md)

---

> _Built with ❤️ for the Cursor and VS Code community. Contributions, feedback, and ideas are always welcome!_
