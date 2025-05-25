import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandHandler } from '../commandHandler.js';

const mockMemoryBank = {
  getIsMemoryBankInitialized: vi.fn().mockResolvedValue(true),
  loadFiles: vi.fn().mockResolvedValue([]),
  getAllFiles: vi.fn().mockReturnValue([]),
  initializeFolders: vi.fn().mockResolvedValue(undefined),
  checkHealth: vi.fn().mockResolvedValue('Healthy'),
};
const mockMcpServer = {
  getMemoryBank: () => mockMemoryBank,
  updateMemoryBankFile: vi.fn().mockResolvedValue(undefined),
};

// Minimal type for MemoryBankMCPServer for testing
type MemoryBankMCPServer = {
  getMemoryBank: () => typeof mockMemoryBank;
  updateMemoryBankFile: (fileType: string, content: string) => Promise<void>;
};

describe('CommandHandler', () => {
  let handler: CommandHandler;
  beforeEach(() => {
    vi.clearAllMocks();

    handler = new CommandHandler(mockMcpServer as any);
  });

  it('returns help text for /memory help', async () => {
    const result = await handler.processMemoryCommand('/memory help');
    expect(result).toContain('AI Memory Bank Commands');
  });

  it('returns status for /memory status', async () => {
    const result = await handler.processMemoryCommand('/memory status');
    expect(result).toContain('Memory Bank Status');
  });

  it('returns error for unsupported command', async () => {
    const result = await handler.processMemoryCommand('/memory foo');
    expect(result).toContain('is not supported');
  });
});
