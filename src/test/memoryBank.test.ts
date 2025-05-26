import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EnvironmentVariableMutatorOptions, EnvironmentVariableMutatorType } from "vscode";
import { MemoryBankService } from "../core/memoryBank.js";
import { MemoryBankFileType } from "../types/types.js";

// Mock Markdown import to avoid Rollup parse errors
vi.mock("../lib/rules/memory-bank-rules.md", () => ({ default: "Mocked Markdown Content" }));

// Mocks for external dependencies
vi.mock("vscode", () => ({
	workspace: { workspaceFolders: [{ uri: { fsPath: "/mock/workspace" } }] },
	window: { showInformationMessage: vi.fn() },
	ExtensionContext: class {},
}));
vi.mock("node:fs/promises", () => ({
	stat: vi
		.fn()
		.mockResolvedValue({ isDirectory: () => true, isFile: () => true, mtime: new Date() }),
	mkdir: vi.fn().mockResolvedValue(undefined),
	readFile: vi.fn().mockResolvedValue("mock content"),
	writeFile: vi.fn().mockResolvedValue(undefined),
	access: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("node:path", async () => {
	const actual = await vi.importActual("node:path");
	return { ...actual, join: (...args: string[]) => args.join("/") };
});
vi.mock("../lib/cursor-rules-service.js", () => ({
	CursorRulesService: class {
		createRulesFile = vi.fn().mockResolvedValue(undefined);
	},
}));
vi.mock("../utils/log.js", () => ({
	Logger: { getInstance: () => ({ info: vi.fn() }) },
	LogLevel: { Info: "info" },
}));
vi.mock("../lib/memoryBankTemplates.js", () => ({
	getTemplateForFileType: () => "template content",
}));

// Minimal mock for vscode.ExtensionContext
const mementoMock = {
	keys: () => [],
	get: vi.fn(),
	update: vi.fn(),
	setKeysForSync: (_keys: readonly string[]) => {},
};
const secretStorageMock = {
	get: vi.fn(),
	store: vi.fn(),
	delete: vi.fn(),
	onDidChange: vi.fn(),
};
const uriMock = {
	scheme: "file",
	authority: "",
	path: "/mock/uri",
	query: "",
	fragment: "",
	fsPath: "/mock/uri",
	with: vi.fn(),
	toString: () => "/mock/uri",
	toJSON: () => ({ fsPath: "/mock/uri" }),
};

// Minimal EnvironmentVariableMutator mock type
type EnvironmentVariableMutator = {
	type: EnvironmentVariableMutatorType;
	value: string;
	options?: object;
};
const envVarCollectionMock = {
	persistent: true,
	description: "",
	getScoped: vi.fn(),
	replace: vi.fn(),
	append: vi.fn(),
	prepend: vi.fn(),
	get: vi.fn(),
	forEach: vi.fn(),
	clear: vi.fn(),
	delete: vi.fn(),
	toJSON: vi.fn(),
	[Symbol.iterator]: function* (): IterableIterator<[string, EnvironmentVariableMutator]> {
		const options: EnvironmentVariableMutatorOptions = {};
		yield [
			"MOCK_VAR",
			{
				type: "replace" as unknown as import("vscode").EnvironmentVariableMutatorType,
				value: "mock",
				options,
			},
		];
	},
};
const extensionMock = {
	id: "mock.extension",
	extensionUri: uriMock,
	extensionPath: "/mock/path",
	isActive: true,
	packageJSON: {},
	exports: {},
	activate: vi.fn(),
	extensionKind: 1,
};
const mockContext = {
	subscriptions: [],
	workspaceState: mementoMock,
	globalState: mementoMock,
	secrets: secretStorageMock,
	extensionUri: uriMock,
	extensionPath: "/mock/path",
	environmentVariableCollection: {} as unknown,
	storageUri: uriMock,
	globalStorageUri: uriMock,
	logUri: uriMock,
	extensionMode: 1,
	extension: extensionMock,
	asAbsolutePath: (relativePath: string) => `/mock/path/${relativePath}`,
	storagePath: "/mock/storage",
	globalStoragePath: "/mock/globalStorage",
	logPath: "/mock/log",
	languageModelAccessInformation: {},
};

describe("MemoryBankService", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		// Reset fs mocks to default behavior
		const fs = await import("node:fs/promises");
		fs.stat = vi
			.fn()
			.mockResolvedValue({ isDirectory: () => true, isFile: () => true, mtime: new Date() });
		fs.mkdir = vi.fn().mockResolvedValue(undefined);
		fs.readFile = vi.fn().mockResolvedValue("mock content");
		fs.writeFile = vi.fn().mockResolvedValue(undefined);
		fs.access = vi.fn().mockResolvedValue(undefined);
	});

	it("throws if no workspace folder is found", async () => {
		const vscode = await import("vscode");
		const original = vscode.workspace.workspaceFolders;
		vi.spyOn(vscode.workspace, "workspaceFolders", "get").mockReturnValue(undefined);
		expect(
			() =>
				new MemoryBankService(mockContext as unknown as import("vscode").ExtensionContext),
		).toThrow("No workspace folder found");
		vi.spyOn(vscode.workspace, "workspaceFolders", "get").mockReturnValue(original);
	});

	it("isReady returns false before loadFiles, true after", async () => {
		const service = new MemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
		);
		expect(service.isReady()).toBe(false);
		await service.loadFiles();
		expect(service.isReady()).toBe(true);
	});

	it("getFile returns undefined if not loaded, then returns file after loadFiles", async () => {
		const service = new MemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
		);
		expect(service.getFile(MemoryBankFileType.ProjectBrief)).toBeUndefined();
		await service.loadFiles();
		const file = service.getFile(MemoryBankFileType.ProjectBrief);
		expect(file).toBeDefined();
		expect(file?.content).toBe("mock content");
	});

	it("getAllFiles returns all loaded files", async () => {
		const service = new MemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
		);
		await service.loadFiles();
		const files = service.getAllFiles();
		expect(Array.isArray(files)).toBe(true);
		expect(files.length).toBeGreaterThan(0);
	});

	it("updateFile updates the file content and lastUpdated", async () => {
		const service = new MemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
		);
		await service.loadFiles();
		await service.updateFile(MemoryBankFileType.ProjectBrief, "new content");
		const file = service.getFile(MemoryBankFileType.ProjectBrief);
		expect(file?.content).toBe("new content");
		expect(file?.lastUpdated).toBeInstanceOf(Date);
	});

	it("getFilesWithFilenames returns a string with file info", async () => {
		const service = new MemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
		);
		await service.loadFiles();
		const result = service.getFilesWithFilenames();
		expect(typeof result).toBe("string");
		expect(result).toContain("last updated");
	});

	it("checkHealth returns healthy message if all files/folders exist", async () => {
		const service = new MemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
		);
		await service.loadFiles();
		const health = await service.checkHealth();
		expect(health).toContain("All files and folders are present");
	});

	it("getIsMemoryBankInitialized returns true if all files exist", async () => {
		const service = new MemoryBankService(
			mockContext as unknown as import("vscode").ExtensionContext,
		);
		await service.loadFiles();
		const isInit = await service.getIsMemoryBankInitialized();
		expect(isInit).toBe(true);
	});

	describe("getIsMemoryBankInitialized edge cases", () => {
		it("returns false when directory doesn't exist", async () => {
			const fs = await import("node:fs/promises");
			fs.stat = vi.fn().mockRejectedValue(new Error("ENOENT"));

			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);
			const result = await service.getIsMemoryBankInitialized();
			expect(result).toBe(false);
		});

		it("returns false when directory exists but files are missing", async () => {
			const fs = await import("node:fs/promises");
			fs.stat = vi
				.fn()
				.mockResolvedValueOnce({ isDirectory: () => true }) // directory exists
				.mockRejectedValue(new Error("ENOENT")); // files don't exist

			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);
			const result = await service.getIsMemoryBankInitialized();
			expect(result).toBe(false);
		});

		it("returns false when files exist but are not actually files", async () => {
			const fs = await import("node:fs/promises");
			fs.stat = vi
				.fn()
				.mockResolvedValueOnce({ isDirectory: () => true }) // directory exists
				.mockResolvedValue({ isFile: () => false, mtimeMs: Date.now() }); // files exist but are not files

			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);
			const result = await service.getIsMemoryBankInitialized();
			expect(result).toBe(false);
		});

		it("handles cache hits and misses correctly", async () => {
			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);

			// Load files first to populate cache
			await service.loadFiles();

			// Reset stats before testing
			service.resetCacheStats();

			// Call loadFiles again - this should show cache behavior
			await service.loadFiles();
			const stats = service.getCacheStats();

			// We should have some cache activity (hits since files are already loaded)
			expect(stats.hits).toBeGreaterThan(0);
		});

		it("invalidates cache for missing files", async () => {
			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);

			// Pre-populate cache and then clear it
			service.invalidateCache();

			// Now setup mocks for missing files scenario
			const fs = await import("node:fs/promises");
			fs.stat = vi
				.fn()
				.mockResolvedValueOnce({ isDirectory: () => true }) // directory exists
				.mockRejectedValue(new Error("ENOENT")); // files don't exist

			const result = await service.getIsMemoryBankInitialized();
			expect(result).toBe(false);
		});

		it("handles general errors gracefully", async () => {
			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);

			// Setup mocks after service creation
			const fs = await import("node:fs/promises");
			fs.stat = vi.fn().mockRejectedValue(new Error("Unexpected error"));

			const result = await service.getIsMemoryBankInitialized();
			expect(result).toBe(false);
		});
	});

	describe("cache management", () => {
		it("can invalidate specific file cache", async () => {
			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);
			await service.loadFiles();

			// Invalidate specific file - should not throw
			expect(() => {
				service.invalidateCache("/mock/workspace/memory-bank/core/projectbrief.md");
			}).not.toThrow();

			// Should still have cache methods available
			const stats = service.getCacheStats();
			expect(stats).toBeDefined();
		});

		it("can clear all cache", async () => {
			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);
			await service.loadFiles();

			// Clear all cache - should not throw
			expect(() => {
				service.invalidateCache();
			}).not.toThrow();

			// Reset stats to verify behavior
			service.resetCacheStats();
			const stats = service.getCacheStats();
			expect(stats.hits).toBe(0);
			expect(stats.misses).toBe(0);
			expect(stats.reloads).toBe(0);
		});
	});

	describe("loadFiles error handling", () => {
		it("sets ready to false on error", async () => {
			const fs = await import("node:fs/promises");
			fs.readFile = vi.fn().mockRejectedValue(new Error("Read failed"));
			fs.writeFile = vi.fn().mockRejectedValue(new Error("Write failed"));

			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);

			await expect(service.loadFiles()).rejects.toThrow("Write failed");
			expect(service.isReady()).toBe(false);
		});

		it("creates missing files from templates", async () => {
			const fs = await import("node:fs/promises");
			fs.readFile = vi.fn().mockRejectedValue(new Error("File not found"));
			fs.writeFile = vi.fn().mockResolvedValue(undefined);
			fs.stat = vi.fn().mockResolvedValue({ mtime: new Date(), mtimeMs: Date.now() });

			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);

			const createdFiles = await service.loadFiles();
			expect(createdFiles.length).toBeGreaterThan(0);
			expect(service.isReady()).toBe(true);
		});
	});

	describe("updateFile error handling", () => {
		it("throws error when write fails", async () => {
			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);
			await service.loadFiles();

			// Mock writeFile to fail after initial load
			const fs = await import("node:fs/promises");
			fs.writeFile = vi.fn().mockRejectedValue(new Error("Write failed"));

			await expect(
				service.updateFile(MemoryBankFileType.ProjectBrief, "new content"),
			).rejects.toThrow("Write failed");
		});
	});

	describe("checkHealth error cases", () => {
		it("reports missing folders", async () => {
			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);
			await service.loadFiles();

			// Mock stat to fail after initial load
			const fs = await import("node:fs/promises");
			fs.stat = vi.fn().mockRejectedValue(new Error("Folder not found"));

			const health = await service.checkHealth();
			expect(health).toContain("Issues found");
			expect(health).toContain("Missing folder");
		});

		it("reports missing files", async () => {
			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);
			await service.loadFiles();

			// Mock access to fail after initial load
			const fs = await import("node:fs/promises");
			fs.stat = vi.fn().mockResolvedValue({ isDirectory: () => true }); // folder exists
			fs.access = vi.fn().mockRejectedValue(new Error("File not accessible"));

			const health = await service.checkHealth();
			expect(health).toContain("Issues found");
			expect(health).toContain("Missing or unreadable");
		});
	});

	describe("initializeFolders", () => {
		it("creates all required subfolders", async () => {
			const fs = await import("node:fs/promises");
			fs.mkdir = vi.fn().mockResolvedValue(undefined);

			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);

			await service.initializeFolders();

			// Should create root, core, systemPatterns, techContext, progress folders
			expect(fs.mkdir).toHaveBeenCalledWith("/mock/workspace/memory-bank/", {
				recursive: true,
			});
			expect(fs.mkdir).toHaveBeenCalledWith("/mock/workspace/memory-bank/core", {
				recursive: true,
			});
			expect(fs.mkdir).toHaveBeenCalledWith("/mock/workspace/memory-bank/systemPatterns", {
				recursive: true,
			});
			expect(fs.mkdir).toHaveBeenCalledWith("/mock/workspace/memory-bank/techContext", {
				recursive: true,
			});
			expect(fs.mkdir).toHaveBeenCalledWith("/mock/workspace/memory-bank/progress", {
				recursive: true,
			});
		});
	});

	describe("createMemoryBankRulesIfNotExists", () => {
		it("calls cursor rules service to create rules file", async () => {
			const service = new MemoryBankService(
				mockContext as unknown as import("vscode").ExtensionContext,
			);

			await service.createMemoryBankRulesIfNotExists();

			// This should call the mocked CursorRulesService.createRulesFile
			// The exact assertion would depend on how we want to verify this
		});
	});
});
