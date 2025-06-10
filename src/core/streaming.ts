/**
 * @file src/core/streaming.ts
 * @description Provides secure and efficient file streaming capabilities.
 *
 * This file contains two main classes:
 * - FileStreamer: Handles the low-level logic of streaming a file from disk with security checks.
 * - StreamingManager: A higher-level manager that decides whether to stream or
 *   perform a normal read based on file size, while also collecting performance statistics.
 */

import type { ReadStream, Stats } from "node:fs";
import { createReadStream } from "node:fs";
import * as fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

import type { Logger, Result } from "../lib/types/core";
import type {
	FileError,
	FileStreamerConfig,
	StreamDataHandlerContext,
	StreamingManagerConfig,
	StreamingMetadata,
	StreamingOptions,
	StreamingResult,
	StreamingStats,
	StreamSetupParameters,
	StreamSetupState,
} from "../lib/types/operations";
import { sanitizePath, validateMemoryBankPath } from "../lib/validation";
import type { FileOperationManager } from "./file-operations";

// =================================================================
// Section: FileStreamer Class
// =================================================================

/**
 * FileStreamer provides secure streaming file operations with path validation
 * to prevent directory traversal attacks.
 */
export class FileStreamer {
	// =================================================================
	// Section: Properties
	// =================================================================

	private readonly logger: Logger;
	private readonly allowedRoot: string; // SECURITY: Required allowedRoot for path validation
	private readonly defaultChunkSize: number;
	private readonly defaultTimeout: number;
	private readonly defaultEnableProgressCallbacks: boolean;

	// =================================================================
	// Section: Constructor
	// =================================================================

	constructor(
		logger: Logger,
		allowedRoot: string, // SECURITY: Add required allowedRoot parameter
		config: FileStreamerConfig,
	) {
		if (!allowedRoot) {
			throw new Error(
				"FileStreamer requires allowedRoot for security - cannot operate without path restrictions",
			);
		}

		this.logger = logger;
		this.allowedRoot = allowedRoot;
		this.defaultChunkSize = config.defaultChunkSize;
		this.defaultTimeout = config.defaultTimeout;
		this.defaultEnableProgressCallbacks = config.defaultEnableProgressCallbacks;

		this.logger.debug(
			`FileStreamer initialised with allowedRoot: ${allowedRoot}, defaultChunkSize: ${this.defaultChunkSize}, defaultTimeout: ${this.defaultTimeout}`,
		);
	}

	// =================================================================
	// Section: Public API
	// =================================================================

	/**
	 * Securely streams a file from disk. Path is validated before any operation.
	 */
	async streamFile(
		filePath: string,
		stats: Stats,
		options?: StreamingOptions,
	): Promise<Result<StreamingResult, FileError>> {
		let promiseResolved = false;
		let currentTimeoutId: NodeJS.Timeout | undefined;

		try {
			const validatedPath = this.validatePath(filePath);
			const startTime = performance.now();

			return await new Promise<Result<StreamingResult, FileError>>(resolve => {
				const resolveOnce = (value: Result<StreamingResult, FileError>) => {
					if (!promiseResolved) {
						promiseResolved = true;
						if (currentTimeoutId) clearTimeout(currentTimeoutId);
						resolve(value);
					}
				};

				const setupParams: StreamSetupParameters = {
					validatedPath,
					stats,
					startTime,
					originalFilePath: filePath,
				};
				if (options) {
					setupParams.options = options;
				}

				currentTimeoutId = this._setupStreamAndEvents(setupParams, {
					chunks: [],
					bytesRead: { value: 0 },
					chunksProcessed: { value: 0 },
					resolve: resolveOnce,
				});
			});
		} catch (error) {
			const fileError: FileError = {
				code: "PATH_VALIDATION_ERROR",
				message: error instanceof Error ? error.message : String(error),
				path: filePath,
				originalError: error instanceof Error ? error : new Error(String(error)),
			};
			return { success: false, error: fileError };
		}
	}

	// =================================================================
	// Section: Internal Logic & Private Helpers
	// =================================================================

	/**
	 * SECURITY: Validates path before any file operation
	 */
	private validatePath(path: string): string {
		try {
			const validatedPath = validateMemoryBankPath(path, this.allowedRoot);
			this.logger.debug(`FileStreamer path validated: ${path} -> ${validatedPath}`);
			return validatedPath;
		} catch (error) {
			this.logger.error(
				`FileStreamer path validation failed for: ${path} - ${error instanceof Error ? error.message : String(error)}`,
			);
			throw new Error(`Path validation failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Sets up and clears a timeout for a streaming operation.
	 */
	private manageStreamTimeout(
		stream: ReadStream,
		timeoutMs: number,
		filePath: string,
		resolvePromise: (value: Result<StreamingResult, FileError>) => void,
	): NodeJS.Timeout {
		const timeoutId = setTimeout(() => {
			const fileError: FileError = {
				code: "STREAMING_TIMEOUT",
				message: `Streaming read timed out after ${timeoutMs}ms`,
				path: filePath,
			};
			resolvePromise({ success: false, error: fileError });

			// Defensive check for stream object and methods
			if (stream && typeof stream.removeAllListeners === "function" && typeof stream.destroy === "function") {
				stream.removeAllListeners("data");
				stream.removeAllListeners("end");
				stream.removeAllListeners("error");
				stream.removeAllListeners("close");

				if (!stream.destroyed) {
					stream.destroy();
				}
			} else {
				// This log helps if this defensive block is ever hit in a non-test scenario or if mocks are behaving unexpectedly.
				this.logger.warn(
					`[FileStreamer] Stream object was undefined or malformed in manageStreamTimeout for ${filePath} after promise resolution. This might indicate a test cleanup race condition or an issue with the stream instance itself.`,
				);
			}
		}, timeoutMs);
		return timeoutId;
	}

	/**
	 * Determines if streaming should pause to manage memory pressure
	 */
	private shouldPauseForMemoryPressure(_bytesRead: number, chunksProcessed: number): boolean {
		// Pause every 10 chunks to yield control and prevent memory pressure
		return chunksProcessed % 10 === 0;
	}

	/**
	 * Handles the 'data' event from the read stream.
	 */
	private _handleStreamData(
		chunk: Buffer | string,
		stream: ReadStream, // Added stream for pause/resume
		chunks: Buffer[],
		context: StreamDataHandlerContext,
	): void {
		const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		chunks.push(buffer);
		context.bytesRead.value += buffer.length;
		context.chunksProcessed.value++;

		if (context.enableProgress && context.options?.onProgress) {
			context.options.onProgress(context.bytesRead.value, context.totalSize);
		}

		if (this.shouldPauseForMemoryPressure(context.bytesRead.value, context.chunksProcessed.value)) {
			stream.pause();
			setImmediate(() => {
				if (!stream.destroyed) {
					stream.resume();
				}
			});
		}
	}

	/**
	 * Handles the 'end' event from the read stream.
	 */
	private _handleStreamEnd(
		chunks: Buffer[],
		startTime: number,
		bytesRead: number,
		chunksProcessed: number,
		filePath: string,
		resolvePromise: (value: Result<StreamingResult, FileError>) => void,
	): void {
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
			resolvePromise({ success: true, data: result });
		} catch (error) {
			const fileError: FileError = {
				code: "STREAMING_PARSE_ERROR",
				message: `Failed to parse streamed content: ${error instanceof Error ? error.message : String(error)}`,
				path: filePath,
				originalError: error instanceof Error ? error : new Error(String(error)),
			};
			resolvePromise({ success: false, error: fileError });
		}
	}

	/**
	 * Handles the 'error' event from the read stream.
	 */
	private _handleStreamError(
		error: Error,
		filePath: string,
		resolvePromise: (value: Result<StreamingResult, FileError>) => void,
	): void {
		const fileError: FileError = {
			code: "STREAMING_READ_ERROR",
			message: `Stream read error: ${error.message}`,
			path: filePath,
			originalError: error,
		};
		resolvePromise({ success: false, error: fileError });
	}

	private _handleStreamClose(filePath: string, resolve: (value: Result<StreamingResult, FileError>) => void): void {
		// The resolve function itself checks if the promise is already resolved.
		this.logger.warn(`Stream for ${filePath} closed prematurely.`);
		const fileError: FileError = {
			code: "STREAM_CLOSED_PREMATURELY",
			message: "Stream closed prematurely without completing or erroring.",
			path: filePath,
		};
		resolve({ success: false, error: fileError });
	}

	private _setupStreamAndEvents(params: StreamSetupParameters, state: StreamSetupState): NodeJS.Timeout | undefined {
		const totalSize = params.stats.size;
		// Provide default options to avoid undefined issues
		const options = params.options ?? {};
		const chunkSize = options.chunkSize ?? this.defaultChunkSize;
		const timeoutMs = options.timeout ?? this.defaultTimeout;
		const enableProgress = this.defaultEnableProgressCallbacks && typeof options.onProgress === "function";

		const stream = createReadStream(params.validatedPath, {
			highWaterMark: chunkSize,
		});

		const currentTimeoutId = this.manageStreamTimeout(
			stream,
			timeoutMs,
			params.originalFilePath, // Use originalFilePath for logging/timeout context
			state.resolve,
		);

		stream.on("data", (chunk: Buffer | string) => {
			this._handleStreamData(chunk, stream, state.chunks, {
				bytesRead: state.bytesRead,
				chunksProcessed: state.chunksProcessed,
				totalSize,
				enableProgress,
				options, // Now guaranteed to be StreamingOptions, not undefined
			});
		});

		stream.on("end", () => {
			this._handleStreamEnd(
				state.chunks,
				params.startTime,
				state.bytesRead.value,
				state.chunksProcessed.value,
				params.originalFilePath,
				state.resolve,
			);
		});

		stream.on("error", error => {
			this._handleStreamError(error, params.originalFilePath, state.resolve);
		});

		stream.on("close", () => {
			this._handleStreamClose(params.originalFilePath, state.resolve);
		});
		return currentTimeoutId;
	}
}

// =================================================================
// Section: StreamingManager Class
// =================================================================

/**
 * Streaming Manager
 *
 * Chooses appropriate read strategy and maintains performance statistics.
 * Validates all paths for security before file operations.
 */
export class StreamingManager {
	// =================================================================
	// Section: Properties
	// =================================================================

	private readonly logger: Logger;
	private readonly fileOperationManager: FileOperationManager;
	private readonly allowedRoot: string;
	private readonly sizeThreshold: number;
	private readonly chunkSize: number;
	private readonly timeout: number;
	private readonly enableProgressCallbacks: boolean;
	private readonly fileStreamer: FileStreamer;

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

	// =================================================================
	// Section: Constructor
	// =================================================================

	constructor(
		logger: Logger,
		fileOperationManager: FileOperationManager,
		allowedRoot: string,
		config: StreamingManagerConfig = {},
	) {
		if (!allowedRoot) {
			throw new Error("Requires allowedRoot for security - cannot operate without path restrictions");
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

	// =================================================================
	// Section: Public API
	// =================================================================

	/**
	 * Reads a file, choosing the best strategy (streaming or normal).
	 * Main entry point for file reading.
	 */
	async readFile(filePath: string, options?: StreamingOptions): Promise<Result<StreamingResult, FileError>> {
		const pathAndStatsResult = await this._getValidatedPathAndStats(filePath, options);
		if (!pathAndStatsResult.success) {
			return { success: false, error: pathAndStatsResult.error };
		}
		const { sanitisedPath, stats } = pathAndStatsResult.data;

		return this._performReadOperation(filePath, sanitisedPath, stats, options);
	}

	getStats(): StreamingStats {
		return {
			...this.stats,
			lastReset: new Date(this.stats.lastReset.getTime()),
		};
	}

	resetStats(): void {
		this.stats.totalOperations = 0;
		this.stats.streamedOperations = 0;
		this.stats.totalBytesRead = 0;
		this.stats.avgStreamingTime = 0;
		this.stats.avgNormalReadTime = 0;
		this.stats.largestFileStreamed = 0;
		this.stats.lastReset = new Date();
		this.activeOperations.clear();
		this.logger.info("StreamingManager stats have been reset.");
	}

	getActiveOperations(): StreamingMetadata[] {
		return Array.from(this.activeOperations.values());
	}

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

	async wouldStreamFile(filePath: string, allowedRoot?: string): Promise<Result<boolean, FileError>> {
		// Use constructor's allowedRoot if no allowedRoot is provided
		const effectiveAllowedRoot = allowedRoot ?? this.allowedRoot;
		// Validate and resolve path first. Re-use _getValidatedPathAndStats for this.
		const pathAndStatsResult = await this._getValidatedPathAndStats(filePath, {
			allowedRoot: effectiveAllowedRoot,
		});
		if (!pathAndStatsResult.success) {
			return pathAndStatsResult;
		}
		// Access stats from the successful result
		const { stats } = pathAndStatsResult.data;
		return { success: true, data: stats.size >= this.sizeThreshold };
	}

	// =================================================================
	// Section: Internal Logic & Private Helpers
	// =================================================================

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
	private _startOperation(filePath: string, fileSize: number, strategy: "streaming" | "normal"): string {
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
	private async _executeNormalRead(sanitisedPath: string, stats: Stats): Promise<Result<StreamingResult, FileError>> {
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
				this.logger.debug(`Using streaming strategy for large file: ${originalFilePath} (${fileSize} bytes)`);
				result = await this._executeStreamingRead(sanitisedPath, stats, options);
			} else {
				this.logger.debug(`Using normal read strategy for file: ${originalFilePath} (${fileSize} bytes)`);
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
		} catch (error) {
			this.activeOperations.delete(operationId);
			const fileError: FileError = {
				code: "READ_OPERATION_UNHANDLED_ERROR",
				message: `Unhandled error during read operation: ${error instanceof Error ? error.message : String(error)}`,
				path: originalFilePath,
				originalError: error instanceof Error ? error : new Error(String(error)),
			};
			this.logger.error(
				`[StreamingManager._performReadOperation] Unhandled exception for ${originalFilePath}: ${fileError.message}`,
			);
			result = { success: false, error: fileError };
		}
		return result;
	}

	private async normalReadFile(filePath: string, stats: Stats): Promise<Result<StreamingResult, FileError>> {
		const startTime = performance.now();
		try {
			// Using the more robust fileOperationManager
			const fileReadResult = await this.fileOperationManager.readFileWithRetry(filePath);

			if (!fileReadResult.success) {
				// Propagate the detailed error from the operation manager
				return { success: false, error: fileReadResult.error };
			}
			const content = fileReadResult.data;
			const duration = performance.now() - startTime;

			return {
				success: true,
				data: {
					content,
					wasStreamed: false,
					duration,
					bytesRead: stats.size,
					chunksProcessed: 1, // Only one 'chunk' in a normal read
				},
			};
		} catch (error) {
			const fileError: FileError = {
				code: "NORMAL_READ_UNHANDLED_ERROR",
				message: `Unhandled error during normal file read: ${error instanceof Error ? error.message : String(error)}`,
				path: filePath,
				originalError: error instanceof Error ? error : new Error(String(error)),
			};
			return { success: false, error: fileError };
		}
	}

	private updateAverageTimes(duration: number, strategy: "normal" | "streaming"): void {
		if (strategy === "normal") {
			const totalNormalOps = this.stats.totalOperations - this.stats.streamedOperations;
			this.stats.avgNormalReadTime =
				(this.stats.avgNormalReadTime * (totalNormalOps - 1) + duration) / totalNormalOps;
		} else {
			this.stats.avgStreamingTime =
				(this.stats.avgStreamingTime * (this.stats.streamedOperations - 1) + duration) /
				this.stats.streamedOperations;
		}
	}
}
