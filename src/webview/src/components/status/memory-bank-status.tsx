import { useCallback, useEffect, useState } from "react";
import { RiLoader5Fill } from "react-icons/ri";
import { cn } from "../../utils/cn.js";
import { sendLog } from "../../utils/message.js";

export function MemoryBankStatus({
	onReviewAllFiles,
	reviewLoading,
}: {
	onReviewAllFiles: () => void;
	reviewLoading: boolean;
}) {
	const [isLoading, setIsLoading] = useState(true);
	const [isMemoryBankInitialized, setIsMemoryBankInitialized] = useState(false);
	const [updateLoading, setUpdateLoading] = useState(false);
	const [initLoading, setInitLoading] = useState(false);

	const requestMemoryBankStatus = useCallback(() => {
		setIsLoading(true);
		sendLog("Requesting memory bank status", "info", { action: "requestMemoryBankStatus" });
		window.vscodeApi?.postMessage({
			command: "requestMemoryBankStatus",
		});
	}, []);

	// Handlers moved from MCPServerManager
	const handleInitializeMemoryBank = useCallback(async () => {
		setInitLoading(true);
		window.vscodeApi?.postMessage({ command: "startMCPServer" });
		setInitLoading(false);
	}, []);

	const handleUpdateMemoryBank = useCallback(async () => {
		const fileType = window.prompt("Enter memory bank file type (e.g. projectbrief.md):");
		if (!fileType) {
			return;
		}
		const content = window.prompt("Enter new content for the file:");
		if (content === null) {
			return;
		}
		setUpdateLoading(true);
		window.vscodeApi?.postMessage({ command: "updateMemoryBankFile", fileType, content });
		setUpdateLoading(false);
	}, []);

	const handleRepairMemoryBank = useCallback(async () => {
		setUpdateLoading(true);
		window.vscodeApi?.postMessage({ command: "repairMemoryBank" });
		setUpdateLoading(false);
	}, []);

	useEffect(() => {
		// Setup message listener
		const handleMessage = (event: MessageEvent) => {
			const message = event.data;
			sendLog(`Received message in memory-bank-status: ${message.type}`, "info", {
				action: "handleMessage",
				messageType: message.type,
			});
			switch (message.type) {
				case "memoryBankStatus":
					setIsMemoryBankInitialized(message.initialized);
					setIsLoading(false);
					break;
			}
		};

		window.addEventListener("message", handleMessage);

		// Request initial memory bank status
		requestMemoryBankStatus();

		return () => {
			window.removeEventListener("message", handleMessage);
		};
	}, [requestMemoryBankStatus]);

	return (
		<div className="flex flex-col gap-2 mb-2">
			<div className="flex items-center gap-2">
				<span className="text-sm font-medium text-muted-foreground">Memory Bank:</span>
				{isLoading && (
					<span className="text-sm">
						<RiLoader5Fill className="animate-spin size-4" />
					</span>
				)}
				{!isLoading && (
					<span
						className={cn(
							isMemoryBankInitialized
								? "bg-green-200 text-green-800"
								: "bg-red-200 text-red-800",
							"px-2 py-0.5 rounded-full text-xs font-semibold",
						)}
					>
						{isMemoryBankInitialized ? "Initialized" : "Missing"}
					</span>
				)}
			</div>
			<span className="text-xs text-muted-foreground mt-1">
				Tip: Type "Initialise memory bank" in cursor to start the initialisation process.
			</span>
			{/* Memory bank action buttons */}
			<div className="grid grid-cols-2 gap-2 mt-2 w-full max-w-md">
				<button
					type="button"
					className="w-full px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
					onClick={handleInitializeMemoryBank}
					disabled={isLoading || initLoading}
				>
					{initLoading ? "Initialising..." : "Initialise Memory Bank"}
				</button>
				<button
					type="button"
					className="w-full px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
					onClick={handleRepairMemoryBank}
					disabled={isLoading || updateLoading}
				>
					{updateLoading ? "Repairing..." : "Repair Memory Bank"}
				</button>
				<button
					type="button"
					className="w-full px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
					onClick={handleUpdateMemoryBank}
					disabled={isLoading || updateLoading}
				>
					{updateLoading ? "Updating..." : "Update Memory Bank"}
				</button>
				<button
					type="button"
					className="w-full px-2 py-1 border border-border text-[var(--vscode-foreground)] bg-muted hover:bg-gray-200 rounded disabled:opacity-50"
					onClick={onReviewAllFiles}
					disabled={isLoading || reviewLoading}
				>
					{reviewLoading ? "Reviewing..." : "Review All Files"}
				</button>
			</div>
		</div>
	);
}
