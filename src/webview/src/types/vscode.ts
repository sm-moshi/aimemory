/**
 * VSCode API Types
 * Type definitions for VSCode webview API and global declarations
 */

import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "./messages";

/**
 * VSCode API interface for webview communication
 */
export interface VSCodeAPI {
	postMessage: (message: WebviewToExtensionMessage) => void;
	getState: () => unknown;
	setState: (state: unknown) => void;
}

/**
 * Global window extensions for VSCode webview
 */
declare global {
	interface Window {
		acquireVsCodeApi: () => VSCodeAPI;
		vscodeApi?: VSCodeAPI;
	}
}

/**
 * Message event type for webview communication
 */
export interface WebviewMessageEvent extends MessageEvent {
	data: ExtensionToWebviewMessage;
}
