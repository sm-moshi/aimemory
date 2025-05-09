## [0.1.1](https://github.com/sm-moshi/aimemory/compare/v0.1.0...v0.1.1) (2025-05-09)

### Experimental & In-Progress 🐹

- Added a dedicated Output Channel for AI Memory extension logs to improve diagnostics and user feedback.
- Updated TODO and ROADMAP with a robust, Cursor-first action plan for startup, error handling, and MCP tool reliability.
- Planned and prepared for retry/backoff logic, JSON validation, and deferred activation for MCP server connection.
- Improved project documentation to clarify modular memory bank structure and workflows.
- Minor cleanups and preparation for further refactoring (Express removal, command queuing, etc.).
- This version is running in the Extension Development Host, but is not yet fully stable for production use.

---

## [0.1.0](https://github.com/sm-moshi/aimemory/compare/v0.0.7...v0.1.0) (2025-05-09)

### Major Changes & Features 🐹

- Refactored memory bank to a modular, async, and robust structure with readiness checks and error handling
- Hardened MCP server: automatic port failover, robust error handling, and readiness checks for all endpoints
- Modernised webview UI: added "Initialise Memory Bank" and "Update Memory Bank" buttons, clear feedback, and error handling
- Reduced bundle size by marking large dependencies as external in the build config
- Improved developer experience: clearer feedback, robust error messages, and up-to-date documentation
- Updated documentation: `README.md`, `IMPLEMENTATION.md`, `TROUBLESHOOTING.md`, and this changelog
- All code and docs now use British English and follow project rules (emoji, GitFlow, etc.)
- All linter and type errors resolved; tests pass successfully

### Fixes & Improvements

- Fixed asset and markdown copying in build process
- Ensured all MCP tools and webview actions fail gracefully if memory bank is not ready
- Improved error handling and logging throughout the extension
- Cleaned up and optimised build scripts

## [0.0.7](https://github.com/Ipenywis/aimemory/compare/v0.0.6...v0.0.7) (2025-04-04)



## 0.0.6 (2025-04-04)


### Bug Fixes

* allow checking if server is already running when opening dashboard in cases other instances are running ([9dd3ad9](https://github.com/Ipenywis/aimemory/commit/9dd3ad97b0ec344343fc35b4059a32ad33cc02d6))
* build script, extension icon and license ([0c30b5e](https://github.com/Ipenywis/aimemory/commit/0c30b5e0832eed1e33d05748981033b938133eca))
* critical bug not allowing rules to be read by new Cursor sessions ([baae365](https://github.com/Ipenywis/aimemory/commit/baae36551c6054267fe8098704af23f038d2eefa))
* remove temp folder ([1f7dfec](https://github.com/Ipenywis/aimemory/commit/1f7dfec1530cbee9266d8d20c82a3b81b74b6e8e))
* update README and adding github workflows ([758635b](https://github.com/Ipenywis/aimemory/commit/758635bd4efb5a9228fc2dce0e4d7999c74727d0))
* using global env for workflow secrets ([767c042](https://github.com/Ipenywis/aimemory/commit/767c042aef4f1ea533e6d7240f3bf9a2d05670de))
* workflow ([0c35c21](https://github.com/Ipenywis/aimemory/commit/0c35c21832b2de40222786581edc7833ab9c8d18))
* workflows ([1e95a73](https://github.com/Ipenywis/aimemory/commit/1e95a73fdf0d8e50106370ed3bd47ad3ef8375f2))


### Features

* add how does it work section ([e53bc6e](https://github.com/Ipenywis/aimemory/commit/e53bc6e6856c3f0d192e4c1a5932e233815b2e16))
* add webview for managing the rules with React, vite and the vscode apis ([bf107a6](https://github.com/Ipenywis/aimemory/commit/bf107a6e9f87a864f3208d098a37f54200ab4b31))
* allow automatic MCP Config update ([e35d946](https://github.com/Ipenywis/aimemory/commit/e35d946a6c293d0ddfdbacb41bff81c1f7bd9f7e))
* allow loading the cursor rules from separate markdown file for better DX ([72e5bae](https://github.com/Ipenywis/aimemory/commit/72e5bae87591072e5968a0cc53be89df7015d830))
* allow to manage MCP server from the dashboard ([d8ce2dd](https://github.com/Ipenywis/aimemory/commit/d8ce2dd657a272841bc065353aabc1afdef752b3))
* extension working with showing memory-bank and rules status on the dashboard ([79c807b](https://github.com/Ipenywis/aimemory/commit/79c807bfbb9925435dabf04de3f643dfd53020f5))
* initial extension with simple MCP server (Not fully working yet) ([f587322](https://github.com/Ipenywis/aimemory/commit/f58732228681209537190f55032d2981bf862942))
* MCP working with commands to start/stop it from within the VSCode extension ([a836b2b](https://github.com/Ipenywis/aimemory/commit/a836b2b37d856c84af2ad8eb15621145091ea574))
* memory bank implementation ([e7e2ec0](https://github.com/Ipenywis/aimemory/commit/e7e2ec00a74a998a23aac92667ded18adf49fc78))
* update README file ([551578c](https://github.com/Ipenywis/aimemory/commit/551578c1829965a92a326b589a4b02f06a850e43))



# Change Log

All notable changes to the "aimemory" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Initial release

## [0.1.2] - 2025-05-09

### Packaging & Workflow Improvements 🐹

- Fixed VSIX packaging to strictly exclude `.cursor/`, `memory-bank/`, `docs/`, and `test/` folders using hard excludes in `.vscodeignore`.
- Ensured only `README.md`, `LICENSE.md`, `CHANGELOG.md`, and built extension assets are included in the VSIX.
- Updated `Justfile` with a robust `ship` function: now runs `pnpm install` and `npm install --omit=dev` before packaging, and verifies VSIX contents with `vsce ls --tree`.
- Confirmed extension runs in Extension Development Host Mode for safe testing and development.
- Improved documentation and workflow for privacy and reproducibility in packaging.

---
