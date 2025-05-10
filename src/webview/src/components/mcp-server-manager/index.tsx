import { useCallback, useEffect, useState } from "react";
import { RiLoader5Fill, RiPlayFill, RiStopFill } from "react-icons/ri";
import { cn } from "../../utils/cn";

export function MCPServerManager() {
  const [isLoading, setIsLoading] = useState(false);
  const [isMCPRunning, setIsMCPRunning] = useState(false);
  const [port, setPort] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);

  // Function to check if MCP server is already running on a given port
  const checkServerRunning = useCallback(async (checkPort: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:${checkPort}/health`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        // Short timeout to avoid hanging if server is not responsive
        signal: AbortSignal.timeout(1000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === "ok ok") {
          // Server is already running on this port
          setIsMCPRunning(true);
          setPort(checkPort);

          // Notify extension that we detected a running server
          window.vscodeApi?.postMessage({
            command: "serverAlreadyRunning",
            port: checkPort,
          });
        }
      }
    } catch (error) {
      // Server is not running or not responding, this is expected in many cases
      console.log(`No server running on port ${checkPort}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check if a server is already running when component mounts
  useEffect(() => {
    // Default port to check - should match DEFAULT_MCP_PORT in extension.ts
    const defaultPorts = [7331, 7332];

    // Try to check all potential ports
    const checkAllPorts = async () => {
      for (const portToCheck of defaultPorts) {
        // If we already found a running server, stop checking
        if (isMCPRunning) { break; }
        await checkServerRunning(portToCheck);
      }
    };

    checkAllPorts();
  }, [checkServerRunning, isMCPRunning]);

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

  // Helper to call MCP tool via HTTP POST
  const callMCPTool = useCallback(
    async (tool: string, params: Record<string, unknown> = {}) => {
      if (!port) {
        setFeedback("MCP server port not available.");
        return;
      }
      try {
        const response = await fetch(`http://localhost:${port}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool, params }),
        });
        if (!response.ok) {
          setFeedback(`Error: ${response.statusText}`);
          return;
        }
        const data = await response.json();
        if (data?.content?.[0]?.text) {
          setFeedback(data.content[0].text);
        } else {
          setFeedback("No response from MCP tool.");
        }
      } catch (err) {
        setFeedback(`Request failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [port]
  );

  // Handler for Initialize Memory Bank
  const handleInitializeMemoryBank = useCallback(async () => {
    setInitLoading(true);
    setFeedback(null);
    await callMCPTool("initialize-memory-bank");
    setInitLoading(false);
  }, [callMCPTool]);

  // Handler for Update Memory Bank
  const handleUpdateMemoryBank = useCallback(async () => {
    // Simple prompt for file type and content (can be improved to a modal or form)
    const fileType = window.prompt("Enter memory bank file type (e.g. projectbrief.md):");
    if (!fileType) { return; }
    const content = window.prompt("Enter new content for the file:");
    if (content === null) { return; }
    setUpdateLoading(true);
    setFeedback(null);
    await callMCPTool("update-memory-bank-file", { fileType, content });
    setUpdateLoading(false);
  }, [callMCPTool]);

  // Handler for Repair Memory Bank
  const handleRepairMemoryBank = useCallback(async () => {
    setFeedback(null);
    setUpdateLoading(true);
    await callMCPTool("read-memory-bank-files");
    setUpdateLoading(false);
  }, [callMCPTool]);

  return (
    <div className="flex flex-col gap-3">
      {/* MCP Server Controls */}
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
            type="button"
            className="flex items-center gap-1 px-2 py-1 text-white rounded-md"
            onClick={handleStartMCPServer}
          >
            <RiPlayFill className="size-4" /> Start MCP Server
          </button>
        )}
        {isMCPRunning && (
          <button
            type="button"
            className="flex items-center gap-1 px-2 py-1 text-white rounded-md"
            onClick={handleStopMCPServer}
          >
            <RiStopFill className="size-4" /> Stop MCP Server
          </button>
        )}
      </div>
      {/* Memory Bank Controls */}
      {isMCPRunning && (
        <div className="flex flex-col gap-2 mt-4">
          <div className="flex gap-4">
            <button
              type="button"
              className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              onClick={handleInitializeMemoryBank}
              disabled={initLoading}
            >
              {initLoading ? "Initializing..." : "Initialize Memory Bank"}
            </button>
            <button
              type="button"
              className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              onClick={handleUpdateMemoryBank}
              disabled={updateLoading}
            >
              {updateLoading ? "Updating..." : "Update Memory Bank"}
            </button>
            <button
              type="button"
              className="px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
              onClick={handleRepairMemoryBank}
              disabled={updateLoading}
            >
              {updateLoading ? "Repairing..." : "Repair Memory Bank"}
            </button>
          </div>
        </div>
      )}
      {/* Feedback message */}
      {feedback && (
        <div className="mt-2 p-2 bg-gray-100 border rounded text-sm text-gray-800">
          {feedback}
        </div>
      )}
      {port && isMCPRunning && (
        <span className="text-xs text-gray-500">
          Server running on <b>http://localhost:{port}/sse</b>
          <br />
          Your Cursor MCP config has been automatically updated (Please check
          Cursor MCP settings to ensure it is correct).
        </span>
      )}
    </div>
  );
}
