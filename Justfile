# Justfile for AI Memory Extension (Cursor-Only)
# Setup

install:
    pnpm install
    cd src/webview && pnpm install

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

#ä Dev Mode (backend watch + webview dev)

dev:
    just backend-watch & just webview-dev

# Quality Checks

lint:
    pnpm run lint

typecheck:
    pnpm run check-types

# Test

test:
    pnpm run test

# Packaging

package:
    pnpm run package

vsix:
    pnpm run package:vsce

ship: install lint typecheck backend webview-build test package vsix
    pnpm install
    npm install --omit=dev
    vsce ls --tree

# Clean

clean:
    rm -rf dist node_modules .turbo .next out coverage
    cd src/webview && rm -rf dist node_modules

# Full Rebuild

rebuild: clean ship

# VSIX packaging with npm (for vsce compatibility)
vsix-npm:
    rm -rf node_modules
    npm install --omit=dev
    pnpm run package:vsce

# Restore pnpm environment after packaging
restore-pnpm:
    rm -rf node_modules
    pnpm install
    cd src/webview && pnpm install
