import type { Stats } from "node:fs";
import * as fs from "node:fs/promises";
import { resolve } from "node:path";
import { sanitizePath } from "../services/validation/security.js";
import type { Result } from "../types/errorHandling.js";
import type { FileError } from "../types/fileOperations.js";
import type { MemoryBankLogger } from "../types/index.js";
import type {
	FileStreamerConfig,
	StreamingManagerConfig,
	StreamingMetadata,
	StreamingOptions,
	StreamingResult,
	StreamingStats,
} from "../types/streaming.js";
import { FileStreamer } from "./FileStreamer.js";

/**
 * StreamingManager handles intelligent file reading with automatic streaming
 * for large files to prevent event loop blocking and memory issues.
 */
export class StreamingManager {
	private readonly sizeThreshold: number;
	private readonly chunkSize: number;
	private readonly timeout: number;
	private readonly enableProgressCallbacks: boolean;
	private readonly fileStreamer: FileStreamer;

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

		// Initialize FileStreamer
		const fileStreamerConfig: FileStreamerConfig = {
			defaultChunkSize: this.chunkSize,
			defaultTimeout: this.timeout,
			defaultEnableProgressCallbacks: this.enableProgressCallbacks,
		};
		this.fileStreamer = new FileStreamer(this.logger, fileStreamerConfig);

		this.logger.debug(
			`StreamingManager initialised with sizeThreshold: ${this.sizeThreshold} bytes, chunkSize: ${this.chunkSize} bytes`,
		);
	}

	/**
	 * Validates and resolves a file path, applying sanitization.
	 */
	private async _validateAndResolvePath(
		filePath: string,
		allowedRoot?: string,
	): Promise<Result<string, FileError>> {
		let sanitisedPath: string;
		if (allowedRoot) {
			try {
				const validatedPath = sanitizePath(filePath, allowedRoot);
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
			if (filePath.includes("../") || filePath.includes("..\\") || filePath.includes("\0")) {
				const fileError: FileError = {
					code: "PATH_VALIDATION_ERROR",
					message: "Path contains potentially dangerous sequences",
					path: filePath,
				};
				return { success: false, error: fileError };
			}
			sanitisedPath = filePath;
		}
		return { success: true, data: sanitisedPath };
	}

	/**
	 * Starts tracking an active file operation.
	 */
	private _startOperation(
		filePath: string,
		fileSize: number,
		strategy: "streaming" | "normal",
	): string {
		const startTime = performance.now();
		const operationId = `${filePath}-${startTime}`;
		const metadata: StreamingMetadata = {
			filePath,
			fileSize,
			strategy,
			startTime,
		};
		this.activeOperations.set(operationId, metadata);
		return operationId;
	}

	/**
	 * Ends tracking an active file operation and updates stats.
	 */
	private _endOperation(
		operationId: string,
		duration: number,
		fileSize: number,
		strategy: "streaming" | "normal",
	): void {
		const metadata = this.activeOperations.get(operationId);
		if (metadata) {
			metadata.endTime = metadata.startTime + duration;
			this.stats.totalOperations++;
			this.stats.totalBytesRead += fileSize;
			this.updateAverageTimes(duration, strategy);
			this.activeOperations.delete(operationId);
		}
	}

	/**
	 * Reads a file using intelligent strategy selection based on file size
	 */
	async readFile(
		filePath: string,
		options?: StreamingOptions,
	): Promise<Result<StreamingResult, FileError>> {
		const pathResult = await this._validateAndResolvePath(filePath, options?.allowedRoot);
		if (!pathResult.success) {
			return { success: false, error: pathResult.error };
		}
		const sanitisedPath = pathResult.data;

		let operationId = "";
		let fileSize = 0;
		let strategy: "streaming" | "normal" = "normal";

		try {
			const stats = await fs.stat(sanitisedPath);
			fileSize = stats.size;
			strategy = fileSize >= this.sizeThreshold ? "streaming" : "normal";
			operationId = this._startOperation(filePath, fileSize, strategy);

			let result: Result<StreamingResult, FileError>;

			if (strategy === "streaming") {
				this.logger.debug(
					`Using streaming strategy for large file: ${filePath} (${fileSize} bytes)`,
				);
				result = await this.fileStreamer.streamFile(sanitisedPath, stats, options);
				this.stats.streamedOperations++;
				this.stats.largestFileStreamed = Math.max(this.stats.largestFileStreamed, fileSize);
			} else {
				this.logger.debug(
					`Using normal read strategy for file: ${filePath} (${fileSize} bytes)`,
				);
				result = await this.normalReadFile(sanitisedPath, stats);
			}

			if (operationId && result.success) {
				this._endOperation(operationId, result.data.duration, fileSize, strategy);
				this.logger.debug(
					`Successfully read ${filePath} in ${result.data.duration.toFixed(2)}ms using ${strategy} strategy`,
				);
			} else if (operationId) {
				this.activeOperations.delete(operationId);
			}

			return result;
		} catch (error) {
			if (operationId) {
				this.activeOperations.delete(operationId);
			}
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
		// Validate and resolve path first
		const pathResult = await this._validateAndResolvePath(filePath, allowedRoot);
		if (!pathResult.success) {
			return { success: false, error: pathResult.error };
		}
		const sanitisedPath = pathResult.data;

		try {
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
