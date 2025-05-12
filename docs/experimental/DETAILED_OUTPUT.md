# Detailed Output Channel Logging with Webview Integration

> **Warning:** This document describes experimental, unstable, or in-progress features. Use with caution and expect breaking changes.

_Last updated: 2025-05-11 🐹_

_This document is formatted for optimal Markdown readability._

## Overview

This guide describes how to implement a robust, user-configurable logging system for the AI Memory extension, combining:

- **User-configurable log levels** (Trace, Debug, Info, Warning, Error, Off)
- **Webview error and event reporting** directly to the Output Channel

This ensures all critical actions and errors—whether from the backend or the webview UI—are visible in the dedicated Output Channel, improving diagnostics and user support.

---

## Migration Rationale

- **Traceability:** Users and developers can see all important events and errors in one place.
- **User control:** Users can set how verbose the logs are, reducing noise or increasing detail as needed.
- **Webview integration:** Errors and feedback from the webview (e.g., button failures, tool errors) are no longer lost in the browser console—they are logged persistently.

---

## Implementation Steps (Preferred Approach)

### 1. Use a Central Logger Class (Singleton)

Create a single `Logger` class in `src/utils/log.ts`:

```ts
import * as vscode from "vscode";

export enum LogLevel { Trace, Debug, Info, Warning, Error, Off }

export class Logger {
  private static instance: Logger;
  private output = vscode.window.createOutputChannel("AI Memory");
  private level: LogLevel = LogLevel.Info;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }

  log(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
    if (level >= this.level && this.level !== LogLevel.Off) {
      const prefix = `[Webview] ${new Date().toISOString()} - ${LogLevel[level].toUpperCase()}`;
      const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
      this.output.appendLine(`${prefix} ${msg}${metaStr}`);
    }
  }

  info(msg: string, meta?: Record<string, unknown>) { this.log(LogLevel.Info, msg, meta); }
  error(msg: string, meta?: Record<string, unknown>) { this.log(LogLevel.Error, msg, meta); }
  debug(msg: string, meta?: Record<string, unknown>) { this.log(LogLevel.Debug, msg, meta); }
}
```

Always use `Logger.getInstance()` to avoid multiple Output Channels.

### 2. Dynamic Log Level Configuration

In `src/extension.ts`, read the log level from config and update the logger:

```ts
import { Logger, LogLevel } from "./utils/log";

function parseLogLevel(levelStr: string): LogLevel {
  switch (levelStr) {
    case "trace": return LogLevel.Trace;
    case "debug": return LogLevel.Debug;
    case "info": return LogLevel.Info;
    case "warning": return LogLevel.Warning;
    case "error": return LogLevel.Error;
    default: return LogLevel.Info;
  }
}

const logger = Logger.getInstance();
const config = vscode.workspace.getConfiguration("aimemory");
logger.setLevel(parseLogLevel(config.get<string>("logLevel")!));

vscode.workspace.onDidChangeConfiguration(e => {
  if (e.affectsConfiguration("aimemory.logLevel")) {
    const levelStr = vscode.workspace.getConfiguration("aimemory").get<string>("logLevel")!;
    logger.setLevel(parseLogLevel(levelStr));
  }
});
```

(Optional) Persist the log level in `context.globalState` for UX polish.

### 3. Webview-to-Extension Log Messaging

In the webview (e.g., `src/webview/src/utils/message.ts`):

```ts
export function sendLog(text: string, level: "info" | "error" = "info", meta?: Record<string, unknown>) {
  if (window.vscodeApi) {
    window.vscodeApi.postMessage({
      command: "logMessage",
      level,
      text,
      meta,
    });
  } else {
    console[level === "error" ? "error" : "log"]("Log fallback:", text, meta);
  }
}
```

Use `sendLog()` in all error handlers and important actions in the webview:

```ts
await callMCPTool("initialize-memory-bank").catch((err) => {
  sendLog(`Initialise failed: ${err.message}`, "error", { tool: "initialize-memory-bank" });
});
```

### 4. Handle Webview Log Messages in Extension

In your extension's webview message handler (e.g., `src/webviewManager.ts` or `src/extension.ts`):

```ts
import { Logger, LogLevel } from "./utils/log";
const logger = Logger.getInstance();

// ...
case "logMessage": {
  const level = message.level === "error" ? LogLevel.Error : LogLevel.Info;
  logger.log(level, message.text, message.meta);
  break;
}
```

### 5. Structured Logging and Source Tagging (Recommended for Future-Proofing)

Use the `meta` argument to include structured data (e.g., tool name, error reason, source):

```ts
logger.info("Tool failed", { tool: "initialize-memory-bank", reason: "network timeout", source: "webview" });
```

This makes logs easier to parse, grep, and route for diagnostics or telemetry.

### 6. Documentation

Update `README.md` and this guide to explain:

- How to set the log level
- That webview errors and important events now appear in the Output Channel
- The benefits of structured logging and source tagging

---

## Checklist

### 1. Logger & Log Level Infrastructure
- [x] Create `Logger` class and `LogLevel` enum in `src/utils/log.ts`
- [x] Add `aimemory.logLevel` config to `package.json`
- [x] On extension activation, read config and set logger level
- [x] Listen for config changes and update logger level dynamically

### 2. Extension Logging Refactor
- [x] Remove all usage of `getOutputChannel` and direct `appendLine` in extension code
- [x] Refactor `src/memoryBank.ts` to use `Logger`
- [ ] Refactor other extension files (e.g., `src/mcpServer.ts`, `src/commandHandler.ts`, etc.) to use `Logger` (if needed)

### 3. Webview-to-Extension Log Messaging
- [x] Create `sendLog()` utility in `src/webview/src/utils/message.ts`
- [x] In extension's webview message handler (e.g., `src/webviewManager.ts`), handle `"logMessage"` and route to `Logger`
- [x] Refactor webview UI/actions to use `sendLog()` for errors and key events

### 4. Command Palette Integration (Optional)
- [x] Register a command (e.g., `aimemory.setLogLevel`) for changing log level via quick-pick UI

### 5. Documentation & Testing
- [ ] Update `README.md` to document log level and Output Channel features
- [ ] Manual test: log level changes, webview error reporting, Output Channel output in Cursor/VS Code

---

## Example Output

```text
[Webview] 2025-05-11T22:38:12.311Z - INFO Tool failed {"tool":"initialize-memory-bank","reason":"network timeout","source":"webview"}
[Webview] 2025-05-11T22:38:13.114Z - ERROR Tool update-memory-bank-file failed {"tool":"update-memory-bank-file","reason":"404 Not Found","source":"webview"}
```

---

## Notes

- Webview log queueing is only needed if you ever want to send logs from the extension to the webview (not required for current design).
- Always use the singleton Logger to avoid multiple Output Channels.
- Type safety for `meta` is recommended if you expand structured logging.

---

## Appendix: ChatGPT Review and Recommendations

_The following section is a peer review and rationale for the above approach._

---

Your plan is well thought out, forward-compatible, and strikes a good balance between developer diagnostics and user-facing robustness. That said, here are a few targeted recommendations to make it even cleaner and more extensible:

---

### ✅ Recommended Improvements

#### 1. Use a Central Logger Class Instead of Loose Functions

Instead of spreading logging functions (`log()`, `postExtensionLog()`, etc.), encapsulate them:

```ts
// src/utils/log.ts
export enum LogLevel { Trace, Debug, Info, Warning, Error, Off }

export class Logger {
  private output = vscode.window.createOutputChannel("AI Memory");
  private level: LogLevel = LogLevel.Info;

  setLevel(level: LogLevel) {
    this.level = level;
  }

  log(level: LogLevel, msg: string) {
    if (level >= this.level && this.level !== LogLevel.Off) {
      const prefix = `[Webview] ${new Date().toISOString()} - ${LogLevel[level].toUpperCase()}`;
      this.output.appendLine(`${prefix} ${msg}`);
    }
  }

  info(msg: string) { this.log(LogLevel.Info, msg); }
  error(msg: string) { this.log(LogLevel.Error, msg); }
  debug(msg: string) { this.log(LogLevel.Debug, msg); }
}
```

Then import and reuse it across modules. Easier to maintain, test, and extend (e.g. to file logging or telemetry later).

---

#### 2. Persist Log Level Config in Extension Context

Right now, `aimemory.logLevel` is read from `package.json` config. To ensure real-time changes (and runtime switching), store it in `context.globalState` and watch for updates:

```ts
vscode.workspace.onDidChangeConfiguration(e => {
  if (e.affectsConfiguration("aimemory.logLevel")) {
    const levelStr = vscode.workspace.getConfiguration("aimemory").get<string>("logLevel")!;
    logger.setLevel(parseLogLevel(levelStr));
  }
});
```

This prevents stale log levels after reloads and allows runtime control.

---

#### 3. Support Structured Logging (Optional But Powerful)

Instead of just strings, allow:

```ts
logger.info("Tool failed", { tool: "initialize-memory-bank", reason: "network timeout" });
```

Internally format to:

```text
[Webview] 2025-05-11T22:38:12.311Z - INFO Tool failed {"tool":"initialize-memory-bank","reason":"network timeout"}
```

It's a small change but makes logs easier to grep, parse, and route later (e.g. telemetry, diagnostics panel, cloud sync).

---

#### 4. Defer Webview Logging Until Panel Loads

In rare cases, the `webview.postMessage()` channel may be undefined briefly after activation. Queue logs until the panel is live or use a resilient fallback if logging from backend to frontend ever becomes part of the design.

---

#### 5. Consider log source tags

If you want to go deeper:

```ts
logger.info("Memory bank init failed", { source: "webview", tool: "init" });
```

And auto-include the caller/source (webview, mcpServer, etc.).

---

### ✅ TL;DR Changes I Recommend

| Recommendation                                  | Priority | Reason                                 |
| ----------------------------------------------- | -------- | -------------------------------------- |
| Replace loose `log()` funcs with a Logger class | ⭐⭐⭐⭐     | Better design, less duplication        |
| Hook into config change for log level           | ⭐⭐⭐      | Ensures dynamic reloading              |
| Add minimal structured logging support          | ⭐⭐       | Future-proofing, better tooling        |
| Use globalState to persist level                | ⭐        | UX polish                              |
| Tag log source in info/error()                  | Optional | For later observability/dashboard tool |

Would you like a drop-in Logger class with level parsing and structured message support now?

---

_For stable features and usage, see [docs/guides/README.md](../guides/README.md)._
