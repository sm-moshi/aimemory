# AI Memory Extension for Cursor 🐹

[![Build Status](https://img.shields.io/github/actions/workflow/status/sm-moshi/aimemory/ci.yml?branch=main)](https://github.com/sm-moshi/aimemory/actions)
[![License](https://img.shields.io/github/license/sm-moshi/aimemory)](LICENSE)
[![Version](https://img.shields.io/github/package-json/v/sm-moshi/aimemory/main)](package.json)

_A robust, production-ready memory bank extension for Cursor and VS Code, enabling persistent, context-aware AI workflows with comprehensive MCP server integration._

**Status**: ✅ **Phase 1 Complete** - Production-ready core architecture with advanced features

---

## 🧠 Overview

AI Memory is a mature extension for [Cursor](https://www.cursor.com/) (0.50+) and VS Code, providing persistent, context-aware memory for LLMs and agents. It features a modern React webview, a robust MCP server (CLI/stdio-only), and a fully modular, self-healing memory bank system.

**Key Benefits:**

- **Zero Configuration**: Auto-creates and manages your memory bank structure
- **Performance Optimized**: Streaming operations for large files, intelligent caching
- **Security Hardened**: Comprehensive input validation and path traversal protection
- **Developer Experience**: Modern toolchain with hot reload, comprehensive testing

> **Architecture**: Uses **STDIO transport exclusively** for MCP server communication. Express/HTTP transport removed in favour of STDIO-only design for maximum Cursor compatibility.

---

## ✨ Key Features

- **🏗 Modular Memory Bank**: Structured folders for project, product, technical, and progress context
- **⚡ High-Performance MCP Server**: Async operations, streaming for large files, intelligent retry logic
- **🖥 Modern Webview UI**: React 19 + Tailwind 4 interface for memory bank management
- **🔧 Self-Healing Architecture**: Auto-repair missing files, migration detection, template-based recovery
- **💬 Native Chat Integration**: `/memory` commands in Cursor chat for direct memory interaction
- **🛡 Security First**: Zod validation, path sanitisation, resource limits, secure error handling
- **📊 Performance Monitoring**: Streaming metrics, cache statistics, health monitoring
- **🔄 Version Control Ready**: Git-friendly structure, supports team collaboration

---

## 🛠 Installation & Quick Start

### Prerequisites

- [Cursor](https://www.cursor.com/) 0.50+ or VS Code 1.96+
- Node.js 20 LTS
- pnpm 10.11+

### Development Setup

```bash
# Clone and setup
git clone https://github.com/sm-moshi/aimemory.git
cd aimemory
pnpm install

# Build extension
pnpm run build

# Launch development environment
# Press F5 in Cursor to launch extension host
```

### Using the Extension

1. **Open Dashboard**: `AI Memory: Open Dashboard` (Command Palette)
2. **Start MCP Server**: Click "Start MCP Server" in webview
3. **Initialize Memory Bank**: Click "Initialize Memory Bank"
4. **Use Chat Commands**: `/memory status`, `/memory list`, `/memory read <file>`

---

## 💡 Usage Examples

```text
# Check memory bank status
/memory status

# List all memory files
/memory list

# Read specific memory file
/memory read core/projectbrief.md

# Read current progress
/memory read progress/current.md
```

**Webview Actions:**

- **Repair Memory Bank**: Auto-fix missing or corrupted files
- **Health Check**: Comprehensive system validation
- **Performance Metrics**: View streaming and cache statistics

---

## 🏗 Project Structure

```markdown
aimemory/
├── src/                    # Extension source code
│   ├── core/              # Business logic & services
│   ├── services/          # Domain-specific modules
│   ├── infrastructure/    # Framework adapters
│   ├── mcp/              # MCP server implementation
│   ├── webview/          # React UI
│   └── types/            # TypeScript definitions
├── memory-bank/          # Development memory bank (submodule)
├── docs/                 # Documentation
└── dist/                 # Build outputs
```

**Core Technologies:**

- **Backend**: Node.js 20, TypeScript 5.8, MCP Protocol
- **Build**: Rollup 4 + SWC, Biome (linting/formatting)
- **Frontend**: React 19, Tailwind 4, Vite 6
- **Testing**: Vitest, @vscode/test-cli, >90% coverage

---

## ⚙️ Configuration

**Zero Configuration Required** - All files auto-created on first use.

**Available Settings** (VS Code Settings):

- `aimemory.logLevel`: Control logging verbosity (`info`, `debug`, `trace`)

**Advanced Configuration:**

- Memory bank templates auto-customize based on project type
- MCP server configuration automatically managed
- Cursor rules integration built-in

---

## 🧪 Development

```bash
# Development with hot reload
pnpm run dev

# Run tests
pnpm test                    # Unit tests
pnpm test:extension          # VS Code extension tests
pnpm test:coverage           # Coverage report

# Code quality
pnpm run lint:fix            # Auto-fix linting issues
pnpm run check-types         # TypeScript validation

# Build for production
pnpm run build:prod          # Optimized build
pnpm run package             # Create .vsix package
```

**Quality Standards:**

- **British English** enforced throughout codebase
- **Test Coverage**: >90% maintained
- **Code Quality**: Biome linting, strict TypeScript
- **Performance**: Streaming for files >1MB, memory-bounded operations

---

## 🔧 Advanced Features

### Performance Optimizations

- **Streaming Manager**: Intelligent file reading (normal vs streaming based on size)
- **LRU Cache**: Bounded cache with automatic eviction
- **Resource Management**: Memory pressure handling, cleanup lifecycle
- **Retry Logic**: Exponential backoff for transient failures

### Security Features

- **Input Validation**: Comprehensive Zod schemas for all inputs
- **Path Security**: Path traversal prevention, file system boundaries
- **Resource Limits**: File size limits, cache bounds, operation timeouts
- **Error Handling**: Secure error messages, no sensitive data leakage

### Architecture Patterns

- **Clean Architecture**: Clear separation of concerns (utils → services → core)
- **Dependency Injection**: Testable, modular service design
- **Result Pattern**: Explicit error handling throughout
- **Event-Driven**: Async operations with proper cleanup

---

## 🚀 Production Ready

> **Phase 1 Complete** ✅

- [x] Core architecture implementation
- [x] Performance optimization
- [x] Security hardening
- [x] Comprehensive testing
- [x] Modern toolchain integration

> **Next: Phase 2 - Metadata System**

- [ ] Intelligent file categorisation
- [ ] Advanced search capabilities
- [ ] Content analysis and insights
- [ ] Multi-workspace support

---

## 🛠 Troubleshooting

> **Common Issues:**

- **MCP Server**: Check webview dashboard or `/memory status`
- **Missing Files**: Use webview "Repair Memory Bank" button
- **Performance**: Large files automatically use streaming
- **Logs**: Check Output Channel → "AI Memory"

**Documentation:**

- [Troubleshooting Guide](docs/guides/TROUBLESHOOTING.md)
- [Migration Guide](docs/guides/MIGRATION_GUIDE.md)
- [Quick Start Guide](docs/guides/QUICKSTART.md)

---

## 🤝 Contributing

We welcome contributions! Please see our development standards:

**Quality Requirements:**

- British English spelling throughout
- Comprehensive test coverage for new features
- Biome formatting compliance
- TypeScript strict mode compliance

```bash
# Before committing
pnpm run lint:fix && pnpm test && pnpm run build
```

**Development Process:**

- Branch from `develop` using `feature/*` naming
- Follow [Gitflow](https://nvie.com/posts/a-successful-git-branching-model/) workflow
- Ensure all tests pass and coverage maintained

---

## 📜 License & Links

**License:** [Apache 2.0](LICENSE)

**Documentation:**

- [Implementation Details](docs/wip/IMPLEMENTATION.md) -> not yet public
- [Phase 1 Architecture](docs/v1.0/PHASE_1_CORE_ARCHITECTURE.md) -> not yet public
- [GitHub Best Practices](docs/devs/github-repo-guide.md) -> not yet public

**Support:**

- [GitHub Issues](https://github.com/sm-moshi/aimemory/issues) for bugs/features
- [GitHub Discussions](https://github.com/sm-moshi/aimemory/discussions) for questions
