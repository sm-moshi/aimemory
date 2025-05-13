# WIP: Source & Documentation Restructuring Plan 🐹

_Last updated: (WIP, update date after each major edit)_

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

## 2. Current `src/` Structure & Issues

- `src/` contains a mix of backend logic, webview UI, types, utils, and test files
- Some logic is tightly coupled (e.g., MCP server, memory bank, webview manager)
- Webview code is nested but not always clearly separated
- Test and utility files are mixed in with core logic
- Lacks clear boundaries for future modules (e.g., planner, chunking, advanced MCP tools)

---

## 3. Planned `src/` Structure & Principles

**Guiding Principles:**
- KISS, DRY, YAGNI, idiomatic TypeScript
- Async-first, concurrency-aware where needed
- Modular: separate core, webview, utils, types, and test logic
- Prepare for future features (planner, chunking, etc.)

**Proposed Structure:**
```
src/
  core/           # Core memory bank logic (MemoryBankService, migration, etc.)
  mcp/            # MCP server, tool/resource registration, protocol logic
  webview/        # Vite/React webview app (src/, components/, utils/)
  types/          # Shared TypeScript types/interfaces
  utils/          # Shared utilities (logger, file ops, etc.)
  test/           # Unit/integration tests
  extension.ts    # VS Code/Cursor extension entry point
  ...             # (other entry points as needed)
```

---

## 4. Documentation (`docs/`) Restructuring

**Current State:**
- `/docs/` contains a mix of guides, experimental docs, roadmap, and WIP notes
- Some files are duplicated or out of date
- New conventions are being adopted (see below)

**New Conventions:**
- `/docs/guides/`: User-facing guides (Quickstart, Migration, Troubleshooting)
- `/docs/experimental/`: Advanced, unstable, or in-progress features
- `/docs/wip/`: Work-in-progress, drafts, ongoing refactors (this file)
- `/docs/maybe/`: Private notes (gitignored)
- `/docs/README.md`: Index and navigation
- Each folder has a `README.md` or `index.md` for navigation

**Migration Status:**
- Most guides have been moved to `/docs/guides/`
- Experimental plans and advanced logging docs are in `/docs/experimental/`
- This plan and future refactor notes go in `/docs/wip/`
- Some files still need review and migration (see checklist)

---

## 5. Checklist / Roadmap

### Codebase (`src/`)
- [x] Audit all files in `src/` and categorise by function
- [x] Move core logic to `src/core/` (memoryBank.ts, memoryBankServiceCore.ts, memoryBankCore.ts moved; all imports updated)
- [x] Move MCP server/tools to `src/mcp/` (mcpServer.ts, mcpServerCli.ts, coreMemoryBankMCP.ts moved; all imports and build config updated)
- [x] Move webview code to `src/webview/` (webviewManager.ts moved; all imports updated; modularisation errors resolved)
- [ ] Move shared types to `src/types/`
- [ ] Move shared utils to `src/utils/`
- [ ] Move tests to `src/test/`
- [ ] Refactor entry points for clarity
- [ ] Update imports and resolve breakages
- [ ] Document new structure in `IMPLEMENTATION.md`

### Documentation (`docs/`)
- [x] Create `/docs/guides/` and move user guides
- [x] Create `/docs/experimental/` for advanced features
- [x] Create `/docs/wip/` for WIP/refactor notes
- [x] Update `/docs/README.md` as index
- [x] Review and migrate any remaining docs
- [x] Add/update `README.md` or `index.md` in each folder (RESTRUCTURE_PLAN.md serves as the living index for `/docs/wip/`)
- [ ] Keep this plan up to date as changes are made

---

## 6. Notes
- This is a living document. Update after each major change.
- Use checklists to track progress and next steps.
- Reference this plan in PRs and team discussions.

---

## 7. Categorisation of Current `src/` Files (2025-05-11)

### File/Folder Mapping to New Structure

- **core/**
  - memoryBank.ts
  - memoryBankServiceCore.ts
  - memoryBankCore.ts
- **mcp/**
  - mcpServer.ts
  - mcpServerCli.ts
  - coreMemoryBankMCP.ts
  - commandHandler.ts (if tightly coupled to MCP logic)
- **webview/**
  - webviewManager.ts
  - webview/ (entire folder, including src/, components/, utils/)
- **types/**
  - types.ts
  - types/ (entire folder)
- **utils/**
  - utils/ (entire folder)
  - lib/cursor-rules-service.ts
  - lib/cursor-rules.ts
  - lib/mcp-prompts.ts
- **rules/**
  - lib/rules/ (entire folder)
- **test/**
  - test/ (entire folder)
- **assets/**
  - assets/ (entire folder)
- **Entry Points**
  - extension.ts (remains at src/ root)
  - cli.ts (remains at src/ root)

### Rationale for Each Category

- **core/**: Contains all context-agnostic memory bank logic, ensuring reusability across CLI, extension, and server. This supports Cursor-first and modular design.
- **mcp/**: All MCP server logic, tool/resource registration, and protocol handling. Keeps Cursor/Claude integration clean and testable.
- **webview/**: Vite/React app and related managers, fully isolated for UI development and Cursor/VS Code compatibility.
- **types/**: Shared TypeScript types/interfaces for strong typing and maintainability.
- **utils/**: Shared utilities, logging, file ops, and Cursor-specific helpers, promoting DRY and error-free code.
- **rules/**: All Cursor rules logic, kept modular for easy updates and compliance.
- **test/**: Unit and integration tests, supporting robust, repeatable validation (inspired by cursor-tools best practices).
- **assets/**: Static resources, icons, and images, separated for clarity.
- **Entry Points**: `extension.ts` and `cli.ts` remain at the root for discoverability and alignment with MCP/VS Code standards.

### Next Steps

1. Review this mapping and rationale.
2. Move files/folders to their new locations (one category at a time, with tests after each move).
3. Update imports and resolve any breakages.
4. Document each migration step and update this plan after every major change.

**This plan ensures a Cursor-first, modular, and error-free codebase, supporting future features and robust testing.**

_Last updated: 2025-05-11 🐹_

#### Migration Log (2025-05-12)
- Moved memoryBank.ts, memoryBankServiceCore.ts, and memoryBankCore.ts to core/.
- Updated all imports in the codebase to reflect the new structure.
- Build and lint are clean; only a known VS Code test runner issue remains (unrelated to migration).
- All core logic is now modular and ready for further refactor. 🐹
- Moved mcpServer.ts, mcpServerCli.ts, and coreMemoryBankMCP.ts to mcp/.
- Updated all imports and build configuration to reflect the new structure.
- Build and lint are clean; only a known VS Code test runner issue remains (unrelated to migration).
- MCP logic is now modular and ready for further refactor. 🐹

#### Migration Log (2025-05-13)
- Moved webviewManager.ts to webview/.
- Updated all imports in the codebase to reflect the new structure.
- All webview logic is now modular and isolated under src/webview/.
- Build and lint are clean; only a known VS Code test runner issue remains (unrelated to migration).
- Webview code is now ready for further modularisation and UI improvements. 🐹
