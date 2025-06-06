import type { Stats } from "node:fs";
import * as fs from "node:fs/promises";
import type {
	FileError,
	FileOperationManagerConfig,
	Logger,
	Result,
	RetryConfig,
} from "@/types/index.js";
import { sleep } from "@utils/common/async-helpers.js";
import { validateMemoryBankPath } from "@utils/security-helpers.js";

/**
 * FileOperationManager provides robust file operations with retry logic,
 * exponential backoff, and proper error handling following Result<T,E> pattern.
 *
 * SECURITY: All file operations validate paths to prevent directory traversal attacks.
 */
export class FileOperationManager {
	private readonly retryConfig: RetryConfig = {
		maxRetries: 3,
		baseDelay: 100,
		maxDelay: 5000,
		backoffFactor: 2,
	};

	private readonly timeout: number;

	constructor(
		private readonly logger: Logger,
		private readonly allowedRoot: string, // SECURITY: Required allowedRoot for path validation
		config?: FileOperationManagerConfig,
	) {
		if (!allowedRoot) {
			throw new Error(
				"FileOperationManager requires allowedRoot for security - cannot operate without path restrictions",
			);
		}

		if (config?.retryConfig) {
			this.retryConfig = { ...this.retryConfig, ...config.retryConfig };
		}
		this.timeout = config?.timeout ?? 30000; // 30 seconds default

		this.logger.debug(`FileOperationManager initialized with allowedRoot: ${allowedRoot}`);
	}

	/**
	 * SECURITY: Validates path before any file operation
	 */
	private validatePath(path: string): string {
		try {
			const validatedPath = validateMemoryBankPath(path, this.allowedRoot);
			this.logger.debug(`Path validated: ${path} -> ${validatedPath}`);
			return validatedPath;
		} catch (error) {
			this.logger.error(
				`Path validation failed for: ${path} - ${error instanceof Error ? error.message : String(error)}`,
			);
			throw new Error(
				`Path validation failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Read file with retry mechanism and timeout
	 * SECURITY: Path is validated before any file access
	 */
	async readFileWithRetry(path: string): Promise<Result<string, FileError>> {
		try {
			const validatedPath = this.validatePath(path);
			return await this.withRetry(async () => {
				this.logger.debug(`Reading file: ${validatedPath}`);
				return await this.withTimeout(fs.readFile(validatedPath, "utf-8"));
			}, `readFile(${path})`);
		} catch (error) {
			const fileError: FileError = {
				code: "PATH_VALIDATION_ERROR",
				message: error instanceof Error ? error.message : String(error),
				path,
				originalError: error instanceof Error ? error : new Error(String(error)),
			};
			return { success: false, error: fileError };
		}
	}

	/**
	 * Write file with retry mechanism and timeout
	 * SECURITY: Path is validated before any file access
	 */
	async writeFileWithRetry(path: string, content: string): Promise<Result<void, FileError>> {
		try {
			const validatedPath = this.validatePath(path);
			return await this.withRetry(async () => {
				this.logger.debug(`Writing file: ${validatedPath}`);
				return await this.withTimeout(fs.writeFile(validatedPath, content));
			}, `writeFile(${path})`);
		} catch (error) {
			const fileError: FileError = {
				code: "PATH_VALIDATION_ERROR",
				message: error instanceof Error ? error.message : String(error),
				path,
				originalError: error instanceof Error ? error : new Error(String(error)),
			};
			return { success: false, error: fileError };
		}
	}

	/**
	 * Create directory with retry mechanism
	 * SECURITY: Path is validated before any file access
	 */
	async mkdirWithRetry(
		path: string,
		options?: { recursive?: boolean },
	): Promise<Result<void, FileError>> {
		try {
			const validatedPath = this.validatePath(path);
			return await this.withRetry(async () => {
				this.logger.debug(`Creating directory: ${validatedPath}`);
				await this.withTimeout(fs.mkdir(validatedPath, options));
			}, `mkdir(${path})`);
		} catch (error) {
			const fileError: FileError = {
				code: "PATH_VALIDATION_ERROR",
				message: error instanceof Error ? error.message : String(error),
				path,
				originalError: error instanceof Error ? error : new Error(String(error)),
			};
			return { success: false, error: fileError };
		}
	}

	/**
	 * Get file stats with retry mechanism
	 * SECURITY: Path is validated before any file access
	 */
	async statWithRetry(path: string): Promise<Result<Stats, FileError>> {
		try {
			const validatedPath = this.validatePath(path);
			return await this.withRetry(async () => {
				this.logger.debug(`Getting stats for: ${validatedPath}`);
				return await this.withTimeout(fs.stat(validatedPath));
			}, `stat(${path})`);
		} catch (error) {
			const fileError: FileError = {
				code: "PATH_VALIDATION_ERROR",
				message: error instanceof Error ? error.message : String(error),
				path,
				originalError: error instanceof Error ? error : new Error(String(error)),
			};
			return { success: false, error: fileError };
		}
	}

	/**
	 * Check file access with retry mechanism
	 * SECURITY: Path is validated before any file access
	 */
	async accessWithRetry(path: string, mode?: number): Promise<Result<void, FileError>> {
		try {
			const validatedPath = this.validatePath(path);
			return await this.withRetry(async () => {
				this.logger.debug(`Checking access for: ${validatedPath}`);
				return await this.withTimeout(fs.access(validatedPath, mode));
			}, `access(${path})`);
		} catch (error) {
			const fileError: FileError = {
				code: "PATH_VALIDATION_ERROR",
				message: error instanceof Error ? error.message : String(error),
				path,
				originalError: error instanceof Error ? error : new Error(String(error)),
			};
			return { success: false, error: fileError };
		}
	}

	/**
	 * Generic retry wrapper with exponential backoff
	 */
	private async withRetry<T>(
		operation: () => Promise<T>,
		operationName: string,
		retries = this.retryConfig.maxRetries,
	): Promise<Result<T, FileError>> {
		try {
			const result = await operation();
			return { success: true, data: result };
		} catch (error) {
			const fileError = this.createFileError(error, operationName);

			if (retries > 0 && this.isRetryableError(error)) {
				const delay = Math.min(
					this.retryConfig.baseDelay *
						this.retryConfig.backoffFactor ** (this.retryConfig.maxRetries - retries),
					this.retryConfig.maxDelay,
				);

				this.logger.warn(
					`${operationName} failed, retrying in ${delay}ms. Retries left: ${retries}. Error: ${fileError.message}`,
				);

				await sleep(delay);
				return this.withRetry(operation, operationName, retries - 1);
			}

			this.logger.error(`${operationName} failed after all retries: ${fileError.message}`);
			return { success: false, error: fileError };
		}
	}

	/**
	 * Add timeout to operations to prevent hanging
	 */
	private async withTimeout<T>(operation: Promise<T>): Promise<T> {
		return Promise.race([
			operation,
			new Promise<never>((_, reject) =>
				setTimeout(
					() => reject(new Error(`Operation timed out after ${this.timeout}ms`)),
					this.timeout,
				),
			),
		]);
	}

	/**
	 * Determine if an error is retryable
	 */
	private isRetryableError(error: unknown): boolean {
		if (!(error instanceof Error)) return false;

		const retryableCodes = [
			"EBUSY", // Resource busy
			"EMFILE", // Too many open files
			"ENFILE", // File table overflow
			"ENOENT", // No such file or directory (might be temporary)
			"ETIMEDOUT", // Timeout
			"ECONNRESET", // Connection reset
		];

		// Check for Node.js file system error codes
		const nodeError = error as NodeJS.ErrnoException;
		if (nodeError.code && retryableCodes.includes(nodeError.code)) {
			return true;
		}

		// Check for timeout errors
		if (error.message.includes("timeout") || error.message.includes("Timeout")) {
			return true;
		}

		return false;
	}

	/**
	 * Create standardized file error
	 */
	private createFileError(error: unknown, operation: string): FileError {
		if (error instanceof Error) {
			const nodeError = error as NodeJS.ErrnoException;
			const fileError: FileError = {
				code: nodeError.code ?? "UNKNOWN_ERROR",
				message: `${operation}: ${error.message}`,
				originalError: error,
			};
			if (nodeError.path !== undefined) {
				fileError.path = nodeError.path;
			}
			return fileError;
		}

		return {
			code: "UNKNOWN_ERROR",
			message: `${operation}: ${String(error)}`,
			originalError: error instanceof Error ? error : new Error(String(error)),
		};
	}
}
