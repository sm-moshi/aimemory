import { useEffect, useState } from "react";
import { useConnectionHealth } from "../../hooks/useConnectionHealth";
import type { MemoryBankStatusMessage, RulesStatusMessage } from "../../types/messages";
import { postMessage } from "../../utils/message";
import { HealthIndicator } from "../ui/HealthIndicator";
import { MemoryBankStatus } from "./memory-bank-status";
import { RulesStatus } from "./rules-status";

interface StatusProps {
	mcpServerStatus: "started" | "stopped" | "error";
}

function getStatusColor(status: "started" | "stopped" | "error"): string {
	if (status === "started") return "bg-green-500";
	if (status === "error") return "bg-red-500";
	return "bg-gray-500";
}

export function Status({ mcpServerStatus }: StatusProps) {
	const [, setRulesStatus] = useState<RulesStatusMessage | null>(null);
	const [, setMemoryBankStatus] = useState<MemoryBankStatusMessage | null>(null);

	// Get health check settings from VS Code configuration (defaults if not available)
	const healthSettings = {
		checkInterval: (window as any).vscodeApi?.getState()?.healthCheckInterval ?? 5000,
		notificationLevel: (window as any).vscodeApi?.getState()?.notificationLevel ?? "normal",
		timeoutThreshold: (window as any).vscodeApi?.getState()?.healthCheckTimeout ?? 10000,
	};

	// Initialize health monitoring
	const { health, forceCheck, settings } = useConnectionHealth(healthSettings);

	useEffect(() => {
		// Message handler for extension responses
		const handleMessage = (event: MessageEvent) => {
			const message = event.data;
			switch (message.type) {
				case "rulesStatus":
					setRulesStatus(message);
					break;
				case "memoryBankStatus":
					setMemoryBankStatus(message);
					break;
			}
		};

		window.addEventListener("message", handleMessage);

		// Request initial status
		postMessage({ command: "getRulesStatus" });
		postMessage({ command: "requestMemoryBankStatus" });

		return () => {
			window.removeEventListener("message", handleMessage);
		};
	}, []);

	return (
		<div className="space-y-6">
			{/* Health Monitoring Section */}
			<div className="bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] rounded-lg p-4">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-lg font-semibold text-[var(--vscode-foreground)]">System Health</h3>
					<button
						type="button"
						onClick={forceCheck}
						className="px-3 py-1 text-sm bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] rounded hover:bg-[var(--vscode-button-hoverBackground)] transition-colors"
						disabled={health.status === "checking"}
					>
						{health.status === "checking" ? "Checking..." : "Check Now"}
					</button>
				</div>
				<HealthIndicator health={health} settings={settings} onForceCheck={forceCheck} className="w-full" />
			</div>

			{/* MCP Server Status */}
			<div className="bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] rounded-lg p-4">
				<h3 className="text-lg font-semibold text-[var(--vscode-foreground)] mb-3">MCP Server Status</h3>
				<div className="flex items-center gap-2">
					<div className={`w-3 h-3 rounded-full ${getStatusColor(mcpServerStatus)}`} />
					<span className="text-[var(--vscode-foreground)] capitalize">{mcpServerStatus}</span>
				</div>
			</div>

			{/* Rules Status */}
			<div className="bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] rounded-lg p-4">
				<h3 className="text-lg font-semibold text-[var(--vscode-foreground)] mb-3">Cursor Rules</h3>
				<RulesStatus />
			</div>

			{/* Memory Bank Status */}
			<div className="bg-[var(--vscode-editor-background)] border border-[var(--vscode-panel-border)] rounded-lg p-4">
				<h3 className="text-lg font-semibold text-[var(--vscode-foreground)] mb-3">Memory Bank</h3>
				<MemoryBankStatus onReviewAllFiles={() => {}} reviewLoading={false} />
			</div>
		</div>
	);
}
