// =============================================================================
// Streaming Management Types
// =============================================================================

/**
 * Progress callback for streaming operations
 */
export type StreamingProgressCallback = (bytesRead: number, totalBytes: number) => void;

/**
 * Configuration for streaming manager behavior
 */
export interface StreamingManagerConfig {
	sizeThreshold?: number; // bytes - files larger than this will be streamed
	chunkSize?: number; // bytes - size of each chunk when streaming
	timeout?: number; // milliseconds - timeout for streaming operations
	enableProgressCallbacks?: boolean;
}

/**
 * Options for individual streaming operations
 */
export interface StreamingOptions {
	onProgress?: StreamingProgressCallback;
	timeout?: number;
	chunkSize?: number;
	enableCancellation?: boolean;
	/**
	 * Security: Root directory for path validation - prevents path traversal attacks
	 * If provided, all file paths will be validated to ensure they remain within this root
	 */
	allowedRoot?: string;
}

/**
 * Enhanced result with streaming metadata
 */
export interface StreamingResult {
	content: string;
	wasStreamed: boolean;
	duration: number;
	bytesRead: number;
	chunksProcessed?: number;
}

/**
 * Statistics for streaming operations
 */
export interface StreamingStats {
	totalOperations: number;
	streamedOperations: number;
	totalBytesRead: number;
	avgStreamingTime: number;
	avgNormalReadTime: number;
	largestFileStreamed: number;
	lastReset: Date;
}

/**
 * Streaming operation metadata
 */
export interface StreamingMetadata {
	filePath: string;
	fileSize: number;
	strategy: "normal" | "streaming";
	startTime: number;
	endTime?: number;
	bytesProcessed?: number;
	chunksProcessed?: number;
}

// Configuration for FileStreamer class
export interface FileStreamerConfig {
	defaultChunkSize: number;
	defaultTimeout: number;
	defaultEnableProgressCallbacks: boolean;
	// Optional onProgress for specific instances if needed, but defaults are primary
	onProgress?: (progress: { bytesRead: number; totalBytes: number; chunks: number }) => void;
}

/**
 * Context for the _handleStreamData method in FileStreamer.
 */
export interface StreamDataHandlerContext {
	bytesRead: { value: number };
	chunksProcessed: { value: number };
	totalSize: number;
	enableProgress: boolean;
	options?: StreamingOptions;
}
