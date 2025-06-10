/**
 * @file src/core/index.ts
 * @description Barrel file for core services.
 *
 * This file re-exports the main classes for each core service,
 * providing a single entry point for consumers of the core library.
 */

export * from "./file-operations";
export { FileOperationManager } from "./file-operations";
export { MemoryBankManager } from "./memory-bank";
export * from "./streaming";
