import { MemoryBankFileType } from "../lib/types/core";

// Only techContext/index.md is created on initialization. The other techContext files are created on demand.
export const techTemplates = new Map<MemoryBankFileType, string>([
	[
		MemoryBankFileType.TechContextIndex,
		`# Tech Context Index

> Summary of technology stack, environment setup, and technical constraints

## Technology Stack
<!-- Brief overview; split out to stack.md if needed -->

## Dependencies
<!-- Brief overview; split out to dependencies.md if needed -->

## Environment
<!-- Brief overview; split out to environment.md if needed -->

---
> *Last updated: [date]*
`,
	],
	// The following are only used for on-demand file creation, not on init
	[
		MemoryBankFileType.TechContextStack,
		`# Technology Stack

## Runtime Environment

### Core Platform
- **Runtime**: [Runtime environment and version]
- **Operating System**: [Supported OS platforms]
- **Architecture**: [Target architectures]

### Language and Compilation
- **Primary Language**: [Language and version]
- **Compilation Target**: [Compilation settings]
- **Module System**: [Module format and bundling]

## Backend Technologies

### Server Framework
- **Framework**: [Server framework and version]
- **HTTP Handling**: [Request/response handling]
- **Middleware**: [Key middleware components]

### Data Management
- **Database**: [Database technology and version]
- **ORM/Query Builder**: [Data access layer]
- **Caching**: [Caching solutions]
- **File Storage**: [File handling and storage]

### Integration and APIs
- **External APIs**: [Third-party service integrations]
- **Message Queues**: [Async communication]
- **Real-time**: [WebSocket/real-time features]

## Frontend Technologies

### UI Framework
- **Framework**: [Frontend framework and version]
- **Component Library**: [UI component system]
- **State Management**: [Client state handling]

### Styling and Design
- **CSS Framework**: [Styling approach]
- **Design System**: [Design standards]
- **Responsive Design**: [Mobile/responsive strategy]

### Build and Bundling
- **Bundler**: [Asset bundling solution]
- **Transpilation**: [Code transformation]
- **Optimization**: [Production optimizations]

## Development Tools

### Build System
- **Build Tool**: [Primary build system]
- **Task Runner**: [Development tasks]
- **Package Manager**: [Dependency management]

### Code Quality
- **Linting**: [Code linting tools]
- **Formatting**: [Code formatting tools]
- **Type Checking**: [Static type analysis]

### Testing Framework
- **Unit Testing**: [Unit test framework]
- **Integration Testing**: [Integration test tools]
- **E2E Testing**: [End-to-end testing]
- **Coverage**: [Code coverage tools]

## Infrastructure and Deployment

### Deployment Platform
- **Platform**: [Deployment target]
- **Containerization**: [Container technology]
- **Orchestration**: [Container orchestration]

### CI/CD Pipeline
- **CI Platform**: [Continuous integration]
- **Deployment**: [Deployment automation]
- **Monitoring**: [Application monitoring]

### Security
- **Authentication**: [Auth implementation]
- **Authorization**: [Permission system]
- **Data Protection**: [Data security measures]

## Performance and Optimization

### Performance Strategy
- **Caching**: [Caching strategies]
- **CDN**: [Content delivery]
- **Database**: [Database optimization]

### Monitoring and Analytics
- **Application Monitoring**: [APM tools]
- **Error Tracking**: [Error monitoring]
- **Analytics**: [Usage analytics]

---
> *Last updated: [date]*
`,
	],
	[
		MemoryBankFileType.TechContextDependencies,
		`# Dependencies

## Core Dependencies

### Production Dependencies
- **[Package Name]** (v[version]): [Purpose and justification]
- **[Package Name]** (v[version]): [Purpose and justification]
- **[Package Name]** (v[version]): [Purpose and justification]

### Development Dependencies
- **[Package Name]** (v[version]): [Development purpose]
- **[Package Name]** (v[version]): [Development purpose]
- **[Package Name]** (v[version]): [Development purpose]

## Dependency Management

### Version Strategy
- **Versioning Policy**: [How versions are managed]
- **Update Frequency**: [How often dependencies are updated]
- **Security Updates**: [How security updates are handled]

### Lock Files
- **Lock File**: [Lock file format used]
- **Reproducibility**: [How builds are kept reproducible]
- **Conflict Resolution**: [How version conflicts are resolved]

## Security and Compliance

### Vulnerability Scanning
- **Tools**: [Security scanning tools]
- **Process**: [How vulnerabilities are identified and fixed]
- **Monitoring**: [Ongoing security monitoring]

### License Compliance
- **License Policy**: [Acceptable licenses]
- **License Tracking**: [How licenses are tracked]
- **Compliance Checking**: [Automated license checking]

## Dependency Categories

### Essential Dependencies
<!-- Critical dependencies the project cannot function without -->
- **[Category]**: [Purpose and key packages]
- **[Category]**: [Purpose and key packages]

### Optional Dependencies
<!-- Nice-to-have dependencies that add features -->
- **[Category]**: [Purpose and key packages]
- **[Category]**: [Purpose and key packages]

### Development-Only Dependencies
<!-- Dependencies only needed during development -->
- **[Category]**: [Purpose and key packages]
- **[Category]**: [Purpose and key packages]

## Upgrade and Maintenance

### Upgrade Strategy
- **Major Versions**: [How major upgrades are handled]
- **Minor Versions**: [Automatic vs manual minor updates]
- **Patch Versions**: [Patch update policy]

### Testing Strategy
- **Dependency Testing**: [How dependency updates are tested]
- **Rollback Plan**: [How to rollback problematic updates]
- **Staging**: [How updates are staged before production]

### Maintenance Schedule
- **Regular Reviews**: [Frequency of dependency reviews]
- **End-of-Life Planning**: [How EOL dependencies are handled]
- **Performance Impact**: [How dependency performance is monitored]

## Risk Management

### Critical Dependencies
- **Single Points of Failure**: [Dependencies that could break the system]
- **Mitigation Strategies**: [How critical dependency risks are mitigated]
- **Alternatives**: [Backup options for critical dependencies]

### Supply Chain Security
- **Package Verification**: [How package integrity is verified]
- **Trusted Sources**: [Only trusted package sources]
- **Code Review**: [Review process for new dependencies]

---
> *Last updated: [date]*
`,
	],
	[
		MemoryBankFileType.TechContextEnvironment,
		`# Environment Setup

## Development Environment

### System Requirements
- **Operating System**: [Supported OS versions]
- **Hardware**: [Minimum hardware requirements]
- **Memory**: [RAM requirements]
- **Storage**: [Disk space requirements]

### Required Software
- **Runtime**: [Runtime environment and installation]
- **Package Manager**: [Package manager setup]
- **Editor/IDE**: [Recommended development environment]
- **Version Control**: [Git and repository setup]

### Installation Steps
1. [First setup step]
2. [Second setup step]
3. [Third setup step]
4. [Verification step]

## Configuration

### Environment Variables
- **[VARIABLE_NAME]**: [Purpose and example value]
- **[VARIABLE_NAME]**: [Purpose and example value]
- **[VARIABLE_NAME]**: [Purpose and example value]

### Configuration Files
- **[config-file.ext]**: [Purpose and key settings]
- **[config-file.ext]**: [Purpose and key settings]
- **[config-file.ext]**: [Purpose and key settings]

### Startup Process
- **Development Server**: [How to start the dev server]
- **Testing**: [How to run the test suite]
- **Building**: [How to create a production build]

---
> *Last updated: [date]*
`,
	],
]);
