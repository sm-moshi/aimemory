import { useEffect, useState } from "react";
import "@vscode-elements/elements";
import { Status } from "./components/status";

function App() {
  const [apiAvailable, setApiAvailable] = useState(!!window.vscodeApi);

  // Log VSCode API to debug
  console.log("VSCODE API in App:", window.vscodeApi);

  // Re-check for API if it wasn't available initially
  useEffect(() => {
    if (!apiAvailable) {
      const checkInterval = setInterval(() => {
        if (window.vscodeApi) {
          setApiAvailable(true);
          clearInterval(checkInterval);
          // requestRulesStatus();
        }
      }, 500);

      return () => clearInterval(checkInterval);
    }
  }, [apiAvailable]);

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
    <div className="flex flex-col w-full gap-3">
      <header className="border-b border-[var(--vscode-panel-border)] pb-1">
        <h1 className="mb-2 text-[var(--vscode-foreground)] text-2xl font-bold">
          AI Memory
        </h1>
        <p className="mt-0 text-[var(--vscode-descriptionForeground)]">
          Add memory superpowers to LLMs
        </p>
      </header>
      <main>
        <Status />
      </main>
    </div>
  );
}

export default App;
