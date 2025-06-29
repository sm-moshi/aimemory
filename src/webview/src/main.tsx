/// <reference types="vite/client" />
/// <reference types="react" />
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "@vscode-elements/elements";
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "./types/messages";
import type { VSCodeAPI, WebviewMessageEvent } from "./types/vscode";

// Create a better mock implementation for development
class MockVsCodeApi implements VSCodeAPI {
	private state: unknown = { rulesInitialized: false };

	postMessage(message: WebviewToExtensionMessage): void {
		console.log("🔄 Mock VSCode - Message sent:", message);

		// Simulate VSCode API responses for development
		setTimeout(() => {
			const msg = message as { command?: string; type?: string };
			switch (msg.command ?? msg.type) {
				case "getRulesStatus":
					this.mockResponse({
						type: "rulesStatus",
						initialized: (this.state as { rulesInitialized: boolean }).rulesInitialized,
					} as ExtensionToWebviewMessage);
					break;
				case "resetRules":
					this.state = {
						...(this.state as Record<string, unknown>),
						rulesInitialized: true,
					};
					this.mockResponse({
						type: "resetRulesResult",
						success: true,
					} as ExtensionToWebviewMessage);
					break;
			}
		}, 500); // Add delay to simulate network
	}

	getState(): unknown {
		return this.state;
	}

	setState(newState: unknown): void {
		this.state = {
			...(this.state as Record<string, unknown>),
			...(newState as Record<string, unknown>),
		};
	}

	private mockResponse(data: ExtensionToWebviewMessage) {
		console.log("⬅️ Mock VSCode - Response:", data);
		const event = new MessageEvent("message", { data }) as WebviewMessageEvent;
		window.dispatchEvent(event);
	}
}

// Get the VS Code API - store it in a global variable
const getVsCodeApi = () => {
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
	return new MockVsCodeApi();
};

// Expose VS Code API to the app through a global variable
window.vscodeApi = getVsCodeApi();
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
