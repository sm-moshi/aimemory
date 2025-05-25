# Phase 2: Build System (Rollup + SWC)

## Goal

Replace legacy `esbuild` setup with a modern Rollup+SWC toolchain.

## Steps

1. **✅ Remove `esbuild.js` and legacy scripts**
   - ✅ Delete any `esbuild.js` bundling code.

2. **✅ Install dependencies**

   ```bash
   pnpm add -D rollup @rollup/plugin-node-resolve @rollup/plugin-commonjs @rollup/plugin-json @swc/core rollup-plugin-swc3
   ```

   - ✅ All required dependencies installed
   - ✅ Legacy esbuild dependencies removed
   - ℹ️ **Note**: Using `@rollup/plugin-swc` instead of `rollup-plugin-swc3` (official plugin, better choice)

3. **✅ Create `rollup.config.ts`**
   - ✅ Include builds for:
     - `src/extension.ts` → `dist/extension.cjs`
     - `src/mcp/mcpServerCli.ts` → `dist/index.js`
   - ✅ Use `@rollup/plugin-node-resolve`, `commonjs`, and `swc`.
   - ℹ️ **Note**: Implemented as `rollup.config.js` (works perfectly)

4. **✅ Transpile with SWC**
   - ✅ Use `@rollup/plugin-swc` for fast, modern TypeScript transpilation.

5. **✅ Keep Vite for Webview**
   - ✅ Retain Vite only for webview subproject (`src/webview/`).

6. **✅ Output structure**

   ```folder
   dist/
   ├── extension.cjs  ✅
   └── index.js       ✅
   ```

7. **✅ Update `package.json` scripts**
   - ✅ Replace any `esbuild` commands with:

     ```json
     "build": "rollup -c"
     ```

## Notes

- SWC outperforms TSC and Babel in MCP extension projects.
- This will unify server and extension build pipelines.

## ✅ Phase 2 Status: **COMPLETE**

## **Overall Progress: 100% Complete** 🎉

✅ **Major work completed**: Rollup+SWC build system is fully functional
✅ **Build targets working**: Both extension and MCP server build correctly
✅ **Performance improved**: SWC provides faster transpilation than legacy setup
✅ **Dependencies cleaned**: All legacy esbuild references removed

**Result**: Phase 2 migration **COMPLETE**! Modern, fast build system is operational.
