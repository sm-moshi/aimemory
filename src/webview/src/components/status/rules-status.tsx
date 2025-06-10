import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { RiLoader5Fill } from "react-icons/ri";
import { cn } from "../../utils/cn";
import { sendLog } from "../../utils/message";

export function RulesStatus(): ReactNode {
	const [isLoading, setIsLoading] = useState(true);
	const [rulesInitialized, setRulesInitialized] = useState(false);
	const [resetLoading, setResetLoading] = useState(false);
	const [feedback, setFeedback] = useState<string | null>(null);

	const requestRulesStatus = useCallback(() => {
		setIsLoading(true);
		sendLog("Requesting rules status", "info", {
			action: "requestRulesStatus",
		});
		window.vscodeApi?.postMessage({
			command: "getRulesStatus",
		});
	}, []);

	useEffect(() => {
		// Setup message listener
		const handleMessage = (event: MessageEvent) => {
			const message = event.data;
			sendLog(`Received message in rules-status: ${message.type}`, "info", {
				action: "handleMessage",
				messageType: message.type,
			});
			switch (message.type) {
				case "rulesStatus":
					setRulesInitialized(message.initialized);
					setIsLoading(false);
					break;
				case "resetRulesResult":
					setResetLoading(false);
					if (message.success) {
						setFeedback("Rules reset successfully.");
						requestRulesStatus();
					} else {
						setFeedback(
							message.error ? `Failed to reset rules: ${message.error}` : "Failed to reset rules.",
						);
					}
					break;
			}
		};

		window.addEventListener("message", handleMessage);

		// Request initial rules status
		requestRulesStatus();

		return () => {
			window.removeEventListener("message", handleMessage);
		};
	}, [requestRulesStatus]);

	const resetRules = useCallback(() => {
		setResetLoading(true);
		setFeedback(null);
		sendLog("User clicked Reset Rules button", "info", {
			action: "resetRules",
		});
		window.vscodeApi?.postMessage({
			command: "resetRules",
		});
	}, []);

	return (
		<div className="flex flex-col gap-2 mb-2">
			<div className="flex items-center gap-2">
				<span className="text-sm font-medium text-muted-foreground">Rules:</span>
				{isLoading && (
					<span className="text-sm">
						<RiLoader5Fill className="animate-spin size-4" />
					</span>
				)}
				{!isLoading && (
					<span
						className={cn(
							rulesInitialized ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800",
							"px-2 py-0.5 rounded-full text-xs font-semibold",
						)}
					>
						{rulesInitialized ? "Initialized" : "Missing"}
					</span>
				)}
			</div>
			<div className="w-full">
				<button
					className="w-full text-sm text-muted-foreground mt-1"
					type="button"
					onClick={resetRules}
					disabled={resetLoading}
				>
					{resetLoading ? (
						<span className="flex items-center gap-1">
							<RiLoader5Fill className="animate-spin size-4" /> Resetting...
						</span>
					) : (
						"Reset rules"
					)}
				</button>
			</div>
			{feedback && <div className="mt-1 text-xs text-gray-700">{feedback}</div>}
		</div>
	);
}
