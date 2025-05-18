# Justfile for AI Memory Extension (Cursor-Only)
# Setup

install:
    pnpm install
    cd src/webview && pnpm install

# Clean
clean:
    pnpm store prune

clean-all:
    rm -rf dist node_modules .turbo .next out coverage
    cd src/webview && rm -rf dist node_modules

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

# Dev Mode (backend watch + webview dev)

dev:
    just backend-watch & just webview-dev

# Quality Checks

typecheck:
    pnpm run check-types

lint:
    pnpm run lint

# Test

test:
    pnpm run test

# Packaging

package:
    pnpm run package

# The following commands are commented out because there are no corresponding scripts in package.json:
# cli:
#     pnpm run build:cli
# vsix:
#     pnpm run package:vsce

# Full Rebuild
# Removed 'cli' and 'vsix' from ship and rebuild as well
ship: clean install backend webview-build typecheck lint package

rebuild: clean ship

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
