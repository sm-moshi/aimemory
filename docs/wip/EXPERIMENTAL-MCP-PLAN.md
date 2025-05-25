# Experimental MCP Feature Prototyping Plan (Chunking, Metadata, Planner)

> **Warning:** This plan is experimental. Only follow these steps if you are comfortable with advanced MCP features and are prepared to roll back if instability occurs. The following steps are based on advanced internal planning for MCP features.

---

## 🚦 Feature Status Tracker (2025-05-17)

| Feature               | Status      | Notes                              |
| --------------------- | ----------- | ---------------------------------- |
| Chunked file access   | Not started | Schema below; see step 2           |
| Metadata tool         | Not started | Schema below; see step 3           |
| Planner tools (/plan) | Not started | Schema below; see step 4           |
| update-current-plan   | Not started | Needs consent/validation           |
| Session/state mgmt    | Planned     | Consider for chunked/planner tools |
| Security/consent      | Planned     | Required for file updates          |
| Test plan             | Planned     | Manual + automated (see below)     |

---

## 🦾 Step-by-Step Experimental Plan

### 1. Prepare a Safe Branch

- Create a new feature branch: `feature/experimental-mcp-chunking`
- Ensure your current main/dev branch is stable and all changes are committed

### 2. Implement Chunked File Access

- **Schema:**

  ```ts
  const ChunkedFileInput = z.object({
    filename: z.string(),
    chunkIndex: z.number().optional(),
  });
  ```

- **Handler logic:**

  ```ts
  const file = memoryBank.getFile(input.filename);
  const content = input.chunkIndex !== undefined
    ? file.getChunk(input.chunkIndex)
    : file.getContent();
  let status: "ok" | "large" | "too_large" = "ok";
  if (file.size > 15000) status = "large";
  if (file.size > 30000) status = "too_large";
  return { content, status };
  ```

- **Test:** Use large files to ensure chunking works and UI/agent does not crash.
- **Session:** Consider session ID if chunking is stateful.

### 3. Add Metadata Tool

- **Schema:**

  ```ts
  const MetadataOutput = z.array(z.object({
    name: z.string(),
    size: z.number(),
    chunkCount: z.number(),
    modifiedAt: z.string(),
  }));
  ```

- **Handler:**

  ```ts
  registerTool({
    name: "get-memory-bank-metadata",
    inputSchema: z.object({}),
    outputSchema: MetadataOutput,
    handler: () => memoryBank.getAllFiles().map(file => ({
      name: file.name,
      size: file.size,
      chunkCount: file.chunkCount,
      modifiedAt: file.modified.toISOString()
    }))
  });
  ```

- **Test:** Validate output in webview/agent for various file sets.

### 4. Prototype Planner Tools

- **/plan tool:**
  - **Handler:**

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

- **update-current-plan tool:**
  - **Schema:**

    ```ts
    const UpdatePlanInput = z.object({ newPlan: z.string() });
    const UpdatePlanOutput = z.object({ status: z.string() });
    ```

  - **Handler:**

    ```ts
    registerTool({
      name: "update-current-plan",
      inputSchema: UpdatePlanInput,
      outputSchema: UpdatePlanOutput,
      handler: async ({ newPlan }) => {
        // TODO: Require user consent/validation before update
        memoryBank.updateFile("progress/current.md", newPlan, { mode: "replace" });
        return { status: "ok" };
      }
    });
    ```

- **Test:** Test `/plan` and plan update flows in Cursor. Require explicit user consent for updates.

### 5. Safety, Rollback & Feature Flags

- Commit after each major step
- If instability or regressions occur, revert to the previous stable commit
- Keep all experimental code behind feature flags or in isolated modules if possible

### 6. Document Findings & Test Plan

- Record all issues, successes, and lessons learned in this file or a dedicated log
- If successful, propose merging to main/dev and update ROADMAP/TODO accordingly
- **Test plan:**
  - Manual: Large file chunking, metadata output, planner flows, consent prompts
  - Automated: Add unit/integration tests for each tool and edge case

---

_Last updated: 2025-05-25 🐹_

**Note:** Documentation and findings are being updated as part of the robustness/self-healing memory bank work (May 2025).

---

_For stable features and usage, see [README.md](../guides/README.md)._
