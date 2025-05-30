export type WebviewLogLevel = "info" | "error";
export interface WebviewLogMessage {
	command: "logMessage";
	level: WebviewLogLevel;
	text: string;
	meta?: Record<string, unknown>;
}
export type WebviewMessage = WebviewLogMessage;
export declare const postMessage: (message: WebviewMessage) => void;
/**
 * Send a log message from the webview to the extension host Output Channel.
 * @param text The log message text.
 * @param level The log level ("info" | "error"). Defaults to "info".
 * @param meta Optional structured metadata for context.
 */
export declare function sendLog(
	text: string,
	level?: WebviewLogLevel,
	meta?: Record<string, unknown>,
): void;
//# sourceMappingURL=message.d.ts.map
