import { createReadStream } from "node:fs";
import type { ReadStream, Stats } from "node:fs";
import { validateMemoryBankPath } from "../services/validation/security.js";
import type { Result } from "../types/errorHandling.js";
import type { FileError } from "../types/fileOperations.js";
import type { MemoryBankLogger } from "../types/logging.js";
import type {
	FileStreamerConfig,
	StreamDataHandlerContext,
	StreamingOptions,
	StreamingResult,
} from "../types/streaming.js";

/**
 * FileStreamer provides secure streaming file operations with path validation
 * to prevent directory traversal attacks.
 */
export class FileStreamer {
	private readonly logger: MemoryBankLogger;
	private readonly allowedRoot: string; // SECURITY: Required allowedRoot for path validation
	private readonly defaultChunkSize: number;
	private readonly defaultTimeout: number;
	private readonly defaultEnableProgressCallbacks: boolean;

	constructor(
		logger: MemoryBankLogger,
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
			throw new Error(
				`Path validation failed: ${error instanceof Error ? error.message : String(error)}`,
			);
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
			stream.destroy(); // Explicitly destroy stream on timeout
			const fileError: FileError = {
				code: "STREAMING_TIMEOUT",
				message: `Streaming read timed out after ${timeoutMs}ms`,
				path: filePath,
			};
			resolvePromise({ success: false, error: fileError });
		}, timeoutMs);
		return timeoutId;
	}

	/**
	 * Determines if streaming should pause to manage memory pressure
	 */
	private shouldPauseForMemoryPressure(bytesRead: number, chunksProcessed: number): boolean {
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

		if (
			this.shouldPauseForMemoryPressure(
				context.bytesRead.value,
				context.chunksProcessed.value,
			)
		) {
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

	/**
	 * Performs streaming file reading for large files.
	 * SECURITY: Path is validated before creating read stream
	 */
	async streamFile(
		filePath: string,
		stats: Stats,
		options?: StreamingOptions,
	): Promise<Result<StreamingResult, FileError>> {
		// SECURITY: VALIDATE PATH FIRST
		let validatedPath: string;
		try {
			validatedPath = this.validatePath(filePath);
		} catch (error) {
			const fileError: FileError = {
				code: "PATH_VALIDATION_ERROR",
				message: `Path validation failed: ${error instanceof Error ? error.message : String(error)}`,
				path: filePath,
				originalError: error instanceof Error ? error : new Error(String(error)),
			};
			return { success: false, error: fileError };
		}

		return new Promise((resolve) => {
			const chunks: Buffer[] = [];
			const bytesRead = { value: 0 };
			const chunksProcessed = { value: 0 };
			const startTime = performance.now();
			const totalSize = stats.size;

			const chunkSize = options?.chunkSize ?? this.defaultChunkSize;
			const timeoutMs = options?.timeout ?? this.defaultTimeout;
			const enableProgress =
				this.defaultEnableProgressCallbacks && typeof options?.onProgress === "function";

			// Create read stream with VALIDATED path
			const stream = createReadStream(validatedPath, {
				highWaterMark: chunkSize,
			});

			// Setup timeout
			const timeoutId = this.manageStreamTimeout(stream, timeoutMs, filePath, resolve);

			stream.on("data", (chunk: Buffer | string) => {
				this._handleStreamData(chunk, stream, chunks, {
					bytesRead,
					chunksProcessed,
					totalSize,
					enableProgress,
					options,
				});
			});

			stream.on("end", () => {
				clearTimeout(timeoutId);
				this._handleStreamEnd(
					chunks,
					startTime,
					bytesRead.value,
					chunksProcessed.value,
					filePath,
					resolve,
				);
			});

			stream.on("error", (error) => {
				clearTimeout(timeoutId);
				this._handleStreamError(error, filePath, resolve);
			});

			// Note: Cancellation logic via options?.enableCancellation would typically involve
			// an AbortSignal or similar mechanism passed in via options, which would
			// then be used to call stream.destroy() or similar.
		});
	}
}
