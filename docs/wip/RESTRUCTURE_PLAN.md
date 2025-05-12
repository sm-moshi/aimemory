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
- [ ] Audit all files in `src/` and categorise by function
- [ ] Move core logic to `src/core/`
- [ ] Move MCP server/tools to `src/mcp/`
- [ ] Move webview code to `src/webview/`
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
