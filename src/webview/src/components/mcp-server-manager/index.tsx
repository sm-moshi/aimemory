import { useCallback, useEffect, useState } from "react";
import { RiLoader5Fill, RiPlayFill, RiStopFill } from "react-icons/ri";
import { cn } from "../../utils/cn";

export function MCPServerManager() {
  const [isLoading, setIsLoading] = useState(false);
  const [isMCPRunning, setIsMCPRunning] = useState(false);
  const [port, setPort] = useState<number | null>(null);

  const handleStartMCPServer = useCallback(() => {
    setIsLoading(true);
    setIsMCPRunning(true);
    window.vscodeApi?.postMessage({
      command: "startMCPServer",
    });
  }, []);

  const handleStopMCPServer = useCallback(() => {
    setIsLoading(true);
    setIsMCPRunning(false);
    setPort(null);
    window.vscodeApi?.postMessage({
      command: "stopMCPServer",
    });
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    const message = event.data;
    console.log("Received message 22:", message);
    switch (message.type) {
      case "MCPServerStatus":
        setIsMCPRunning(message.status === "started");
        setIsLoading(false);
        if (message.port) {
          setPort(message.port);
        }
        break;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [handleMessage]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-xl font-bold">MCP Server</span>
        <span className="text-xs text-gray-500">
          Manage the AI Memory MCP server
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--vscode-descriptionForeground)] underline">
            MCP Server:
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
                  isMCPRunning ? "text-green-500" : "text-red-500",
                  "text-sm"
                )}
              >
                {isMCPRunning ? "Running " : "Stopped"}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-4 w-fit">
        {!isMCPRunning && (
          <button
            className="flex items-center gap-1 px-2 py-1 text-white rounded-md"
            onClick={handleStartMCPServer}
          >
            <RiPlayFill className="size-4" /> Start MCP Server
          </button>
        )}
        {isMCPRunning && (
          <button
            className="flex items-center gap-1 px-2 py-1 text-white rounded-md"
            onClick={handleStopMCPServer}
          >
            <RiStopFill className="size-4" /> Stop MCP Server
          </button>
        )}
      </div>
      {port && isMCPRunning && (
        <span className="text-xs text-gray-500">
          Server running on <b>http://localhost:{port}/sse</b> - Make sure you
          add this to Cursor MCP settings
        </span>
      )}
    </div>
  );
}
