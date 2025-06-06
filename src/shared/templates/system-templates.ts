import { MemoryBankFileType } from "../../types/core.js";

export const systemTemplates = new Map<MemoryBankFileType, string>([
	[
		MemoryBankFileType.SystemPatternsIndex,
		`# System Patterns Index

> Summary of architectural patterns, design decisions, and system structure

## Architecture Overview
<!-- High-level system design -->
- **Pattern**: [Primary architectural pattern used]
- **Structure**: [How the system is organized]
- **Communication**: [How components interact]

## Key Design Patterns
<!-- Primary patterns used throughout the system -->
- **[Pattern Name]**: [How and where it's used]
- **[Pattern Name]**: [How and where it's used]
- **[Pattern Name]**: [How and where it's used]

## Service Architecture
<!-- How services are structured and interact -->
- **[Service Name]**: [Purpose and responsibilities]
- **[Service Name]**: [Purpose and responsibilities]
- **[Service Name]**: [Purpose and responsibilities]

## Cross-Cutting Concerns
<!-- How the system handles common concerns -->
- **Error Handling**: [Approach used]
- **Logging**: [Logging strategy]
- **Configuration**: [Configuration management]
- **Security**: [Security measures]
- **Performance**: [Performance considerations]

## Quality Patterns
<!-- Patterns ensuring code quality and maintainability -->
- **Testing Strategy**: [How testing is approached]
- **Build Pipeline**: [Build and deployment process]
- **Code Standards**: [Coding standards and conventions]
- **Documentation**: [Documentation approach]

## Reference Links
<!-- Links to detailed documentation -->
- [Architecture Details](systemPatterns/architecture.md)
- [Pattern Details](systemPatterns/patterns.md)
- [Scanning Patterns](systemPatterns/scanning.md)

---
> *Last updated: [date]*
`,
	],
	[
		MemoryBankFileType.SystemPatternsArchitecture,
		`# System Architecture

## High-Level Architecture

### System Overview
[Brief description of the overall system design and purpose]

### Core Components
- **[Component Name]**: [Purpose and responsibilities]
- **[Component Name]**: [Purpose and responsibilities]
- **[Component Name]**: [Purpose and responsibilities]

### Component Interactions
\`\`\`mermaid
graph TD
    A[Component A] --> B[Component B]
    B --> C[Component C]
    C --> A
\`\`\`

## Architectural Patterns

### Primary Patterns
- **[Pattern Name]**: [How it's implemented and why it was chosen]
- **[Pattern Name]**: [How it's implemented and why it was chosen]

### Pattern Benefits
- [Benefit 1 and its impact]
- [Benefit 2 and its impact]

### Pattern Trade-offs
- [Trade-off 1 and how it's mitigated]
- [Trade-off 2 and how it's mitigated]

## Data Flow

### Request Processing
1. [Step 1 of request flow]
2. [Step 2 of request flow]
3. [Step 3 of request flow]

### Data Persistence
- **Storage Layer**: [How data is stored]
- **Caching Strategy**: [How caching is implemented]
- **Data Validation**: [How data integrity is ensured]

## Scalability Considerations

### Performance Characteristics
- **Throughput**: [Expected performance metrics]
- **Latency**: [Response time characteristics]
- **Resource Usage**: [Memory and CPU usage patterns]

### Scaling Strategies
- **Horizontal Scaling**: [How to scale out]
- **Vertical Scaling**: [How to scale up]
- **Bottlenecks**: [Known bottlenecks and mitigation strategies]

## Security Architecture

### Security Layers
- **Input Validation**: [How inputs are validated]
- **Authentication**: [How users are authenticated]
- **Authorization**: [How access is controlled]
- **Data Protection**: [How data is protected]

### Threat Model
- **Primary Threats**: [Key security concerns]
- **Mitigation Strategies**: [How threats are addressed]

## Evolution and Maintenance

### Architecture Evolution
- **Version 1.0**: [Initial architecture decisions]
- **Version 2.0**: [Planned architectural improvements]

### Technical Debt
- **Current Debt**: [Known architectural issues]
- **Debt Reduction Plans**: [How debt will be addressed]

---
> *Last updated: [date]*
`,
	],
	[
		MemoryBankFileType.SystemPatternsPatterns,
		`# Design Patterns

## Core Patterns

### [Pattern Name]
- **Intent**: [What problem this pattern solves]
- **Implementation**: [How it's implemented in the system]
- **Benefits**: [Advantages of using this pattern]
- **Trade-offs**: [Disadvantages or costs]
- **Usage**: [Where and when this pattern is used]

### [Pattern Name]
- **Intent**: [What problem this pattern solves]
- **Implementation**: [How it's implemented in the system]
- **Benefits**: [Advantages of using this pattern]
- **Trade-offs**: [Disadvantages or costs]
- **Usage**: [Where and when this pattern is used]

## Behavioral Patterns

### Communication Patterns
- **[Pattern]**: [How components communicate]
- **[Pattern]**: [How events are handled]
- **[Pattern]**: [How data flows through the system]

### State Management Patterns
- **[Pattern]**: [How state is managed]
- **[Pattern]**: [How state changes are tracked]
- **[Pattern]**: [How state consistency is maintained]

## Structural Patterns

### Organization Patterns
- **[Pattern]**: [How code is organized]
- **[Pattern]**: [How modules are structured]
- **[Pattern]**: [How dependencies are managed]

### Interface Patterns
- **[Pattern]**: [How interfaces are designed]
- **[Pattern]**: [How contracts are defined]
- **[Pattern]**: [How backwards compatibility is maintained]

## Creational Patterns

### Object Creation
- **[Pattern]**: [How objects are created]
- **[Pattern]**: [How dependencies are injected]
- **[Pattern]**: [How singletons are managed]

## Anti-Patterns

### Patterns to Avoid
- **[Anti-Pattern]**: [Why this should be avoided]
- **[Anti-Pattern]**: [Better alternatives]

### Warning Signs
- [Sign that indicates an anti-pattern]
- [Sign that indicates poor design]

## Pattern Evolution

### Pattern Adoption
- **Phase 1**: [Initial patterns used]
- **Phase 2**: [Pattern improvements]
- **Phase 3**: [Advanced pattern usage]

### Lessons Learned
- **[Lesson]**: [What was learned about pattern usage]
- **[Lesson]**: [How patterns evolved in the project]

---
> *Last updated: [date]*
`,
	],
	[
		MemoryBankFileType.SystemPatternsScanning,
		`# Scanning Patterns

## File and Content Scanning

### Scanning Strategy
- **Scope**: [What is scanned and why]
- **Frequency**: [How often scanning occurs]
- **Triggers**: [What triggers a scan]

### Content Analysis
- **Pattern Recognition**: [How patterns are identified]
- **Classification**: [How content is categorized]
- **Indexing**: [How content is indexed for search]

## Performance Patterns

### Efficient Scanning
- **Chunked Processing**: [How large content is processed]
- **Parallel Processing**: [How parallelism is used]
- **Caching**: [How scan results are cached]

### Memory Management
- **Buffer Management**: [How memory is managed during scans]
- **Resource Limits**: [How resource usage is bounded]
- **Cleanup**: [How resources are cleaned up]

## Error Handling

### Scan Failures
- **Error Types**: [Common scanning errors]
- **Recovery Strategies**: [How errors are handled]
- **Retry Logic**: [How failed scans are retried]

### Data Integrity
- **Validation**: [How scan results are validated]
- **Consistency Checks**: [How consistency is ensured]
- **Corruption Detection**: [How corruption is detected]

## Scanning Metrics

### Performance Metrics
- **Throughput**: [How scanning performance is measured]
- **Latency**: [Response time characteristics]
- **Resource Usage**: [Memory and CPU usage during scans]

### Quality Metrics
- **Accuracy**: [How accurate pattern detection is]
- **Coverage**: [How complete scanning is]
- **False Positives**: [How false positives are minimized]

## Optimization Techniques

### Speed Optimizations
- **Early Termination**: [When scanning can be stopped early]
- **Smart Filtering**: [How irrelevant content is filtered out]
- **Incremental Scanning**: [How only changes are scanned]

### Resource Optimizations
- **Memory Streaming**: [How large files are processed without loading entirely]
- **Background Processing**: [How scanning happens in background]
- **Priority Queues**: [How scan priority is managed]

---
> *Last updated: [date]*
`,
	],
]);
