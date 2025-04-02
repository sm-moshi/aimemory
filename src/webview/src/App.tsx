import { useEffect, useState } from "react";
import "@vscode-elements/elements";
import { Status } from "./components/status";
import { HowDoesItWork } from "./components/how-does-it-work";

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
        <h1 className="mb-4 text-xl text-red-500">VSCode API not available</h1>
        <p>The extension is having trouble connecting to VSCode.</p>
        <button
          className="px-4 py-2 mt-4 font-bold text-white bg-blue-500 rounded hover:bg-blue-700"
          onClick={() => setApiAvailable(!!window.vscodeApi)}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-6">
      <header className="flex flex-col gap-1 border-b border-[var(--vscode-panel-border)]">
        <h1 className="text-2xl font-bold">AI Memory</h1>
        <p className="mt-0 text-[var(--vscode-descriptionForeground)]">
          Add memory superpowers to LLMs
        </p>
      </header>
      <main className="flex flex-col gap-8">
        <Status />
        <HowDoesItWork />
      </main>
    </div>
  );
}

export default App;
