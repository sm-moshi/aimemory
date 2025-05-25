/// <reference types="vite/client" />
/// <reference types="react" />

interface VSCode {
	postMessage: (message: any) => void;
	getState: () => any;
	setState: (state: any) => void;
}

interface Window {
	acquireVsCodeApi: () => VSCode;
}

declare const acquireVsCodeApi: () => VSCode;

// Define custom elements directly with any type
declare namespace JSX {
	interface IntrinsicElements {
		"vscode-button": any;
		"vscode-panel-tab": any;
		"vscode-panel-view": any;
		"vscode-progress-ring": any;
		// Add any other custom elements you need here
	}
}
