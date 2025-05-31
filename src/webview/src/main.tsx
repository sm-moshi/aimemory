/// <reference types="vite/client" />
/// <reference types="react" />
import { createRoot } from "react-dom/client";
import App from "./App.js";
import "./index.css";
import "@vscode-elements/elements";
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "./types/messages.js";
import type { VSCodeAPI, WebviewMessageEvent } from "./types/vscode.js";

// Create a better mock implementation for development
class MockVSCodeAPI implements VSCodeAPI {
	private state: any = { rulesInitialized: false };

	postMessage(message: WebviewToExtensionMessage): void {
		console.log("🔄 Mock VSCode - Message sent:", message);

		// Simulate VSCode API responses for development
		setTimeout(() => {
			switch ((message as any).command ?? (message as any).type) {
				case "getRulesStatus":
					this.mockResponse({
						type: "rulesStatus",
						initialized: this.state.rulesInitialized,
					} as ExtensionToWebviewMessage);
					break;
				case "resetRules":
					this.state.rulesInitialized = true;
					this.mockResponse({
						type: "resetRulesResult",
						success: true,
					} as ExtensionToWebviewMessage);
					break;
			}
		}, 500); // Add delay to simulate network
	}

	getState(): any {
		return this.state;
	}

	setState(newState: any): void {
		this.state = { ...this.state, ...newState };
	}

	private mockResponse(data: ExtensionToWebviewMessage) {
		console.log("⬅️ Mock VSCode - Response:", data);
		const event = new MessageEvent("message", { data }) as WebviewMessageEvent;
		window.dispatchEvent(event);
	}
}

// Get the VS Code API - store it in a global variable
const getVSCodeAPI = () => {
	// In the VS Code webview
	if (typeof window.acquireVsCodeApi === "function") {
		try {
			console.log("✅ Using real VSCode API");
			return window.acquireVsCodeApi();
		} catch (e) {
			console.error("❌ Error acquiring VSCode API:", e);
		}
	}

	// In development mode (via iframe)
	if (window.vscodeApi) {
		console.log("✅ Using vscodeApi from parent iframe");
		return window.vscodeApi;
	}

	// Fallback for development outside VS Code
	console.log("⚠️ VSCode API not found, using mock implementation");
	return new MockVSCodeAPI();
};

// Expose VS Code API to the app through a global variable
window.vscodeApi = getVSCodeAPI();
console.log("🚀 vscodeApi initialized:", window.vscodeApi);

// Only render once we've ensured the vscodeApi is available
const renderApp = () => {
	// Get the container element
	const container = document.getElementById("root") as HTMLElement;
	if (!container) {
		console.error("Root element not found!");
		return;
	}

	// Create a root
	const root = createRoot(container);

	// Initial render
	root.render(<App />);
};

// Make sure the DOM is fully loaded
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", renderApp);
} else {
	renderApp();
}
