# Experimental MCP Feature Prototyping Plan (Chunking, Metadata, Planner)

> **Warning:** This plan is experimental. Only follow these steps if you are comfortable with advanced MCP features and are prepared to roll back if instability occurs. The following steps are based on advanced internal planning for MCP features.

---

## 🦾 Step-by-Step Experimental Plan

### 1. Prepare a Safe Branch
- Create a new feature branch: `feature/experimental-mcp-chunking`
- Ensure your current main/dev branch is stable and all changes are committed

### 2. Implement Chunked File Access
- Add a `chunkIndex` parameter to the `get-memory-bank-file` MCP tool:
  ```ts
  chunkIndex: z.number().optional()
  // Handler logic:
  const file = memoryBank.getFile(input.filename);
  const content = input.chunkIndex !== undefined
    ? file.getChunk(input.chunkIndex)
    : file.getContent();
  ```
- Add file size warnings:
  ```ts
  let status: "ok" | "large" | "too_large" = "ok";
  if (file.size > 15000) status = "large";
  if (file.size > 30000) status = "too_large";
  return { content, status };
  ```
- Test with large files to ensure chunking works and UI/agent does not crash

### 3. Add Metadata Tool
- Implement a `get-memory-bank-metadata` MCP tool:
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
- Use this metadata in the webview or agent for smarter file handling

### 4. Prototype Planner Tools
- Implement a `/plan` command tool to extract plan from `progress/current.md` and `core/activeContext.md`:
  ```ts
  // In CommandHandler
  if (args.includes("plan")) {
    const plan = memoryBank.getPlanSummary();
    return `📋 Current Plan:\n\n${plan}`;
  }
  // In MemoryBankService
  getPlanSummary(): string {
    const ctx = this.getFile("core/activeContext.md");
    const roadmap = this.getFile("progress/current.md");
    return extractBulletPoints(ctx.content + "\n" + roadmap.content);
  }
  ```
- Add an `update-current-plan` tool for AI/user to submit new plans (with validation and optional backup):
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
- Test `/plan` and plan update flows in Cursor

### 5. Safety & Rollback
- Commit after each major step
- If instability or regressions occur, revert to the previous stable commit
- Keep all experimental code behind feature flags or in isolated modules if possible

### 6. Document Findings
- Record all issues, successes, and lessons learned in this file or a dedicated log
- If successful, propose merging to main/dev and update ROADMAP/TODO accordingly

---

_Last updated: 2025-05-10_

**Note:** Documentation and findings are being updated as part of the robustness/self-healing memory bank work (May 2025). 🐹

---

_For stable features and usage, see [README.md](../guides/README.md)._
