/**
 * Type Guards and Runtime Validation for MCP Server
 *
 * Provides runtime type checking to improve type safety
 * and eliminate unsafe type assertions throughout the MCP codebase.
 */

import { MemoryBankFileType } from "../../types/types.js";

// Re-export TypeValidationError from centralized types
export { TypeValidationError } from "../../types/mcpTypes.js";

/**
 * Valid memory bank file types
 * This should be kept in sync with the actual MemoryBankFileType definition
 */
const VALID_FILE_TYPES = Object.values(MemoryBankFileType);

/**
 * Type guard for MemoryBankFileType with runtime validation
 */
export function isValidMemoryBankFileType(value: unknown): value is MemoryBankFileType {
	return typeof value === "string" && VALID_FILE_TYPES.includes(value as MemoryBankFileType);
}

/**
 * Type guard for string validation
 */
export function isString(value: unknown): value is string {
	return typeof value === "string";
}

/**
 * Type guard for non-empty string validation
 */
export function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validates and converts a string to MemoryBankFileType
 * Throws an error if the value is not a valid file type
 */
export function validateFileType(value: unknown): MemoryBankFileType {
	if (!isValidMemoryBankFileType(value)) {
		throw new Error(
			`Invalid file type: ${String(value)}. Valid types are: ${VALID_FILE_TYPES.join(", ")}`,
		);
	}
	return value;
}

/**
 * Validates that a value is a non-empty string
 * Throws an error if validation fails
 */
export function validateNonEmptyString(value: unknown, fieldName = "value"): string {
	if (!isNonEmptyString(value)) {
		throw new Error(`${fieldName} must be a non-empty string`);
	}
	return value;
}

/**
 * Type guard for objects with specific properties
 */
export function hasProperty<T extends string>(obj: unknown, prop: T): obj is Record<T, unknown> {
	return typeof obj === "object" && obj !== null && prop in obj;
}

/**
 * Safe property accessor with type checking
 */
export function getProperty<T>(
	obj: unknown,
	prop: string,
	validator: (value: unknown) => value is T,
): T | undefined {
	if (hasProperty(obj, prop)) {
		const value = obj[prop];
		return validator(value) ? value : undefined;
	}
	return undefined;
}
