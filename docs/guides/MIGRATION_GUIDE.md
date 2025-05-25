# AI Memory Extension Migration Guide

>_Last updated: 2025-05-25 🐹_

This guide helps you upgrade from older versions of AI Memory (0.0.x) to the latest modular, self-healing, and robust 0.1.x+ and 0.2.x+ releases.

---

## 🆕 Key Changes in 0.1.x+ and 0.2.x+

- **Modular memory bank**: Files are now grouped by context (`core/`, `systemPatterns/`, `techContext/`, `progress/`).
- **Self-healing**: Missing or incomplete files are auto-created from templates.
- **Improved feedback**: Output Channel and webview show clear repair/status messages.
- **Webview UI**: “Repair Memory Bank” button, robust status checks, and error feedback.
- **MCP server**: Hardened with readiness checks, port failover, and better error handling.
- **Cursor-first**: The extension is now optimised for Cursor, with VS Code compatibility as a bonus.

---

## 🔄 Migration Steps

1. **Backup your old memory bank** (`memory-bank/` and `.cursor/rules/`).
2. **Install or upgrade to the latest AI Memory** (see [QUICKSTART.md](./QUICKSTART.md)).
3. **Open the webview dashboard** and start the MCP server.
4. **Click “Repair Memory Bank”** to auto-create any missing files and migrate to the modular structure.
5. **Check the Output Channel and webview** for any errors or self-healing actions.
6. **Review and update your memory bank content** as needed (see new modular file layout).
7. **Consult [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** if you encounter issues.

---

## ℹ️ Notes

- The new structure is backwards compatible with most flat memory banks, but modularisation is recommended for best results.
- All major actions and errors are now logged for easier debugging.
- For the latest features and migration notes, see [ROADMAP.md](../wip/ROADMAP.md).

---
