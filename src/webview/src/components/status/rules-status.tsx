import { useCallback, useEffect, useState } from "react";
import { RiLoader5Fill } from "react-icons/ri";
import { cn } from "../../utils/cn";
import { sendLog } from '../../utils/message';

export function RulesStatus() {
  const [isLoading, setIsLoading] = useState(true);
  const [rulesInitialized, setRulesInitialized] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const requestRulesStatus = useCallback(() => {
    setIsLoading(true);
    sendLog('Requesting rules status', 'info', { action: 'requestRulesStatus' });
    window.vscodeApi?.postMessage({
      command: "getRulesStatus",
    });
  }, []);

  useEffect(() => {
    // Setup message listener
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      sendLog(`Received message in rules-status: ${message.type}`, 'info', { action: 'handleMessage', messageType: message.type });
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
            setFeedback(message.error ? `Failed to reset rules: ${message.error}` : "Failed to reset rules.");
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
    sendLog('User clicked Reset Rules button', 'info', { action: 'resetRules' });
    window.vscodeApi?.postMessage({
      command: "resetRules",
    });
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--vscode-descriptionForeground)] underline">
          Rules:
        </span>
        {isLoading && (
          <span className="text-sm">
            <RiLoader5Fill className="animate-spin size-4" />
          </span>
        )}
        {!isLoading && (
          <span
            className={cn(
              rulesInitialized ? "text-green-500" : "text-red-500",
              "text-sm"
            )}
          >
            {rulesInitialized ? "Initialized" : "Missing"}
          </span>
        )}
      </div>
      <button className="text-sm text-gray-500 w-fit" type="button" onClick={resetRules} disabled={resetLoading}>
        {resetLoading ? <span className="flex items-center gap-1"><RiLoader5Fill className="animate-spin size-4" /> Resetting...</span> : "Reset rules"}
      </button>
      {feedback && (
        <div className="mt-1 text-xs text-gray-700">{feedback}</div>
      )}
    </div>
  );
}
