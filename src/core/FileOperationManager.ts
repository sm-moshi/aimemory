import type { Stats } from "node:fs";
import * as fs from "node:fs/promises";
import type {
	FileError,
	FileOperationManagerConfig,
	MemoryBankLogger,
	Result,
	RetryConfig,
} from "../types/index.js";

/**
 * FileOperationManager provides robust file operations with retry logic,
 * exponential backoff, and proper error handling following Result<T,E> pattern.
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
		private readonly logger: MemoryBankLogger,
		config?: FileOperationManagerConfig,
	) {
		if (config?.retryConfig) {
			this.retryConfig = { ...this.retryConfig, ...config.retryConfig };
		}
		this.timeout = config?.timeout ?? 30000; // 30 seconds default
	}

	/**
	 * Read file with retry mechanism and timeout
	 */
	async readFileWithRetry(path: string): Promise<Result<string, FileError>> {
		return await this.withRetry(async () => {
			this.logger.debug(`Reading file: ${path}`);
			return await this.withTimeout(fs.readFile(path, "utf-8"));
		}, `readFile(${path})`);
	}

	/**
	 * Write file with retry mechanism and timeout
	 */
	async writeFileWithRetry(path: string, content: string): Promise<Result<void, FileError>> {
		return await this.withRetry(async () => {
			this.logger.debug(`Writing file: ${path}`);
			return await this.withTimeout(fs.writeFile(path, content));
		}, `writeFile(${path})`);
	}

	/**
	 * Create directory with retry mechanism
	 */
	async mkdirWithRetry(
		path: string,
		options?: { recursive?: boolean },
	): Promise<Result<void, FileError>> {
		return await this.withRetry(async () => {
			this.logger.debug(`Creating directory: ${path}`);
			await this.withTimeout(fs.mkdir(path, options));
		}, `mkdir(${path})`);
	}

	/**
	 * Get file stats with retry mechanism
	 */
	async statWithRetry(path: string): Promise<Result<Stats, FileError>> {
		return await this.withRetry(async () => {
			this.logger.debug(`Getting stats for: ${path}`);
			return await this.withTimeout(fs.stat(path));
		}, `stat(${path})`);
	}

	/**
	 * Check file access with retry mechanism
	 */
	async accessWithRetry(path: string, mode?: number): Promise<Result<void, FileError>> {
		return await this.withRetry(async () => {
			this.logger.debug(`Checking access for: ${path}`);
			return await this.withTimeout(fs.access(path, mode));
		}, `access(${path})`);
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

				await this.sleep(delay);
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
			return {
				code: nodeError.code ?? "UNKNOWN_ERROR",
				message: `${operation}: ${error.message}`,
				path: nodeError.path,
				originalError: error,
			};
		}

		return {
			code: "UNKNOWN_ERROR",
			message: `${operation}: ${String(error)}`,
			originalError: error instanceof Error ? error : new Error(String(error)),
		};
	}

	/**
	 * Simple sleep utility
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
