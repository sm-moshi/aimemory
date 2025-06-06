# AI Memory Extension Quickstart Guide

> _Last updated: 2025-06-05_

Welcome to the AI Memory extension for Cursor and VS Code! This guide will help you install, set up, and use the extension for persistent, context-aware AI workflows using the Memory Bank technique.

---

## 🚀 Installation

### From Cursor Extension Panel (Recommended)

1. Open Cursor.
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X).
3. Search for "AI Memory".
4. Click **Install**.

### From VSIX File

1. Download the latest `.vsix` from [GitHub releases](https://github.com/sm-moshi/aimemory/releases).
2. In Cursor, open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P).
3. Run "Extensions: Install from VSIX..." and select the file.

_For troubleshooting installation, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)._

---

## 🏗️ Initial Setup

### Quick Start

1. **Install the extension** (see above).
2. **Open your project workspace** in Cursor.
3. **Run `AI Memory: Start MCP Server`** from the Command Palette.
   - Creates a `memory-bank/` folder structure if missing
   - Starts the MCP server using stdio transport
   - Updates your Cursor MCP config automatically

### Available Commands

Access these via Command Palette (Ctrl+Shift+P / Cmd+Shift+P):

- **`AI Memory: Start MCP Server`** - Initialize and start the MCP server
- **`AI Memory: Open Dashboard`** - Launch the webview UI
- **`AI Memory: Update Cursor MCP Config`** - Refresh MCP configuration
- **`AI Memory: Stop MCP Server`** - Stop the running server
- **`AI Memory: Show Output Channel`** - View extension logs

---

## 🧠 Using the Memory Bank

### Memory Bank Structure

The extension creates a modular folder structure:

```text
memory-bank/
├── core/                    # Essential project information
│   ├── projectBrief.md     # Project overview and goals
│   ├── productContext.md   # Product requirements and context
│   └── activeContext.md    # Current focus and priorities
├── systemPatterns/         # Architecture and design patterns
│   ├── index.md           # Pattern overview
│   ├── architecture.md    # System architecture
│   ├── patterns.md        # Design patterns used
│   └── scanning.md        # Code analysis patterns
├── techContext/           # Technical stack and environment
│   ├── index.md          # Tech stack overview
│   ├── stack.md          # Technology choices
│   ├── dependencies.md   # Key dependencies
│   └── environment.md    # Development environment
└── progress/             # Project tracking and history
    ├── index.md         # Progress overview
    ├── current.md       # Current tasks and status
    └── history.md       # Completed work history
```

### Webview Dashboard

- **Launch**: Run `AI Memory: Open Dashboard` from Command Palette
- **Features**:
  - Initialize missing memory bank files
  - View server status and health checks
  - Monitor MCP server connection
  - Access extension logs and diagnostics

### MCP Tools (Available to Cursor AI)

The extension provides these MCP tools for Cursor's AI agent:

- **`initialize-memory-bank`** - Create all required files and structure
- **`list-memory-bank-files`** - List all memory bank files
- **`read-memory-bank-files`** - Read multiple files at once
- **`read-memory-bank-file`** - Read a specific file
- **`update-memory-bank-file`** - Update file content safely
- **`health-check-memory-bank`** - Check system health

---

## 💡 Best Practices & Tips

### For Users

- **Use the webview dashboard** for all memory bank management
- **Let the AI manage files** - the MCP tools handle file operations safely
- **Check the Output Channel** if you encounter issues (`AI Memory: Show Output Channel`)
- **Keep your workspace organized** - the memory bank works best with structured projects

### For AI Agents

- **Always check health** before major operations
- **Use `read-memory-bank-files`** to load context efficiently
- **Validate before updates** - check file existence and permissions
- **Log operations** for debugging and audit trails

### Integration with Cursor

- The extension automatically configures Cursor's MCP settings
- AI agents can access memory bank through MCP tools
- All communication uses stdio transport (no HTTP endpoints)
- Persistent context is maintained across Cursor sessions

---

## 🔧 Technical Details

### MCP Implementation

- **Transport**: stdio (not HTTP)
- **Protocol**: Model Context Protocol (MCP) v1.12+
- **Communication**: Direct process communication with Cursor
- **Configuration**: Automatically updates `.cursor/mcp.json`

### File Operations

- **Self-healing**: Missing files auto-created from templates
- **Validation**: All file operations include safety checks
- **Logging**: Comprehensive operation logging for debugging
- **Error handling**: Graceful degradation when files unavailable

---

## 📚 More Information

- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — Common issues and solutions
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) — Upgrading from older versions
- [Architecture Overview](../devs/architecture-overview.md) — Technical implementation details
- [GitHub Repository](https://github.com/sm-moshi/aimemory) — Source code and releases

---

## 🐛 Getting Help

1. **Check logs**: Use `AI Memory: Show Output Channel` for detailed error information
2. **Review health**: Use the webview dashboard to check system status
3. **Common issues**: See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for solutions
4. **Report bugs**: Create an issue on the [GitHub repository](https://github.com/sm-moshi/aimemory/issues)
