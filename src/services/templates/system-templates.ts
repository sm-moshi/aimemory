import { MemoryBankFileType } from "../../types/core.js";

export const systemTemplates = new Map<MemoryBankFileType, string>([
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
]);
