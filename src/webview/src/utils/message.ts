// Type for log levels
export type WebviewLogLevel = "info" | "error";

// Type for log messages sent from webview to extension
export interface WebviewLogMessage {
  command: "logMessage";
  level: WebviewLogLevel;
  text: string;
  meta?: Record<string, unknown>;
}

// Union type for all allowed webview messages (expand as needed)
export type WebviewMessage = WebviewLogMessage; // | OtherMessageTypes

// Create a safe postMessage function
export const postMessage = (message: WebviewMessage) => {
  if (window.vscodeApi) {
    window.vscodeApi.postMessage(message);
    console.log("Message sent:", message);
  } else {
    console.warn("VSCode API not available, can't send message:", message);
  }
};

/**
 * Send a log message from the webview to the extension host Output Channel.
 * @param text The log message text.
 * @param level The log level ("info" | "error"). Defaults to "info".
 * @param meta Optional structured metadata for context.
 */
export function sendLog(
  text: string,
  level: WebviewLogLevel = "info",
  meta?: Record<string, unknown>
) {
  const message: WebviewLogMessage = {
    command: "logMessage",
    level,
    text,
    meta,
  };
  postMessage(message);
}
