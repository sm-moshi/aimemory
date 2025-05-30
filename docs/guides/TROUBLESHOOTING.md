# AI Memory Extension Troubleshooting Guide

> _Last updated: 2025-05-28 🐹_

This guide helps you diagnose and resolve common issues with the AI Memory extension for Cursor and VS Code, focusing on MCP, webview, and modular memory bank workflows.

_For setup, see [QUICKSTART.md](./QUICKSTART.md). For technical details, see [IMPLEMENTATION.md](../wip/IMPLEMENTATION.md). For the project roadmap, see [ROADMAP.md](../wip/ROADMAP.md)._

---

## 🛠️ Common Issues & Solutions

### 1. MCP Server Connection Problems

- **Check if the MCP server is running**:
  Run `AI Memory: Start MCP` from the Command Palette.
  Visit `http://localhost:7331/health` (or fallback port) in your browser.
- **Port conflicts**:
  Default port is 7331; fallback is 7332. Check extension output for which port is used.
- **Firewall/network issues**:
  Ensure your firewall allows local connections.

### 2. Webview UI Issues

- **Blank dashboard**:
  Caused by Content Security Policy (CSP) or asset loading issues.
  Ensure you are using the latest version of the extension.
- **Buttons not working**:
  Ensure the MCP server is running. Reload the webview or restart Cursor/VS Code.

### 3. Memory Bank Migration & Self-Healing

- **Migration prompt not appearing**:
  Ensure you have a flat memory bank structure and no modular folders. Restart the extension to trigger migration detection.
- **Files not migrated or missing**:
  Use the "Repair Memory Bank" button in the webview. Check file permissions in your workspace.
- **Self-healing actions**:
  Missing or incomplete files are auto-created and logged in the Output Channel and webview.

### 4. SSE/Streaming Errors

- **"Client closed" or dropped connections**:
  Ensure keepalive pings are being sent (see extension output).

### 5. Debugging Tips

- Use "Developer: Toggle Developer Tools" in Cursor/VS Code to inspect console logs.
- Check the extension output panel for detailed logs.

---

## ⚠️ Known Limitations (May 2025)

- The extension is currently migrating away from Express for all communication.
  Some advanced features (e.g., chunked file access, version control integration, advanced UI) are planned but not yet available.
- For the latest status, see [ROADMAP.md](../wip/ROADMAP.md) and [TODO.md](../wip/TODO.md).

---

## 📝 Reporting Issues

1. Gather logs from the extension output panel.
2. Note the exact steps to reproduce the issue.
3. Create an issue on the project repository with this information.

---

## 📚 More Information

- [QUICKSTART.md](./QUICKSTART.md)
- [IMPLEMENTATION.md](../wip/IMPLEMENTATION.md)
- [ROADMAP.md](../wip/ROADMAP.md)
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

How Cursor rules work?
<https://forum.cursor.com/t/my-best-practices-for-mdc-rules-and-troubleshooting/50526>
