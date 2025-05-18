import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryBankService } from '../core/memoryBank.js';
import { MemoryBankFileType } from '../types/types.js';
import type { EnvironmentVariableMutatorType, EnvironmentVariableMutatorOptions } from 'vscode';

// Mock Markdown import to avoid Rollup parse errors
vi.mock('../lib/rules/memory-bank-rules.md', () => ({ default: 'Mocked Markdown Content' }));

// Mocks for external dependencies
vi.mock('vscode', () => ({
  workspace: { workspaceFolders: [{ uri: { fsPath: '/mock/workspace' } }] },
  window: { showInformationMessage: vi.fn() },
  ExtensionContext: class {},
}));
vi.mock('node:fs/promises', () => ({
  stat: vi.fn().mockResolvedValue({ isDirectory: () => true, isFile: () => true, mtime: new Date() }),
  mkdir: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue('mock content'),
  writeFile: vi.fn().mockResolvedValue(undefined),
  access: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('node:path', async () => {
  const actual = await vi.importActual('node:path');
  return { ...actual, join: (...args: string[]) => args.join('/') };
});
vi.mock('../lib/cursor-rules-service.js', () => ({
  CursorRulesService: class {
    createRulesFile = vi.fn().mockResolvedValue(undefined);
  }
}));
vi.mock('../utils/log.js', () => ({
  Logger: { getInstance: () => ({ info: vi.fn() }) },
  LogLevel: { Info: 'info' }
}));
vi.mock('../lib/memoryBankTemplates.js', () => ({
  getTemplateForFileType: () => 'template content',
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
  scheme: 'file',
  authority: '',
  path: '/mock/uri',
  query: '',
  fragment: '',
  fsPath: '/mock/uri',
  with: vi.fn(),
  toString: () => '/mock/uri',
  toJSON: () => ({ fsPath: '/mock/uri' }),
};

// Minimal EnvironmentVariableMutator mock type
type EnvironmentVariableMutator = { type: EnvironmentVariableMutatorType; value: string; options?: object };
const envVarCollectionMock = {
  persistent: true,
  description: '',
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
      'MOCK_VAR',
      { type: 'replace' as unknown as import('vscode').EnvironmentVariableMutatorType, value: 'mock', options }
    ];
  },
};
const extensionMock = {
  id: 'mock.extension',
  extensionUri: uriMock,
  extensionPath: '/mock/path',
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
  extensionPath: '/mock/path',
  environmentVariableCollection: {} as unknown,
  storageUri: uriMock,
  globalStorageUri: uriMock,
  logUri: uriMock,
  extensionMode: 1,
  extension: extensionMock,
  asAbsolutePath: (relativePath: string) => `/mock/path/${relativePath}`,
  storagePath: '/mock/storage',
  globalStoragePath: '/mock/globalStorage',
  logPath: '/mock/log',
  languageModelAccessInformation: {},
};

describe('MemoryBankService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws if no workspace folder is found', async () => {
    const vscode = await import('vscode');
    const original = vscode.workspace.workspaceFolders;
    vi.spyOn(vscode.workspace, 'workspaceFolders', 'get').mockReturnValue(undefined);
    expect(() => new MemoryBankService(mockContext as unknown as import('vscode').ExtensionContext)).toThrow('No workspace folder found');
    vi.spyOn(vscode.workspace, 'workspaceFolders', 'get').mockReturnValue(original);
  });

  it('isReady returns false before loadFiles, true after', async () => {
    const service = new MemoryBankService(mockContext as unknown as import('vscode').ExtensionContext);
    expect(service.isReady()).toBe(false);
    await service.loadFiles();
    expect(service.isReady()).toBe(true);
  });

  it('getFile returns undefined if not loaded, then returns file after loadFiles', async () => {
    const service = new MemoryBankService(mockContext as unknown as import('vscode').ExtensionContext);
    expect(service.getFile(MemoryBankFileType.ProjectBrief)).toBeUndefined();
    await service.loadFiles();
    const file = service.getFile(MemoryBankFileType.ProjectBrief);
    expect(file).toBeDefined();
    expect(file?.content).toBe('mock content');
  });

  it('getAllFiles returns all loaded files', async () => {
    const service = new MemoryBankService(mockContext as unknown as import('vscode').ExtensionContext);
    await service.loadFiles();
    const files = service.getAllFiles();
    expect(Array.isArray(files)).toBe(true);
    expect(files.length).toBeGreaterThan(0);
  });

  it('updateFile updates the file content and lastUpdated', async () => {
    const service = new MemoryBankService(mockContext as unknown as import('vscode').ExtensionContext);
    await service.loadFiles();
    await service.updateFile(MemoryBankFileType.ProjectBrief, 'new content');
    const file = service.getFile(MemoryBankFileType.ProjectBrief);
    expect(file?.content).toBe('new content');
    expect(file?.lastUpdated).toBeInstanceOf(Date);
  });

  it('getFilesWithFilenames returns a string with file info', async () => {
    const service = new MemoryBankService(mockContext as unknown as import('vscode').ExtensionContext);
    await service.loadFiles();
    const result = service.getFilesWithFilenames();
    expect(typeof result).toBe('string');
    expect(result).toContain('last updated');
  });

  it('checkHealth returns healthy message if all files/folders exist', async () => {
    const service = new MemoryBankService(mockContext as unknown as import('vscode').ExtensionContext);
    await service.loadFiles();
    const health = await service.checkHealth();
    expect(health).toContain('All files and folders are present');
  });

  it('getIsMemoryBankInitialized returns true if all files exist', async () => {
    const service = new MemoryBankService(mockContext as unknown as import('vscode').ExtensionContext);
    await service.loadFiles();
    const isInit = await service.getIsMemoryBankInitialized();
    expect(isInit).toBe(true);
  });
});
