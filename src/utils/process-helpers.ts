/**
 * Shared Process Management Helpers
 *
 * Utilities to reduce complexity in MCP process management, specifically for MemoryBankMCPAdapter.
 */

import { type ChildProcess, spawn } from "node:child_process";
import { join } from "node:path";
import { type ExtensionContext, workspace } from "vscode";
import type { ProcessEventHandlers, ProcessSpawnConfig } from "../lib/types/system";
import type { Logger } from "../types/logging";

/**
 * Validates workspace and returns the workspace path
 */
export function validateWorkspace(logger: Logger): string {
	const workspaceFolders = workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		logger.error("AI Memory: No workspace folder found. Cannot start MCP server.");
		throw new Error("No workspace folder found to start MCP server.");
	}

	const firstFolder = workspaceFolders[0];
	if (!firstFolder) {
		logger.error("AI Memory: First workspace folder is undefined.");
		throw new Error("First workspace folder is undefined.");
	}

	return firstFolder.uri.fsPath;
}

/**
 * Creates process spawn configuration Centralizes path resolution and environment setup
 */
export function createProcessConfig(context: ExtensionContext, workspacePath: string): ProcessSpawnConfig {
	const serverPath = join(context.extensionPath, "dist", "index.cjs");
	const nodeExecutable = process.execPath ?? "node";

	return {
		serverPath,
		workspacePath,
		nodeExecutable,
		cwd: context.extensionPath,
		env: {
			...process.env,
			// biome-ignore lint/style/useNamingConvention: NODE_ENV is a standard environment variable convention
			NODE_ENV: "production",
		},
	};
}

/**
 * Spawns MCP server process with standardized configuration Reduces spawning complexity and
 * centralizes spawn logic
 */
export function spawnMCPServer(config: ProcessSpawnConfig): ChildProcess {
	return spawn(config.nodeExecutable, [config.serverPath, config.workspacePath], {
		stdio: "pipe", // We'll manage stdio ourselves for MCP communication
		cwd: config.cwd,
		env: config.env,
	});
}

/**
 * Registers standard event handlers for MCP server process
 */
export function registerProcessEventHandlers(childProcess: ChildProcess, handlers: ProcessEventHandlers): void {
	// Handle process errors
	childProcess.on("error", handlers.onError);

	// Handle process exit
	childProcess.on("exit", handlers.onExit);

	// Log stderr for debugging (optional)
	if (handlers.onStderr && childProcess.stderr) {
		childProcess.stderr.on("data", handlers.onStderr);
	}
}

/**
 * Waits for process startup with timeout Standardizes the startup validation pattern
 */
export async function waitForProcessStartup(childProcess: ChildProcess, timeoutMs = 1000): Promise<void> {
	await new Promise(resolve => setTimeout(resolve, timeoutMs));

	if (!childProcess || childProcess.killed) {
		throw new Error("Failed to start MCP server process");
	}
}

/**
 * High-level process launcher that combines all the patterns
 */
export async function launchMCPServerProcess(
	context: ExtensionContext,
	logger: Logger,
	eventHandlers: Omit<ProcessEventHandlers, "onStderr"> & {
		onStderr?: (data: Buffer) => void;
	},
): Promise<ChildProcess> {
	// Validate workspace
	const workspacePath = validateWorkspace(logger);

	// Create process configuration
	const config = createProcessConfig(context, workspacePath);

	logger.info(`Starting MCP STDIO server: ${config.serverPath} with workspace: ${workspacePath}`);

	// Spawn the process
	const childProcess = spawnMCPServer(config);

	// Register event handlers
	registerProcessEventHandlers(childProcess, eventHandlers);

	// Wait for startup
	await waitForProcessStartup(childProcess);

	logger.info("MCP STDIO server started successfully");

	return childProcess;
}
