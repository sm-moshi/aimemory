import { MemoryBankFileType } from "@/types/core.js";

export const techTemplates = new Map<MemoryBankFileType, string>([
	[
		MemoryBankFileType.TechContextIndex,
		`# Tech Context Index

> Summary of technology stack, environment setup, and technical constraints

## Architecture Overview
<!-- High-level technology choices and principles -->
- **Platform**: [Primary platform/runtime]
- **Language**: [Programming language and version]
- **Framework**: [Main framework/libraries]

## Core Technologies
<!-- Key technologies that define the solution -->
- **Backend**: [Server-side technologies]
- **Frontend**: [Client-side technologies]
- **Database**: [Data storage solutions]
- **Infrastructure**: [Deployment and infrastructure]

## Development Environment
<!-- Tools and setup for development -->
- **IDE/Editor**: [Development environment]
- **Build Tools**: [Build system and tools]
- **Testing**: [Testing frameworks and tools]
- **Version Control**: [VCS and workflows]

## Quality and Tooling
<!-- Code quality and development tools -->
- **Linting**: [Code quality tools]
- **Formatting**: [Code formatting standards]
- **Testing**: [Testing strategy and coverage]
- **CI/CD**: [Continuous integration and deployment]

## Constraints and Requirements
<!-- Technical limitations and requirements -->
- **Performance**: [Performance requirements]
- **Security**: [Security constraints]
- **Compatibility**: [Platform compatibility needs]
- **Scalability**: [Scaling requirements]

## Reference Links
<!-- Links to detailed documentation -->
- [Technology Stack Details](techContext/stack.md)
- [Dependencies](techContext/dependencies.md)
- [Environment Setup](techContext/environment.md)

---
> *Last updated: [date]*
`,
	],
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

### Local Development Settings
- **Database**: [Local database setup]
- **API Keys**: [Development API configuration]
- **Feature Flags**: [Local feature toggle setup]

## Build and Run

### Build Process
\`\`\`bash
# Build commands
npm run build
npm run test
\`\`\`

### Development Server
\`\`\`bash
# Development commands
npm run dev
npm run watch
\`\`\`

### Testing
\`\`\`bash
# Testing commands
npm run test
npm run test:watch
npm run test:coverage
\`\`\`

## Troubleshooting

### Common Issues
- **Issue**: [Description]
  - **Cause**: [Why this happens]
  - **Solution**: [How to fix it]

- **Issue**: [Description]
  - **Cause**: [Why this happens]
  - **Solution**: [How to fix it]

### Performance Issues
- **Slow Build**: [Optimization tips]
- **Memory Usage**: [Memory optimization]
- **Hot Reload**: [Development server issues]

### Platform-Specific Issues
- **Windows**: [Windows-specific considerations]
- **macOS**: [macOS-specific considerations]
- **Linux**: [Linux-specific considerations]

## IDE and Tooling

### Recommended Extensions
- **[Extension Name]**: [Purpose and benefits]
- **[Extension Name]**: [Purpose and benefits]

### Code Formatting
- **Formatter**: [Code formatting tool]
- **Rules**: [Formatting rules and configuration]
- **Integration**: [IDE integration setup]

### Debugging
- **Debugger Setup**: [How to configure debugging]
- **Breakpoints**: [Debugging best practices]
- **Logging**: [Development logging configuration]

## Deployment Environments

### Development
- **URL**: [Development environment URL]
- **Database**: [Development database]
- **Features**: [Development-specific features]

### Staging
- **URL**: [Staging environment URL]
- **Database**: [Staging database]
- **Testing**: [Staging testing process]

### Production
- **URL**: [Production environment URL]
- **Monitoring**: [Production monitoring]
- **Backups**: [Backup and recovery]

---
> *Last updated: [date]*
`,
	],
]);
