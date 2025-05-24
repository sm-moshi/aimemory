import { useCallback, useEffect, useState } from 'react';
import { RiPlayFill, RiStopFill } from 'react-icons/ri';
import { cn } from '../../utils/cn.js';
import { sendLog } from '../../utils/message.js';
import { RulesStatus } from '../status/rules-status.js';

export function MCPServerManager() {
  const [isLoading, setIsLoading] = useState(false);
  const [isMCPRunning, setIsMCPRunning] = useState(false);
  const [port, setPort] = useState<number | null>(null);
  const [feedback] = useState<string | null>(null);

  // Function to check if MCP server is already running on a given port
  const checkServerRunning = useCallback(async (checkPort: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:${checkPort}/health`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        // Short timeout to avoid hanging if server is not responsive
        signal: AbortSignal.timeout(1000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'ok ok') {
          // Server is already running on this port
          setIsMCPRunning(true);
          setPort(checkPort);

          // Notify extension that we detected a running server
          window.vscodeApi?.postMessage({
            command: 'serverAlreadyRunning',
            port: checkPort,
          });
          sendLog(`Detected running MCP server on port ${checkPort}`, 'info', {
            action: 'detectServer',
            port: checkPort,
          });
        }
      }
    } catch (error) {
      // Server is not running or not responding, this is expected in many cases
      sendLog(
        `No server running on port ${checkPort}: ${error instanceof Error ? error.message : String(error)}`,
        'info',
        { action: 'detectServer', port: checkPort }
      );
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
        if (isMCPRunning) {
          break;
        }
        await checkServerRunning(portToCheck);
      }
    };

    checkAllPorts();
  }, [checkServerRunning, isMCPRunning]);

  const handleStartMCPServer = useCallback(() => {
    setIsLoading(true);
    setIsMCPRunning(true);
    sendLog("User clicked 'Start MCP Server' button", 'info', { action: 'startMCPServer' });
    window.vscodeApi?.postMessage({
      command: 'startMCPServer',
    });
  }, []);

  const handleStopMCPServer = useCallback(() => {
    setIsLoading(true);
    setIsMCPRunning(false);
    setPort(null);
    sendLog("User clicked 'Stop MCP Server' button", 'info', { action: 'stopMCPServer' });
    window.vscodeApi?.postMessage({
      command: 'stopMCPServer',
    });
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    const message = event.data;
    switch (message.type) {
      case 'MCPServerStatus':
        setIsMCPRunning(message.status === 'started');
        setIsLoading(false);
        if (message.port) {
          setPort(message.port);
        }
        break;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  return (
    <div className="rounded-xl border border-border bg-muted p-4 shadow-sm space-y-4 mb-6">
      <h2 className="text-xl font-bold mb-2 border-b border-border pb-1">MCP Server</h2>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Status:</span>
        <span
          className={cn(
            isMCPRunning ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800',
            'px-2 py-0.5 rounded-full text-xs font-semibold'
          )}
        >
          {isMCPRunning ? 'Running' : 'Stopped'}
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
              <RiPlayFill className="size-4 mr-1" /> <span>Start MCP Server</span>
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
              <RiStopFill className="size-4 mr-1" /> <span>Stop MCP Server</span>
            </button>
            <div />
          </>
        )}
        <div className="col-span-2">
          <RulesStatus />
        </div>
      </div>
      <hr className="border-border my-4" />
      {feedback && (
        <pre className="bg-gray-100 p-2 rounded max-h-40 overflow-y-auto text-xs mt-2 transition-opacity duration-300">
          {feedback}
        </pre>
      )}
      {port && isMCPRunning && (
        <p className="text-xs text-muted-foreground mt-2">
          Server running on{' '}
          <span className="font-mono text-blue-300">http://localhost:{port}/sse</span>
          <br />
          Your Cursor MCP config has been automatically updated.
          <br />
          Please check Cursor MCP settings to ensure it is correct.
        </p>
      )}
    </div>
  );
}
