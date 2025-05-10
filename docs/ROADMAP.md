# AI Memory Extension Roadmap

## Vision

Empower Cursor and VS Code users with a robust, modular, and user-editable memory bank, enabling persistent, context-aware AI interactions and seamless context resets.

---

## Milestones

### v0.1.x (Current)
- [x] Modular memory bank structure (`core/`, `systemPatterns/`, `techContext/`, `progress/`)
- [x] MCP server with robust error handling and port failover
- [x] Webview UI for memory bank management (init, update, feedback)
- [x] Migration logic for flat → modular memory bank
- [x] Public documentation in `docs/`, private memory in `memory-bank/`
- [x] Cursor 0.49+ and VS Code compatibility

### v0.2.x (Planned)
- [ ] Version control integration for memory bank files
- [ ] Enhanced webview: file previews, diffs, and history
- [ ] Remote/Cloud memory bank support
- [ ] Visualisation tools for memory relationships (webview)
- [~] Improved AI context reset and "active context" workflows (in progress)
- [ ] More granular permissions and user roles

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

---

## Action Plan (May 2025)

- Refactor extension to remove Express and use Cursor/VS Code APIs for all communication.
- Ensure all communication and MCP tool logic is Cursor-first (Cursor compatibility is the top priority; VS Code compatibility is a bonus).
- Add a dedicated Output Channel for AI Memory extension logs using the Cursor/VS Code API.
- Review and analyse MCP and Developer Tools logs in `logs/` (especially `2025-05-10 15:19:50.log` and matching `vscode-app-*.log` files) for startup, error, and runtime issues.
- Rebuild and repackage the extension after refactoring.
- Test activation, command registration, and MCP tool operation in Cursor (and optionally VS Code).
- Document findings and next steps in this ROADMAP.

_Last updated: 2025-05-10_

---

For a detailed, step-by-step experimental plan to safely prototype advanced MCP features (chunked file access, metadata, planner tools), see [EXPERIMENTAL-MCP-PLAN.md](./EXPERIMENTAL-MCP-PLAN.md).

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
