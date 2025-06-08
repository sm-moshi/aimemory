/**
 * Centralized Type Exports for AI Memory Extension Updated to reflect consolidated type structure
 */

// Core Memory Bank Types (includes logging types)
export * from "./core";

// Logging Types (explicit exports)
export type { Logger, LoggerConfig, LogContext } from "./logging";
export { LogLevel } from "./logging";

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
} from "./fileOperations";

// System-level Types (cache, resources, process config - consolidated)
export * from "./system";

// Error Handling and Result Pattern Types
export * from "./errorHandling";

// Memory Bank Schemas (Zod)
export * from "./memoryBankSchemas";

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
} from "./config";

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
} from "./config";

// Export validation functions explicitly
export {
	validateMCPToolParams,
	validateWebviewMessage,
	isValidFileType,
	isSafePath,
} from "./config";

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
} from "./mcpTypes";

// Re-export the TypeValidationError class
export { TypeValidationError } from "./mcpTypes";

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
} from "./metadata";

// Explicitly export from the new ResourceManager file path if it's not covered by core.ts
// export { ResourceManager } from "../utils/helpers";
