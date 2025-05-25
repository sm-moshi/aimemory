export const INITIALIZE_MEMORY_BANK_PROMPT = `I need you to initialize the Memory Bank for this project.

STEPS:
1. Read the Cursor rules at .cursor/rules/memory-bank.mdc to understand the Memory Bank structure
2. Create all required Memory Bank files with appropriate initial content for this project
3. Document the project goals, context, and technical details based on what you know
4. Once you've created the Memory Bank files, call the load-memory-bank-files tool to complete initialization

This is critical for maintaining project context between sessions. Please start immediately.`;

export const MEMORY_BANK_ALREADY_INITIALIZED_PROMPT =
  'The Memory Bank has already been initialized. Read the .cursor/rules/memory-bank.mdc file to understand the Memory Bank structure and how it works.';

export const MEMORY_BANK_HEALTH_CHECK_PROMPT =
  'Please check the health of the Memory Bank and report any missing or corrupted files. Suggest repairs if needed.';

export const MEMORY_BANK_FILE_MISSING_PROMPT = (fileType: string) =>
  `The file "${fileType}" is missing from the Memory Bank. Please create it using the appropriate template and document its intended content.`;

export const MEMORY_BANK_UPDATE_CONFIRMATION_PROMPT = (fileType: string) =>
  `You are about to update "${fileType}". Please confirm the changes and ensure you have user consent if this file is sensitive.`;

export const MEMORY_BANK_STRUCTURE_GUIDE_PROMPT =
  'Refer to the Memory Bank structure diagram in the ruleset to understand the relationship between files and modules. Use this as a guide when reading or updating files.';

export const MEMORY_BANK_USAGE_TIP_PROMPT =
  'Tip: Regularly review the Memory Bank for outdated or incomplete information. Keeping it up to date improves agent performance and project continuity.';

export const REVIEW_AND_UPDATE_MEMORY_BANK_PROMPT =
  'You are reviewing all memory bank files. For each file, review the content and suggest updates if needed. Always prompt before overwriting protected files. After all files are reviewed, summarise the changes made.';
