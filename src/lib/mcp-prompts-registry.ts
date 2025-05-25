import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  INITIALIZE_MEMORY_BANK_PROMPT,
  MEMORY_BANK_ALREADY_INITIALIZED_PROMPT,
  MEMORY_BANK_FILE_MISSING_PROMPT,
  MEMORY_BANK_HEALTH_CHECK_PROMPT,
  MEMORY_BANK_STRUCTURE_GUIDE_PROMPT,
  MEMORY_BANK_UPDATE_CONFIRMATION_PROMPT,
  MEMORY_BANK_USAGE_TIP_PROMPT,
  REVIEW_AND_UPDATE_MEMORY_BANK_PROMPT,
} from './mcp-prompts.js';

export function registerMemoryBankPrompts(server: McpServer) {
  server.prompt('memory-bank-guide', () => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: INITIALIZE_MEMORY_BANK_PROMPT,
        },
      },
    ],
  }));

  server.prompt('memory-bank-already-initialized', () => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: MEMORY_BANK_ALREADY_INITIALIZED_PROMPT,
        },
      },
    ],
  }));

  server.prompt('memory-bank-health-check', () => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: MEMORY_BANK_HEALTH_CHECK_PROMPT,
        },
      },
    ],
  }));

  server.prompt('memory-bank-file-missing', (extra) => {
    const fileType =
      typeof extra === 'object' &&
      extra &&
      'params' in extra &&
      typeof extra.params === 'object' &&
      extra.params &&
      'fileType' in extra.params
        ? (extra.params as { fileType?: string }).fileType || '(unknown file)'
        : '(unknown file)';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: MEMORY_BANK_FILE_MISSING_PROMPT(fileType),
          },
        },
      ],
    };
  });

  server.prompt('memory-bank-update-confirmation', (extra) => {
    const fileType =
      typeof extra === 'object' &&
      extra &&
      'params' in extra &&
      typeof extra.params === 'object' &&
      extra.params &&
      'fileType' in extra.params
        ? (extra.params as { fileType?: string }).fileType || '(unknown file)'
        : '(unknown file)';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: MEMORY_BANK_UPDATE_CONFIRMATION_PROMPT(fileType),
          },
        },
      ],
    };
  });

  server.prompt('memory-bank-structure-guide', () => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: MEMORY_BANK_STRUCTURE_GUIDE_PROMPT,
        },
      },
    ],
  }));

  server.prompt('memory-bank-usage-tip', () => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: MEMORY_BANK_USAGE_TIP_PROMPT,
        },
      },
    ],
  }));

  server.prompt('review-and-update-memory-bank', () => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: REVIEW_AND_UPDATE_MEMORY_BANK_PROMPT,
        },
      },
    ],
  }));

  // Agentic logic: When the user requests a batch update or says 'update memory bank', the agent should call 'review-and-update-memory-bank'.
  // This prompt is used to guide the agent in such flows.
  server.prompt('agentic-batch-update-guidance', () => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: "When the user requests to 'update memory bank' or a batch review, you should call the 'review-and-update-memory-bank' tool. For each file, suggest updates or prompt the user for new content, and always respect safety rules (never overwrite protected files without explicit consent). After all files are reviewed, provide a summary of changes.",
        },
      },
    ],
  }));

  // TODO: Add more prompts here as needed
}
