# AI Memory MCP Troubleshooting Guide

## Common Issues

### "Client closed" Error on SSE Connection

If you're seeing "Client closed" errors when Cursor attempts to connect to the MCP server's SSE endpoint, try the following solutions:

#### 1. Verify Server is Running

Make sure the MCP server is actually running:
- Check that you've run the "AI Memory: Start MCP" command
- Visit http://localhost:1337/health in your browser (should return `{"status":"ok ok"}`)
- Visit http://localhost:1337/status to see the server state

#### 2. Check for Port Conflicts

The default port is 1337, but if that's in use, the extension will try port 7331:
- Make sure no other applications are using these ports
- Check the extension output log to see which port was actually used
- Try connecting to both http://localhost:1337/health and http://localhost:7331/health

#### 3. Network/Firewall Issues

- Ensure your firewall isn't blocking local connections
- Try disabling any network security software temporarily
- Check that localhost resolves properly on your system

#### 4. Server Timing Out

The server may be timing out connections:
- The connection should remain open with keepalive "pings" every 10 seconds
- Check VSCode's output panel for the AI Memory extension to see if pings are being sent
- Look for any error messages in the output panel

#### 5. Debugging the Connection

Add these steps to help debug:

1. Open the Command Palette and run "Developer: Toggle Developer Tools"
2. In the Console tab, run this command to test a direct SSE connection:

```javascript
(function() {
  console.log("Testing SSE connection...");
  const eventSource = new EventSource('http://localhost:1337/sse');
  
  eventSource.onopen = () => console.log("Connection opened");
  eventSource.onerror = (e) => console.error("Connection error:", e);
  eventSource.onmessage = (e) => console.log("Message received:", e.data);
  
  // Listen for server messages
  eventSource.addEventListener('message', (e) => {
    console.log("Message:", e.data);
  });
  
  // Close connection after 30 seconds
  setTimeout(() => {
    console.log("Closing test connection");
    eventSource.close();
  }, 30000);
})();
```

3. Watch the Console output for connection events

#### 6. Check Transport Implementation

If you've modified the code, verify:
- The SSE headers are set correctly (Content-Type, Cache-Control, Connection)
- The response isn't being ended prematurely
- Error handling includes proper cleanup
- All promises are being properly awaited and errors caught

## Advanced Fixes

### Simplified SSE Implementation

If you're still having issues, you can try a simplified SSE implementation:

```typescript
// In mcpServer.ts
this.app.get("/sse", (req, res) => {
  // Basic SSE setup
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();
  
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
  
  // Create transport without any extra error handling
  this.transport = new SSEServerTransport("/messages", res);
  
  // Connect in background to avoid blocking
  this.server.connect(this.transport).catch(err => 
    console.error("Connection error:", err)
  );
  
  // Minimal keepalive
  const interval = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch (e) {
      clearInterval(interval);
    }
  }, 15000);
  
  req.on("close", () => {
    clearInterval(interval);
    console.log("Connection closed");
  });
});
```

### Model Context Protocol Versions

Ensure you're using compatible versions:
- Check that your `@modelcontextprotocol/sdk` version (currently 1.7.0) is compatible with Cursor
- Try upgrading to the latest version if available

## Reporting Issues

If you continue to experience problems:
1. Gather logs from VSCode's output panel for the AI Memory extension
2. Note the exact steps that reproduce the issue
3. Create an issue on the project repository with this information 


How Cursor rules work?
https://forum.cursor.com/t/my-best-practices-for-mdc-rules-and-troubleshooting/50526