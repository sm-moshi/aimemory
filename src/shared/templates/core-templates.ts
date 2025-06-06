import { MemoryBankFileType } from "@/types/core.js";

export const coreTemplates = new Map<MemoryBankFileType, string>([
	[
		MemoryBankFileType.ProjectBrief,
		`# Project Brief

> Foundation document that shapes all other files

## Vision Statement
<!-- Brief 1-2 sentence vision of what this project achieves -->

## Core Requirements
<!-- Essential functional requirements that define success -->
- [ ] Requirement 1
- [ ] Requirement 2

## Project Goals
<!-- Specific, measurable objectives -->
- **Primary Goal**:
- **Secondary Goals**:
  -
  -

## Project Scope
<!-- What's included and explicitly excluded -->
### In Scope
-

### Out of Scope
-

## Success Criteria
<!-- How will you know when this is successful? -->
- [ ] Criterion 1
- [ ] Criterion 2

## Key Constraints
<!-- Technical, time, resource, or other limitations -->
-

---
> *Last updated: [date]*
`,
	],
	[
		MemoryBankFileType.ProductContext,
		`# Product Context

## Why This Project Exists
<!-- The problem space and motivation -->

### Problem Statement
<!-- What specific problems are being solved? -->

### User Pain Points
<!-- What frustrations or gaps exist today? -->
-
-

## How It Should Work
<!-- High-level user experience and workflows -->

### Core User Journey
1. User needs to...
2. They interact with...
3. The system provides...
4. The result is...

### Key Interactions
<!-- Primary ways users engage with the solution -->
- **[Action]**: [Expected behavior]
- **[Action]**: [Expected behavior]

## User Experience Goals
<!-- Qualitative objectives for the user experience -->
- **Ease of Use**:
- **Performance**:
- **Reliability**:
- **Accessibility**:

## Target Audience
<!-- Who are the primary users? -->
- **Primary**:
- **Secondary**:

## Business Context
<!-- How this fits into larger organizational goals -->

---
> *Last updated: [date]*
`,
	],
	[
		MemoryBankFileType.ActiveContext,
		`# Active Context

## Current Work Focus
<!-- What's the primary objective right now? -->

### Sprint/Phase Goal
<!-- What are you trying to accomplish in this iteration? -->

### Active Features
<!-- Features currently in development -->
- **[Feature Name]**: [Status] - [Brief description]

## Recent Changes
<!-- Last 2-3 significant changes made -->
- **[Date]**: [Change description and impact]
- **[Date]**: [Change description and impact]

## Next Steps
<!-- Prioritized list of immediate next actions -->
1. **[Priority]**: [Specific actionable task]
2. **[Priority]**: [Specific actionable task]
3. **[Priority]**: [Specific actionable task]

## Active Decisions and Considerations
<!-- Current open questions or decisions being made -->

### Pending Decisions
- **[Decision Topic]**: [Options being considered]
- **[Decision Topic]**: [Options being considered]

### Technical Considerations
<!-- Current technical challenges or trade-offs -->
-
-

### Blockers and Dependencies
<!-- What's preventing progress? -->
- **[Blocker]**: [Description and resolution plan]

## Context for AI Assistant
<!-- Information to help AI understand current state -->
- **Current Phase**:
- **Key Files Modified Recently**:
- **Testing Status**:
- **Deployment Status**:

---
> *Last updated: [date]*
`,
	],
]);
