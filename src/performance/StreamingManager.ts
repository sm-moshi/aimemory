/**
 * Streaming Manager
 *
 * Intelligent file reading strategy selector that chooses between
 * normal reads and streaming based on file size and system constraints.
 */

import type { Stats } from "node:fs";
import * as fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import type { FileOperationManager } from "../core/FileOperationManager.js";
import type {
	CachedFileStats,
	FileError,
	Logger,
	Result,
	StreamingManagerConfig,
	StreamingMetadata,
	StreamingOptions,
	StreamingResult,
	StreamingStats,
} from "../types/index.js";
import { sanitizePath } from "../utils/index.js";
import { FileStreamer } from "./FileStreamer.js";

/**
 * Streaming Manager
 *
 * Chooses appropriate read strategy and maintains performance statistics.
 * Validates all paths for security before file operations.
 */
export class StreamingManager {
	private readonly logger: Logger;
	private readonly fileOperationManager: FileOperationManager;
	private readonly allowedRoot: string;
	private readonly sizeThreshold: number;
	private readonly chunkSize: number;
	private readonly timeout: number;
	private readonly enableProgressCallbacks: boolean;
	private readonly fileStreamer: FileStreamer;
	private readonly statsCache = new Map<string, CachedFileStats>();

	// Runtime statistics
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
		logger: Logger,
		fileOperationManager: FileOperationManager,
		allowedRoot: string,
		config: StreamingManagerConfig = {},
	) {
		if (!allowedRoot) {
			throw new Error(
				"Requires allowedRoot for security - cannot operate without path restrictions",
			);
		}

		this.logger = logger;
		this.fileOperationManager = fileOperationManager;
		this.allowedRoot = allowedRoot;
		this.sizeThreshold = config.sizeThreshold ?? 1024 * 1024; // 1MB default
		this.chunkSize = config.chunkSize ?? 64 * 1024; // 64KB default
		this.timeout = config.timeout ?? 30000; // 30s default
		this.enableProgressCallbacks = config.enableProgressCallbacks ?? true;

		// Create FileStreamer with same config
		this.fileStreamer = new FileStreamer(this.logger, allowedRoot, {
			defaultChunkSize: this.chunkSize,
			defaultTimeout: this.timeout,
			defaultEnableProgressCallbacks: this.enableProgressCallbacks,
		});

		this.logger.debug(
			`StreamingManager initialised with sizeThreshold: ${this.sizeThreshold}, chunkSize: ${this.chunkSize}, timeout: ${this.timeout}`,
		);
	}

	/**
	 * Validates and resolves a file path against the allowed root
	 */
	private async _validateAndResolvePath(
		filePath: string,
		allowedRootOptions?: string,
	): Promise<Result<string, FileError>> {
		try {
			const effectiveAllowedRoot = allowedRootOptions ?? this.allowedRoot;

			// filePath can be relative or absolute.
			// sanitizePath will validate it against effectiveAllowedRoot.
			// The path returned (validatedSegment) is normalized but might still be
			// relative if filePath was relative, or absolute if filePath was absolute.
			const validatedSegment = sanitizePath(filePath, effectiveAllowedRoot);

			// We need a fully resolved absolute path for internal fs operations.
			// path.resolve handles if validatedSegment is already absolute correctly.
			const absolutePath = path.resolve(effectiveAllowedRoot, validatedSegment);

			// Final check: ensure this resolved absolute path is *still* within the effectiveAllowedRoot.
			// This is a safeguard. The initial sanitizePath (with its internal _validatePathWithinRoot)
			// should have already ensured this. Calling it again on the fully resolved absolute path
			// acts as a definitive assertion that the path is safe and correctly rooted.
			sanitizePath(absolutePath, effectiveAllowedRoot); // This will throw if not compliant.

			return { success: true, data: absolutePath };
		} catch (error) {
			const fileError: FileError = {
				code: "PATH_VALIDATION_ERROR",
				message: `Path validation failed: ${error instanceof Error ? error.message : String(error)}`,
				path: filePath,
				originalError: error instanceof Error ? error : new Error(String(error)),
			};
			return { success: false, error: fileError };
		}
	}

	/**
	 * Starts tracking a new file operation
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
	 * Ends tracking of a file operation and updates statistics
	 */
	private _endOperation(
		operationId: string,
		duration: number,
		fileSize: number,
		strategy: "streaming" | "normal",
	): void {
		if (this.activeOperations.has(operationId)) {
			this.stats.totalOperations++;
			this.stats.totalBytesRead += fileSize;
			this.updateAverageTimes(duration, strategy);
			this.activeOperations.delete(operationId);
		}
	}

	/**
	 * Validates and resolves a file path against the allowed root, then gets file stats.
	 */
	private async _getValidatedPathAndStats(
		filePath: string,
		options?: StreamingOptions,
	): Promise<Result<{ sanitisedPath: string; stats: Stats }, FileError>> {
		const allowedRoot = options?.allowedRoot ?? this.allowedRoot;
		const pathResult = await this._validateAndResolvePath(filePath, allowedRoot);
		if (!pathResult.success) {
			return { success: false, error: pathResult.error };
		}
		const sanitisedPath = pathResult.data;

		try {
			const stats = await fs.stat(sanitisedPath);
			return { success: true, data: { sanitisedPath, stats } };
		} catch (error) {
			const fileError: FileError = {
				code: "STAT_ERROR",
				message: `Failed to stat file: ${error instanceof Error ? error.message : String(error)}`,
				path: filePath,
				originalError: error instanceof Error ? error : new Error(String(error)),
			};
			this.logger.error(
				`[StreamingManager._getValidatedPathAndStats] Error for ${filePath}: ${fileError.message}`,
			);
			return { success: false, error: fileError };
		}
	}

	/**
	 * Executes the streaming read strategy for a file.
	 */
	private async _executeStreamingRead(
		sanitisedPath: string,
		stats: Stats,
		options?: StreamingOptions,
	): Promise<Result<StreamingResult, FileError>> {
		const result = await this.fileStreamer.streamFile(sanitisedPath, stats, options);
		if (result.success) {
			this.stats.streamedOperations++;
			this.stats.largestFileStreamed = Math.max(this.stats.largestFileStreamed, stats.size);
		}
		return result;
	}

	/**
	 * Executes the normal read strategy for a file.
	 */
	private async _executeNormalRead(
		sanitisedPath: string,
		stats: Stats,
	): Promise<Result<StreamingResult, FileError>> {
		return this.normalReadFile(sanitisedPath, stats);
	}

	/**
	 * Performs the read operation using the determined strategy (streaming or normal).
	 * Handles operation tracking and statistics updates.
	 */
	private async _performReadOperation(
		originalFilePath: string, // Use original path for logging and operation ID
		sanitisedPath: string, // Use sanitised path for actual file operations
		stats: Stats,
		options?: StreamingOptions,
	): Promise<Result<StreamingResult, FileError>> {
		const fileSize = stats.size;
		const strategy = fileSize >= this.sizeThreshold ? "streaming" : "normal";
		const operationId = this._startOperation(originalFilePath, fileSize, strategy);

		let result: Result<StreamingResult, FileError>;

		try {
			if (strategy === "streaming") {
				this.logger.debug(
					`Using streaming strategy for large file: ${originalFilePath} (${fileSize} bytes)`,
				);
				result = await this._executeStreamingRead(sanitisedPath, stats, options);
			} else {
				this.logger.debug(
					`Using normal read strategy for file: ${originalFilePath} (${fileSize} bytes)`,
				);
				result = await this._executeNormalRead(sanitisedPath, stats);
			}

			if (result.success) {
				this._endOperation(operationId, result.data.duration, fileSize, strategy);
				this.logger.debug(
					`Successfully read ${originalFilePath} in ${result.data.duration.toFixed(2)}ms using ${strategy} strategy`,
				);
			} else {
				// Error occurred within strategy execution (e.g., streamFile or normalReadFile returned an error Result)
				// The operationId needs to be cleared as _endOperation won't be called.
				this.activeOperations.delete(operationId);
				this.logger.warn(
					`[StreamingManager._performReadOperation] Failed to read ${originalFilePath} using ${strategy}: ${result.error.message}`,
				);
			}
			return result;
		} catch (error) {
			// Catch unexpected errors during this method's execution
			this.activeOperations.delete(operationId); // Ensure cleanup

			const errorMessage = error instanceof Error ? error.message : String(error);
			this.logger.error(
				`[StreamingManager._performReadOperation] Caught unexpected error for path ${originalFilePath}: ${errorMessage}`,
			);
			if (error instanceof Error && error.stack) {
				this.logger.error(
					`[StreamingManager._performReadOperation] Stack trace: ${error.stack}`,
				);
			}

			const fileError: FileError = {
				code: "PERFORM_READ_ERROR", // More specific error code
				message: `Unexpected failure during read operation execution for ${originalFilePath}: ${errorMessage}`,
				path: originalFilePath,
				originalError: error instanceof Error ? error : new Error(errorMessage),
			};
			return { success: false, error: fileError };
		}
	}

	/**
	 * Reads a file using intelligent strategy selection based on file size
	 */
	async readFile(
		filePath: string,
		options?: StreamingOptions,
	): Promise<Result<StreamingResult, FileError>> {
		const pathAndStatsResult = await this._getValidatedPathAndStats(filePath, options);

		if (!pathAndStatsResult.success) {
			// Error already logged by _getValidatedPathAndStats if it was a stat error
			// or by _validateAndResolvePath for path errors.
			return { success: false, error: pathAndStatsResult.error };
		}

		const { sanitisedPath, stats } = pathAndStatsResult.data;

		// Pass original filePath for consistent logging/operation ID,
		// and sanitisedPath for actual file system access.
		return this._performReadOperation(filePath, sanitisedPath, stats, options);
	}

	/**
	 * Normal file reading for small files using FileOperationManager
	 */
	private async normalReadFile(
		filePath: string,
		stats: Stats,
	): Promise<Result<StreamingResult, FileError>> {
		const startTime = performance.now();
		try {
			const result = await this.fileOperationManager.readFileWithRetry(filePath);
			const duration = performance.now() - startTime;

			if (!result.success) {
				const fileError: FileError = {
					code: "NORMAL_READ_ERROR",
					message: result.error.message,
					path: filePath,
				};

				if (result.error.originalError !== undefined) {
					fileError.originalError = result.error.originalError;
				}

				return {
					success: false,
					error: fileError,
				};
			}

			return {
				success: true,
				data: {
					content: result.data,
					wasStreamed: false,
					duration,
					bytesRead: stats.size,
				},
			};
		} catch (error) {
			const fileError: FileError = {
				code: "NORMAL_READ_ERROR",
				message: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
				path: filePath,
				originalError: error instanceof Error ? error : new Error(String(error)),
			};
			this.logger.error(
				`[StreamingManager.normalReadFile] Error for ${filePath}: ${fileError.message}`,
			);
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
		// Use constructor's allowedRoot if no allowedRoot is provided
		const effectiveAllowedRoot = allowedRoot ?? this.allowedRoot;
		// Validate and resolve path first. Re-use _getValidatedPathAndStats for this.
		const pathAndStatsResult = await this._getValidatedPathAndStats(filePath, {
			allowedRoot: effectiveAllowedRoot,
		});
		if (!pathAndStatsResult.success) {
			return { success: false, error: pathAndStatsResult.error };
		}
		// Access stats from the successful result
		const { stats } = pathAndStatsResult.data;
		return { success: true, data: stats.size >= this.sizeThreshold };
	}
}
