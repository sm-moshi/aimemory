import { MemoryBankFileType } from "../../types/core.js";

export const techTemplates = new Map<MemoryBankFileType, string>([
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
]);
