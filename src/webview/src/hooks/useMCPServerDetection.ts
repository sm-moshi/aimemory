import { useCallback, useEffect, useState } from "react";
import { sendLog } from "../utils/message.js";

const DEFAULT_PORTS = [7331, 7332]; // Default ports to check

interface UseMCPServerDetectionReturn {
	isLoading: boolean;
	isServerRunning: boolean;
	detectedPort: number | null;
}

export function useMCPServerDetection(): UseMCPServerDetectionReturn {
	const [isLoading, setIsLoading] = useState(true); // Start with loading true
	const [isServerRunning, setIsServerRunning] = useState(false);
	const [detectedPort, setDetectedPort] = useState<number | null>(null);

	const checkServerRunning = useCallback(async (checkPort: number) => {
		// This function will be called by the effect, so it doesn't need to set isLoading directly
		// The parent effect will handle overall loading state for the detection phase.
		try {
			const response = await fetch(`http://localhost:${checkPort}/health`, {
				method: "GET",
				headers: {
					Accept: "application/json",
				},
				signal: AbortSignal.timeout(1000), // Short timeout
			});

			if (response.ok) {
				const data = await response.json();
				if (data.status === "ok ok") {
					return true; // Server found
				}
			}
		} catch (error) {
			sendLog(
				`No server running on port ${checkPort} during initial detection: ${error instanceof Error ? error.message : String(error)}`,
				"info",
				{ action: "initialDetectServer", port: checkPort, area: "useMCPServerDetection" },
			);
		}
		return false; // Server not found or error
	}, []);

	useEffect(() => {
		let didCancel = false;
		setIsLoading(true); // Set loading true at the start of the detection effect

		const detectServer = async () => {
			for (const portToCheck of DEFAULT_PORTS) {
				if (didCancel) break;

				const found = await checkServerRunning(portToCheck);
				if (found) {
					if (!didCancel) {
						setIsServerRunning(true);
						setDetectedPort(portToCheck);
						// Notify extension that we detected a running server
						window.vscodeApi?.postMessage({
							command: "serverAlreadyRunning",
							port: portToCheck,
						});
						sendLog(
							`Detected running MCP server on port ${portToCheck} during initial scan`,
							"info",
							{
								action: "initialDetectServerSuccess",
								port: portToCheck,
								area: "useMCPServerDetection",
							},
						);
					}
					break; // Stop checking if server is found
				}
			}
			if (!didCancel) {
				setIsLoading(false); // Set loading false after checking all ports
			}
		};

		detectServer();

		return () => {
			didCancel = true;
			// Optional: If there were ongoing fetch requests that need explicit cancellation beyond AbortSignal.timeout,
			// they could be handled here, but AbortSignal.timeout should suffice for fetch.
		};
	}, [checkServerRunning]); // checkServerRunning is stable due to useCallback

	return { isLoading, isServerRunning, detectedPort };
}
