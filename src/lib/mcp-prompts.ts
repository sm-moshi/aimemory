export const INITIALIZE_MEMORY_BANK_PROMPT = `I need you to initialize the Memory Bank for this project. 

STEPS:
1. Read the Cursor rules at .cursor/rules/memory-bank.mdc to understand the Memory Bank structure
2. Create all required Memory Bank files with appropriate initial content for this project
3. Document the project goals, context, and technical details based on what you know
4. Once you've created the Memory Bank files, call the load-memory-bank-files tool to complete initialization

This is critical for maintaining project context between sessions. Please start immediately.`;

export const MEMORY_BANK_ALREADY_INITIALIZED_PROMPT = `The Memory Bank has already been initialized. Read the .cursor/rules/memory-bank.mdc file to understand the Memory Bank structure and how it works.`;
