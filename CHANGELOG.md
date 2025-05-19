## [0.4.1](https://github.com/sm-moshi/aimemory/compare/v0.4.0...v0.4.1) (2025-05-19)



# 0.4.0 (2025-05-18)


### Bug Fixes

* allow checking if server is already running when opening dashboard in cases other instances are running ([9dd3ad9](https://github.com/sm-moshi/aimemory/commit/9dd3ad97b0ec344343fc35b4059a32ad33cc02d6))
* build script, extension icon and license ([0c30b5e](https://github.com/sm-moshi/aimemory/commit/0c30b5e0832eed1e33d05748981033b938133eca))
* critical bug not allowing rules to be read by new Cursor sessions ([baae365](https://github.com/sm-moshi/aimemory/commit/baae36551c6054267fe8098704af23f038d2eefa))
* remove temp folder ([1f7dfec](https://github.com/sm-moshi/aimemory/commit/1f7dfec1530cbee9266d8d20c82a3b81b74b6e8e))
* update README and adding github workflows ([758635b](https://github.com/sm-moshi/aimemory/commit/758635bd4efb5a9228fc2dce0e4d7999c74727d0))
* using global env for workflow secrets ([767c042](https://github.com/sm-moshi/aimemory/commit/767c042aef4f1ea533e6d7240f3bf9a2d05670de))
* workflow ([0c35c21](https://github.com/sm-moshi/aimemory/commit/0c35c21832b2de40222786581edc7833ab9c8d18))
* workflows ([1e95a73](https://github.com/sm-moshi/aimemory/commit/1e95a73fdf0d8e50106370ed3bd47ad3ef8375f2))


### Features

* add CLI/stdio MCP server, modular memory bank, and robust Cursor integration ([170eb33](https://github.com/sm-moshi/aimemory/commit/170eb3306bb5dbba2dc6044ecb23cee6a881f8dd))
* add Command Palette log level picker for Output Channel ([b6dd82d](https://github.com/sm-moshi/aimemory/commit/b6dd82d3ab02d165120c996f81069894df5dfea2))
* add how does it work section ([e53bc6e](https://github.com/sm-moshi/aimemory/commit/e53bc6e6856c3f0d192e4c1a5932e233815b2e16))
* add webview for managing the rules with React, vite and the vscode apis ([bf107a6](https://github.com/sm-moshi/aimemory/commit/bf107a6e9f87a864f3208d098a37f54200ab4b31))
* allow automatic MCP Config update ([e35d946](https://github.com/sm-moshi/aimemory/commit/e35d946a6c293d0ddfdbacb41bff81c1f7bd9f7e))
* allow loading the cursor rules from separate markdown file for better DX ([72e5bae](https://github.com/sm-moshi/aimemory/commit/72e5bae87591072e5968a0cc53be89df7015d830))
* allow to manage MCP server from the dashboard ([d8ce2dd](https://github.com/sm-moshi/aimemory/commit/d8ce2dd657a272841bc065353aabc1afdef752b3))
* **core:** migrate memory bank logic to src/core/ and update imports ([b0c7aa6](https://github.com/sm-moshi/aimemory/commit/b0c7aa69c70c9c54da15fb74f5118b570c70a68b))
* extension working with showing memory-bank and rules status on the dashboard ([79c807b](https://github.com/sm-moshi/aimemory/commit/79c807bfbb9925435dabf04de3f643dfd53020f5))
* initial extension with simple MCP server (Not fully working yet) ([f587322](https://github.com/sm-moshi/aimemory/commit/f58732228681209537190f55032d2981bf862942))
* **logging:** add Logger class, dynamic log level config, and refac to use new logger ([f4921ee](https://github.com/sm-moshi/aimemory/commit/f4921ee22fa3f779d4467aaa38e23720428098c9))
* **logging:** route all webview status and MCP actions to Output Channel via sendLog ([cc77647](https://github.com/sm-moshi/aimemory/commit/cc77647468b0db50731bbdfa5dc65bbb40d6dd8e))
* MCP working with commands to start/stop it from within the VSCode extension ([a836b2b](https://github.com/sm-moshi/aimemory/commit/a836b2b37d856c84af2ad8eb15621145091ea574))
* memory bank implementation ([e7e2ec0](https://github.com/sm-moshi/aimemory/commit/e7e2ec00a74a998a23aac92667ded18adf49fc78))
* migrate MCP server/tools to src/mcp/ and update all imports ([e6d2b12](https://github.com/sm-moshi/aimemory/commit/e6d2b12fc3eb107f9e1e2bfb0b5515a5dc828a80))
* modularise webview code under src/webview/ and update all imports ([849eb6c](https://github.com/sm-moshi/aimemory/commit/849eb6c0e0a68528583b48058859e484230a1cb5))
* restore and enhance MCP memory bank, planning, and build system ([c4484cb](https://github.com/sm-moshi/aimemory/commit/c4484cb483c86cc508d3822132b33fdb62765e0f))
* update README file ([551578c](https://github.com/sm-moshi/aimemory/commit/551578c1829965a92a326b589a4b02f06a850e43))



## [Unreleased]

## [0.3.2] - 2025-05-18

**Small Maintenance Release** 🐹

- Bumped extension version to 0.3.2 in `package.json` for release tracking.
- No functional or code changes; this is a version alignment and housekeeping update.

## [0.3.1] - 2025-05-18

**CI Unification, Version Bump, and Ruleset Improvements** 🦔

- Consolidated build, lint, and test GitHub Actions into a single, robust CI workflow for clarity and maintainability.
- Added `workflow_dispatch` to the ESLint workflow for manual runs.
- Updated `.gitignore` and `.cursorignore` to reflect new folder structure and ignore rules.
- Bumped version to 0.3.1 in `package.json` and `src/webview/package.json`.
- Added `mise.toml` for Node version management.
- Added `.cursor/rules/memory-bank.mdc` (auto-generated) to codify memory bank rules for Cursor agents.
- Minor tweaks to `esbuild.js` and submodule for consistency.
- All changes follow KISS and DRY principles, prioritising clarity and maintainability.

**Comprehensive Refactor & Cursor-First Improvements** 🐹

- **Build & Config**
  - Unified and cleaned up TypeScript configs, build scripts (esbuild for Node/extension/server, Vite for webview), and ignore files.
  - Removed unnecessary dependencies, deduplicated scripts, and ensured all build/test/dev commands are documented in `README.md`.

- **MCP Server & Memory Bank**
  - Migrated from Express/HTTP to Cursor/VS Code APIs and stdio transport for core operations.
  - Refactored MCP tool and resource registration for both extension and CLI/server, ensuring feature parity and compliance (including per-file resource access).
  - Centralised template logic in `src/lib/memoryBankTemplates.ts` for context-agnostic use.
  - Implemented health/status commands (`/memory health`), self-healing, and robust file/folder checks.
  - Updated command handler to support `/memory init`, `/memory health`, and other commands, with clear help text.

- **Logging, Output, and Diagnostics**
  - Added `aimemory.showOutput` command to show the Output Channel in the extension.
  - Verbose logging for all major actions (file loads, updates, checks, method calls, and errors) for improved debugging and traceability.
  - Output Channel feature: basic output is visible, verbose logging is implemented, further interactivity and UI feedback are planned.

- **Webview & UI/UX**
  - Updated React webview to use new tool names, fixed button labels, and improved feedback for memory bank actions.
  - Enhanced status indicators and ensured UI reflects backend state.
  - The "Reset the rules" button in the webview now provides user feedback and error handling for all code paths.
  - Improved user notifications and logging for rule resets and memory bank repairs.

- **Ruleset & Self-Healing**
  - The ruleset and `.mdc` file are now up-to-date; self-healing is robust and automatic.
  - MCP tool usage is now enforced and documented in the rules.

- **Bugfixes & Diagnostics**
  - Fixed command routing, tool name mismatches, and clarified error messages.
  - Diagnosed and resolved issues with command interception by Cursor's default AI agent.
  - Ensured per-file resource registration for full MCP compliance.

- **Documentation & Roadmap**
  - Updated `TODO.md` and `ROADMAP.md` to reflect current progress, robust self-healing, and logging improvements.
  - Highlighted upcoming features: chunked file access, metadata tools, rule-bound validation, advanced UI, and automated testing/CI.

- **User Experience**
  - Ensured all changes are idiomatic, maintainable, and follow KISS/DRY principles.
  - Prioritised Cursor-first operation, with VS Code compatibility as a bonus.
  - Provided clear, actionable summaries and next steps throughout.

- **Memory Bank Update**
  - Used the summary to update `memory-bank/progress/current.md` with a detailed progress log and next steps.

---

## [0.2.5] - 2025-05-13

**Major Features & Refactors** 🐹

- **MCP CLI/stdio Entrypoint**
  - Added CLI entrypoint for the MCP server, enabling Cursor 0.50+ compatibility and context-agnostic operation.
  - MCP server now supports both HTTP/SSE and stdio transports.

- **Full Modularisation**
  - Refactored all core, MCP, webview, types, and utils code into modular, context-agnostic structure.
  - Improved separation of concerns and maintainability.

- **Webview UI Overhaul**
  - Modern React/Tailwind UI with status, repair, and management controls.
  - Added "Repair Memory Bank" and "Reset Rules" buttons with robust feedback and error handling.

- **Self-Healing Memory Bank**
  - Memory bank files and folders are now auto-created and repaired at runtime.
  - Robust error handling and user feedback for all file operations.

- **Rules Management**
  - `.cursor/rules/memory-bank.mdc` is always up-to-date and can be reset from the webview.
  - Improved ruleset enforcement and documentation.

- **Command Handler Improvements**
  - `/memory status`, `/memory update`, and `/memory help` commands are robust and user-friendly.
  - Improved error handling and feedback.

- **Express/CORS Deprecation (In Progress)**
  - Ongoing refactor to remove Express in favour of pure MCP SDK/Node APIs for Cursor-first design.

- **Testing & Type/Lint Improvements**
  - TypeScript config and type definitions are now robust and error-free.
  - Improved test coverage and reliability.

- **Packaging & Ignore Rules**
  - VSIX and npm packages are now clean, minimal, and only include runtime essentials.

- **Documentation**
  - `IMPLEMENTATION.md`, `memory-bank-rules.md`, and other docs are up-to-date and detailed.

---

## [0.2.4] - 2025-05-13

**Modularisation, Checklist, and Documentation Updates** 🐹

- Moved all shared types to `src/types/` and shared utils to `src/utils/` for improved modularity and maintainability.
- Updated all checklists in `docs/wip/RESTRUCTURE_PLAN.md` to mark types and utils migration as complete.
- Confirmed `.js.map` files are included in the package for best debugging practices.
- Added a future refactor note to remove Express from the MCP server in `RESTRUCTURE_PLAN.md`.
- Ensured all living docs (`RESTRUCTURE_PLAN.md`, `MCP_SERVER.md`, `EXPERIMENTAL-MCP-PLAN.md`) reflect the current modular structure and progress.
- No functional changes to extension logic; all changes are structural, documentation, and checklist updates.

---

## [0.1.5] - 2025-05-11

**Packaging & Ignore Rules Fixes** 🐹

- Reviewed and optimised `.npmignore`, `.vscodeignore`, and `.cursorignore` to ensure only necessary files are included in VSIX and npm packages.
- Fixed previous issues where packaging or ignore rules caused the extension to break or exclude required files.
- Successfully built and packaged version 0.1.5; the VSIX is now clean, minimal, and includes only runtime essentials.
- 0.1.5 is now the new stable baseline for further development and release.

---

## [0.1.4] - 2025-05-10

**Major Changes & Features** 🐹

- Modular memory bank structure: files grouped by context (core, systemPatterns, techContext, progress)
- Self-healing: missing or incomplete files are auto-created from templates
- Improved error feedback: Output Channel and webview now show clear repair/status messages
- Webview UI: new "Repair Memory Bank" button, improved feedback, and robust status checks
- MCP server: hardened with readiness checks, port failover, and better error handling
- `/memory status` and webview now surface self-healing and repair actions
- Documentation and troubleshooting guides updated for migration and new workflows

**Migration & Compatibility**

- Migration guide drafted in memory bank: see `progress/current.md` for upgrade steps
- Backwards compatible with most flat memory banks, but modularisation is recommended
- All major actions and errors now logged for easier debugging

---

## [0.1.2] - 2025-05-09

**Packaging & Workflow Improvements** 🐹

- Fixed VSIX packaging to strictly exclude `.cursor/`, `memory-bank/`, `docs/`, and `test/` folders using hard excludes in `.vscodeignore`.
- Ensured only `README.md`, `LICENSE.md`, `CHANGELOG.md`, and built extension assets are included in the VSIX.
- Updated `Justfile` with a robust `ship` function: now runs `pnpm install` and `npm install --omit=dev` before packaging, and verifies VSIX contents with `vsce ls --tree`.
- Confirmed extension runs in Extension Development Host Mode for safe testing and development.
- Improved documentation and workflow for privacy and reproducibility in packaging.

---

## [0.1.1] - 2025-05-09

**Experimental & In-Progress** 🐹

- Added a dedicated Output Channel for AI Memory extension logs to improve diagnostics and user feedback.
- Updated TODO and ROADMAP with a robust, Cursor-first action plan for startup, error handling, and MCP tool reliability.
- Planned and prepared for retry/backoff logic, JSON validation, and deferred activation for MCP server connection.
- Improved project documentation to clarify modular memory bank structure and workflows.
- Minor cleanups and preparation for further refactoring (Express removal, command queuing, etc.).
- This version is running in the Extension Development Host, but is not yet fully stable for production use.

---

## [0.1.0] - 2025-05-09

**Major Changes & Features** 🐹

- Refactored memory bank to a modular, async, and robust structure with readiness checks and error handling
- Hardened MCP server: automatic port failover, robust error handling, and readiness checks for all endpoints
- Modernised webview UI: added "Initialise Memory Bank" and "Update Memory Bank" buttons, clear feedback, and error handling
- Reduced bundle size by marking large dependencies as external in the build config
- Improved developer experience: clearer feedback, robust error messages, and up-to-date documentation
- Updated documentation: `README.md`, `IMPLEMENTATION.md`, `TROUBLESHOOTING.md`, and this changelog
- All code and docs now use British English and follow project rules (emoji, GitFlow, etc.)
- All linter and type errors resolved; tests pass successfully

**Fixes & Improvements**

- Fixed asset and markdown copying in build process
- Ensured all MCP tools and webview actions fail gracefully if memory bank is not ready
- Improved error handling and logging throughout the extension
- Cleaned up and optimised build scripts

---

## [0.0.7] - 2025-04-04

**Bug Fixes**

- Allow checking if server is already running when opening dashboard in cases other instances are running ([9dd3ad9](https://github.com/Ipenywis/aimemory/commit/9dd3ad97b0ec344343fc35b4059a32ad33cc02d6))
- Build script, extension icon and license ([0c30b5e](https://github.com/Ipenywis/aimemory/commit/0c30b5e0832eed1e33d05748981033b938133eca))
- Critical bug not allowing rules to be read by new Cursor sessions ([baae365](https://github.com/Ipenywis/aimemory/commit/baae36551c6054267fe8098704af23f038d2eefa))
- Remove temp folder ([1f7dfec](https://github.com/Ipenywis/aimemory/commit/1f7dfec1530cbee9266d8d20c82a3b81b74b6e8e))
- Update README and adding github workflows ([758635b](https://github.com/Ipenywis/aimemory/commit/758635bd4efb5a9228fc2dce0e4d7999c74727d0))
- Using global env for workflow secrets ([767c042](https://github.com/Ipenywis/aimemory/commit/767c042aef4f1ea533e6d7240f3bf9a2d05670de))
- Workflow ([0c35c21](https://github.com/Ipenywis/aimemory/commit/0c35c21832b2de40222786581edc7833ab9c8d18))
- Workflows ([1e95a73](https://github.com/Ipenywis/aimemory/commit/1e95a73fdf0d8e50106370ed3bd47ad3ef8375f2))

**Features**

- Add how does it work section ([e53bc6e](https://github.com/Ipenywis/aimemory/commit/e53bc6e6856c3f0d192e4c1a5932e233815b2e16))
- Add webview for managing the rules with React, vite and the vscode apis ([bf107a6](https://github.com/Ipenywis/aimemory/commit/bf107a6e9f87a864f3208d098a37f54200ab4b31))
- Allow automatic MCP Config update ([e35d946](https://github.com/Ipenywis/aimemory/commit/e35d946a6c293d0ddfdbacb41bff81c1f7bd9f7e))
- Allow loading the cursor rules from separate markdown file for better DX ([72e5bae](https://github.com/Ipenywis/aimemory/commit/72e5bae87591072e5968a0cc53be89df7015d830))
- Allow to manage MCP server from the dashboard ([d8ce2dd](https://github.com/Ipenywis/aimemory/commit/d8ce2dd657a272841bc065353aabc1afdef752b3))
- Extension working with showing memory-bank and rules status on the dashboard ([79c807b](https://github.com/Ipenywis/aimemory/commit/79c807bfbb9925435dabf04de3f643dfd53020f5))
- Initial extension with simple MCP server (Not fully working yet) ([f587322](https://github.com/Ipenywis/aimemory/commit/f58732228681209537190f55032d2981bf862942))
- MCP working with commands to start/stop it from within the VSCode extension ([a836b2b](https://github.com/Ipenywis/aimemory/commit/a836b2b37d856c84af2ad8eb15621145091ea574))
- Memory bank implementation ([e7e2ec0](https://github.com/Ipenywis/aimemory/commit/e7e2ec00a74a998a23aac92667ded18adf49fc78))
- Update README file ([551578c](https://github.com/Ipenywis/aimemory/commit/551578c1829965a92a326b589a4b02f06a850e43))

---

## 0.0.6 - 2025-04-04

**Bug Fixes**

- Various bug fixes and improvements.
