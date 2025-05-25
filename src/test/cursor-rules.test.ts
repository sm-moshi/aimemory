import { describe, expect, it, vi } from 'vitest';

// Mock the Markdown import to avoid Rollup parse errors
vi.mock('../lib/rules/memory-bank-rules.md', () => ({
  default: 'Mocked Markdown Content',
}));

import {
  CURSOR_MEMORY_BANK_FILENAME,
  CURSOR_MEMORY_BANK_RULES_FILE,
  CURSOR_RULES_PATH,
} from '../lib/cursor-rules.js';

// Unit tests for cursor-rules.ts

describe('cursor-rules', () => {
  it('CURSOR_RULES_PATH ends with memory-bank.mdc', () => {
    expect(CURSOR_RULES_PATH.endsWith('memory-bank.mdc')).toBe(true);
  });

  it('CURSOR_MEMORY_BANK_FILENAME is correct', () => {
    expect(CURSOR_MEMORY_BANK_FILENAME).toBe('memory-bank.mdc');
  });

  it('CURSOR_MEMORY_BANK_RULES_FILE contains mocked markdown content', () => {
    expect(CURSOR_MEMORY_BANK_RULES_FILE).toContain('Mocked Markdown Content');
  });
});
