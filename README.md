# AI Memory Extension for Cursor 🐹

[![Build Status](https://img.shields.io/github/actions/workflow/status/sm-moshi/aimemory/ci.yml?branch=main)](https://github.com/sm-moshi/aimemory/actions)
[![License](https://img.shields.io/github/license/sm-moshi/aimemory)](LICENSE)
[![Version](https://img.shields.io/github/package-json/v/sm-moshi/aimemory/main)](package.json)

> **Persistent, context-aware memory for AI workflows in Cursor and VS Code**

Give your AI assistant a memory bank that remembers your project context, decisions, and progress across sessions. No more repeating yourself—your AI learns and grows with your project.

---

## 🚀 Quick Start

### Installation

**For Cursor Users:**

1. Install the extension from Cursor marketplace (coming soon)
2. Open Command Palette (`Cmd/Ctrl+Shift+P`)
3. Run: `AI Memory: Open Dashboard`
4. Click "Initialize Memory Bank"

**For Developers:**

```bash
git clone https://github.com/sm-moshi/aimemory.git
cd aimemory
pnpm install && pnpm build
# Press F5 in Cursor/VS Code to launch extension
```

### Basic Usage

```bash
# Chat commands in Cursor
/memory status              # Check memory bank health
/memory list               # See all stored memories
/memory read projectbrief  # Read specific memory file
```

---

## ✨ What It Does

- **🧠 Persistent Memory**: Your AI remembers project context between sessions
- **📁 Organized Structure**: Auto-creates folders for project briefs, technical context, and progress
- **🔄 Self-Healing**: Automatically repairs missing or corrupted files
- **💬 Chat Integration**: Use `/memory` commands directly in Cursor chat
- **🛡️ Secure**: Input validation, path protection, no data sent to external services

---

## 📖 Example Memory Structure

```text
memory-bank/
├── core/
│   ├── projectbrief.md     # What your project does
│   └── activeContext.md    # Current focus areas
├── progress/
│   └── current.md          # Recent work and next steps
├── systemPatterns/
│   └── architecture.md     # Technical decisions
└── techContext/
    └── stack.md           # Technology choices
```

---

## 🛠️ Key Features

- **Zero Configuration** - Works out of the box
- **STDIO MCP Server** - Optimized for Cursor compatibility
- **React Dashboard** - Modern webview for memory management
- **Streaming Support** - Handles large files efficiently
- **British English** - Consistent language throughout

---

## 📚 Documentation

- [Phase 4 Restructuring Plan](docs/phase-4-restructuring-plan.md) - Current development progress
- [Troubleshooting Guide](docs/guides/TROUBLESHOOTING.md) - Common issues and solutions
- [Contributing Guidelines](CONTRIBUTING.md) - How to contribute

---

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes following our [coding standards](docs/guides/CODING_STANDARDS.md)
4. Run tests: `pnpm test`
5. Submit a pull request

**Requirements:**

- British English throughout codebase
- Comprehensive test coverage
- Follow existing code patterns

---

## 📄 License & Support

**License:** [Apache 2.0](LICENSE)

**Need Help?**

- 🐛 [Report Issues](https://github.com/sm-moshi/aimemory/issues)
- 💬 [Ask Questions](https://github.com/sm-moshi/aimemory/discussions)
- 📖 [Read Documentation](docs/)

---

Built with ❤️ for the Cursor and VS Code communities
