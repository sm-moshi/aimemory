# WIP: Source & Documentation Restructuring Plan 🐹

_Last updated: 2025-05-17_

---

## 1. Motivation & Goals

### Why restructure `src/`?
- Reduce clutter and improve maintainability
- Enforce clear separation of concerns (core logic, webview, utils, types, etc.)
- Make onboarding and navigation easier for contributors
- Align with idiomatic TypeScript/VS Code/extension best practices
- Prepare for future modularity and testability

### Why restructure `docs/`?
- Make user, developer, and experimental docs easy to find
- Separate stable guides from WIP/experimental notes
- Enable clear migration and onboarding paths
- Support living documentation and ongoing refactors

---

## 2. Summary Table: What's Done

| Area                 | Status      | Notes                                         |
| -------------------- | ----------- | --------------------------------------------- |
| Core logic move      | Done        | All core files in `src/core/`                 |
| MCP logic move       | Done        | All MCP files in `src/mcp/`                   |
| Webview move         | Done        | All webview files in `src/webview/`           |
| Types move           | Done        | All types in `src/types/`                     |
| Utils move           | Done        | All utils in `src/utils/`                     |
| Tests move           | Done        | All tests in `src/test/`                      |
| Entry points         | Done        | `extension.ts`, `cli.ts` at root              |
| Imports/build config | Done        | All updated and working                       |
| Docs restructure     | Done        | `/guides/`, `/experimental/`, `/wip/` created |
| Indexing             | Done        | `/docs/README.md` and folder indexes in place |
| Modularisation       | Done        | Confirmed in migration log                    |
| Express removal      | In progress | Last major refactor                           |

---

## 3. Current Structure

```
src/
  core/           # Core memory bank logic
  mcp/            # MCP server, tool/resource registration
  webview/        # Vite/React webview app
  types/          # Shared TypeScript types/interfaces
  utils/          # Shared utilities
  test/           # Unit/integration tests
  extension.ts    # VS Code/Cursor extension entry point
  cli.ts          # MCP CLI/stdio entry point
```

`docs/` is now split into:
- `/guides/`: User-facing guides
- `/experimental/`: Advanced, unstable, or in-progress features
- `/wip/`: Work-in-progress, drafts, ongoing refactors
- `/README.md`: Index and navigation

---

## 4. Migration Log (2025-05-17)
- All core, MCP, webview, types, utils, rules, and test files have been moved to their respective folders.
- Imports and build configuration have been updated to reflect the new structure.
- Modularisation, webview overhaul, MCP CLI/stdio, and self-healing are complete.
- Express removal is the last major refactor in progress.
- The codebase is now Cursor-first, with VS Code compatibility as a bonus.
- Build and lint are clean; only a known VS Code test runner issue remains (unrelated to migration).
- All core logic is now modular and ready for further refactor. 🐹

---

## 5. Next Steps
- Complete Express removal from MCP server (replace with MCP SDK/Node APIs)
- As new features (e.g., planner, chunking) are added, further modularisation may be needed
- Update this plan and the migration log after each major change

---

**This plan ensures a Cursor-first, modular, and error-free codebase, supporting future features and robust testing.**

_Last updated: 2025-05-17 🐹_
