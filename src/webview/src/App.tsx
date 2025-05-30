import { useCallback, useEffect, useState } from "react";
import "@vscode-elements/elements";
import { HowDoesItWork } from "./components/how-does-it-work/index.js";
import { MCPServerManager } from "./components/mcp-server-manager/index.js";
import { Status } from "./components/status/index.js";
import { sendLog } from "./utils/message.js";

function App() {
	const [apiAvailable, setApiAvailable] = useState(!!window.vscodeApi);
	const [reviewLoading, setReviewLoading] = useState(false);

	// Log VSCode API to debug
	console.log("VSCODE API in App:", window.vscodeApi);

	// Re-check for API if it wasn't available initially
	useEffect(() => {
		if (!apiAvailable) {
			const checkInterval = setInterval(() => {
				if (window.vscodeApi) {
					setApiAvailable(true);
					clearInterval(checkInterval);
				}
			}, 500);

			return () => clearInterval(checkInterval);
		}
	}, [apiAvailable]);

	// Handler for Review and Update Memory Bank
	const handleReviewAndUpdateMemoryBank = useCallback(() => {
		setReviewLoading(true);
		sendLog("User clicked 'Review and Update Memory Bank' button", "info", {
			action: "reviewAndUpdateMemoryBank",
		});
		window.vscodeApi?.postMessage({
			command: "reviewAndUpdateMemoryBank",
		});
		// setReviewLoading(false) will be called when a response is received
	}, []);

	// Effect to handle messages from the extension
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const message = event.data;
			// Ensure message and message.type are defined
			if (message && typeof message === "object" && message.type) {
				if (message.type === "reviewAndUpdateMemoryBankComplete") {
					setReviewLoading(false);
					sendLog("Review and Update Memory Bank complete.", "info", {
						action: "reviewAndUpdateMemoryBankComplete",
						success: message.success,
						error: message.error,
					});
				}
			}
		};

		window.addEventListener("message", handleMessage);
		return () => {
			window.removeEventListener("message", handleMessage);
		};
	}, []);

	if (!apiAvailable) {
		return (
			<div className="w-full p-4 text-center">
				<h1 className="mb-4 text-xl text-red-500">VSCode API not available</h1>
				<p>The extension is having trouble connecting to VSCode.</p>
				<button
					type="button"
					className="px-4 py-2 mt-4 font-bold text-white bg-blue-500 rounded hover:bg-blue-700"
					onClick={() => setApiAvailable(!!window.vscodeApi)}
				>
					Try Again
				</button>
			</div>
		);
	}

	return (
		<div className="flex flex-col w-full gap-6">
			<header className="flex flex-col gap-1 border-b border-[var(--vscode-panel-border)]">
				<h1 className="text-2xl font-bold">AI Memory</h1>
				<p className="mt-0 text-[var(--vscode-descriptionForeground)]">
					Add memory superpowers to LLMs
				</p>
			</header>
			<main className="flex flex-col gap-8">
				<MCPServerManager />
				<Status
					onReviewAllFiles={handleReviewAndUpdateMemoryBank}
					reviewLoading={reviewLoading}
				/>
				<HowDoesItWork />
			</main>
		</div>
	);
}

export default App;
