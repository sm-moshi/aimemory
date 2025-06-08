import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WebviewManager } from "../../app/extension/webviewManager";
import { mockWindow, standardAfterEach, standardBeforeEach } from "../test-utils";

describe("WebviewManager", () => {
	let webviewManager: WebviewManager;
	const mockContext: any = {
		extensionPath: "/mock/extension/path",
		subscriptions: [],
		extensionUri: { fsPath: "/mock/extension/path" },
	};

	const mockMcpServer: any = {
		isServerRunning: vi.fn().mockReturnValue(false),
		setExternalServerRunning: vi.fn(),
		getPort: vi.fn().mockReturnValue(3000),
	};

	const mockMemoryBankService: any = {
		getAllFiles: vi.fn().mockReturnValue([]),
		checkHealth: vi.fn().mockResolvedValue({ success: true, data: "healthy" }),
	};

	const mockCursorRulesService: any = {
		listAllRulesFilesInfo: vi.fn().mockResolvedValue([]),
	};

	const mockMcpAdapter: any = {
		isServerRunning: vi.fn().mockReturnValue(false),
		setExternalServerRunning: vi.fn(),
	};

	const mockLogger: any = {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	};

	beforeEach(() => {
		standardBeforeEach();
		vi.clearAllMocks(); // Ensure mocks are clean for each test
		webviewManager = new WebviewManager(
			mockContext,
			mockMcpServer,
			mockMemoryBankService,
			mockCursorRulesService,
			mockMcpAdapter,
			mockLogger,
		);
	});

	afterEach(standardAfterEach);

	it("should create a webview panel", async () => {
		await webviewManager.openWebview();
		expect(mockWindow.createWebviewPanel).toHaveBeenCalledTimes(1);
		expect(mockWindow.createWebviewPanel).toHaveBeenCalledWith(
			"aiMemoryWebview",
			"AI Memory",
			expect.any(Number), // ViewColumn
			expect.objectContaining({
				enableScripts: true,
				retainContextWhenHidden: true,
			}),
		);
	});

	it("should set the webview HTML content", async () => {
		await webviewManager.openWebview();
		const panel = webviewManager.getWebviewPanel();
		expect(panel?.webview.html).toContain("<!DOCTYPE html>");
		expect(panel?.webview.html).toContain('<div id="root"></div>');
		expect(panel?.webview.html).toContain("main"); // Ensure script is referenced
	});

	it("should handle messages from the webview", async () => {
		await webviewManager.openWebview();
		const panel = webviewManager.getWebviewPanel();

		// Simulate receiving a message from the webview
		const messageHandlers = (panel?.webview.onDidReceiveMessage as any).mock.calls[0][0];
		messageHandlers({ command: "getRulesStatus", payload: {} });

		// Verify that appropriate method calls are made
		expect(mockCursorRulesService.listAllRulesFilesInfo).toHaveBeenCalled();
	});

	it("should dispose the panel when it's closed", async () => {
		await webviewManager.openWebview();
		const panel = webviewManager.getWebviewPanel();
		const onDidDisposeCallback = (panel?.onDidDispose as any).mock.calls[0][0];

		onDidDisposeCallback();

		// Check that the panel reference is cleared
		expect(webviewManager.getWebviewPanel()).toBeUndefined();
	});

	it("should only create one panel at a time", async () => {
		await webviewManager.openWebview();
		const firstPanel = webviewManager.getWebviewPanel();

		// The second call should reveal the existing panel, not create a new one.
		await webviewManager.openWebview();
		const secondPanel = webviewManager.getWebviewPanel();

		expect(mockWindow.createWebviewPanel).toHaveBeenCalledTimes(1);
		expect(firstPanel?.reveal).toHaveBeenCalled();
		expect(secondPanel).toBe(firstPanel);
	});
});
