# AI Memory Extension Troubleshooting Guide

> _Last updated: 2025-06-05_

This guide helps you diagnose and resolve common issues with the AI Memory extension for Cursor and VS Code. The extension uses stdio transport for MCP communication and provides a modular memory bank system.

> **Current Version**: v0.8.0-alpha
> _Last updated: 2025-06-12_

_For setup instructions, see [QUICKSTART.md](./QUICKSTART.md). For upgrade information, see [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)._

---

## 🛠️ Common Issues & Solutions

### 1. MCP Server Issues

**Problem**: MCP server won't start or Cursor can't connect

- **Check extension status**: Run `AI Memory: Show Output Channel` for detailed logs
- **Restart the server**: Use `AI Memory: Start MCP Server` from Command Palette
- **Verify workspace**: Ensure you have an open workspace folder in Cursor
- **Check Cursor MCP config**: The extension should auto-update `.cursor/mcp.json`

**Problem**: "MCP server process error" in output logs

- **Check Node.js**: Ensure Node.js is installed and accessible
- **Workspace permissions**: Verify write permissions for your workspace folder
- **Extension conflicts**: Temporarily disable other extensions to test

### 2. Memory Bank File Issues

**Problem**: Memory bank folder not created

- **Manual initialization**: Run `AI Memory: Start MCP Server` to trigger auto-creation
- **Workspace requirement**: Ensure you have a folder open in Cursor (not just loose files)
- **Check permissions**: Verify write permissions for your workspace directory

**Problem**: Files missing or incomplete

- **Self-healing**: The extension auto-creates missing files from templates
- **Use webview**: Open the dashboard with `AI Memory: Open Dashboard` to check status
- **Manual repair**: The system automatically detects and repairs missing files

**Problem**: Cannot read/write memory bank files

- **File permissions**: Check that your user has read/write access to the workspace
- **File locks**: Close any external editors that might have memory bank files open
- **Antivirus**: Some antivirus software may interfere with file operations

### 3. Webview Dashboard Issues

**Problem**: Dashboard won't open or appears blank

- **CSP issues**: The extension uses strict Content Security Policy - this is normal
- **Reload webview**: Close and reopen with `AI Memory: Open Dashboard`
- **Extension restart**: Reload Cursor window (Cmd/Ctrl+R) to restart extension

**Problem**: Server status shows disconnected

- **Start server**: Ensure MCP server is running via `AI Memory: Start MCP Server`
- **Check output**: View logs with `AI Memory: Show Output Channel`
- **Webview refresh**: Close and reopen the dashboard to refresh connection status

### 4. Cursor Integration Issues

**Problem**: Cursor AI can't access MCP tools

- **Check MCP config**: Extension should auto-update `.cursor/mcp.json`
- **Manual config update**: Run `AI Memory: Update Cursor MCP Config`
- **Restart Cursor**: Close and reopen Cursor to reload MCP configuration
- **Verify server**: Ensure MCP server is running and shows as connected

**Problem**: Memory bank context not available to AI

- **Initialize memory bank**: Run `AI Memory: Start MCP Server` first
- **File content**: Ensure memory bank files have actual content (not empty)
- **Tool usage**: AI agents need to explicitly use MCP tools to access memory bank

### 5. Performance Issues

**Problem**: Extension slow to start or respond

- **Large memory bank**: Files >30KB may cause slower operations
- **File count**: Too many files in memory bank may impact performance
- **System resources**: Check available memory and disk space

**Problem**: High CPU usage

- **Restart server**: Use `AI Memory: Stop MCP Server` then start again
- **Check logs**: Look for error loops in `AI Memory: Show Output Channel`
- **Extension conflicts**: Disable other extensions temporarily to isolate issue

---

## 🔍 Debugging Steps

### 1. Check Extension Status

```bash
# View detailed logs
Cmd/Ctrl+Shift+P → "AI Memory: Show Output Channel"

# Check webview dashboard
Cmd/Ctrl+Shift+P → "AI Memory: Open Dashboard"
```

### 2. Verify Configuration

- Check that `.cursor/mcp.json` exists and contains AI Memory configuration
- Verify `memory-bank/` folder exists in your workspace
- Confirm core files exist: `core/projectBrief.md`, `core/activeContext.md`, etc.

### 3. Test MCP Connection

- Start MCP server: `AI Memory: Start MCP Server`
- Check webview dashboard for connection status
- Review output logs for any error messages

### 4. Reset if Needed

```bash
# Stop server
Cmd/Ctrl+Shift+P → "AI Memory: Stop MCP Server"

# Update configuration
Cmd/Ctrl+Shift+P → "AI Memory: Update Cursor MCP Config"

# Restart server
Cmd/Ctrl+Shift+P → "AI Memory: Start MCP Server"
```

---

## ⚠️ Known Limitations

### Current Version (v0.8.0-alpha)

- **Development version**: Some features may be unstable
- **Large files**: Files >50KB may impact performance
- **Windows paths**: File path handling may have edge cases on Windows
- **Extension isolation**: MCP server runs as separate process for stability

### Future Improvements

- Enhanced error recovery and user feedback
- Better performance for large memory banks
- Advanced webview features and file management
- Cross-platform path handling improvements

---

## 📝 Reporting Issues

### Before Reporting

1. **Check this guide** for common solutions
2. **Gather logs** from `AI Memory: Show Output Channel`
3. **Note exact steps** to reproduce the issue
4. **Check version**: Note your Cursor version and extension version

### Issue Report Template

```markdown
**Environment:**
- OS: [Windows/macOS/Linux]
- Cursor version: [version]
- AI Memory extension version: [version]

**Issue:**
[Describe the problem]

**Steps to reproduce:**
1. [Step 1]
2. [Step 2]
3. [Result]

**Expected behavior:**
[What should happen]

**Logs:**
[Paste relevant logs from Output Channel]
```

**Submit to**: [GitHub Issues](https://github.com/sm-moshi/aimemory/issues)

---

## 📚 Additional Resources

- [QUICKSTART.md](./QUICKSTART.md) — Installation and setup guide
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) — Upgrading from older versions
- [Architecture Overview](../devs/architecture-overview.md) — Technical implementation details
- [GitHub Repository](https://github.com/sm-moshi/aimemory) — Source code and latest updates
