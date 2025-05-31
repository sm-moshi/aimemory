// Global vitest setup file for VS Code extension testing
import { vi } from "vitest";

// Mock the vscode module globally
vi.mock("vscode", () => {
	return {
		workspace: {
			workspaceFolders: [
				{
					uri: { fsPath: "/mock/workspace" },
					name: "mock-workspace",
					index: 0,
				},
			],
		},
		window: {
			showInformationMessage: vi.fn(),
			showErrorMessage: vi.fn(),
			showWarningMessage: vi.fn(),
		},
		Uri: {
			file: vi.fn((path: string) => ({ fsPath: path })),
			parse: vi.fn((uri: string) => ({ fsPath: uri })),
		},
		ExtensionContext: vi.fn(),
		commands: {
			registerCommand: vi.fn(),
			executeCommand: vi.fn(),
		},
		languages: {
			registerCompletionItemProvider: vi.fn(),
		},
		StatusBarAlignment: {
			Left: 1,
			Right: 2,
		},
		TreeItemCollapsibleState: {
			None: 0,
			Collapsed: 1,
			Expanded: 2,
		},
		ConfigurationTarget: {
			Global: 1,
			Workspace: 2,
			WorkspaceFolder: 3,
		},
	};
});
