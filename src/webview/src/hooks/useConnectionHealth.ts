import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sendLog } from "../utils/message";

interface HealthSettings {
	checkInterval: 2500 | 5000 | 10000;
	notificationLevel: "minimal" | "normal" | "detailed";
	timeoutThreshold: 5000 | 10000 | 15000;
}

interface ConnectionHealth {
	status: "healthy" | "degraded" | "disconnected" | "checking";
	lastCheck: Date | null;
	retryCount: number;
	error?: string;
}

const DEFAULT_SETTINGS: HealthSettings = {
	checkInterval: 5000,
	notificationLevel: "normal",
	timeoutThreshold: 10000,
};

export function useConnectionHealth(settings: Partial<HealthSettings> = {}) {
	const finalSettings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...settings }), [settings]);
	const [health, setHealth] = useState<ConnectionHealth>({
		status: "checking",
		lastCheck: null,
		retryCount: 0,
	});

	const timeoutRef = useRef<number | undefined>(undefined);
	const retryTimeoutRef = useRef<number | undefined>(undefined);
	const isActiveRef = useRef(true);

	const checkHealth = useCallback(async () => {
		if (!isActiveRef.current) return;

		setHealth(prev => ({ ...prev, status: "checking" }));

		try {
			// Send health check message with timeout
			const healthPromise = new Promise<boolean>((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(new Error(`Health check timeout after ${finalSettings.timeoutThreshold}ms`));
				}, finalSettings.timeoutThreshold);

				const handleMessage = (event: MessageEvent) => {
					const message = event.data;
					if (message.type === "healthCheckResponse") {
						clearTimeout(timeout);
						window.removeEventListener("message", handleMessage);
						resolve(message.healthy);
					}
				};

				window.addEventListener("message", handleMessage);
				// Use the proper healthCheck command now that it's defined
				window.vscodeApi?.postMessage({
					command: "healthCheck",
				});
			});

			const isHealthy = await healthPromise;

			if (!isActiveRef.current) return;

			setHealth({
				status: isHealthy ? "healthy" : "degraded",
				lastCheck: new Date(),
				retryCount: 0,
				error: undefined,
			});

			if (finalSettings.notificationLevel === "detailed") {
				sendLog("Health check completed successfully", "info", {
					action: "healthCheck",
					status: isHealthy ? "healthy" : "degraded",
				});
			}
		} catch (error) {
			if (!isActiveRef.current) return;

			const errorMessage = error instanceof Error ? error.message : "Unknown error";

			setHealth(prev => {
				const newRetryCount = prev.retryCount + 1;

				// Schedule retry with exponential backoff using up-to-date retry count
				const retryDelay = Math.min(
					finalSettings.checkInterval * 2 ** newRetryCount,
					30000, // Max 30 seconds
				);

				if (finalSettings.notificationLevel !== "minimal") {
					sendLog(
						`Health check failed: ${errorMessage} (retry ${newRetryCount} in ${retryDelay}ms)`,
						"error",
						{
							action: "healthCheckFailed",
							error: errorMessage,
							retryCount: newRetryCount,
							retryDelay,
						},
					);
				}

				// Clear any existing retry timeout
				if (retryTimeoutRef.current) {
					clearTimeout(retryTimeoutRef.current);
				}

				// Schedule retry with exponential backoff
				retryTimeoutRef.current = window.setTimeout(() => {
					if (isActiveRef.current) {
						checkHealth();
					}
				}, retryDelay);

				return {
					status: "disconnected",
					lastCheck: new Date(),
					retryCount: newRetryCount,
					error: errorMessage,
				};
			});
		}
	}, [finalSettings]);

	// Start periodic health checks
	useEffect(() => {
		isActiveRef.current = true;

		// Initial check
		checkHealth();

		// Set up interval only for successful checks (removed health.status dependency to prevent re-registration)
		const startInterval = () => {
			if (timeoutRef.current) {
				clearInterval(timeoutRef.current);
			}

			timeoutRef.current = window.setInterval(() => {
				// Only check if we're in a good state - avoid rapid retries during failures
				setHealth(prev => {
					if (prev.status === "healthy" || prev.status === "degraded") {
						checkHealth();
					}
					return prev;
				});
			}, finalSettings.checkInterval);
		};

		startInterval();

		return () => {
			isActiveRef.current = false;
			if (timeoutRef.current) {
				clearInterval(timeoutRef.current);
			}
			if (retryTimeoutRef.current) {
				clearTimeout(retryTimeoutRef.current);
			}
		};
	}, [finalSettings.checkInterval, checkHealth]);

	const forceCheck = useCallback(() => {
		if (retryTimeoutRef.current) {
			clearTimeout(retryTimeoutRef.current);
		}
		checkHealth();
	}, [checkHealth]);

	return {
		health,
		forceCheck,
		settings: finalSettings,
	};
}
