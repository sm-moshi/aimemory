# 📦 AI Memory 0.1.0+ — MCP Restoration Task Breakdown

This roadmap outlines the steps required to fully restore and enhance the AI Memory MCP layer for version 0.1.0 or higher.

---

## 🎯 Goal

Rebuild a production-ready MCP interface that:
- Fully respects memory-bank folder and rules
- Provides chunked access, size awareness, rule guidance
- Offers robust `/memory` and `/plan` toolchain for Cursor

---

## 🧩 Phase 1: Core MCP Features

### 1. ✅ `get-memory-bank-file`
- Already implemented in `mcpServer.ts`
- Add: size warning logic
- Add: optional `chunkIndex` parameter
- Use: `MemoryBankService.getFile().chunked(index, size)`

### 2. ✅ `update-memory-bank-file`
- Already exists
- Add: rule-bound validation hook (optional)
- Add: append/replace mode distinction

### 3. 🔧 `get-memory-bank-metadata`
- Add new MCP tool: returns list of files, size, modifiedAt, chunkCount
- Enables smarter UIs in Cursor and CLI

---

## 📚 Phase 2: Planner Tools

### 4. 🔄 `/plan` Command Tool
- Tool: `get-current-plan`
- Returns extracted bullet list from:
  - `progress/current.md`
  - `core/activeContext.md`
- May also reference `modes/current.md`

### 5. 🧠 `update-current-plan`
- Allows AI to submit a rewritten or extended plan
- Confirmed via validation prompt
- Optional: snapshot backup saved to `.bak/`

---

## 🪓 Phase 3: Rule Enforcement & Limits

### 6. 🔐 Chunked Reading
- Implement `chunkIndex` support in MCP layer
- Default chunk size: 2000 characters
- Return: `[chunkIndex, totalChunks, content]`

### 7. ⚠️ Size Warnings
- If file >15 KB, show `⚠️ large file` tag
- If >30 KB, show `❌ will not load unless chunked`

### 8. 🧾 `.mdc` Planner Mode
- Read memory-bank `.mdc` rule
- Set `"plannerMode": true` → auto-enable `/plan` logic
- If enabled, `/plan` becomes default response tool

---

## 🔀 Phase 4: DevOps & Integration

### 9. ✅ Git Flow: `release/0.1.0`
- Start with: `git checkout -b release/0.1.0 develop`
- Merge in all MCP patch work
- Tag after full MCP re-validation + test suite

### 10. 🔖 Tag & Publish
- Tag: `v0.1.0` or `v0.2.0` depending on depth
- Publish to VSCE + OVSX
- Add changelog entry with full MCP spec coverage

---

## 🧪 Optional (Advanced)

- Implement `cursor-rules-service` feedback hooks (MCP-driven)
- Support MCP UI injection of `memory-bank-rules.md` in dashboard
- Allow GitHub Action to regenerate `.mdc` from schema

---

This plan sets the stage for a stable AI Memory 0.1.0+ that gives Cursor a complete, chunk-aware, memory-smart interface.