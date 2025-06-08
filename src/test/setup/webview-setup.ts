/**
 * Webview Test Setup for React Components
 *
 * This setup file configures the happy-dom environment for testing React components in the webview.
 */

import { beforeEach, vi } from "vitest";

// Happy-dom provides a DOM environment, but we might need some globals
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation(query => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(), // deprecated
		removeListener: vi.fn(), // deprecated
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Mock VS Code webview API that might be available in the webview context
Object.defineProperty(window, "acquireVsCodeApi", {
	writable: true,
	value: vi.fn().mockImplementation(() => ({
		postMessage: vi.fn(),
		setState: vi.fn(),
		getState: vi.fn(),
	})),
});

beforeEach(() => {
	// Reset any webview-specific state between tests
	vi.clearAllMocks();
});
