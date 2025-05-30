/**
 * Shared Process Management Helpers
 *
 * Utilities to reduce complexity in MCP process management,
 * specifically for MemoryBankMCPAdapter.
 */

import { type ChildProcess, spawn } from "node:child_process";
import { join } from "node:path";
import { type ExtensionContext, workspace } from "vscode";
import type { ProcessEventHandlers, ProcessSpawnConfig } from "../../types/types.js";
import type { Logger } from "../../utils/log.js";

/**
 * Validates workspace and returns the workspace path
 * Reduces complexity from ~4 branches to ~1 in calling code
 */
export function validateWorkspace(logger: Logger): string {
	const workspaceFolders = workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		logger.error("AI Memory: No workspace folder found. Cannot start MCP server.");
		throw new Error("No workspace folder found to start MCP server.");
	}
	return workspaceFolders[0].uri.fsPath;
}

/**
 * Creates process spawn configuration
 * Centralizes path resolution and environment setup
 */
export function createProcessConfig(
	context: ExtensionContext,
	workspacePath: string,
): ProcessSpawnConfig {
	const serverPath = join(context.extensionPath, "dist", "index.cjs");
	const nodeExecutable = process.execPath ?? "node";

	return {
		serverPath,
		workspacePath,
		nodeExecutable,
		cwd: context.extensionPath,
		env: {
			...process.env,
			NODE_ENV: "production",
		},
	};
}

/**
 * Spawns MCP server process with standardized configuration
 * Reduces spawning complexity and centralizes spawn logic
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
 * Reduces event handler complexity from ~6 branches to ~1
 */
export function registerProcessEventHandlers(
	childProcess: ChildProcess,
	handlers: ProcessEventHandlers,
): void {
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
 * Waits for process startup with timeout
 * Standardizes the startup validation pattern
 */
export async function waitForProcessStartup(
	childProcess: ChildProcess,
	timeoutMs = 1000,
): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, timeoutMs));

	if (!childProcess || childProcess.killed) {
		throw new Error("Failed to start MCP server process");
	}
}

/**
 * High-level process launcher that combines all the patterns
 * Reduces start() method complexity from ~19 to ~5-6 complexity points
 */
export async function launchMCPServerProcess(
	context: ExtensionContext,
	logger: Logger,
	eventHandlers: Omit<ProcessEventHandlers, "onStderr"> & { onStderr?: (data: Buffer) => void },
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
