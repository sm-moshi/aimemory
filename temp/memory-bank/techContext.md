# Technical Context

## Technology Stack
The project is built on a modern front-end technology stack consisting of:

- **React 19**: Latest version of the React library for building user interfaces
- **TypeScript**: For static typing and improved developer experience
- **Vite**: Build tool and development server optimized for speed
- **ESLint**: For code quality and consistency
- **CSS**: Standard CSS for styling
- **Figma API**: For integration with design assets

## Development Environment
The development environment consists of:

- **Node.js**: Runtime environment for JavaScript
- **pnpm**: Package manager (alternative to npm/yarn)
- **Cursor IDE**: Used as the primary development environment
- **Git**: Version control system
- **Vite Dev Server**: Development server with HMR (Hot Module Replacement)

## Key Dependencies
The project relies on the following key dependencies:

1. **Core Dependencies**:
   - `react`: ^19.0.0
   - `react-dom`: ^19.0.0

2. **Development Dependencies**:
   - `@eslint/js`: ^9.21.0
   - `@types/react`: ^19.0.10
   - `@types/react-dom`: ^19.0.4
   - `@vitejs/plugin-react`: ^4.3.4
   - `eslint`: ^9.21.0
   - `eslint-plugin-react-hooks`: ^5.1.0
   - `eslint-plugin-react-refresh`: ^0.4.19
   - `globals`: ^15.15.0
   - `typescript`: ~5.7.2
   - `typescript-eslint`: ^8.24.1
   - `vite`: ^6.2.0

## External Services and APIs
- **Figma API**: Used for fetching design assets and potentially synchronizing design changes
  - Authentication via `FIGMA_ACCESS_TOKEN` stored in .env file

## Configuration Files
- **package.json**: Defines project dependencies and scripts
- **tsconfig.json**: TypeScript configuration
- **tsconfig.app.json**: Additional TypeScript configuration for the application
- **tsconfig.node.json**: TypeScript configuration for Node.js
- **eslint.config.js**: ESLint configuration
- **.env**: Environment variables, including Figma API token
- **vite.config.ts**: Vite build tool configuration

## Development Workflows
- **Development**: `pnpm dev` - Starts the Vite development server
- **Build**: `pnpm build` - Compiles TypeScript and builds the production bundle
- **Lint**: `pnpm lint` - Runs ESLint to check code quality
- **Preview**: `pnpm preview` - Previews the production build locally

## Technical Constraints
1. Browser compatibility must be maintained for modern browsers
2. Responsive design must work on mobile, tablet, and desktop devices
3. API calls to Figma are subject to rate limiting
4. Environment variables must be properly managed to secure the Figma access token

## Deployment Considerations
While not yet implemented, the application should be prepared for:
- Static site hosting (Netlify, Vercel, GitHub Pages, etc.)
- Environment variable management in production
- Proper build optimization for production deployment 