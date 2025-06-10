import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock @vscode-elements/elements before importing App
vi.mock("@vscode-elements/elements", () => ({}));

// Mock the App component's child components to avoid import issues
vi.mock("./components/how-does-it-work/index", () => ({
	HowDoesItWork: () => <div>How does it work?</div>,
}));

vi.mock("./components/mcp-server-manager/index", () => ({
	MCPServerManager: () => <div>MCP Server</div>,
}));

vi.mock("./components/status/index", () => ({
	Status: ({ onReviewAllFiles, reviewLoading }: { onReviewAllFiles: () => void; reviewLoading: boolean }) => (
		<div>
			<div>Memory Bank Status</div>
			{reviewLoading && <div>Loading...</div>}
			<button type="button" onClick={onReviewAllFiles}>
				Review All Files
			</button>
		</div>
	),
}));

// Mock the message utility
vi.mock("./utils/message", () => ({
	sendLog: vi.fn(),
}));

// Now import App after the mocks
import App from "./App";

// Type the global utility function
declare global {
	var setVSCodeAPIAvailable: (available: boolean) => void;
}

describe("App", () => {
	beforeEach(() => {
		// Clear any mocks
		vi.clearAllMocks();

		// Clear any existing vscodeApi (only if window exists)
		if (typeof window !== "undefined") {
			(window as any).vscodeApi = undefined;
		}
	});

	it("renders fallback when VSCode API is not available", () => {
		// Explicitly ensure VSCode API is not available
		if (typeof window !== "undefined") {
			(window as any).vscodeApi = undefined;
		}

		render(<App />);

		// Should show the fallback UI
		expect(screen.getByText("VSCode API not available")).toBeInTheDocument();
		expect(screen.getByText("The extension is having trouble connecting to VSCode.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
	});

	it("renders main interface when VSCode API is available", async () => {
		// Make VSCode API available
		if (typeof window !== "undefined") {
			(window as any).vscodeApi = {
				postMessage: vi.fn(),
				getState: vi.fn(),
				setState: vi.fn(),
			};
		}

		render(<App />);

		// Should show the main app interface
		expect(screen.getByText("AI Memory")).toBeInTheDocument();
		expect(screen.getByText("Get your Cursor LLMs some brain!")).toBeInTheDocument();

		// Should show main sections (mocked components)
		expect(screen.getByText("MCP Server")).toBeInTheDocument();
		expect(screen.getByText("Memory Bank Status")).toBeInTheDocument();
		expect(screen.getByText("How does it work?")).toBeInTheDocument();

		// Should NOT show the fallback message
		expect(screen.queryByText("VSCode API not available")).not.toBeInTheDocument();
	});

	it("can retry connection when API becomes available", async () => {
		// Start without API
		if (typeof window !== "undefined") {
			(window as any).vscodeApi = undefined;
		}

		render(<App />);

		// Should show fallback initially
		expect(screen.getByText("VSCode API not available")).toBeInTheDocument();

		// Make API available and click "Try Again" in act
		await act(async () => {
			if (typeof window !== "undefined") {
				(window as any).vscodeApi = {
					postMessage: vi.fn(),
					getState: vi.fn(),
					setState: vi.fn(),
				};
			}

			// Click "Try Again" button
			const tryAgainButton = screen.getByRole("button", { name: "Try Again" });
			tryAgainButton.click();
		});

		// Should now show main interface
		await waitFor(() => {
			expect(screen.getByText("AI Memory")).toBeInTheDocument();
		});

		expect(screen.queryByText("VSCode API not available")).not.toBeInTheDocument();
	});
});
