/**
 * VSCode API Types
 * Type definitions for VSCode webview API and global declarations
 */

/**
 * VSCode API interface for webview communication
 */
export interface VSCodeAPI {
	postMessage: (message: any) => void;
	getState: () => any;
	setState: (state: any) => void;
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
	data: {
		type?: string;
		[key: string]: any;
	};
}
