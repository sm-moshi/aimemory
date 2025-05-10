# AI Memory Extension Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the AI Memory extension for Cursor and VS Code, focusing on MCP, webview, and modular memory bank workflows.

*For setup instructions, see [QUICKSTART.md](./QUICKSTART.md). For technical details, see [IMPLEMENTATION.md](./IMPLEMENTATION.md). For the project roadmap, see [ROADMAP.md](./ROADMAP.md).*

---

## Common Issues & Solutions

### 1. MCP Server Connection Problems
- **Check if the MCP server is running:**
  - Run "AI Memory: Start MCP" from the Command Palette.
  - Visit `http://localhost:7331/health` (or fallback port) in your browser. You should see `{ "status": "ok ok" }`.
  - For more on MCP, see [Model Context Protocol](https://modelcontextprotocol.org)
- **Port conflicts:**
  - Default port is 7331; fallback is 7332. Check extension output for which port is used.
  - Ensure no other application is using these ports.
- **Firewall/network issues:**
  - Ensure your firewall allows local connections.
  - Try disabling network security software temporarily.

### 2. Webview UI Issues
- **Blank dashboard:**
  - Caused by Content Security Policy (CSP) or asset loading issues.
  - Ensure you are using the latest version of the extension.
  - Check the extension output for CSP errors.
  - For more on webviews and CSP, see [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- **Buttons not working:**
  - Ensure the MCP server is running.
  - Reload the webview or restart Cursor/VS Code.

### 3. Memory Bank Migration
<!-- - **Migration prompt not appearing:**
  - Ensure you have a flat memory bank structure (`memory-bank/*.md`) and no modular folders.
  - Restart the extension to trigger migration detection. -->
- **Files not migrated:**
  - Check file permissions in your workspace.
  - Review logs for errors during migration.

### 4. SSE/Streaming Errors
- **"Client closed" or dropped connections:**
  - Ensure keepalive pings are being sent (see extension output).
  - Try the simplified SSE test script in the developer console (see below).

### 5. Debugging Tips
- Use "Developer: Toggle Developer Tools" in Cursor/VS Code to inspect console logs.
- Check the extension output panel for detailed logs.
- Review [IMPLEMENTATION.md](./IMPLEMENTATION.md) for architecture and troubleshooting context.

---

## Advanced Debugging

### Test SSE Connection
```javascript
(function() {
  const eventSource = new EventSource('http://localhost:7331/sse');
  eventSource.onopen = () => console.log("Connection opened");
  eventSource.onerror = (e) => console.error("Connection error:", e);
  eventSource.onmessage = (e) => console.log("Message received:", e.data);
  setTimeout(() => eventSource.close(), 30000);
})();
```

### Check MCP SDK Version
- Ensure `@modelcontextprotocol/sdk` is compatible with your Cursor version.
- Upgrade to the latest version if issues persist.

---

## Reporting Issues
1. Gather logs from the extension output panel.
2. Note the exact steps to reproduce the issue.
3. Create an issue on the project repository with this information.

---

For more details, see:
- [QUICKSTART.md](./QUICKSTART.md)
- [IMPLEMENTATION.md](./IMPLEMENTATION.md)
- [ROADMAP.md](./ROADMAP.md)
- [EXPERIMENTAL-MCP-PLAN.md](./EXPERIMENTAL-MCP-PLAN.md)

How Cursor rules work?
https://forum.cursor.com/t/my-best-practices-for-mdc-rules-and-troubleshooting/50526
