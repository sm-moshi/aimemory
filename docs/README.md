# Documentation Index & Migration Plan 🐹

Welcome to the AI Memory documentation! This index explains the new folder structure and helps you find the right guide, reference, or plan for your needs.

## 📁 Folder Structure Overview

| Folder                | Purpose                                           | Example Contents                                                    |
| --------------------- | ------------------------------------------------- | ------------------------------------------------------------------- |
| `/docs/guides/`       | User guides, onboarding, migration                | `QUICKSTART.md`, `MIGRATION_GUIDE.md`, `TROUBLESHOOTING.md`         |
| `/docs/experimental/` | Experimental features, design spikes              | *(none currently)*                                                  |
| `/docs/wip/`          | Work-in-progress, drafts, ongoing refactors       | `RESTRUCTURE_PLAN.md`, `ROADMAP.md`, `TODO.md`, `IMPLEMENTATION.md`, `DETAILED_OUTPUT.md`, `EXPERIMENTAL-MCP-PLAN.md`, `MCP_SERVER.md` |
| `/docs/maybe/`        | Private, unvetted, or personal notes (gitignored) | (not tracked)                                                       |

## 📚 Main Docs
- [Quickstart Guide](./guides/QUICKSTART.md)
- [Migration Guide](./guides/MIGRATION_GUIDE.md)
- [Implementation Guide](./wip/IMPLEMENTATION.md)
- [Troubleshooting](./guides/TROUBLESHOOTING.md)
- [Roadmap](./wip/ROADMAP.md)
- [TODO](./wip/TODO.md)
- [Logging & Output Channel (Advanced)](./wip/DETAILED_OUTPUT.md)
- [Experimental MCP Plan](./wip/EXPERIMENTAL-MCP-PLAN.md)
- [MCP Server Guide](./wip/MCP_SERVER.md)

## 🛠️ Migration Checklist
- [x] Move user guides to `/docs/guides/`
- [x] Move experimental docs to `/docs/experimental/`
- [x] Move WIP docs to `/docs/wip/`
- [x] Keep `/docs/maybe/` for private notes (gitignored)
- [x] Update all internal links
- [x] Move advanced/experimental docs to `/docs/wip/` as they stabilise

## 📝 Notes
- Each folder contains a `README.md` or `index.md` for navigation.
- `/docs/maybe/` is for private notes and is not tracked in git.
- This index is up to date as of the latest restructure. 🐹
