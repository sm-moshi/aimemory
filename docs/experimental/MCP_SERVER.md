# AI Memory MCP Server: Implementation & Migration Plan

## 🚨 Why This Refactor? (Cursor 0.50 MCP CLI Entrypoint Problem)

With the release of Cursor 0.50, the MCP integration model changed:
- Cursor now expects to launch MCP servers via a CLI entrypoint (stdio transport), configured in `.cursor/mcp.json`.
- The previous model (Cursor connecting to a pre-running HTTP server) is no longer the default or recommended.
- Our extension did not provide a CLI entrypoint, and the server logic was tightly coupled to VS Code/Express.

**Symptoms:**
- MCP tools stopped working in Cursor 0.50+.
- Logs showed repeated connection failures (`ECONNREFUSED 127.0.0.1:7331`).
- Cursor was not launching or connecting to our MCP server as expected.

**Root Cause:**
- No CLI entrypoint for stdio transport.
- Server logic not context-agnostic.

**Goal:**
- Refactor to support a CLI entrypoint (stdio), restore MCP tool support, and align with MCP 2025 best practices.

---

## 📌 Project Summary & Goals

This document tracks the design, implementation, and migration plan for refactoring and modernising the AI Memory MCP server to align with the latest Model Context Protocol (MCP) standards and best practices (2025). It is the canonical reference for the `feature/mcp-cli-entrypoint` and related branches.

**Goals:**
- Full compliance with MCP 2025 protocol (current: 2025-03-26)
- Modular, maintainable, and testable server structure
- Robust tool/resource registration and discovery
- Secure, stateful, and extensible session management
- Seamless integration with Cursor, Claude, and other MCP clients
- Comprehensive documentation and migration guidance

---

## 🏆 Best Practices (with References)

- **Project Structure:**
  - Use or align with `create-typescript-server` CLI ([/modelcontextprotocol/create-typescript-server](https://github.com/modelcontextprotocol/create-typescript-server))
  - Separate resource, tool, and transport logic
  - Use TypeScript strictness and Zod schemas for validation ([/modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk))

- **Protocol Negotiation:**
  - Implement JSON-RPC 2.0 initialization and version negotiation ([/modelcontextprotocol/modelcontextprotocol](https://github.com/modelcontextprotocol/modelcontextprotocol))
  - Advertise capabilities: tools, resources, prompts, logging

- **Tool/Resource Registration:**
  - Each tool: unique name, description, input schema, output, annotations ([MCP Tools Doc](https://modelcontextprotocol.io/docs/concepts/tools))
  - Register tools/resources for dynamic discovery
  - Use Zod or JSON Schema for validation

- **Session & State:**
  - Support stateful sessions if needed
  - Isolate session data per client

- **Security & Consent:**
  - Explicit user consent for sensitive operations
  - Restrict access to registered/approved tools/resources
  - Validate all inputs/outputs

- **Error Handling & Logging:**
  - Use JSON-RPC error objects
  - Log all requests, responses, and errors

- **Testing & Debugging:**
  - Use MCP Inspector, CLI, and unit tests
  - Document all endpoints and schemas

- **Integration:**
  - Register server in `.cursor/mcp.json` (Cursor) or Claude config
  - Use correct transport: stdio (CLI/desktop), SSE (network)

**References (Context7 Libraries/Docs):**
- `/modelcontextprotocol/modelcontextprotocol` (specification, protocol negotiation, JSON-RPC)
- `/modelcontextprotocol/typescript-sdk` (official TypeScript SDK)
- `/modelcontextprotocol/create-typescript-server` (CLI scaffolding)
- `/modelcontextprotocol/servers` (reference servers)
- MCP Docs: https://modelcontextprotocol.io/llms-full.txt
- Cursor Docs: https://docs.cursor.com/context/model-context-protocol

---

## 📝 TODO List & Migration Checklist 🐹

- [~] Align project structure with `create-typescript-server` best practices
- [~] Refactor core logic into context-agnostic modules (tools, resources, transport)
- [x] Implement JSON-RPC 2.0 initialization and version negotiation
- [x] Register all tools/resources with clear schemas and handlers
- [ ] Add session/state management as needed
- [~] Enforce security, consent, and input/output validation
- [x] Implement robust error handling and logging
- [ ] Add/expand unit and integration tests
- [x] Integrate with Cursor/Claude via `.cursor/mcp.json` (stdio transport)
- [~] Document all endpoints, schemas, and usage
- [x] Update this file as the implementation progresses

---

## 🔍 Codebase Assessment (Updated)

**Matches Best Practices:**
- Modular memory bank logic (good foundation)
- Some separation of tool/resource logic
- TypeScript used throughout
- Initial CLI entrypoint and context-agnostic service in progress

**Needs Improvement:**
- Project structure not fully aligned with `create-typescript-server` (tools/resources/transport split)
- Protocol negotiation/initialization not fully explicit (JSON-RPC handshake)
- Tool/resource registration could be more dynamic and schema-driven
- Session/state management not fully isolated
- Error handling/logging could be more robust and standardised
- Testing coverage and documentation can be improved
- **No working CLI entrypoint for MCP server (critical for Cursor 0.50+)**
- **Extension currently broken in Cursor 0.50+ due to missing stdio/CLI support**

**Gaps:**
- No explicit Zod/JSON Schema validation for tool/resource inputs
- No clear separation of CLI/extension/server logic
- Some VS Code/Express dependencies remain in core logic
- Integration with latest Cursor/Claude MCP config not fully automated

---

## 🧠 Reasoning & Prioritised Migration Plan

**Immediate Priority:**
1. **Restore a working MCP server for Cursor 0.50+ as fast as possible:**
   - Implement a minimal CLI entrypoint that launches the MCP server in stdio mode (no VS Code/Express dependencies).
   - Register at least the core memory bank tools/resources needed for basic operation.
   - Update `.cursor/mcp.json` to point to the new CLI entrypoint.
   - Test with Cursor to confirm MCP tools are available and working.

**Short-Term (After Restoration):**
2. Refactor project structure to align with `create-typescript-server` best practices (tools/resources/transport split).
3. Implement full JSON-RPC 2.0 initialization and version negotiation.
4. Migrate tool/resource registration to use Zod/JSON Schema validation.
5. Isolate session/state management per client.
6. Harden error handling and logging.
7. Expand unit/integration tests.
8. Document all endpoints, schemas, and usage.

**Long-Term:**
- Complete migration to context-agnostic, modular architecture.
- Integrate with latest Cursor/Claude MCP config automation.
- Continue to update this file as implementation progresses.

---

## 📚 References for Future Lookup (Context7/Docs)
- `/modelcontextprotocol/modelcontextprotocol`

# ✅ MCP Server Migration Status (as of 2025-05-11)

**Immediate migration steps are now complete:**
- [x] Minimal CLI entrypoint for stdio MCP server (`src/cli.ts`, `src/mcpServerCli.ts`)
- [x] Core tools/resources registered with Zod validation
- [x] `.cursor/mcp.json` updated automatically
- [x] JSON-RPC 2.0 protocol compliance via official SDK
- [x] Robust error handling and logging (singleton Logger, webview logs)
- [x] Modular memory bank and self-healing logic implemented and surfaced in UI
- [x] Webview UI for server/memory bank management

**Partial progress:**
- [~] Project structure modular but not fully aligned with `create-typescript-server` (tools/resources/transport split could be improved)
- [~] Some VS Code/Express dependencies remain in the extension backend
- [~] Security/consent handled for file overwrites, but not for all sensitive operations
- [~] Documentation is good but not exhaustive for all endpoints/schemas

**Not started:**
- [ ] Session/state management per client
- [ ] Comprehensive unit/integration tests (only a sample test exists)

**Next priorities:**
- Refactor for full modularity/context-agnostic design
- Add session/state management
- Expand tests
- Improve documentation and security/consent flows

_Audit performed and checklist updated on 2025-05-11 🐹_
