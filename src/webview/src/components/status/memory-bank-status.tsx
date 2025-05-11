import { useCallback, useEffect, useState } from "react";
import { RiLoader5Fill } from "react-icons/ri";
import { cn } from "../../utils/cn";
import { sendLog } from '../../utils/message';

export function MemoryBankStatus() {
  const [isLoading, setIsLoading] = useState(true);
  const [isMemoryBankInitialized, setIsMemoryBankInitialized] = useState(false);

  const requestMemoryBankStatus = useCallback(() => {
    setIsLoading(true);
    sendLog('Requesting memory bank status', 'info', { action: 'requestMemoryBankStatus' });
    window.vscodeApi?.postMessage({
      command: "requestMemoryBankStatus",
    });
  }, []);

  useEffect(() => {
    // Setup message listener
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      sendLog(`Received message in memory-bank-status: ${message.type}`, 'info', { action: 'handleMessage', messageType: message.type });
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
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--vscode-descriptionForeground)] underline">
          Memory Bank:
        </span>
        {isLoading && (
          <span className="text-sm">
            <RiLoader5Fill className="animate-spin size-4" />
          </span>
        )}
        {!isLoading && (
          <div className="flex flex-col gap-1">
            <span
              className={cn(
                isMemoryBankInitialized ? "text-green-500" : "text-red-500",
                "text-sm"
              )}
            >
              {isMemoryBankInitialized ? "Initialized" : "Missing"}
            </span>
          </div>
        )}
      </div>
      <span className="text-xs text-gray-500">
        Tip: Type "Initialize memory bank" in cursor to start the initialization
        process.
      </span>
    </div>
  );
}
