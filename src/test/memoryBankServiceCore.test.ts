import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryBankServiceCore } from '../core/memoryBankServiceCore.js';
import { MemoryBankFileType } from '../types/types.js';

// Mock fs and path modules
vi.mock('node:fs/promises', () => ({
  stat: vi
    .fn()
    .mockResolvedValue({ isDirectory: () => true, isFile: () => true, mtime: new Date() }),
  mkdir: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue('mock content'),
  writeFile: vi.fn().mockResolvedValue(undefined),
  access: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('node:path', async () => {
  const actual = await vi.importActual('node:path');
  return { ...actual, join: (...args: string[]) => args.join('/') };
});
vi.mock('../lib/memoryBankTemplates.js', () => ({
  getTemplateForFileType: () => 'template content',
}));

describe('MemoryBankServiceCore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('constructs and is not ready by default', () => {
    const service = new MemoryBankServiceCore('/mock/path');
    expect(service.isReady()).toBe(false);
  });

  it('getFile returns undefined before loadFiles, then returns file after loadFiles', async () => {
    const service = new MemoryBankServiceCore('/mock/path');
    expect(service.getFile(MemoryBankFileType.ProjectBrief)).toBeUndefined();
    await service.loadFiles();
    const file = service.getFile(MemoryBankFileType.ProjectBrief);
    expect(file).toBeDefined();
    expect(file?.content).toBe('mock content');
  });

  it('getAllFiles returns empty array before loadFiles', () => {
    const service = new MemoryBankServiceCore('/mock/path');
    expect(service.getAllFiles()).toEqual([]);
  });

  // You can add more tests for loadFiles, updateFile, etc. with more advanced mocks if needed
});
