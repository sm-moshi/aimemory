// This import automatically extends Vitest's 'expect' with jest-dom matchers
// and provides the necessary types.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Mock web components that don't render correctly in a Node-based test environment
vi.mock("@vscode-elements/elements", () => ({}));

// Mock the VSCode API for webview components
(global as any).vscodeApi = {
	postMessage: vi.fn(),
	getState: vi.fn(),
	setState: vi.fn(),
};

// Clean up the DOM after each test
afterEach(() => {
	cleanup();
});
