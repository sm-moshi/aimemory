import { MemoryBankFileType } from "../types/core.js";

const defaultTemplate =
	"# Memory Bank File\n\nThis file should contain project memory or context as appropriate.\n\n*This is a default template*\n";

const templateMap = new Map<MemoryBankFileType, string>([
	[
		MemoryBankFileType.ProjectBrief,
		`# Project Brief

*Foundation document that shapes all other files*

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
*Last updated: [date]*
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
*Last updated: [date]*
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
*Last updated: [date]*
`,
	],
	[
		MemoryBankFileType.SystemPatternsIndex,
		`# System Patterns Index

*Summary of architectural patterns, design decisions, and system structure*

## Architecture Overview
<!-- High-level system design -->
- **Pattern**: [Core architectural pattern in use]
- **Structure**: [How components are organized]
- **Communication**: [How components interact]

## Key Design Patterns
<!-- Primary patterns used throughout the system -->
- **[Pattern Name]**: [Where used and why]
- **[Pattern Name]**: [Where used and why]

## Service Architecture
<!-- How services are structured and interact -->
- **[Service Name]**: [Responsibility and interfaces]
- **[Service Name]**: [Responsibility and interfaces]

## Cross-Cutting Concerns
<!-- How the system handles common concerns -->
- **Error Handling**: [Approach used]
- **Logging**: [Strategy and tools]
- **Configuration**: [Management approach]
- **Security**: [Key security patterns]

## Reference Links
<!-- Links to detailed documentation -->
- [Architecture Details](systemPatterns/architecture.md)
- [Pattern Details](systemPatterns/patterns.md)
- [Scanning Patterns](systemPatterns/scanning.md)

---
*Last updated: [date]*
`,
	],
	[
		MemoryBankFileType.SystemPatternsArchitecture,
		`# System Architecture

## Overall Architecture

### High-Level Structure
\`\`\`mermaid
graph TB
    %% Add your architecture diagram here
    subgraph "Core"
        A[Component A]
        B[Component B]
    end

    subgraph "Services"
        C[Service C]
        D[Service D]
    end

    A --> C
    B --> D
\`\`\`

### Component Responsibilities
- **[Component Name]**: [Primary responsibility and key interfaces]
- **[Component Name]**: [Primary responsibility and key interfaces]

## Detailed Architecture

### Service Layer
<!-- Describe your service architecture -->

### Data Layer
<!-- How data is stored and accessed -->

### Integration Layer
<!-- How external systems are integrated -->

## Key Architectural Decisions
<!-- Important decisions made and their rationale -->

### Decision: [Title]
- **Context**: [Why this decision was needed]
- **Options Considered**: [Alternatives evaluated]
- **Decision**: [What was chosen]
- **Rationale**: [Why this option was selected]
- **Consequences**: [Trade-offs and implications]

## Design Principles
<!-- Guiding principles for the architecture -->
- **[Principle]**: [How it's applied]
- **[Principle]**: [How it's applied]

## Non-Functional Requirements
<!-- How architecture supports quality attributes -->
- **Performance**: [Targets and approach]
- **Scalability**: [Growth strategy]
- **Reliability**: [Availability targets]
- **Security**: [Security architecture]

---
*Last updated: [date]*
`,
	],
	[
		MemoryBankFileType.SystemPatternsPatterns,
		`# Design Patterns

## Core Patterns in Use

### [Pattern Name]
- **Intent**: [What problem does this solve?]
- **Implementation**: [How is it implemented in this codebase?]
- **Location**: [Where in the code is this used?]
- **Benefits**: [Why was this pattern chosen?]
- **Trade-offs**: [What are the costs/limitations?]

### [Pattern Name]
- **Intent**: [What problem does this solve?]
- **Implementation**: [How is it implemented in this codebase?]
- **Location**: [Where in the code is this used?]
- **Benefits**: [Why was this pattern chosen?]
- **Trade-offs**: [What are the costs/limitations?]

## Error Handling Patterns
<!-- How errors are handled consistently -->
- **Strategy**: [Overall approach to error handling]
- **Patterns**: [Specific patterns used]
- **Examples**: [Code examples or references]

## Concurrency Patterns
<!-- How concurrent operations are managed -->
- **Threading Model**: [Approach to concurrency]
- **Synchronization**: [How coordination is handled]
- **Async Patterns**: [Asynchronous operation patterns]

## Data Access Patterns
<!-- How data is accessed and managed -->
- **Repository Pattern**: [If used, how implemented]
- **Unit of Work**: [Transaction management]
- **Caching**: [Caching strategies]

## Integration Patterns
<!-- How external systems are integrated -->
- **API Integration**: [Patterns for external APIs]
- **Event Handling**: [Event-driven patterns]
- **Message Passing**: [Inter-component communication]

## Anti-Patterns to Avoid
<!-- Patterns explicitly avoided and why -->
- **[Anti-Pattern]**: [Why it's avoided in this codebase]

---
*Last updated: [date]*
`,
	],
	[
		MemoryBankFileType.SystemPatternsScanning,
		`# Scanning and Analysis Patterns

## Code Analysis Patterns
<!-- How the codebase is analyzed and maintained -->

### Static Analysis
- **Tools**: [Static analysis tools in use]
- **Rules**: [Key rules and standards enforced]
- **Integration**: [How analysis is integrated into workflow]

### Dynamic Analysis
- **Profiling**: [Performance analysis approach]
- **Monitoring**: [Runtime monitoring patterns]
- **Debugging**: [Debugging strategies and tools]

## Quality Scanning
<!-- How code quality is maintained -->

### Automated Checks
- **Linting**: [Linting tools and configurations]
- **Testing**: [Test automation patterns]
- **Coverage**: [Code coverage requirements and tools]

### Manual Reviews
- **Code Reviews**: [Review process and checklist]
- **Architecture Reviews**: [Architectural decision review process]

## Security Scanning
<!-- How security is analyzed and maintained -->
- **SAST**: [Static Application Security Testing]
- **Dependency Scanning**: [Vulnerability scanning for dependencies]
- **Security Reviews**: [Manual security review processes]

## Performance Analysis
<!-- How performance is monitored and optimized -->
- **Benchmarking**: [Performance testing patterns]
- **Profiling**: [Performance profiling approach]
- **Optimization**: [Performance optimization strategies]

## Maintenance Patterns
<!-- How the system is maintained over time -->
- **Refactoring**: [Continuous improvement strategies]
- **Deprecation**: [How deprecated features are handled]
- **Updates**: [Dependency and framework update patterns]

---
*Last updated: [date]*
`,
	],
	[
		MemoryBankFileType.TechContextIndex,
		`# Tech Context Index

*Summary of technology stack, environment setup, and technical constraints*

## Architecture Overview

<!-- Brief description of your technical architecture -->
The backend is built with **[Runtime]** and **[Primary Language]**, leveraging **[Key Framework/SDK]** for core functionality.

The frontend/UI is implemented with **[UI Framework]** and **[Styling Solution]** for a modern, responsive interface.

## Modern Build System

<!-- Describe your build and tooling approach -->
Build and tooling systems use **[Build Tool]** with **[Compiler/Transpiler]** for fast compilation, **[Linter/Formatter]** for code quality, and **[Test Framework]** for comprehensive testing.

For complete build system specifications, see [stack.md](techContext/stack.md).
For detailed dependency list and versions, see [dependencies.md](techContext/dependencies.md).

## Quality Foundation

<!-- Current quality standards and achievements -->
The project maintains [quality standard] with [testing approach] and [optimization strategy].

For current quality achievements and metrics, see [progress/current.md](progress/current.md).

## Technical Constraints & Design Principles

<!-- Key constraints and principles guiding development -->
Key constraints include **[constraint 1]**, **[constraint 2]**, **[constraint 3]**, and **[constraint 4]**.

All dependencies and configurations are chosen for **[principle 1]**, **[principle 2]**, and **[principle 3]**.

## Runtime Environment

### Core Platform
- **Runtime**: [Runtime version] ([justification])
- **Operating System**: [Primary OS] ([version info])
- **Shell**: [Shell type] ([path if relevant])
- **Package Manager**: [Tool version] ([benefits])

### Development Tools
- **Primary IDE**: [IDE version] ([key features])
- **Target Platform**: [Compatibility target] ([version])
- **Language**: [Language version] ([features used])

For complete environment details, see [environment.md](techContext/environment.md).

## Technology Stack Highlights

### Backend Excellence
<!-- Key backend technologies and their purposes -->
- **[Framework/SDK]**: [Purpose and version]
- **[Validation Tool]**: [Purpose]
- **[Key Migration]**: [Status and goal]

### Frontend Modernization
<!-- Key frontend technologies -->
- **[UI Framework]**: [Purpose and benefits]
- **[Styling]**: [Approach and benefits]
- **[Build Tool]**: [Development benefits]
- **[UI Components]**: [Integration approach]

### Build & Quality Tools
<!-- Development and quality tools -->
- **[Build Pipeline]**: [Performance benefits]
- **[Quality Tool]**: [Quality improvements]
- **[Test Framework]**: [Testing benefits]
- **[Development Tool]**: [Development workflow benefits]

For complete technology specifications, see [stack.md](techContext/stack.md).

## Development Status

<!-- Current development approach and progress -->
The project follows a [development approach] targeting [completion target].

For current development progress and roadmap, see [progress/current.md](progress/current.md).
For complete project goals and scope, see [core/projectbrief.md](core/projectbrief.md).

## Technical Achievements

### Performance Improvements
<!-- Key performance wins -->
- **[Performance Improvement]**: [Quantified benefit]
- **[Quality Improvement]**: [Quantified benefit]
- **[Workflow Improvement]**: [Workflow benefits]

### Developer Experience
<!-- DX improvements -->
- **[Quality Foundation]**: [Confidence benefits]
- **[Modern Toolchain]**: [Performance benefits]
- **[Type Safety]**: [Safety benefits]

### Standards Compliance
<!-- Standards and compliance achievements -->
- **[Protocol/Standard]**: [Compliance level]
- **[API Integration]**: [Integration approach]
- **[Code Quality]**: [Quality standards]
- **[Security]**: [Security measures]

---

The tech stack is designed to support [project goals] while maintaining [key principles]. The combination of [tools/approach] provides a solid foundation for [future development].

---

*Last updated: [date]*
`,
	],
	[
		MemoryBankFileType.TechContextStack,
		`# Technology Stack

## Core Technologies

### Runtime Environment
- **Platform**: [Operating system/platform]
- **Runtime**: [Runtime environment and version]
- **Package Manager**: [Package management tool]

### Programming Languages
- **Primary**: [Main language and version]
- **Secondary**: [Other languages used and purposes]

### Frameworks and Libraries
- **Web Framework**: [If applicable]
- **UI Framework**: [If applicable]
- **Testing Framework**: [Testing tools]
- **Build Tools**: [Compilation and build tools]

## Development Stack

### Development Tools
- **IDE/Editor**: [Recommended development environment]
- **Version Control**: [VCS and branching strategy]
- **CI/CD**: [Continuous integration/deployment tools]

### Code Quality Tools
- **Linting**: [Code linting tools and configuration]
- **Formatting**: [Code formatting tools]
- **Testing**: [Testing framework and tools]
- **Coverage**: [Code coverage tools]

## Infrastructure Stack

### Deployment
- **Platform**: [Deployment platform]
- **Containerization**: [If using containers]
- **Orchestration**: [If using orchestration]

### Monitoring and Observability
- **Logging**: [Logging framework and aggregation]
- **Metrics**: [Metrics collection and visualization]
- **Tracing**: [Distributed tracing if applicable]

## Data Stack
- **Database**: [Primary data storage]
- **Caching**: [Caching layer if applicable]
- **Message Queue**: [If using message queues]

## Security Stack
- **Authentication**: [Authentication mechanism]
- **Authorization**: [Authorization approach]
- **Secrets Management**: [How secrets are managed]

## Status Tracking

### Implementation Phases
- **Phase 0 - Foundation**: ✅ Complete
- **Phase 1 - Core Features**: [Status]
- **Phase 2 - Advanced Features**: [Status]

### Technology Decisions
- **[Decision]**: [Status and rationale]
- **[Decision]**: [Status and rationale]

---
*Last updated: [date]*
`,
	],
	[
		MemoryBankFileType.TechContextDependencies,
		`# Dependencies

## Core Dependencies

### Production Dependencies
| Package | Version | Purpose | Update Frequency |
|---------|---------|---------|------------------|
| [package] | [version] | [purpose] | [frequency] |

### Development Dependencies
| Package | Version | Purpose | Update Frequency |
|---------|---------|---------|------------------|
| [package] | [version] | [purpose] | [frequency] |

## Dependency Management Strategy

### Update Policy
- **Major Updates**: [How major version updates are handled]
- **Security Updates**: [Policy for security patches]
- **LTS Strategy**: [Long-term support preference]

### Version Pinning
- **Exact Versions**: [When exact versions are required]
- **Range Specifications**: [How version ranges are specified]
- **Lock Files**: [Lock file management approach]

## Security Considerations

### Vulnerability Scanning
- **Tools**: [Security scanning tools in use]
- **Frequency**: [How often scans are performed]
- **Response Process**: [How vulnerabilities are addressed]

### Trusted Sources
- **Package Registries**: [Approved package sources]
- **Verification**: [Package verification process]

## Performance Considerations

### Bundle Size Impact
- **Bundle Analysis**: [How bundle size is monitored]
- **Optimization**: [Bundle optimization strategies]
- **Tree Shaking**: [Dead code elimination approach]

### Runtime Performance
- **Performance Critical**: [Dependencies affecting performance]
- **Alternatives**: [Lighter alternatives considered]

## Maintenance and Updates

### Regular Review Schedule
- **Monthly**: [Dependencies reviewed monthly]
- **Quarterly**: [Major dependency reviews]
- **As Needed**: [Security and critical updates]

### Deprecation Management
- **Deprecated Dependencies**: [How deprecated packages are handled]
- **Migration Plans**: [Plans for replacing deprecated dependencies]

---
*Last updated: [date]*
`,
	],
	[
		MemoryBankFileType.TechContextEnvironment,
		`# Environment Configuration

## Development Environment

### System Requirements
- **Operating System**: [Supported OS versions]
- **Runtime**: [Required runtime and version]
- **Memory**: [Minimum RAM requirements]
- **Storage**: [Disk space requirements]

### Development Setup
\`\`\`bash
# Installation commands
[command to install dependencies]
[command to setup environment]
[command to start development]
\`\`\`

### Environment Variables
| Variable | Purpose | Default | Required |
|----------|---------|---------|----------|
| \`VAR_NAME\` | [description] | [default] | [yes/no] |

## Testing Environment

### Test Configuration
- **Test Runner**: [Testing framework used]
- **Test Database**: [Test database setup]
- **Mock Services**: [How external services are mocked]

### Test Environment Variables
| Variable | Purpose | Test Value |
|----------|---------|------------|
| \`TEST_VAR\` | [description] | [test value] |

## Production Environment

### Deployment Requirements
- **Platform**: [Production platform]
- **Runtime Version**: [Specific version requirements]
- **Resource Allocation**: [CPU/Memory requirements]

### Production Configuration
- **Environment Variables**: [Required production env vars]
- **Secrets Management**: [How secrets are handled]
- **Configuration Management**: [Config management approach]

## Environment-Specific Behavior

### Feature Flags
- **Development**: [Development-only features]
- **Testing**: [Test-specific behavior]
- **Production**: [Production optimizations]

### Logging and Monitoring
- **Development**: [Local logging configuration]
- **Testing**: [Test logging and reporting]
- **Production**: [Production monitoring setup]

## Troubleshooting

### Common Issues
- **[Issue]**: [Description and solution]
- **[Issue]**: [Description and solution]

### Environment Validation
\`\`\`bash
# Commands to verify environment setup
[validation command]
[health check command]
\`\`\`

### Reset and Cleanup
\`\`\`bash
# Commands to reset environment
[cleanup command]
[reset command]
\`\`\`

---
*Last updated: [date]*
`,
	],
	[
		MemoryBankFileType.ProgressIndex,
		`# Progress Index

*Summary of project progress, milestones, and current status*

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
*Last updated: [date]*
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
*Last updated: [date]*
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
*Last updated: [date]*
`,
	],
]);

export function getTemplateForFileType(fileType: MemoryBankFileType): string {
	return templateMap.get(fileType) ?? defaultTemplate;
}
