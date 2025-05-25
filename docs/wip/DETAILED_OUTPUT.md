# 📝 AI Memory Extension: Logging & Output Channel (Advanced Guide)

> **Status:** Experimental features. For maintainers and advanced users.
> _Last updated: 2025-05-25 🐹_

## Purpose

This document describes the advanced logging system for the AI Memory extension, including:

- User-configurable log levels (Trace, Debug, Info, Warning, Error, Off)
- Webview-to-extension log forwarding
- Output Channel integration for diagnostics and support
- Recommendations for future-proofing and extensibility

---

## 1. Logging Architecture

- **Central Logger:**
  All extension and webview logs are routed through a singleton `Logger` (`src/utils/log.ts`), ensuring a single Output Channel and consistent formatting.

- **Log Levels:**
  Users can set the log verbosity via the `aimemory.logLevel` setting. The logger respects dynamic config changes.

- **Webview Integration:**
  The webview uses a `sendLog()` utility to forward errors and key events to the extension, which then logs them to the Output Channel.

---

## 2. Usage

- **Setting Log Level:**
  Change `aimemory.logLevel` in settings or via the command palette (`aimemory.setLogLevel`).

- **Viewing Logs:**
  Open the "AI Memory" Output Channel in VS Code or Cursor to see all logs, including webview errors.

- **Structured Logging:**
  Use the `meta` argument for structured data (e.g., `{ tool: "initialize-memory-bank", source: "webview" }`).

---

## 3. Implementation Highlights

- **Logger Singleton:**
  Ensures only one Output Channel is used.
  Example usage:

  ```ts
  import { Logger, LogLevel } from "./utils/log";
  const logger = Logger.getInstance();
  logger.info("Tool started", { tool: "initialize-memory-bank" });
  ```

- **Webview Log Forwarding:**
  In the webview:

  ```ts
  sendLog("Initialise failed", "error", { tool: "initialize-memory-bank" });
  ```

  In the extension:

  ```ts
  case "logMessage":
    logger.log(level, message.text, message.meta);
    break;
  ```

- **Dynamic Log Level:**
  The logger updates its level in real time when the user changes settings.

---

## 4. Best Practices & Recommendations

- **Always use the Logger singleton.**
- **Tag log sources** (e.g., `"webview"`, `"mcpServer"`) for easier diagnostics.
- **Use structured logging** for future extensibility (telemetry, filtering).
- **Do not log sensitive data.**
- **Update documentation** if logging behaviour changes.

---

## 5. Example Output

```
[Webview] 2025-05-17T12:00:00.000Z - INFO Tool failed {"tool":"initialize-memory-bank","reason":"network timeout","source":"webview"}
[Extension] 2025-05-17T12:01:00.000Z - ERROR Unexpected error {"source":"mcpServer"}
```

---

## 6. Further Reading

- For stable usage, see [docs/guides/README.md](../guides/README.md).
- For MCP server logging, see [docs/experimental/MCP_SERVER.md](./MCP_SERVER.md).

---

## 7. Change Log

- 2025-05-17: Simplified and clarified. Removed redundant implementation checklists and peer review. 🐹

---

**This document is for maintainers. For user-facing help, see the main README.**
