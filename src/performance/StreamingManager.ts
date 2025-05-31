import type { Stats } from "node:fs";
import { createReadStream } from "node:fs";
import * as fs from "node:fs/promises";
import { resolve } from "node:path";
import { sanitizePath } from "../services/validation/security.js";
import type { Result } from "../types/errorHandling.js";
import type { FileError } from "../types/fileOperations.js";
import type {
	StreamingManagerConfig,
	StreamingMetadata,
	StreamingOptions,
	StreamingResult,
	StreamingStats,
} from "../types/system.js";
import type { MemoryBankLogger } from "../types/types.js";

/**
 * StreamingManager handles intelligent file reading with automatic streaming
 * for large files to prevent event loop blocking and memory issues.
 */
export class StreamingManager {
	private readonly sizeThreshold: number;
	private readonly chunkSize: number;
	private readonly timeout: number;
	private readonly enableProgressCallbacks: boolean;

	private readonly stats: StreamingStats = {
		totalOperations: 0,
		streamedOperations: 0,
		totalBytesRead: 0,
		avgStreamingTime: 0,
		avgNormalReadTime: 0,
		largestFileStreamed: 0,
		lastReset: new Date(),
	};

	private readonly activeOperations = new Map<string, StreamingMetadata>();

	constructor(
		private readonly logger: MemoryBankLogger,
		config?: StreamingManagerConfig,
	) {
		this.sizeThreshold = config?.sizeThreshold ?? 1024 * 1024; // 1MB default
		this.chunkSize = config?.chunkSize ?? 64 * 1024; // 64KB default
		this.timeout = config?.timeout ?? 30000; // 30 seconds default
		this.enableProgressCallbacks = config?.enableProgressCallbacks ?? true;

		this.logger.debug(
			`StreamingManager initialised with sizeThreshold: ${this.sizeThreshold} bytes, chunkSize: ${this.chunkSize} bytes`,
		);
	}

	/**
	 * Reads a file using intelligent strategy selection based on file size
	 */

	async readFile(
		filePath: string,
		options?: StreamingOptions,
	): Promise<Result<StreamingResult, FileError>> {
		const startTime = performance.now();
		const operationId = `${filePath}-${startTime}`;

		try {
			// SECURITY: Validate and sanitise file path to prevent path traversal attacks
			// Only apply strict validation if allowedRoot is specified (for controlled environments)
			let sanitisedPath: string;
			if (options?.allowedRoot) {
				try {
					const validatedPath = sanitizePath(filePath, options.allowedRoot);
					// Resolve the validated path against the allowedRoot for actual file operations
					sanitisedPath = resolve(options.allowedRoot, validatedPath);
				} catch (error) {
					const fileError: FileError = {
						code: "PATH_VALIDATION_ERROR",
						message: `Path validation failed: ${error instanceof Error ? error.message : String(error)}`,
						path: filePath,
						originalError: error instanceof Error ? error : new Error(String(error)),
					};
					return { success: false, error: fileError };
				}
			} else {
				// Basic security check for obvious path traversal attempts
				if (
					filePath.includes("../") ||
					filePath.includes("..\\") ||
					filePath.includes("\0")
				) {
					const fileError: FileError = {
						code: "PATH_VALIDATION_ERROR",
						message: "Path contains potentially dangerous sequences",
						path: filePath,
					};
					return { success: false, error: fileError };
				}
				sanitisedPath = filePath;
			}

			// Get file stats to determine strategy using the sanitised path
			const stats = await fs.stat(sanitisedPath);
			const fileSize = stats.size;

			// Track operation metadata (using original path for logging, but sanitised path for operations)
			const metadata: StreamingMetadata = {
				filePath,
				fileSize,
				strategy: fileSize >= this.sizeThreshold ? "streaming" : "normal",
				startTime,
			};
			this.activeOperations.set(operationId, metadata);

			let result: Result<StreamingResult, FileError>;

			if (fileSize >= this.sizeThreshold) {
				this.logger.debug(
					`Using streaming strategy for large file: ${filePath} (${fileSize} bytes)`,
				);
				result = await this.streamReadFile(sanitisedPath, stats, options);
				this.stats.streamedOperations++;
				this.stats.largestFileStreamed = Math.max(this.stats.largestFileStreamed, fileSize);
			} else {
				this.logger.debug(
					`Using normal read strategy for file: ${filePath} (${fileSize} bytes)`,
				);
				result = await this.normalReadFile(sanitisedPath, stats);
			}

			// Update metadata and stats
			const endTime = performance.now();
			const duration = endTime - startTime;
			metadata.endTime = endTime;

			this.stats.totalOperations++;
			this.stats.totalBytesRead += fileSize;
			this.updateAverageTimes(duration, metadata.strategy);

			this.activeOperations.delete(operationId);

			if (result.success) {
				this.logger.debug(
					`Successfully read ${filePath} in ${duration.toFixed(2)}ms using ${metadata.strategy} strategy`,
				);
			}

			return result;
		} catch (error) {
			this.activeOperations.delete(operationId);
			const fileError: FileError = {
				code: "STREAMING_READ_ERROR",
				message: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
				path: filePath,
				originalError: error instanceof Error ? error : new Error(String(error)),
			};
			return { success: false, error: fileError };
		}
	}

	/**
	 * Normal file reading for small files
	 */
	private async normalReadFile(
		filePath: string,
		stats: Stats,
	): Promise<Result<StreamingResult, FileError>> {
		try {
			const startTime = performance.now();
			const content = await fs.readFile(filePath, "utf-8");
			const duration = performance.now() - startTime;

			const result: StreamingResult = {
				content,
				wasStreamed: false,
				duration,
				bytesRead: stats.size,
				chunksProcessed: 1,
			};

			return { success: true, data: result };
		} catch (error) {
			const fileError: FileError = {
				code: "NORMAL_READ_ERROR",
				message: `Normal read failed: ${error instanceof Error ? error.message : String(error)}`,
				path: filePath,
				originalError: error instanceof Error ? error : new Error(String(error)),
			};
			return { success: false, error: fileError };
		}
	}

	/**
	 * Streaming file reading for large files
	 */
	private async streamReadFile(
		filePath: string,
		stats: Stats,
		options?: StreamingOptions,
	): Promise<Result<StreamingResult, FileError>> {
		return new Promise((resolve) => {
			const chunks: Buffer[] = [];
			let bytesRead = 0;
			let chunksProcessed = 0;
			const startTime = performance.now();
			const totalSize = stats.size;

			const chunkSize = options?.chunkSize ?? this.chunkSize;
			const timeoutMs = options?.timeout ?? this.timeout;

			// Create timeout handler
			const timeoutId = setTimeout(() => {
				const fileError: FileError = {
					code: "STREAMING_TIMEOUT",
					message: `Streaming read timed out after ${timeoutMs}ms`,
					path: filePath,
				};
				resolve({ success: false, error: fileError });
			}, timeoutMs);

			// Create read stream
			const stream = createReadStream(filePath, {
				highWaterMark: chunkSize,
			});

			// Handle data chunks
			stream.on("data", (chunk: Buffer | string) => {
				const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
				chunks.push(buffer);
				bytesRead += buffer.length;
				chunksProcessed++;

				// Progress callback
				if (this.enableProgressCallbacks && options?.onProgress) {
					options.onProgress(bytesRead, totalSize);
				}

				// Memory pressure check - pause to yield control
				if (this.shouldPauseForMemoryPressure(bytesRead, chunksProcessed)) {
					stream.pause();
					setImmediate(() => {
						if (!stream.destroyed) {
							stream.resume();
						}
					});
				}
			});

			// Handle successful completion
			stream.on("end", () => {
				clearTimeout(timeoutId);
				try {
					const content = Buffer.concat(chunks).toString("utf-8");
					const duration = performance.now() - startTime;

					const result: StreamingResult = {
						content,
						wasStreamed: true,
						duration,
						bytesRead,
						chunksProcessed,
					};

					resolve({ success: true, data: result });
				} catch (error) {
					const fileError: FileError = {
						code: "STREAMING_PARSE_ERROR",
						message: `Failed to parse streamed content: ${error instanceof Error ? error.message : String(error)}`,
						path: filePath,
						originalError: error instanceof Error ? error : new Error(String(error)),
					};
					resolve({ success: false, error: fileError });
				}
			});

			// Handle errors
			stream.on("error", (error) => {
				clearTimeout(timeoutId);
				const fileError: FileError = {
					code: "STREAMING_READ_ERROR",
					message: `Stream read error: ${error.message}`,
					path: filePath,
					originalError: error,
				};
				resolve({ success: false, error: fileError });
			});

			// Handle cancellation if supported
			if (options?.enableCancellation) {
				// Note: Cancellation would need to be implemented by the caller
				// by providing a way to signal cancellation
			}
		});
	}

	/**
	 * Determines if streaming should pause to manage memory pressure
	 */
	private shouldPauseForMemoryPressure(bytesRead: number, chunksProcessed: number): boolean {
		// Pause every 10 chunks to yield control and prevent memory pressure
		return chunksProcessed % 10 === 0;
	}

	/**
	 * Updates average timing statistics
	 */
	private updateAverageTimes(duration: number, strategy: "normal" | "streaming"): void {
		const currentOps = this.stats.totalOperations;
		const currentAvg =
			strategy === "streaming" ? this.stats.avgStreamingTime : this.stats.avgNormalReadTime;

		// Calculate new average using incremental formula
		const newAvg =
			currentOps === 0 ? duration : (currentAvg * (currentOps - 1) + duration) / currentOps;

		if (strategy === "streaming") {
			this.stats.avgStreamingTime = newAvg;
		} else {
			this.stats.avgNormalReadTime = newAvg;
		}
	}

	/**
	 * Gets current streaming statistics
	 */
	getStats(): StreamingStats {
		return { ...this.stats };
	}

	/**
	 * Resets streaming statistics
	 */
	resetStats(): void {
		this.stats.totalOperations = 0;
		this.stats.streamedOperations = 0;
		this.stats.totalBytesRead = 0;
		this.stats.avgStreamingTime = 0;
		this.stats.avgNormalReadTime = 0;
		this.stats.largestFileStreamed = 0;
		this.stats.lastReset = new Date();

		this.logger.debug("Streaming statistics reset");
	}

	/**
	 * Gets information about currently active operations
	 */
	getActiveOperations(): StreamingMetadata[] {
		return Array.from(this.activeOperations.values());
	}

	/**
	 * Gets configuration information
	 */
	getConfig(): {
		sizeThreshold: number;
		chunkSize: number;
		timeout: number;
		enableProgressCallbacks: boolean;
	} {
		return {
			sizeThreshold: this.sizeThreshold,
			chunkSize: this.chunkSize,
			timeout: this.timeout,
			enableProgressCallbacks: this.enableProgressCallbacks,
		};
	}

	/**
	 * Checks if a file would be streamed based on its size
	 */

	async wouldStreamFile(
		filePath: string,
		allowedRoot?: string,
	): Promise<Result<boolean, FileError>> {
		try {
			// SECURITY: Validate and sanitise file path to prevent path traversal attacks
			// Only apply strict validation if allowedRoot is specified (for controlled environments)
			let sanitisedPath: string;
			if (allowedRoot) {
				try {
					const validatedPath = sanitizePath(filePath, allowedRoot);
					// Resolve the validated path against the allowedRoot for actual file operations
					sanitisedPath = resolve(allowedRoot, validatedPath);
				} catch (error) {
					const fileError: FileError = {
						code: "PATH_VALIDATION_ERROR",
						message: `Path validation failed: ${error instanceof Error ? error.message : String(error)}`,
						path: filePath,
						originalError: error instanceof Error ? error : new Error(String(error)),
					};
					return { success: false, error: fileError };
				}
			} else {
				// Basic security check for obvious path traversal attempts
				if (
					filePath.includes("../") ||
					filePath.includes("..\\") ||
					filePath.includes("\0")
				) {
					const fileError: FileError = {
						code: "PATH_VALIDATION_ERROR",
						message: "Path contains potentially dangerous sequences",
						path: filePath,
					};
					return { success: false, error: fileError };
				}
				sanitisedPath = filePath;
			}

			const stats = await fs.stat(sanitisedPath);
			return { success: true, data: stats.size >= this.sizeThreshold };
		} catch (error) {
			const fileError: FileError = {
				code: "STAT_ERROR",
				message: `Failed to stat file: ${error instanceof Error ? error.message : String(error)}`,
				path: filePath,
				originalError: error instanceof Error ? error : new Error(String(error)),
			};
			return { success: false, error: fileError };
		}
	}
}
