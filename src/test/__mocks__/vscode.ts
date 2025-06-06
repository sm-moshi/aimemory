import { vi } from "vitest";

const mockWorkspaceFs = {
	stat: vi.fn(),
	readFile: vi.fn(),
	writeFile: vi.fn(),
	delete: vi.fn(),
	createDirectory: vi.fn(),
	readDirectory: vi.fn(),
};

const mockWindow = {
	showInformationMessage: vi.fn(),
	showErrorMessage: vi.fn(),
	showWarningMessage: vi.fn(),
	showQuickPick: vi.fn(),
	createWebviewPanel: vi.fn(),
	createOutputChannel: vi.fn(() => ({
		appendLine: vi.fn(),
		show: vi.fn(),
		dispose: vi.fn(),
	})),
};

const mockCommands = {
	registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
	registerTextEditorCommand: vi.fn(() => ({ dispose: vi.fn() })),
	executeCommand: vi.fn(),
};

// Complete VS Code API mock - single source of truth with TypeScript typing
export const workspace = {
	workspaceFolders: [
		{
			uri: { fsPath: "/mock/workspace" },
			name: "Mock Workspace",
			index: 0,
		},
	],
	getConfiguration: vi.fn(() => ({
		get: vi.fn((key: string) => {
			if (key === "aiMemory.memoryBankPath") return ".aimemory/memory-bank";
			if (key === "aiMemory.logLevel") return "info";
			return undefined;
		}),
		update: vi.fn(),
	})),
	onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
	fs: mockWorkspaceFs,
};

export const window = mockWindow;
export const commands = mockCommands;

export const Uri = {
	file: vi.fn((path: string) => ({
		fsPath: path,
		path: path,
		scheme: "file",
		with: vi.fn(),
		toString: () => path,
	})),
	parse: vi.fn((uri: string) => ({
		fsPath: uri,
		path: uri,
		scheme: "file",
		with: vi.fn(),
		toString: () => uri,
	})),
	joinPath: vi.fn((base: { fsPath: string }, ...parts: string[]) => ({
		fsPath: `${base.fsPath}/${parts.join("/")}`,
		path: `${base.fsPath}/${parts.join("/")}`,
		scheme: "file",
	})),
};

// VS Code enums and constants with proper typing
export const FileType = {
	File: 1,
	Directory: 2,
	SymbolicLink: 64,
	Unknown: 0,
} as const;

export const ExtensionMode = {
	Production: 1,
	Development: 2,
	Test: 3,
} as const;

export const ConfigurationTarget = {
	Global: 1,
	Workspace: 2,
	WorkspaceFolder: 3,
} as const;

export const StatusBarAlignment = {
	Left: 1,
	Right: 2,
} as const;

export const TreeItemCollapsibleState = {
	None: 0,
	Collapsed: 1,
	Expanded: 2,
} as const;

// Export mock instances for test assertions with proper types
export const mockVscodeWindow = mockWindow;
export const mockVscodeWorkspaceFs = mockWorkspaceFs;
export const mockVscodeCommands = mockCommands;
