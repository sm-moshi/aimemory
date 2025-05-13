# AI Memory Extension TODO

## Core Features

-   [x] Modularise memory bank structure
-   [x] Implement robust MCP server with error handling
-   [x] Add webview UI for memory bank actions
-   [x] Migrate flat memory bank to modular structure
-   [x] Add MCP CLI/stdio entrypoint for Cursor-first operation
-   [x] Self-healing memory bank and rules management
-   [x] MCP tools exposed and robust
-   [~] Refactor extension to remove Express and use Cursor/VS Code APIs for all communication. (in progress)
-   [~] User-configurable log levels for Output Channel (in progress: basic output visible, needs verbose logging and interactivity)
-   [~] Webview error and event reporting to Output Channel (in progress)
-   [ ] Add version control integration for memory bank files
-   [ ] Implement remote/cloud memory bank support
-   [ ] Ensure all communication and MCP tool logic is Cursor-first (Cursor compatibility is the top priority; VS Code compatibility is a bonus).
-   [ ] Review and analyse MCP and Developer Tools logs in `logs/` for startup, error, and runtime issues.
-   [x] Rebuild and repackage the extension after refactoring (ignore files reviewed and fixed, 0.1.5 is new stable baseline).
-   [ ] Test activation, command registration, and MCP tool operation in Cursor (and optionally VS Code).
-   [ ] Document findings and next steps in `docs/ROADMAP.md`.
-   [ ] Replace `Initialize Memory Bank` with `/memory init` command
-   [ ] Add command: 'AI Memory: Create Memory Bank Rule' to create/restore memory-bank.mdc from template or rules source
    -   [ ] Implement user prompt to overwrite if file exists (see cursor-rules-service.ts)

## UI/UX

-   [x] Webview: Initialise/Update Memory Bank buttons
-   [x] Webview UI overhaul (React/Tailwind, status, repair, management)
-   [ ] Fix "Initialise Memory Bank" button
    -   [ ] Text: Replace "Initialize Memory Bank"
-   [ ] Webview: Memory Bank: always red "missing"
-   [ ] Webview: Keep "MCP Server: Running/Stopped" status indicator in sync
-   [ ] Webview: Add a "refresh" button to the memory bank view
-   [ ] Webview: File preview and diff viewer
-   [ ] Webview: Visualise memory bank relationships
-   [~] Webview: Advanced error and status feedback (in progress)

## AI/Agent Integration

-   [x] Expose memory bank via MCP tools/resources
-   [~] Improve AI context reset and "active context" workflows (in progress)
-   [ ] Add AI-driven suggestions for memory bank updates

## Documentation

-   [x] Move all public docs to `docs/`
-   [x] Update `README.md`, `IMPLEMENTATION.md`, `TROUBLESHOOTING.md`
-   [ ] Add user/contributor guides for advanced features
-   [ ] Add screenshots and diagrams to docs

## Testing & Release

-   [x] Manual testing of migration and MCP tools
-   [ ] Add automated tests for all core features
-   [ ] Set up CI/CD for VSIX and Open VSX releases

## Community & Feedback

-   [ ] Gather user feedback for v0.2.x
-   [ ] Add community templates and extension points

---

**Notes (2025-05-13):**
- The codebase is now Cursor-first, with VS Code compatibility as a bonus.
- Modularisation, webview overhaul, MCP CLI/stdio, and self-healing are complete.
- Express removal is the last major refactor in progress.
- Docs, rules, and packaging are up-to-date.

For a detailed, step-by-step experimental plan to safely prototype advanced MCP features (chunked file access, metadata, planner tools), see [EXPERIMENTAL-MCP-PLAN.md](../experimental/EXPERIMENTAL-MCP-PLAN.md).

_Last updated: 2025-05-13 🐹_
