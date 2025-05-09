# AI Memory Extension TODO

## Core Features
- [x] Modularise memory bank structure
- [x] Implement robust MCP server with error handling
- [x] Add webview UI for memory bank actions
- [x] Migrate flat memory bank to modular structure
- [ ] Add version control integration for memory bank files
- [ ] Implement remote/cloud memory bank support
- [ ] Refactor extension to remove Express and use Cursor/VS Code APIs for all communication.
- [ ] Ensure all communication and MCP tool logic is Cursor-first (Cursor compatibility is the top priority; VS Code compatibility is a bonus).
- [ ] Add a dedicated Output Channel for AI Memory extension logs using the Cursor/VS Code API.
- [ ] Review and analyse MCP and Developer Tools logs in `logs/` (especially `2025-05-09 15:19:50.log` and matching `vscode-app-*.log` files) for startup, error, and runtime issues.
- [ ] Rebuild and repackage the extension after refactoring.
- [ ] Test activation, command registration, and MCP tool operation in Cursor (and optionally VS Code).
- [ ] Document findings and next steps in `docs/ROADMAP.md`.

## UI/UX
- [x] Webview: Initialise/Update Memory Bank buttons
- [ ] Webview: File preview and diff viewer
- [ ] Webview: Visualise memory bank relationships
- [ ] Webview: Advanced error and status feedback

## AI/Agent Integration
- [x] Expose memory bank via MCP tools/resources
- [ ] Improve AI context reset and "active context" workflows
- [ ] Add AI-driven suggestions for memory bank updates

## Documentation
- [x] Move all public docs to `docs/`
- [x] Update `README.md`, `IMPLEMENTATION.md`, `TROUBLESHOOTING.md`
- [ ] Add user/contributor guides for advanced features
- [ ] Add screenshots and diagrams to docs

## Testing & Release
- [x] Manual testing of migration and MCP tools
- [ ] Add automated tests for all core features
- [ ] Set up CI/CD for VSIX and Open VSX releases

## Community & Feedback
- [ ] Gather user feedback for v0.2.x
- [ ] Add community templates and extension points

---

For a detailed, step-by-step experimental plan to safely prototype advanced MCP features (chunked file access, metadata, planner tools), see [EXPERIMENTAL-MCP-PLAN.md](./EXPERIMENTAL-MCP-PLAN.md).

_Last updated: 2025-05-09_
