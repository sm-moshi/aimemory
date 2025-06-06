import { MemoryBankFileType } from "@/types/core.js";

export const progressTemplates = new Map<MemoryBankFileType, string>([
	[
		MemoryBankFileType.ProgressIndex,
		`# Progress Index

> Summary of project progress, milestones, and current status

## Current Status
- **Overall Progress**: [percentage]% complete
- **Current Phase**: [Current development phase]
- **Sprint/Iteration**: [Current sprint number/name]
- **Target Completion**: [Projected completion date]

## Progress Overview

### Completed Milestones
- ✅ **[Milestone]**: [Completion date] - [Brief description]
- ✅ **[Milestone]**: [Completion date] - [Brief description]

### Current Work
- 🔄 **[Current Milestone]**: [Progress percentage] - [Brief description]

### Upcoming Milestones
- 📅 **[Future Milestone]**: [Target date] - [Brief description]
- 📅 **[Future Milestone]**: [Target date] - [Brief description]

## Velocity and Metrics
- **Stories Completed**: [number] this sprint
- **Velocity**: [story points] per sprint (average)
- **Quality Metrics**: [test coverage, bug count, etc.]

## Risk and Blockers
- **High Risk**: [Description of high-risk items]
- **Current Blockers**: [Active blockers and resolution plans]
- **Dependencies**: [External dependencies affecting progress]

## Reference Links
- [Current Progress Details](progress/current.md)
- [Progress History](progress/history.md)

---
> *Last updated: [date]*
`,
	],
	[
		MemoryBankFileType.ProgressCurrent,
		`# Current Progress

## Current Sprint/Phase
- **Name**: [Sprint/Phase name]
- **Duration**: [Start date] - [End date]
- **Goal**: [Primary objective for this iteration]

## Active Work Items

### In Progress
- **[Work Item]**: [Status] - [Assigned to] - [Progress notes]
- **[Work Item]**: [Status] - [Assigned to] - [Progress notes]

### Ready for Review
- **[Work Item]**: [Review type] - [Reviewer] - [Review notes]

### Ready for Testing
- **[Work Item]**: [Test type] - [Tester] - [Test status]

## Completed This Sprint
- ✅ **[Completed Item]**: [Completion date] - [Notes]
- ✅ **[Completed Item]**: [Completion date] - [Notes]

## Blockers and Issues

### Active Blockers
- 🚫 **[Blocker]**: [Description] - [Resolution plan] - [Owner]

### Technical Debt
- 🔧 **[Technical Debt Item]**: [Impact] - [Planned resolution]

### Dependencies
- ⏳ **[Dependency]**: [Waiting on] - [Expected resolution]

## Metrics and Health

### Quality Metrics
- **Test Coverage**: [percentage]%
- **Build Status**: [passing/failing]
- **Known Issues**: [number] open bugs
- **Performance**: [key performance indicators]

### Team Metrics
- **Velocity**: [story points completed]
- **Burndown**: [on track/behind/ahead]
- **Scope Changes**: [changes this sprint]

## Next Steps

### Immediate (Next 1-2 days)
1. [Specific actionable task]
2. [Specific actionable task]

### This Week
1. [Weekly goal]
2. [Weekly goal]

### Next Sprint Planning
- **Focus Areas**: [Areas of focus for next sprint]
- **Capacity**: [Expected team capacity]
- **Dependencies**: [Items needed for next sprint]

## Notes and Decisions
- **[Date]**: [Important decision or note]
- **[Date]**: [Important decision or note]

---
> *Last updated: [date]*
`,
	],
	[
		MemoryBankFileType.ProgressHistory,
		`# Progress History

## Major Milestones

### [Milestone Name] - [Date]
- **Achievement**: [What was accomplished]
- **Impact**: [How this changed the project]
- **Metrics**: [Key numbers/stats]
- **Lessons Learned**: [What was learned]

### [Milestone Name] - [Date]
- **Achievement**: [What was accomplished]
- **Impact**: [How this changed the project]
- **Metrics**: [Key numbers/stats]
- **Lessons Learned**: [What was learned]

## Sprint History

### Sprint [Number/Name] - [Date Range]
- **Goal**: [Sprint objective]
- **Completed**: [What was finished]
- **Velocity**: [Story points completed]
- **Highlights**: [Notable achievements]
- **Issues**: [Problems encountered]

### Sprint [Number/Name] - [Date Range]
- **Goal**: [Sprint objective]
- **Completed**: [What was finished]
- **Velocity**: [Story points completed]
- **Highlights**: [Notable achievements]
- **Issues**: [Problems encountered]

## Key Decisions and Changes

### [Date] - [Decision Title]
- **Context**: [Why this decision was needed]
- **Decision**: [What was decided]
- **Rationale**: [Why this choice was made]
- **Impact**: [How this affected the project]

### [Date] - [Decision Title]
- **Context**: [Why this decision was needed]
- **Decision**: [What was decided]
- **Rationale**: [Why this choice was made]
- **Impact**: [How this affected the project]

## Performance Trends

### Quality Trends
- **Test Coverage**: [Historical trend]
- **Bug Count**: [Historical trend]
- **Performance**: [Historical performance metrics]

### Velocity Trends
- **Average Velocity**: [Trend over time]
- **Capacity Utilization**: [How well capacity is used]
- **Predictability**: [How predictable delivery has become]

## Retrospective Insights

### What Worked Well
- [Success pattern]
- [Success pattern]

### What Could Improve
- [Improvement area]
- [Improvement area]

### Process Changes
- **[Date]**: [Process change and its impact]
- **[Date]**: [Process change and its impact]

## Project Evolution

### Architecture Evolution
- **[Date]**: [Architectural change and rationale]
- **[Date]**: [Architectural change and rationale]

### Technology Evolution
- **[Date]**: [Technology change and rationale]
- **[Date]**: [Technology change and rationale]

---
> *Last updated: [date]*
`,
	],
]);
