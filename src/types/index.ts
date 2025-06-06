/**
 * Centralized Type Exports for AI Memory Extension
 * Updated to reflect consolidated type structure
 */

// Core Memory Bank Types (includes logging types)
export * from "./core.js";

// Logging Types (explicit exports)
export type { Logger, LoggerConfig, LogContext } from "./logging.js";
export { LogLevel } from "./logging.js";

// File Operations Types (explicit to avoid FileValidationResult conflict)
export type {
	StreamingProgressCallback,
	StreamingManagerConfig,
	StreamingOptions,
	StreamingResult,
	StreamingStats,
	StreamingMetadata,
	FileStreamerConfig,
	StreamDataHandlerContext,
	ConflictStrategy,
	FileUpdateOptions,
	FileContentTemplate,
	TemplateContext,
	FileTemplateMap,
	ContentValidationRules,
	FileProcessingOptions,
	FileProcessingResult as FileOpsProcessingResult,
	BatchOperationOptions,
	BatchOperationResult,
	RetryConfig,
	FileOperationManagerConfig,
	FileError,
	CachedFileStats,
	StreamSetupParameters,
	StreamSetupState,
} from "./fileOperations.js";

// System-level Types (cache, resources, process config - consolidated)
export * from "./system.js";

// Error Handling and Result Pattern Types
export * from "./errorHandling.js";

// Memory Bank Schemas (Zod)
export * from "./memoryBankSchemas.js";

// Configuration and Validation Types (consolidated - explicit exports to avoid conflicts)
export type {
	CursorMCPServerConfig,
	CursorMCPConfig,
	ConfigComparisonResult,
	CursorRulesSettings,
	ExtensionConfig,
	ProcessEnvironment,
	ProcessOptions,
	ProcessResult,
	ProcessSpawnConfig,
	ProcessEventHandlers,
	RuntimeConfig,
	ValidationResult,
	ValidationContext,
	FileValidationOptions,
	PathValidationOptions,
	ValidationRule,
	ValidatorConfig,
	FieldValidationError,
	ValidationSummary,
	FileProcessingResult,
	SchemaValidationResult,
} from "./config.js";

// Validation Schemas and Functions (consolidated into config.ts)
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
	SchemaValidationResult as ValidationFileResult,
} from "./config.js";

// Export validation functions explicitly
export {
	validateMCPToolParams,
	validateWebviewMessage,
	isValidFileType,
	isSafePath,
} from "./config.js";

// MCP Types (explicit exports to avoid MCPServerConfig conflict)
export type {
	MCPServerInterface,
	MCPSuccessResponse,
	MCPErrorResponse,
	MCPResponse,
	MCPServerConfig as MCPServerConfigInterface,
	BaseMCPServerConfig,
	CoreMemoryBankConfig,
	MCPServerCLIOptions,
	CLIServerConfig,
	MCPServerInstanceConfig,
	CommandResult,
} from "./mcpTypes.js";

// Re-export the TypeValidationError class
export { TypeValidationError } from "./mcpTypes.js";

// Metadata System Types (explicit to avoid conflicts)
export type {
	ValidationStatus,
	SortField,
	SortOrder,
	DateFilterField,
	FileMetrics,
	MetadataIndexEntry,
	MetadataFilter,
	SearchOptions,
	SearchResult,
	IndexStats,
	IndexRebuildResult,
	MetadataValidationResult as MetadataFileValidationResult,
	DateRangeFilter,
	MetadataIndexConfig,
	IndexChangeEvent,
	IndexChangeListener,
} from "./metadata.js";

// Explicitly export from the new ResourceManager file path if it's not covered by core.ts
export { ResourceManager } from "../utils/common/resource-manager.js";
