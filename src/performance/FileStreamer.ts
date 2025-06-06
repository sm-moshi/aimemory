import { createReadStream } from "node:fs";
import type { ReadStream, Stats } from "node:fs";
import type {
	FileError,
	FileStreamerConfig,
	Logger,
	Result,
	StreamDataHandlerContext,
	StreamSetupParameters,
	StreamSetupState,
	StreamingOptions,
	StreamingResult,
} from "../types/index.js";
import { validateMemoryBankPath } from "../utils/security-helpers.js";

/**
 * FileStreamer provides secure streaming file operations with path validation
 * to prevent directory traversal attacks.
 */
export class FileStreamer {
	private readonly logger: Logger;
	private readonly allowedRoot: string; // SECURITY: Required allowedRoot for path validation
	private readonly defaultChunkSize: number;
	private readonly defaultTimeout: number;
	private readonly defaultEnableProgressCallbacks: boolean;

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
			const fileError: FileError = {
				code: "STREAMING_TIMEOUT",
				message: `Streaming read timed out after ${timeoutMs}ms`,
				path: filePath,
			};
			resolvePromise({ success: false, error: fileError });

			// Defensive check for stream object and methods
			if (
				stream &&
				typeof stream.removeAllListeners === "function" &&
				typeof stream.destroy === "function"
			) {
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

	private _handleStreamClose(
		filePath: string,
		resolve: (value: Result<StreamingResult, FileError>) => void,
	): void {
		// The resolve function itself checks if the promise is already resolved.
		this.logger.warn(`Stream for ${filePath} closed prematurely.`);
		const fileError: FileError = {
			code: "STREAM_CLOSED_PREMATURELY",
			message: "Stream closed prematurely without completing or erroring.",
			path: filePath,
		};
		resolve({ success: false, error: fileError });
	}

	private _setupStreamAndEvents(
		params: StreamSetupParameters,
		state: StreamSetupState,
	): NodeJS.Timeout | undefined {
		const totalSize = params.stats.size;
		// Provide default options to avoid undefined issues
		const options = params.options ?? {};
		const chunkSize = options.chunkSize ?? this.defaultChunkSize;
		const timeoutMs = options.timeout ?? this.defaultTimeout;
		const enableProgress =
			this.defaultEnableProgressCallbacks && typeof options.onProgress === "function";

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

		// Wrap the promise resolution to ensure it's only called once
		// and to centralize timeout clearing.
		let timeoutId: NodeJS.Timeout | undefined = undefined;
		return new Promise(resolveOriginal => {
			let promiseResolved = false;
			const resolve = (value: Result<StreamingResult, FileError>) => {
				if (!promiseResolved) {
					promiseResolved = true;
					if (timeoutId) {
						clearTimeout(timeoutId);
						timeoutId = undefined; // Clear ref
					}
					resolveOriginal(value);
				}
			};

			const chunks: Buffer[] = [];
			const bytesRead = { value: 0 };
			const chunksProcessed = { value: 0 };
			const startTime = performance.now();

			const setupParams: StreamSetupParameters = {
				validatedPath,
				stats,
				originalFilePath: filePath,
				startTime,
			};

			if (options !== undefined) {
				setupParams.options = options;
			}

			timeoutId = this._setupStreamAndEvents(setupParams, {
				resolve,
				chunks,
				bytesRead,
				chunksProcessed,
			});

			// Note: Cancellation logic via options?.enableCancellation would typically involve
			// an AbortSignal or similar mechanism passed in via options, which would
			// then be used to call stream.destroy() or similar.
		});
	}
}
