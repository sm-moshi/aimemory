// Modern Vitest global setup file for VS Code extension testing
import { beforeEach, vi } from "vitest";
import { mockLogger, resetSharedMocks } from "./shared-mocks";

// --- Modern Global Mocks ---

// 1. VS Code API - automatically handled by __mocks__/vscode.js
// No manual vi.mock() needed - Vitest auto-discovers __mocks__ folder

// 2. Logger - using shared vi.hoisted() instance
vi.mock("@/utils/vscode/vscode-logger", () => ({
	Logger: {
		getInstance: vi.fn(() => mockLogger),
	},
	LogLevel: {
		trace: 0,
		debug: 1,
		info: 2,
		warning: 3,
		error: 4,
		off: 5,
	},
}));

// 3. Common Node.js modules - will be handled by __mocks__ folder
// __mocks__/node:fs.js, __mocks__/node:os.js, etc.

// --- Global Test Hooks ---
beforeEach(() => {
	// Reset all standard Vitest mocks
	vi.clearAllMocks();

	// Reset our shared mock instances for test isolation
	resetSharedMocks();
});
