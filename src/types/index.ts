/**
 * Centralized Type Exports for AI Memory Extension
 * Barrel export file that provides a single entry point for all types
 */

// Core Memory Bank Types
export * from "./core.js";

// Logging Types
export * from "./logging.js";

// File Operations Types
export * from "./fileOperations.js";

// Cache Management Types
export * from "./cache.js";

// Resource Management and Dependency Injection Types
export * from "./resources.js";

// Error Handling and Result Pattern Types
export * from "./errorHandling.js";

// Validation Types and Schemas (avoiding conflicts)
export type {
	MemoryBankFileTypeSchema,
	NonEmptyStringSchema,
	SafePathSchema,
	ContentSchema,
	InitMemoryBankSchema,
	ReadMemoryBankFilesSchema,
	UpdateMemoryBankFileSchema,
	ReadMemoryBankFileSchema,
	ListMemoryBankFilesSchema,
	HealthCheckMemoryBankSchema,
	ReviewAndUpdateMemoryBankSchema,
	WebviewMessageTypeSchema,
	WebviewMessageBaseSchema,
	WebviewFileOperationSchema,
	SafeCommandSchema,
	EnvironmentVariableSchema,
	PortNumberSchema,
	ValidatedMCPParams,
	ValidatedWebviewMessage,
	SafeProcessConfig,
	SecurityAuditResult,
} from "./validation.js";

// Export validation functions explicitly
export {
	validateMCPToolParams,
	validateWebviewMessage,
	isValidFileType,
	isSafePath,
} from "./validation.js";

// Memory Bank Schemas (Zod)
export * from "./memoryBankSchemas.js";

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

// Metadata System Types
export * from "./metadata.js";

// Explicitly export from the new ResourceManager file path if it's not covered by core.ts
export { ResourceManager } from "../utils/common/resource-manager.js";
