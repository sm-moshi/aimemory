/**
 * Validation Services
 *
 * Barrel export for validation and security utilities
 */

// Export path validation utilities
export * from "@utils/path-validation.js";

// Export file validation utilities
export * from "./file-validation.js";
export { validateSingleFile as validateMemoryBankFile } from "./file-validation.js";
export type { SchemaValidationResult } from "@/types/config.js";
export type { MemoryBankConfig as MemoryBankFileConfig } from "@/types/core.js";

// Export type guards and security helpers with aliases
export * from "@utils/common/type-guards.js";
export * from "@utils/security-helpers.js";
