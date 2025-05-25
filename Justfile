# Justfile for AI Memory Extension (Cursor-Only)
# Updated for Rollup + SWC + Biome + Vitest Coverage
# Last updated: 2025-05-25

# Setup & Installation

install:
    pnpm install
    cd src/webview && pnpm install

# Clean

clean:
    pnpm store prune

clean-all:
    rm -rf dist node_modules .turbo .next out coverage
    cd src/webview && rm -rf dist node_modules coverage

# Build (Rollup + SWC)

build:
    pnpm run build

build-full:
    pnpm run build:full

build-watch:
    pnpm run watch:rollup

# Webview (React + Vite)

webview-dev:
    cd src/webview && pnpm run dev

webview-build:
    cd src/webview && pnpm run build

webview-lint:
    cd src/webview && pnpm run lint

webview-lint-fix:
    cd src/webview && pnpm run lint:fix

webview-format:
    cd src/webview && pnpm run format

# Dev Mode (rollup watch + webview dev)

dev:
    pnpm run dev

# Quality Checks (Biome + TypeScript)

typecheck:
    pnpm run check-types

lint:
    pnpm run lint

lint-fix:
    pnpm run lint:fix

format:
    pnpm run format

# Comprehensive linting (both main + webview)
lint-all:
    pnpm run lint
    cd src/webview && pnpm run lint

lint-fix-all:
    pnpm run lint:fix
    cd src/webview && pnpm run lint:fix

format-all:
    pnpm run format
    cd src/webview && pnpm run format

# Testing & Coverage

test:
    pnpm run test

# Coverage reporting
test-coverage:
    pnpm run test:coverage

webview-test-coverage:
    cd src/webview && pnpm run test:coverage

test-coverage-all:
    pnpm run test:coverage:all

# Utility Scripts

update-docs-date:
    pnpm run update-docs-date

build-check:
    pnpm run build-check

# Packaging

package:
    pnpm run package

# Quality Gates (comprehensive checks)
quality:
    just lint-all
    just typecheck
    just test-unit

quality-fix:
    just lint-fix-all
    just format-all
    just typecheck

# Full Rebuild with quality checks
ship: clean install build webview-build quality package

rebuild: clean ship

# Development workflow helpers
dev-check: lint-all typecheck
    echo "✅ Code quality checks passed"

dev-fix: lint-fix-all format-all
    echo "🎨 Code formatting applied"

# Pre-commit workflow
pre-commit: dev-fix dev-check
    echo "🚀 Ready for commit"

# Coverage workflow
coverage: test-coverage-all
    echo "📊 Coverage reports generated"
    echo "📁 Main: ./coverage/lcov.info"
    echo "📁 Webview: ./src/webview/coverage/lcov.info"

# Documentation workflow
docs: update-docs-date
    echo "📝 Documentation dates updated"

# Complete development workflow
ready: pre-commit build-check
    echo "✅ All checks passed - ready for packaging"

# Quick development commands
quick-build: typecheck build
quick-fix: lint-fix format

# Restore pnpm environment after packaging
restore-pnpm:
    rm -rf node_modules
    pnpm install
    cd src/webview && pnpm install

# Help command
help:
    @echo "🤖 AI Memory Extension - Available Commands:"
    @echo ""
    @echo "📦 Setup:"
    @echo "  install       - Install all dependencies"
    @echo "  clean         - Clean pnpm store"
    @echo "  clean-all     - Remove all build artifacts and dependencies"
    @echo ""
    @echo "🔨 Build:"
    @echo "  build         - Build extension (fast)"
    @echo "  build-full    - Build extension with full linting"
    @echo "  build-watch   - Build extension in watch mode"
    @echo "  webview-build - Build webview only"
    @echo ""
    @echo "🚀 Development:"
    @echo "  dev           - Start development mode (watch + webview dev)"
    @echo "  webview-dev   - Start webview development server"
    @echo ""
    @echo "🔍 Quality:"
    @echo "  lint          - Lint main code"
    @echo "  lint-all      - Lint main + webview code"
    @echo "  lint-fix-all  - Fix linting issues"
    @echo "  format-all    - Format all code"
    @echo "  typecheck     - Run TypeScript checks"
    @echo "  quality       - Run all quality checks"
    @echo ""
    @echo "🧪 Testing:"
    @echo "  test          - Run extension tests"
    @echo "  test-unit     - Run unit tests"
    @echo "  test-coverage - Generate coverage reports"
    @echo ""
    @echo "📦 Packaging:"
    @echo "  package       - Create VSIX package"
    @echo "  ship          - Full rebuild and package"
    @echo ""
    @echo "🛠 Utilities:"
    @echo "  build-check   - Validate build outputs"
    @echo "  update-docs-date - Update documentation timestamps"
    @echo "  pre-commit    - Run pre-commit checks"
    @echo "  ready         - Complete readiness check"
    @echo ""
    @echo "Use 'just <command>' to run any of these commands."

# Default recipe
default: help
