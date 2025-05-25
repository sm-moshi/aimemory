# AI Memory MCP Server: Implementation & Migration Guide

## 🚨 Why This Refactor?

With Cursor 0.50+, MCP servers must launch via a CLI entrypoint (stdio transport), configured in `.cursor/mcp.json`. The previous HTTP-only model is deprecated. **All Express/HTTP server code should be fully removed from extension/server integration. Only use stdio transport for local extension communication.** This guide tracks our migration to full MCP 2025+ compliance.

---

## 📌 Project Summary & Goals

- **Compliant stdio CLI entrypoint** for Cursor 0.50+ (done)
- **Modular, maintainable, and testable** server structure
- **Robust tool/resource registration** with Zod validation
- **Secure, stateful, and extensible** session management (planned)
- **Seamless integration** with Cursor, Claude, and other MCP clients
- **Comprehensive documentation and migration guidance**

---

## 🏆 Best Practices (2025)

- Use `create-typescript-server` conventions for modularity
- Separate resource, tool, and transport logic
- Use Zod/JSON Schema for all tool/resource validation
- Implement JSON-RPC 2.0 protocol and error handling
- Advertise capabilities (tools, resources, logging, etc.)
- Support session IDs and per-client state (**session ID support is a near-term requirement for full MCP 2025+ compliance**)
- Require explicit user consent for sensitive operations
- Log all requests, responses, and errors
- **Provide health endpoints only for HTTP/SSE transports; not required for stdio-based extension/server setups**
- Update `.cursor/mcp.json` automatically

---

## ✅ Current Status (as of 2025-05-17)

- [x] **CLI entrypoint** (`src/cli.ts`, `src/mcp/mcpServerCli.ts`) launches MCP server with stdio transport
- [x] **Core tools/resources** registered with Zod validation
- [x] **JSON-RPC 2.0** protocol compliance via official SDK
- [x] **Cursor config** auto-updated for MCP integration
- [x] **Error handling** and logging (singleton Logger, webview logs)
- [x] **Webview UI** for server/memory bank management
- [x] **Modular memory bank** and self-healing logic

---

## 📝 Migration Checklist & Next Steps

- [~] Refactor for full modularity (tools/resources/transport split)
- [~] Implement session/state management (per-client, session IDs)
- [~] Harden security/consent flows for all sensitive operations
- [~] Expand unit/integration tests for tools, error cases, and transports (see official MCP test suites)
- [~] Improve documentation for all endpoints, schemas, and usage (see MCP documentation standards)
- [~] **Implement dynamic registration and notification for tools/resources to support live updates in Cursor/Claude**

---

## 🔍 Codebase Assessment

**Strengths:**

- Stdio CLI entrypoint and Cursor 0.50+ compatibility
- Modular memory bank logic
- Zod validation and JSON-RPC compliance
- Logging and error handling
- Webview UI for diagnostics and management

**Areas to Improve:**

- Full modularity (align with `create-typescript-server`)
- Session/state management
- Security/consent for all sensitive actions
- Comprehensive testing
- Documentation coverage

---

## References

- [MCP Docs](https://github.com/modelcontextprotocol/modelcontextprotocol)
- [Cursor Docs](https://docs.cursor.com/context/model-context-protocol)
- [create-typescript-server](https://github.com/modelcontextprotocol/create-typescript-server)

---

_Last updated: 2025-05-25 🐹_
