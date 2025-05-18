import { describe, it, expect } from 'vitest';
import { getTemplateForFileType } from '../lib/memoryBankTemplates.js';
import { MemoryBankFileType } from '../types/types.js';

// Unit tests for getTemplateForFileType

describe('getTemplateForFileType', () => {
  it('returns the correct template for ProjectBrief', () => {
    const result = getTemplateForFileType(MemoryBankFileType.ProjectBrief);
    expect(result).toContain('Project Brief');
    expect(result).toContain('foundation document');
  });

  it('returns the correct template for ProductContext', () => {
    const result = getTemplateForFileType(MemoryBankFileType.ProductContext);
    expect(result).toContain('Product Context');
    expect(result).toContain('user experience goals');
  });

  it('returns the correct template for ProgressFlat', () => {
    const result = getTemplateForFileType(MemoryBankFileType.ProgressFlat);
    expect(result).toContain('Progress');
    expect(result).toContain('What works');
  });

  it('returns the default template for unknown type', () => {
    // @ts-expect-error: purposely passing an invalid value
    const result = getTemplateForFileType('not-a-real-type');
    expect(result).toContain('Memory Bank File');
    expect(result).toContain('default template');
  });
});
