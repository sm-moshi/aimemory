# Migration Guide: Upgrading to AI Memory 0.1.x+

_This guide helps you migrate from older versions of AI Memory._

This guide helps you migrate from older versions of AI Memory (0.0.6/0.0.7 and earlier) to the new modular, self-healing, and robust 0.1.x+ releases.

## Key Changes

-   Modular memory bank structure: files are now grouped by context (core, systemPatterns, techContext, progress)
-   Self-healing: missing or incomplete files are auto-created from templates
-   Improved error feedback: Output Channel and webview now show clear repair/status messages
-   Webview UI: new "Repair Memory Bank" button, improved feedback, and robust status checks
-   MCP server: hardened with readiness checks, port failover, and better error handling

## Migration Steps

1. **Backup your old memory bank** (`memory-bank/` and `.cursor/rules/`)
2. **Install or upgrade to AI Memory 0.1.x+** (rebuild and install the latest VSIX)
3. **Open the webview dashboard** and start the MCP server
4. **Click "Repair Memory Bank"** to auto-create any missing files and migrate to the modular structure
5. **Check the Output Channel and webview** for any errors or self-healing actions
6. **Review and update your memory bank content** as needed (see new modular file layout)
7. **Consult the troubleshooting guide** if you encounter issues

## Notes

-   The new structure is backwards compatible with most flat memory banks, but modularisation is recommended for best results.
-   All major actions and errors are now logged for easier debugging.
-   For more details, see the [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

---

_Last updated: 2025-05-10 🐹_
