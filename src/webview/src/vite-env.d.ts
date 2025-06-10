/// <reference types="vite/client" />
/// <reference types="react" />
/// <reference types="@testing-library/jest-dom" />

import type { VSCodeAPI } from "./types/vscode";

// Declare the function provided by VS Code
declare const acquireVsCodeApi: () => VSCodeAPI;

// Extend the Window interface to include the vscodeApi
declare global {
	interface Window {
		vscodeApi?: VSCodeAPI;
	}
}

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
