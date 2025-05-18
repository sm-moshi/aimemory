import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoreMemoryBankMCP } from '../mcp/coreMemoryBankMCP.js';

// Mock dependencies
vi.mock('../core/memoryBankServiceCore.js', () => ({
  MemoryBankServiceCore: vi.fn().mockImplementation(() => ({
    getIsMemoryBankInitialized: vi.fn().mockResolvedValue(false),
    initializeFolders: vi.fn().mockResolvedValue(undefined),
    loadFiles: vi.fn().mockResolvedValue([]),
    getAllFiles: vi.fn().mockReturnValue([]),
    getFilesWithFilenames: vi.fn().mockReturnValue('mock files'),
    updateFile: vi.fn().mockResolvedValue(undefined),
    checkHealth: vi.fn().mockResolvedValue('Healthy'),
    getFile: vi.fn().mockReturnValue({ type: 'mock', content: 'mock', lastUpdated: new Date() }),
  }))
}));
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  class McpServer {
    resource = vi.fn();
    tool = vi.fn();
  }
  class ResourceTemplate {}
  return { McpServer, ResourceTemplate };
});
vi.mock('../lib/mcp-prompts-registry.js', () => ({
  registerMemoryBankPrompts: vi.fn(),
}));

describe('CoreMemoryBankMCP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('constructs and registers resources and tools', () => {
    expect(() => new CoreMemoryBankMCP({ memoryBankPath: '/mock/path' })).not.toThrow();
  });

  it('registers expected tools on the server', () => {
    const mcp = new CoreMemoryBankMCP({ memoryBankPath: '/mock/path' });
    // @ts-expect-error: access private for test
    const server = mcp.server;
    expect(server.tool).toHaveBeenCalled();
    expect(server.resource).toHaveBeenCalled();
  });

  it('init-memory-bank tool handler returns success message', async () => {
    const mcp = new CoreMemoryBankMCP({ memoryBankPath: '/mock/path' });
    // @ts-expect-error: access private for test
    const server = mcp.server;
    // Find the tool registration for init-memory-bank
    const call = (server.tool as unknown as { mock: { calls: [string, ...unknown[]][] } }).mock.calls.find((args: [string, ...unknown[]]) => args[0] === 'init-memory-bank');
    expect(call).toBeDefined();
    if (!call) {throw new Error('init-memory-bank tool not registered');}
    // Simulate calling the handler
    const handler = call[2] as () => Promise<unknown>;
    const result = await handler() as { content: { text: string }[] };
    expect(result.content[0].text).toMatch(/Memory bank initialized successfully|already initialized/);
  });
});
