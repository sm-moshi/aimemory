import { describe, expect, it, vi } from "vitest";
import { activate, deactivate } from "../../extension";

// Import the VS Code mock to ensure it's available
import { mockVscodeCommands } from "../__mocks__/vscode";

// Mock all the dependencies that activate uses
vi.mock("../../utils/logging", () => ({
	createLogger: () => ({
		setLevel: vi.fn(),
		info: vi.fn(),
		debug: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		trace: vi.fn(),
	}),
}));

vi.mock("../../utils/di-container", () => ({
	DIContainer: vi.fn().mockImplementation(() => ({
		register: vi.fn(),
		resolve: vi.fn().mockImplementation((serviceName: string) => {
			// Return appropriate mocks based on service name
			switch (serviceName) {
				case "WebviewManager":
					return { openWebview: vi.fn() };
				case "CommandHandler":
					return { processMemoryCommand: vi.fn() };
				case "MCPServerInterface":
					return { start: vi.fn(), stop: vi.fn() };
				default:
					return {};
			}
		}),
	})),
}));

vi.mock("../../core/FileOperationManager", () => ({
	FileOperationManager: vi.fn().mockImplementation(() => ({
		readFileWithRetry: vi.fn(),
		writeFileWithRetry: vi.fn(),
	})),
}));

vi.mock("../../core/CacheManager", () => ({
	CacheManager: vi.fn().mockImplementation(() => ({
		get: vi.fn(),
		set: vi.fn(),
	})),
}));

vi.mock("../../performance/StreamingManager", () => ({
	StreamingManager: vi.fn().mockImplementation(() => ({
		streamFile: vi.fn(),
	})),
}));

vi.mock("../../core/memoryBankServiceCore", () => ({
	MemoryBankServiceCore: vi.fn().mockImplementation(() => ({
		getIsMemoryBankInitialized: vi.fn(),
		initializeFolders: vi.fn(),
		loadFiles: vi.fn(),
	})),
}));

vi.mock("../../cursor/rules-service", () => ({
	CursorRulesService: vi.fn().mockImplementation(() => ({
		createRulesFile: vi.fn(),
	})),
}));

vi.mock("../../mcp/mcpAdapter", () => ({
	MemoryBankMCPAdapter: vi.fn().mockImplementation(() => ({
		start: vi.fn(),
		stop: vi.fn(),
		getPort: vi.fn(() => 3000),
	})),
}));

vi.mock("../../app/extension/webviewManager", () => ({
	WebviewManager: vi.fn().mockImplementation(() => ({
		openWebview: vi.fn(),
	})),
}));

vi.mock("../../app/extension/commandHandler", () => ({
	CommandHandler: vi.fn().mockImplementation(() => ({
		processMemoryCommand: vi.fn(),
	})),
}));

// Mock the cursor config helper functions
vi.mock("../../cursor/config-helpers", () => ({
	updateCursorMCPConfig: vi.fn(),
}));

vi.mock("../../cursor/rules", () => ({
	getCursorMemoryBankRulesFile: vi.fn(),
}));

vi.mock("../../utils/vscode/ui-helpers", () => ({
	showVSCodeError: vi.fn(),
}));

describe("Extension Activation and Deactivation", () => {
	it("should activate the extension and register commands", async () => {
		const mockContext: any = {
			subscriptions: [],
			extensionPath: "/mock/path",
			extensionUri: { fsPath: "/mock/path" },
		};

		await activate(mockContext);

		// Verify that commands were registered using the VS Code mock
		expect(mockVscodeCommands.registerCommand).toHaveBeenCalled();
		expect(mockVscodeCommands.registerTextEditorCommand).toHaveBeenCalled();
		// Verify that disposables were added to subscriptions
		expect(mockContext.subscriptions.length).toBeGreaterThan(0);
	});

	it("deactivates the extension", () => {
		deactivate();
		// Currently, deactivate does nothing, so this is just a smoke test.
		// If deactivation logic is added, this test should be updated.
		expect(true).toBe(true);
	});
});
