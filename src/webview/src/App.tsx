import { useEffect, useState } from "react";
import "@vscode-elements/elements";
// import RuleStatusPanel from "./components/RuleStatusPanel.js";
// import ResetRulesPanel from "./components/ResetRulesPanel.js";

// Declare vscode API globally is now in main.tsx

// Get VS Code API reference
const vscode = window.vscodeApi;

// const vscode = acquireVsCodeApi();

function App() {
  const [rulesInitialized, setRulesInitialized] = useState<boolean | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [resetSuccess, setResetSuccess] = useState<boolean | null>(null);
  const [apiAvailable, setApiAvailable] = useState(!!window.vscodeApi);

  // Log VSCode API to debug
  console.log("VSCODE API in App:", window.vscodeApi);

  // Create a safe postMessage function
  const postMessage = (message: any) => {
    if (window.vscodeApi) {
      window.vscodeApi.postMessage(message);
      console.log("Message sent:", message);
    } else {
      console.warn("VSCode API not available, can't send message:", message);
      setApiAvailable(false);
    }
  };

  useEffect(() => {
    // Setup message listener
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      console.log("Received message:", message);

      switch (message.type) {
        case "rulesStatus":
          setRulesInitialized(message.initialized);
          setIsLoading(false);
          break;
        case "resetRulesResult":
          setResetSuccess(message.success);
          // Refresh rules status after reset
          if (message.success) {
            requestRulesStatus();
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
  }, []);

  // Re-check for API if it wasn't available initially
  useEffect(() => {
    if (!apiAvailable) {
      const checkInterval = setInterval(() => {
        if (window.vscodeApi) {
          setApiAvailable(true);
          clearInterval(checkInterval);
          requestRulesStatus();
        }
      }, 500);

      return () => clearInterval(checkInterval);
    }
  }, [apiAvailable]);

  const requestRulesStatus = () => {
    setIsLoading(true);
    postMessage({ type: "getRulesStatus" });
  };

  const handleResetRules = () => {
    setResetSuccess(null);
    postMessage({ type: "resetRules" });
  };

  if (!apiAvailable) {
    return (
      <div className="w-full p-4 text-center">
        <h1 className="text-xl text-red-500 mb-4">VSCode API not available</h1>
        <p>The extension is having trouble connecting to VSCode.</p>
        <button
          className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => setApiAvailable(!!window.vscodeApi)}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <header className="mb-8 border-b border-[var(--vscode-panel-border)] pb-4">
        <h1 className="mb-2 text-[var(--vscode-foreground)] text-2xl font-bold">
          AIMemory Extension
        </h1>
        <p className="mt-0 text-[var(--vscode-descriptionForeground)]">
          Manage your AI context memory bank
        </p>
      </header>

      <main className="flex flex-col gap-8 md:flex-row md:items-start">
        <div className="flex-1 rounded bg-[var(--vscode-editor-background)] p-4 shadow-sm">
          <h2 className="mb-4 text-xl font-medium">Memory Bank Status</h2>
          {isLoading ? (
            <p className="text-[var(--vscode-descriptionForeground)]">
              Loading status...
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <p>
                Status:{" "}
                <span className="font-medium">
                  {rulesInitialized ? "Initialized" : "Not Initialized"}
                </span>
              </p>
              <button className="mt-2 w-fit" onClick={requestRulesStatus}>
                Refresh Status
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 rounded bg-[var(--vscode-editor-background)] p-4 shadow-sm">
          <h2 className="mb-4 text-xl font-medium">Reset Memory Bank</h2>
          <p className="mb-4 text-[var(--vscode-descriptionForeground)]">
            Reset the memory bank rules file to the default template.
          </p>
          {resetSuccess !== null && (
            <p className={resetSuccess ? "text-green-500" : "text-red-500"}>
              {resetSuccess ? "Reset successful!" : "Reset failed."}
            </p>
          )}
          <button className="mt-2" onClick={handleResetRules}>
            Reset Rules
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;
