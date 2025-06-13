import type { ReactNode } from "react";
import { RiCheckLine, RiCloseLine, RiLoader5Fill, RiTimeLine } from "react-icons/ri";
import { cn } from "../../utils/cn";

interface ConnectionHealth {
	status: "healthy" | "degraded" | "disconnected" | "checking";
	lastCheck: Date | null;
	retryCount: number;
	error?: string;
}

interface HealthSettings {
	checkInterval: 2500 | 5000 | 10000;
	notificationLevel: "minimal" | "normal" | "detailed";
	timeoutThreshold: 5000 | 10000 | 15000;
}

interface HealthIndicatorProps {
	readonly health: ConnectionHealth;
	readonly settings: HealthSettings;
	readonly onForceCheck?: () => void;
	readonly className?: string;
}

function formatTimeAgo(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSeconds = Math.floor(diffMs / 1000);

	if (diffSeconds < 60) return `${diffSeconds}s ago`;
	if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
	return `${Math.floor(diffSeconds / 3600)}h ago`;
}

export function HealthIndicator({ health, settings, onForceCheck, className }: HealthIndicatorProps): ReactNode {
	const getStatusConfig = () => {
		switch (health.status) {
			case "healthy":
				return {
					icon: RiCheckLine,
					color: "text-green-600",
					bgColor: "bg-green-100 dark:bg-green-900/20",
					ringColor: "ring-green-200 dark:ring-green-800",
					pulse: false,
					label: "Connected",
				};
			case "degraded":
				return {
					icon: RiTimeLine,
					color: "text-yellow-600",
					bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
					ringColor: "ring-yellow-200 dark:ring-yellow-800",
					pulse: false,
					label: "Degraded",
				};
			case "disconnected":
				return {
					icon: RiCloseLine,
					color: "text-red-600",
					bgColor: "bg-red-100 dark:bg-red-900/20",
					ringColor: "ring-red-200 dark:ring-red-800",
					pulse: false,
					label: "Disconnected",
				};
			case "checking":
				return {
					icon: RiLoader5Fill,
					color: "text-blue-600",
					bgColor: "bg-blue-100 dark:bg-blue-900/20",
					ringColor: "ring-blue-200 dark:ring-blue-800",
					pulse: true,
					label: "Checking...",
				};
			default:
				return {
					icon: RiTimeLine,
					color: "text-gray-600",
					bgColor: "bg-gray-100 dark:bg-gray-900/20",
					ringColor: "ring-gray-200 dark:ring-gray-800",
					pulse: false,
					label: "Unknown",
				};
		}
	};

	const config = getStatusConfig();
	const Icon = config.icon;

	if (settings.notificationLevel === "minimal") {
		return (
			<div className={cn("flex items-center gap-2", className)}>
				<div
					className={cn(
						"relative flex h-3 w-3 items-center justify-center rounded-full",
						config.bgColor,
						config.ringColor,
						"ring-1",
					)}
				>
					<div
						className={cn(
							"h-2 w-2 rounded-full",
							config.color.replace("text-", "bg-"),
							config.pulse && "animate-pulse",
						)}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className={cn("flex items-center gap-3", className)}>
			{/* Status Icon */}
			<div
				className={cn(
					"relative flex h-8 w-8 items-center justify-center rounded-full",
					config.bgColor,
					config.ringColor,
					"ring-1 transition-colors",
				)}
			>
				<Icon className={cn("h-4 w-4", config.color, health.status === "checking" && "animate-spin")} />
				{health.status === "healthy" && (
					<div className="absolute inset-0 rounded-full bg-green-400 opacity-20 animate-ping" />
				)}
			</div>

			{/* Status Info */}
			<div className="flex flex-col">
				<div className="flex items-center gap-2">
					<span className={cn("text-sm font-medium", config.color)}>{config.label}</span>
					{health.retryCount > 0 && (
						<span className="text-xs text-gray-500">(retry {health.retryCount})</span>
					)}
				</div>

				{settings.notificationLevel === "detailed" && (
					<div className="flex items-center gap-2 text-xs text-gray-500">
						{health.lastCheck && <span>Last check: {formatTimeAgo(health.lastCheck)}</span>}
						{health.error && <span className="text-red-500 truncate max-w-40">{health.error}</span>}
						{onForceCheck && health.status !== "checking" && (
							<button
								type="button"
								onClick={onForceCheck}
								className="text-blue-500 hover:text-blue-600 underline"
							>
								Check now
							</button>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
