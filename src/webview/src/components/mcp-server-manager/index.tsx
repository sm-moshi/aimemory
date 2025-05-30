import { useCallback, useEffect, useState } from "react";
import { RiPlayFill, RiStopFill } from "react-icons/ri";
import { useMCPServerDetection } from "../../hooks/useMCPServerDetection.js";
import { cn } from "../../utils/cn.js";
import { sendLog } from "../../utils/message.js";
import { RulesStatus } from "../status/rules-status.js";

export function MCPServerManager() {
	// State from the detection hook (for HTTP server detection only)
	const {
		isLoading: isDetectingServer,
		isServerRunning: initiallyDetectedServer,
		detectedPort: initialPort,
	} = useMCPServerDetection();

	// Component-specific loading state (for start/stop actions)
	const [isActionLoading, setIsActionLoading] = useState(false);
	// Overall server running status - prioritize message updates over detection
	const [isMCPRunning, setIsMCPRunning] = useState(false);
	// Overall port - prioritize message updates over detection
	const [port, setPort] = useState<number | null>(null);
	// Track if we've received any message-based status updates
	const [hasReceivedStatusMessage, setHasReceivedStatusMessage] = useState(false);

	// Effect to synchronize state from hook ONLY if we haven't received message updates
	// This ensures STDIO servers work correctly while still supporting HTTP detection
	useEffect(() => {
		if (!hasReceivedStatusMessage) {
			setIsMCPRunning(initiallyDetectedServer);
			setPort(initialPort);
		}
	}, [initiallyDetectedServer, initialPort, hasReceivedStatusMessage]);

	const handleStartMCPServer = useCallback(() => {
		setIsActionLoading(true);
		// Optimistically set running, will be confirmed by message
		// setIsMCPRunning(true);
		sendLog("User clicked 'Start MCP Server' button", "info", { action: "startMCPServer" });
		window.vscodeApi?.postMessage({
			command: "startMCPServer",
		});
	}, []);

	const handleStopMCPServer = useCallback(() => {
		setIsActionLoading(true);
		// Optimistically set stopped, will be confirmed by message
		// setIsMCPRunning(false);
		// setPort(null);
		sendLog("User clicked 'Stop MCP Server' button", "info", { action: "stopMCPServer" });
		window.vscodeApi?.postMessage({
			command: "stopMCPServer",
		});
	}, []);

	const handleMessage = useCallback((event: MessageEvent) => {
		const message = event.data;
		if (message.type === "MCPServerStatus") {
			// Prioritize message-based status updates (for STDIO servers)
			setHasReceivedStatusMessage(true);
			setIsMCPRunning(message.status === "started");
			setPort(message.port ?? null);
			setIsActionLoading(false);

			sendLog(`MCP Server status updated via message: ${message.status}`, "info", {
				action: "statusMessageReceived",
				status: message.status,
				port: message.port,
				transport: message.port ? "HTTP" : "STDIO",
			});
		}
	}, []);

	useEffect(() => {
		window.addEventListener("message", handleMessage);
		return () => {
			window.removeEventListener("message", handleMessage);
		};
	}, [handleMessage]);

	// Combined loading state: true if detecting OR an action is in progress
	const isLoading = isDetectingServer ?? isActionLoading;

	return (
		<div className="rounded-xl border border-border bg-muted p-4 shadow-sm space-y-4 mb-6">
			<h2 className="text-xl font-bold mb-2 border-b border-border pb-1">MCP Server</h2>
			<div className="flex items-center gap-2">
				<span className="text-sm font-medium text-muted-foreground">Status:</span>
				<span
					className={cn(
						isMCPRunning ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800",
						"px-2 py-0.5 rounded-full text-xs font-semibold",
					)}
				>
					{isMCPRunning ? "Running" : "Stopped"}
				</span>
			</div>
			<div className="w-full max-w-md grid grid-cols-2 gap-2 pt-2">
				{!isMCPRunning && (
					<>
						<button
							type="button"
							className="w-full flex items-center gap-1 btn btn-primary px-2 py-1 text-white rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
							onClick={handleStartMCPServer}
							disabled={isLoading}
						>
							{isLoading && !isDetectingServer ? (
								<RiStopFill className="animate-spin size-4 mr-1" />
							) : (
								<RiPlayFill className="size-4 mr-1" />
							)}
							<span>Start MCP Server</span>
						</button>
						<div />
					</>
				)}
				{isMCPRunning && (
					<>
						<button
							type="button"
							className="w-full flex items-center gap-1 btn btn-destructive px-2 py-1 text-white rounded-md bg-red-600 hover:bg-red-700 disabled:opacity-50"
							onClick={handleStopMCPServer}
							disabled={isLoading}
						>
							{isLoading && !isDetectingServer ? (
								<RiPlayFill className="animate-spin size-4 mr-1" />
							) : (
								<RiStopFill className="size-4 mr-1" />
							)}
							<span>Stop MCP Server</span>
						</button>
						<div />
					</>
				)}
				<div className="col-span-2">
					<RulesStatus />
				</div>
			</div>
			<hr className="border-border my-4" />
			{isMCPRunning && (
				<p className="text-xs text-muted-foreground mt-2">
					{port ? (
						<>
							Server running on{" "}
							<span className="font-mono text-blue-300">
								http://localhost:{port}/sse
							</span>
							<br />
							Your Cursor MCP config has been automatically updated.
							<br />
							Please check Cursor MCP settings to ensure it is correct.
						</>
					) : (
						<>
							Server running in{" "}
							<span className="font-mono text-green-300">STDIO</span> mode
							<br />
							Ready for Cursor MCP integration via stdio transport.
							<br />
							Check your <span className="font-mono">.cursor/mcp.json</span>{" "}
							configuration.
						</>
					)}
				</p>
			)}
		</div>
	);
}
