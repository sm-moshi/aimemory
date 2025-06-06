/**
 * Configuration Types and Interfaces
 * Contains types for Cursor configuration, process management, and system settings
 */

/**
 * Configuration for MCP server in Cursor
 */
export interface MCPServerConfig {
	name?: string;
	command: string;
	args?: string[];
	env?: Record<string, string>;
	cwd?: string;
	url?: string; // For URL-based servers
}

/**
 * Complete Cursor MCP configuration structure
 */
export interface CursorMCPConfig {
	mcpServers: Record<string, MCPServerConfig>;
}

/**
 * Result of comparing two server configurations
 */
export interface ConfigComparisonResult {
	matches: boolean;
	differences?: string[];
}

/**
 * Settings for Cursor rules generation and management
 */
export interface CursorRulesSettings {
	autoUpdate?: boolean;
	templatePath?: string;
	outputPath?: string;
	includeTimestamp?: boolean;
}

/**
 * Process environment configuration
 */
export interface ProcessEnvironment {
	NODE_ENV?: "development" | "production" | "test";
	DEBUG?: string;
	LOG_LEVEL?: "error" | "warn" | "info" | "debug" | "trace";
	WORKSPACE_ROOT?: string;
	[key: string]: string | undefined;
}

/**
 * Process execution options
 */
export interface ProcessOptions {
	cwd?: string;
	env?: ProcessEnvironment;
	timeout?: number;
	shell?: boolean;
	stdio?: "pipe" | "inherit" | "ignore";
}

/**
 * Result of a process execution
 */
export interface ProcessResult {
	exitCode: number;
	stdout: string;
	stderr: string;
	duration: number;
	signal?: NodeJS.Signals;
}

/**
 * VS Code extension configuration settings
 */
export interface ExtensionConfig {
	memoryBank: {
		enabled: boolean;
		autoInitialize: boolean;
		watchFiles: boolean;
		cacheEnabled: boolean;
	};
	logging: {
		level: "error" | "warn" | "info" | "debug";
		outputToFile: boolean;
		maxLogSize: number;
	};
	cursor: {
		autoUpdateMCP: boolean;
		rulesPath: string;
		mcpConfigPath: string;
	};
}

/**
 * Runtime configuration for the extension
 */
export interface RuntimeConfig {
	extensionPath: string;
	workspacePath: string;
	globalStoragePath: string;
	version: string;
	isDevelopment: boolean;
}

/**
 * Configuration for spawning MCP server process
 */
export interface ProcessSpawnConfig {
	serverPath: string;
	workspacePath: string;
	nodeExecutable: string;
	cwd: string;
	env?: Record<string, string>;
}

/**
 * Process event handlers configuration
 */
export interface ProcessEventHandlers {
	onError: (error: Error) => void;
	onExit: (code: number | null, signal: NodeJS.Signals | null) => void;
	onStderr?: (data: Buffer) => void;
}
