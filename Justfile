# Justfile for AI Memory Extension (Cursor-Only)
# Updated for Biome + Vitest Coverage

# Setup

install:
    pnpm install
    cd src/webview && pnpm install

# Clean
clean:
    pnpm store prune

clean-all:
    rm -rf dist node_modules .turbo .next out coverage
    cd src/webview && rm -rf dist node_modules coverage

# Build backend (with esbuild)

backend:
    node esbuild.js --production

backend-watch:
    node esbuild.js --watch

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

# Dev Mode (backend watch + webview dev)

dev:
    just backend-watch & just webview-dev

# Quality Checks (Biome)

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

# Full Rebuild with new quality checks
ship: clean install backend webview-build quality package

rebuild: clean ship

# Development workflow helpers
dev-check: lint-all typecheck
    echo "✅ Code quality checks passed"

dev-fix: lint-fix-all format-all
    echo "🎨 Code formatting applied"

# Coverage workflow
coverage: test-coverage-all
    echo "📊 Coverage reports generated"
    echo "📁 Main: ./coverage/lcov.info"
    echo "📁 Webview: ./src/webview/coverage/lcov.info"

# VSIX packaging with npm (for vsce compatibility)
# vsix-npm:
#     rm -rf node_modules
#     npm install --omit=dev
#     pnpm run package:vsce

# Restore pnpm environment after packaging
restore-pnpm:
    rm -rf node_modules
    pnpm install
    cd src/webview && pnpm install
