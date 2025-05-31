/**
 * Centralized Type Exports for AI Memory Extension
 * Barrel export file that provides a single entry point for all types
 */

// Result Pattern Types
export * from "./result.js";

// Core Memory Bank Types
export * from "./core.js";

// File Operations Types
export * from "./fileOperations.js";

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

// Dependency Injection Types
export * from "./di.js";

// Error Types
export * from "./errors.js";

// MCP Types (from existing focused file)
export * from "./mcpTypes.js";
