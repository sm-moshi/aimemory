# Justfile for AI Memory Extension (Cursor-Only)

# 🚀 Setup

install:
  pnpm install

# 🧠 Build backend (with esbuild)

backend:
  node esbuild.js --production

backend-watch:
  node esbuild.js --watch

# 🌐 Webview (React + Vite)

webview-dev:
  cd src/webview && pnpm run dev

webview-build:
  cd src/webview && pnpm run build

# 👀 Dev Mode (backend watch + webview dev)

dev:
  just --shell fish     backend:watch &     webview:dev

# 🧹 Quality Checks

lint:
  pnpm run lint

typecheck:
  pnpm run check-types

# ✅ Test

test:
  pnpm run test

# 📦 Packaging

package:
  pnpm run package

vsix:
  pnpm run package:vsce

# 🧼 Clean

clean:
  rm -rf dist node_modules .turbo .next out coverage