/**
 * Centralized Type Exports for AI Memory Extension
 * Barrel export file that provides a single entry point for all types
 */

// Core Memory Bank Types
export * from "./core.js";

// File Operations Types
export * from "./fileOperations.js";

// Cache Management Types
export * from "./cache.js";

// Resource Management Types
export * from "./resources.js";

// Dependency Injection Types
export * from "./di.js";

// Streaming Types
export * from "./streaming.js";

// Error Handling and Result Pattern Types
export * from "./errorHandling.js";

// Configuration Types (excluding MCPServerConfig to avoid conflict)
export type {
	CursorMCPConfig,
	CursorRulesSettings,
	ProcessEnvironment,
	ProcessOptions,
	ProcessResult,
	ExtensionConfig,
	RuntimeConfig,
} from "./config.js";

// Re-export MCPServerConfig from config.ts specifically for Cursor configuration
export type { MCPServerConfig as CursorMCPServerConfig } from "./config.js";

// MCP Types (from existing focused file)
export * from "./mcpTypes.js";

// Logging Types
export * from "./logging.js";

// Explicitly export from the new ResourceManager file path if it's not covered by core.ts
export { ResourceManager } from "../core/ResourceManager.js";
