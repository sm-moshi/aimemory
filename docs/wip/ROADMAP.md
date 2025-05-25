# AI Memory Extension Roadmap

## Vision

Empower Cursor and VS Code users with a robust, modular, and user-editable memory bank, enabling persistent, context-aware AI interactions and seamless context resets.

---

## Milestones

### v0.1.x (Complete)

- [x] Modular memory bank structure (`core/`, `systemPatterns/`, `techContext/`, `progress/`)
- [x] MCP server with robust error handling and port failover
- [x] Webview UI for memory bank management (init, update, feedback)
- [x] Migration logic for flat → modular memory bank
- [x] Public documentation in `docs/`, private memory in `memory-bank/`
- [x] Cursor 0.49+ and VS Code compatibility
- [x] Ignore files reviewed and fixed; packaging issues resolved; 0.1.5 is new stable baseline (May 2025)

### v0.2.x (Current)

- [x] Full modularisation of codebase (core, mcp, webview, types, utils, test)
- [x] MCP CLI/stdio entrypoint for Cursor-first operation
- [x] Webview UI overhaul (React/Tailwind, status, repair, management)
- [x] Self-healing memory bank and rules management
- [x] MCP tools exposed and robust
- [x] Refactor extension to remove Express and use Cursor/VS Code APIs for all communication (**completed in Phase 1d**)
- [~] User-configurable log levels for Output Channel (**basic support present, advanced features pending**)
- [~] Webview error and event reporting to Output Channel (**basic support present, advanced features pending**)
- [ ] Add 'AI Memory: Create Memory Bank Rule' command to create/restore memory-bank.mdc from template or rules source (**logic present, not yet exposed as command**)
- [ ] Implement user prompt to overwrite if file exists (see cursor-rules-service.ts)
- [ ] **Automated test coverage for MCP tools and extension commands (not started)**
- [ ] Implement usage of new MCP prompt constants (health check, file missing, update confirmation, structure guide, usage tip) in the extension and/or webview. Wire up these prompts to relevant extension actions or UI events for improved agent and user feedback.

### v0.3.x (Future)

- [ ] Refactor extension to support stdio MCP server process management (spawn, connect, lifecycle)
- [ ] Refactor to use stdio transport as default for Cursor 0.50+ compatibility
- [ ] Version control integration for memory bank files
- [ ] Expose 'AI Memory: Create Memory Bank Rule' as a command in the command palette
- [ ] Fix 'Initialise Memory Bank' button text in webview
- [ ] Begin work on advanced UI features (refresh, preview, diff, visualisation)
- [ ] Implement automated tests and CI/CD
- [x] **Build & Workspace Simplification**
  - [x] Unify TypeScript configs (single root config, only separate for webview if needed)
  - [x] Streamline build scripts (esbuild for Node/extension/server, vite for webview)
  - [x] Rationalise ignore files (.npmignore/.vscodeignore minimal, only allow built assets)
  - [ ] Use official test tools (@vscode/test-cli, MCP Inspector)
  - [x] Remove Express/HTTP from extension/server path (stdio only) (**completed in Phase 1d**)
  - [ ] Clarify and flatten folder structure
  - [ ] Document all build/test/dev commands in README
  - [ ] Only use monorepo/workspaces if webview is a separate package

### v1.0.0 (Stable)

- [ ] Full test coverage and CI/CD for all features
- [ ] Open VSX and VS Code Marketplace release
- [ ] User feedback integration and UX polish
- [ ] Advanced troubleshooting and diagnostics UI
- [ ] Community templates and extension points

---

## Long-Term Ideas

- AI-driven memory bank suggestions and auto-updates
- Integration with other LLMs and agent frameworks
- Multi-project and workspace memory management
- Plugin system for custom memory bank modules
- Remote/Cloud memory bank support
- Enhanced webview: file previews, diffs, and history
- Visualisation tools for memory relationships (webview)
- More granular permissions and user roles

---

## Action Plan (May 2025)

- [x] Refactor extension to modular, Cursor-first structure (core, mcp, webview, types, utils, test)
- [x] Add MCP CLI/stdio entrypoint for Cursor-first operation
- [x] Webview UI overhaul and robust feedback
- [x] Self-healing memory bank and rules management
- [x] Remove Express and use Cursor/VS Code APIs for all communication (**completed in Phase 1d**)
- [~] User-configurable log levels and webview error/event reporting (**basic support present, advanced features pending**)
- [ ] Version control integration, advanced UI, and chunked file access (future)
- [ ] Test activation, command registration, and MCP tool operation in Cursor (and optionally VS Code)
- [ ] Implement automated tests and CI/CD
- [ ] Expose 'AI Memory: Create Memory Bank Rule' as a command
- [x] **Simplify build/test/workspace as per v0.3.x plan**
- [ ] Document findings and next steps in this ROADMAP.

---

> **Notes (2025-05-17, updated 2025-05-25):**

- The codebase is now Cursor-first, with VS Code compatibility as a bonus.
- Modularisation, webview overhaul, MCP CLI/stdio, and self-healing are complete.
- Express removal completed in Phase 1d - extension now uses STDIO transport exclusively.
- Docs, rules, and packaging are up-to-date.
- Automated tests, advanced UI features, and build/workspace simplification are the next priorities.

For a detailed, step-by-step experimental plan to safely prototype advanced MCP features (chunked file access, metadata, planner tools), see [EXPERIMENTAL-MCP-PLAN.md](../experimental/EXPERIMENTAL-MCP-PLAN.md).

---

## Optional: Advanced MCP Roadmap (Experimental)

> The following roadmap is based on advanced internal planning for MCP features. These features are **optional** and should be implemented with caution, as previous attempts caused instability. Use for reference and future planning only.

### Phase 1: Core MCP Features

- Add chunked reading and size warnings to `get-memory-bank-file`
- Add rule-bound validation and append/replace mode to `update-memory-bank-file`
- Implement `get-memory-bank-metadata` tool for file list, size, modifiedAt, chunkCount

### Phase 2: Planner Tools

- Implement `/plan` command tool to extract plan from `progress/current.md` and `core/activeContext.md`
- Add `update-current-plan` tool for AI-driven plan updates (with validation and optional backup)

### Phase 3: Rule Enforcement & Limits

- Enforce chunked reading with default chunk size (e.g., 2000 chars)
- Show warnings for large files (>15KB, >30KB)
- Enable `.mdc` planner mode for auto `/plan` logic

### Phase 4: DevOps & Integration

- Use Git Flow for release branches and tagging
- Tag and publish after full MCP re-validation and test suite

### Optional Advanced Ideas

- Implement feedback hooks for MCP-driven rule service
- Support MCP UI injection of `memory-bank-rules.md` in dashboard
- Allow GitHub Action to regenerate `.mdc` from schema
