# 🧠 AI Memory 0.1.0 MCP Restoration Plan

> This file defines a Cursor-readable, agent-compatible plan to implement, restore, and validate all core MCP memory bank tooling features in the AI Memory extension version 0.1.0.

---

## 📦 Objective

Restore a complete MCP interface with:

- Memory file chunking
- File size-aware metadata
- Full `/memory` and `/plan` tool support
- Cursor `.mdc` compatibility and rule enforcement

---

## 🛠️ Step-by-Step Implementation Plan

### 1. ✅ Restore MCP Tools in `/src/mcpServer.ts`

- **Uncomment** all `registerMCPTools()` logic at:
  - `/src/mcpServer.ts:registerMCPTools()`

```ts
registerTool(getMemoryBankFileTool(...));
registerTool(updateMemoryBankFileTool(...));
```

- Ensure `getMemoryBankFileTool()` and `updateMemoryBankFileTool()` are **imported** from `/src/tools/memoryBankTools.ts`

---

### 2. 🔄 Add `chunkIndex` Support to `getMemoryBankFile`

- Edit: `/src/tools/memoryBankTools.ts`
- In `getMemoryBankFileTool()`, add:

```ts
chunkIndex: z.number().optional()
```

- Update the handler logic:

```ts
const file = memoryBank.getFile(input.filename);
const content = input.chunkIndex !== undefined
  ? file.getChunk(input.chunkIndex)
  : file.getContent();
```

---

### 3. 📏 Enforce Size-Based File Status

- In `/src/tools/memoryBankTools.ts`, inside the response of `getMemoryBankFileTool()`:

```ts
let status: "ok" | "large" | "too_large" = "ok";
if (file.size > 15000) status = "large";
if (file.size > 30000) status = "too_large";
return { content, status };
```

---

### 4. 📋 Implement `get-memory-bank-metadata` Tool

- Add new tool in `/src/tools/memoryBankTools.ts`:

```ts
registerTool({
  name: "get-memory-bank-metadata",
  inputSchema: z.object({}),
  outputSchema: z.array(z.object({
    name: z.string(),
    size: z.number(),
    chunkCount: z.number(),
    modifiedAt: z.string(),
  })),
  handler: () => memoryBank.getAllFiles().map(file => ({
    name: file.name,
    size: file.size,
    chunkCount: file.chunkCount,
    modifiedAt: file.modified.toISOString()
  }))
});
```

---

### 5. 🧠 Implement `/plan` in `CommandHandler`

- File: `/src/commands/commandHandler.ts`

Update `processModesCommand()` to:

```ts
if (args.includes("plan")) {
  const plan = memoryBank.getPlanSummary(); // implement this
  return `📋 Current Plan:

${plan}`;
}
```

---

### 6. 🧾 Add `getPlanSummary()` to `MemoryBankService`

- File: `/src/services/memoryBank.ts`

```ts
getPlanSummary(): string {
  const ctx = this.getFile("core/activeContext.md");
  const roadmap = this.getFile("progress/current.md");
  return extractBulletPoints(ctx.content + "
" + roadmap.content);
}
```

Use helper `extractBulletPoints(text: string)` from `/src/lib/textTools.ts`

---

### 7. 🔄 Add `update-current-plan` Tool

- File: `/src/tools/memoryBankTools.ts`

```ts
registerTool({
  name: "update-current-plan",
  inputSchema: z.object({ newPlan: z.string() }),
  outputSchema: z.object({ status: z.string() }),
  handler: async ({ newPlan }) => {
    memoryBank.updateFile("progress/current.md", newPlan, { mode: "replace" });
    return { status: "ok" };
  }
});
```

---

### 8. 🧪 Confirm `.mdc` Planner Mode Activation

- Check `/memory-bank/memory-bank.mdc`

```md
"plannerMode": true
```

Ensure `CursorRulesService` references this mode when routing `/plan`.

---

## 🔀 Finalization

### 🏁 Git Flow Branching

- Run:

```bash
git checkout -b release/0.1.0 develop
```

- Commit and test all MCP-related additions
- Tag:

```bash
git tag -a v0.1.0 -m "MCP restored: chunking, planning, metadata, updates"
```

- Push and publish:

```bash
pnpm run package:vsce
gh release create v0.1.0 aimemory-0.1.0.vsix --generate-notes
```

---

Cursor may now use this file as a working task memory or restore plan.